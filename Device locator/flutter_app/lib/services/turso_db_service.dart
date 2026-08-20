import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';
import '../models/location_log.dart';

class TursoDbService extends ChangeNotifier {
  static final TursoDbService instance = TursoDbService._internal();
  TursoDbService._internal();

  Database? _db;
  final List<LocationLog> _inMemoryLogs = [];
  
  // Turso Database Credentials Configuration
  String _tursoUrl = 'https://device-locator-edge.turso.io';
  String _tursoAuthToken = '';
  bool _isSyncing = false;
  int _pendingSyncCount = 0;
  bool _isCloudConnected = false;

  int get pendingSyncCount => _pendingSyncCount;
  bool get isSyncing => _isSyncing;
  bool get isCloudConnected => _isCloudConnected;
  String get tursoUrl => _tursoUrl;

  // Stream controller for live location updates
  final _locationStreamController = StreamController<LocationLog>.broadcast();
  Stream<LocationLog> get onLocationUpdated => _locationStreamController.stream;

  Future<void> init() async {
    if (kIsWeb) {
      debugPrint("TursoDbService: Running on Web (In-Memory Edge Cache)");
      _pendingSyncCount = 0;
      notifyListeners();
      return;
    }

    try {
      final dbPath = await getDatabasesPath();
      final path = join(dbPath, 'device_locator_turso.db');

      _db = await openDatabase(
        path,
        version: 1,
        onCreate: (db, version) async {
          await db.execute('''
            CREATE TABLE location_logs (
              id TEXT PRIMARY KEY,
              latitude REAL NOT NULL,
              longitude REAL NOT NULL,
              altitude REAL NOT NULL,
              accuracy REAL NOT NULL,
              speed REAL NOT NULL,
              heading REAL NOT NULL,
              timestamp TEXT NOT NULL,
              syncStatus TEXT NOT NULL,
              connectionMode TEXT NOT NULL,
              batteryLevel REAL NOT NULL,
              deviceId TEXT NOT NULL
            )
          ''');
        },
      );

      await _updatePendingCount();
    } catch (e) {
      debugPrint("Database init warning: $e");
    }
  }

  void configureTurso({required String url, required String authToken}) {
    _tursoUrl = url;
    _tursoAuthToken = authToken;
    notifyListeners();
  }

  /// Write location log locally (Edge offline cache)
  Future<void> insertLocation(LocationLog log) async {
    if (kIsWeb || _db == null) {
      _inMemoryLogs.insert(0, log);
      if (_inMemoryLogs.length > 500) _inMemoryLogs.removeLast();
      _locationStreamController.add(log);
      notifyListeners();
      return;
    }

    await _db!.insert(
      'location_logs',
      log.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );

    _locationStreamController.add(log);
    await _updatePendingCount();

    // Trigger async sync to Turso Cloud DB if network available
    syncToTursoCloud();
  }

  /// Sync offline pending records to Turso Cloud Database via libSQL HTTP Pipeline API
  Future<void> syncToTursoCloud() async {
    if (_isSyncing || (_db == null && !kIsWeb)) return;
    _isSyncing = true;
    notifyListeners();

    try {
      final pendingLogs = await getPendingLogs();
      if (pendingLogs.isEmpty) {
        _isCloudConnected = true;
        _isSyncing = false;
        notifyListeners();
        return;
      }

      if (_tursoUrl.isEmpty) {
        await Future.delayed(const Duration(milliseconds: 600));
        _isCloudConnected = true;
        _isSyncing = false;
        notifyListeners();
        return;
      }

      // Build libSQL Pipeline Batch Statements
      final statements = pendingLogs.map((log) {
        return {
          "q": "INSERT OR REPLACE INTO location_logs (id, latitude, longitude, altitude, accuracy, speed, heading, timestamp, syncStatus, connectionMode, batteryLevel, deviceId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, ?)",
          "params": [
            log.id,
            log.latitude,
            log.longitude,
            log.altitude,
            log.accuracy,
            log.speed,
            log.heading,
            log.timestamp.toIso8601String(),
            log.connectionMode.name,
            log.batteryLevel,
            log.deviceId
          ]
        };
      }).toList();

      final endpoint = Uri.parse("$_tursoUrl/v2/pipeline");
      final response = await http.post(
        endpoint,
        headers: {
          'Content-Type': 'application/json',
          if (_tursoAuthToken.isNotEmpty) 'Authorization': 'Bearer $_tursoAuthToken',
        },
        body: jsonEncode({
          "requests": [
            {
              "type": "execute",
              "stmt": {
                "sql": "CREATE TABLE IF NOT EXISTS location_logs (id TEXT PRIMARY KEY, latitude REAL, longitude REAL, altitude REAL, accuracy REAL, speed REAL, heading REAL, timestamp TEXT, syncStatus TEXT, connectionMode TEXT, batteryLevel REAL, deviceId TEXT);"
              }
            },
            ...statements.map((s) => {"type": "execute", "stmt": s})
          ]
        }),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200 || response.statusCode == 201) {
        _isCloudConnected = true;
        if (_db != null) {
          for (var log in pendingLogs) {
            await _db!.update(
              'location_logs',
              {'syncStatus': SyncStatus.synced.name},
              where: 'id = ?',
              whereArgs: [log.id],
            );
          }
        }
      } else {
        _isCloudConnected = false;
      }
    } catch (e) {
      _isCloudConnected = false;
      debugPrint("Turso Sync Exception: $e");
    } finally {
      _isSyncing = false;
      await _updatePendingCount();
      notifyListeners();
    }
  }

  Future<List<LocationLog>> getPendingLogs() async {
    if (kIsWeb || _db == null) {
      return _inMemoryLogs.where((l) => l.syncStatus == SyncStatus.pending).take(50).toList();
    }
    final List<Map<String, dynamic>> maps = await _db!.query(
      'location_logs',
      where: 'syncStatus = ?',
      whereArgs: [SyncStatus.pending.name],
      limit: 50,
    );
    return maps.map((m) => LocationLog.fromMap(m)).toList();
  }

  Future<List<LocationLog>> getAllLogs({int limit = 200}) async {
    if (kIsWeb || _db == null) {
      return _inMemoryLogs.take(limit).toList();
    }
    final List<Map<String, dynamic>> maps = await _db!.query(
      'location_logs',
      orderBy: 'timestamp DESC',
      limit: limit,
    );
    return maps.map((m) => LocationLog.fromMap(m)).toList();
  }

  Future<LocationLog?> getLatestLocation() async {
    if (kIsWeb || _db == null) {
      return _inMemoryLogs.isNotEmpty ? _inMemoryLogs.first : null;
    }
    final List<Map<String, dynamic>> maps = await _db!.query(
      'location_logs',
      orderBy: 'timestamp DESC',
      limit: 1,
    );
    if (maps.isEmpty) return null;
    return LocationLog.fromMap(maps.first);
  }

  Future<void> clearAll() async {
    if (kIsWeb || _db == null) {
      _inMemoryLogs.clear();
      _pendingSyncCount = 0;
      notifyListeners();
      return;
    }
    await _db?.delete('location_logs');
    await _updatePendingCount();
    notifyListeners();
  }

  Future<void> _updatePendingCount() async {
    if (kIsWeb || _db == null) {
      _pendingSyncCount = _inMemoryLogs.where((l) => l.syncStatus == SyncStatus.pending).length;
      return;
    }
    final count = Sqflite.firstIntValue(await _db!.rawQuery(
      "SELECT COUNT(*) FROM location_logs WHERE syncStatus = 'pending'"
    )) ?? 0;
    _pendingSyncCount = count;
  }
}
