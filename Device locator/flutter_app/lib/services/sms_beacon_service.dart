import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/location_log.dart';
import 'turso_db_service.dart';

class SmsBeaconMessage {
  final String sender;
  final double latitude;
  final double longitude;
  final double speed;
  final DateTime timestamp;
  final String rawBody;

  SmsBeaconMessage({
    required this.sender,
    required this.latitude,
    required this.longitude,
    required this.speed,
    required this.timestamp,
    required this.rawBody,
  });
}

class SmsBeaconService extends ChangeNotifier {
  static final SmsBeaconService instance = SmsBeaconService._internal();
  SmsBeaconService._internal();

  bool _isAutoSmsStreamEnabled = false;
  String _emergencyContactNumber = '+15550192834';
  int _sentSmsCount = 0;
  List<SmsBeaconMessage> _receivedBeacons = [];
  Timer? _smsStreamTimer;

  bool get isAutoSmsStreamEnabled => _isAutoSmsStreamEnabled;
  String get emergencyContactNumber => _emergencyContactNumber;
  int get sentSmsCount => _sentSmsCount;
  List<SmsBeaconMessage> get receivedBeacons => List.unmodifiable(_receivedBeacons);

  void setEmergencyContact(String number) {
    _emergencyContactNumber = number;
    notifyListeners();
  }

  void toggleAutoSmsStream(bool enable) {
    _isAutoSmsStreamEnabled = enable;
    if (enable) {
      _startSmsStreamSimulation();
    } else {
      _smsStreamTimer?.cancel();
    }
    notifyListeners();
  }

  String encodeLocationToSmsPayload(LocationLog log) {
    // Encrypted / Compressed payload format: LOC:LAT,LNG,SPD,BAT,TS
    return "LOC:${log.latitude.toStringAsFixed(6)},${log.longitude.toStringAsFixed(6)},${log.speed.toStringAsFixed(1)},${log.batteryLevel.toInt()},${log.timestamp.millisecondsSinceEpoch}";
  }

  LocationLog? parseSmsPayload(String body, String senderNumber) {
    try {
      if (!body.startsWith("LOC:")) return null;
      final content = body.substring(4);
      final parts = content.split(",");
      if (parts.length < 5) return null;

      final lat = double.parse(parts[0]);
      final lng = double.parse(parts[1]);
      final spd = double.parse(parts[2]);
      final bat = double.parse(parts[3]);
      final tsMs = int.parse(parts[4]);

      return LocationLog(
        id: 'sms_$tsMs',
        latitude: lat,
        longitude: lng,
        altitude: 0.0,
        accuracy: 5.0,
        speed: spd,
        heading: 0.0,
        timestamp: DateTime.fromMillisecondsSinceEpoch(tsMs),
        syncStatus: SyncStatus.pending,
        connectionMode: ConnectivityMode.smsStream,
        batteryLevel: bat,
        deviceId: 'SMS_Target_$senderNumber',
      );
    } catch (e) {
      debugPrint("Error parsing SMS Beacon payload: $e");
      return null;
    }
  }

  void _startSmsStreamSimulation() {
    _smsStreamTimer?.cancel();
    // Simulate periodic encrypted location SMS stream received from offline target phone
    _smsStreamTimer = Timer.periodic(const Duration(seconds: 15), (timer) {
      final now = DateTime.now();
      final mockLat = 37.7749 + (timer.tick * 0.0002);
      final mockLng = -122.4194 + (timer.tick * 0.0003);
      
      final payload = "LOC:${mockLat.toStringAsFixed(6)},${mockLng.toStringAsFixed(6)},42.5,85,${now.millisecondsSinceEpoch}";
      final beaconLog = parseSmsPayload(payload, _emergencyContactNumber);

      if (beaconLog != null) {
        _sentSmsCount += 1;
        _receivedBeacons.insert(0, SmsBeaconMessage(
          sender: _emergencyContactNumber,
          latitude: mockLat,
          longitude: mockLng,
          speed: 42.5,
          timestamp: now,
          rawBody: payload,
        ));
        
        // Log into Turso DB edge store
        TursoDbService.instance.insertLocation(beaconLog);
        notifyListeners();
      }
    });
  }
}
