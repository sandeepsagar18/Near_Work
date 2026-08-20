import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import '../models/location_log.dart';
import 'turso_db_service.dart';

class LocationService extends ChangeNotifier {
  static final LocationService instance = LocationService._internal();
  LocationService._internal();

  bool _isTracking = false;
  Position? _currentPosition;
  double _currentSpeed = 0.0;
  double _currentHeading = 0.0;
  ConnectivityMode _currentMode = ConnectivityMode.online;
  
  StreamSubscription<Position>? _positionSubscription;
  Timer? _simulationTimer;

  bool get isTracking => _isTracking;
  Position? get currentPosition => _currentPosition;
  double get currentSpeed => _currentSpeed;
  double get currentHeading => _currentHeading;
  ConnectivityMode get currentMode => _currentMode;

  void setConnectivityMode(ConnectivityMode mode) {
    _currentMode = mode;
    notifyListeners();
  }

  Future<bool> requestPermissions() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      return false;
    }

    return true;
  }

  Future<void> startTracking() async {
    if (_isTracking) return;
    _isTracking = true;
    notifyListeners();

    final hasPermission = await requestPermissions();

    if (hasPermission) {
      const locationSettings = LocationSettings(
        accuracy: LocationAccuracy.bestForNavigation,
        distanceFilter: 2, // notify every 2 meters
      );

      _positionSubscription = Geolocator.getPositionStream(
        locationSettings: locationSettings,
      ).listen(
        (Position position) {
          _onNewPosition(position);
        },
        onError: (error) {
          debugPrint("Location error: $error. Falling back to simulation mode.");
          _startSimulationMode();
        },
      );
    } else {
      // Fallback for emulator or desktop testing
      _startSimulationMode();
    }
  }

  void _onNewPosition(Position position) {
    _currentPosition = position;
    _currentSpeed = (position.speed * 3.6).clamp(0.0, 240.0); // Convert m/s to km/h
    _currentHeading = position.heading;

    final log = LocationLog(
      id: 'log_${DateTime.now().millisecondsSinceEpoch}',
      latitude: position.latitude,
      longitude: position.longitude,
      altitude: position.altitude,
      accuracy: position.accuracy,
      speed: _currentSpeed,
      heading: _currentHeading,
      timestamp: DateTime.now(),
      syncStatus: SyncStatus.pending,
      connectionMode: _currentMode,
      batteryLevel: 92.0,
      deviceId: 'TargetPhone_Pixel8',
    );

    TursoDbService.instance.insertLocation(log);
    notifyListeners();
  }

  void _startSimulationMode() {
    _simulationTimer?.cancel();
    // Default starting point: San Francisco / New York / User center mock
    double simLat = 37.7749;
    double simLng = -122.4194;
    double angle = 0.0;
    final random = Random();

    _simulationTimer = Timer.periodic(const Duration(seconds: 3), (timer) {
      angle += 0.05;
      simLat += (cos(angle) * 0.0003) + (random.nextDouble() - 0.5) * 0.0001;
      simLng += (sin(angle) * 0.0003) + (random.nextDouble() - 0.5) * 0.0001;
      
      final mockPos = Position(
        latitude: simLat,
        longitude: simLng,
        timestamp: DateTime.now(),
        altitude: 45.2,
        altitudeAccuracy: 1.0,
        accuracy: 3.5,
        heading: (angle * 57.2958) % 360,
        headingAccuracy: 1.0,
        speed: 12.5 + random.nextDouble() * 5.0, // ~45 km/h
        speedAccuracy: 0.5,
      );

      _onNewPosition(mockPos);
    });
  }

  void stopTracking() {
    _isTracking = false;
    _positionSubscription?.cancel();
    _simulationTimer?.cancel();
    notifyListeners();
  }
}
