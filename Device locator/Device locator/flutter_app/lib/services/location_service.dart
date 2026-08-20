import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:battery_plus/battery_plus.dart';
import '../models/location_log.dart';
import 'turso_db_service.dart';

class LocationService extends ChangeNotifier {
  static final LocationService instance = LocationService._internal();
  LocationService._internal() {
    _initBatteryAndNativeCompass();
    startTracking();
  }

  static const EventChannel _compassEventChannel =
      EventChannel('com.devicelocator.device_locator/compass');

  bool _isTracking = false;
  Position? _currentPosition;
  double _currentSpeed = 0.0;
  double _currentHeading = 0.0;
  int _batteryLevel = 100;
  ConnectivityMode _currentMode = ConnectivityMode.online;
  String _errorMessage = '';
  
  final Battery _battery = Battery();
  StreamSubscription<Position>? _positionSubscription;
  StreamSubscription<dynamic>? _compassSubscription;
  Timer? _batteryTimer;

  bool get isTracking => _isTracking;
  Position? get currentPosition => _currentPosition;
  double get currentSpeed => _currentSpeed;
  double get currentHeading => _currentHeading;
  int get batteryLevel => _batteryLevel;
  ConnectivityMode get currentMode => _currentMode;
  String get errorMessage => _errorMessage;

  void setConnectivityMode(ConnectivityMode mode) {
    _currentMode = mode;
    notifyListeners();
  }

  Future<void> _initBatteryAndNativeCompass() async {
    try {
      _batteryLevel = await _battery.batteryLevel;
      notifyListeners();
    } catch (e) {
      debugPrint("Battery level fetch error: $e");
    }

    _batteryTimer = Timer.periodic(const Duration(seconds: 15), (_) async {
      try {
        final level = await _battery.batteryLevel;
        if (_batteryLevel != level) {
          _batteryLevel = level;
          notifyListeners();
        }
      } catch (_) {}
    });

    // Native Android Hardware SensorManager Rotation Stream (60 FPS Azimuth Heading)
    try {
      _compassSubscription = _compassEventChannel.receiveBroadcastStream().listen(
        (dynamic heading) {
          if (heading is double) {
            _currentHeading = heading;
            notifyListeners();
          }
        },
        onError: (error) {
          debugPrint("Native compass sensor error: $error");
        },
      );
    } catch (e) {
      debugPrint("Compass channel init exception: $e");
    }
  }

  Future<bool> requestPermissions() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _errorMessage = 'GPS Location Service is disabled on phone. Please turn on Location/GPS.';
      notifyListeners();
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        _errorMessage = 'Location permission denied by user.';
        notifyListeners();
        return false;
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      _errorMessage = 'Location permission denied permanently. Open app settings to enable GPS.';
      notifyListeners();
      return false;
    }

    _errorMessage = '';
    return true;
  }

  Future<void> startTracking() async {
    if (_isTracking) return;
    _isTracking = true;
    notifyListeners();

    final hasPermission = await requestPermissions();

    if (hasPermission) {
      try {
        Position initialPos = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.bestForNavigation,
          timeLimit: const Duration(seconds: 10),
        );
        _onNewPosition(initialPos);
      } catch (e) {
        debugPrint("Initial location fetch: $e");
      }

      const locationSettings = LocationSettings(
        accuracy: LocationAccuracy.bestForNavigation,
        distanceFilter: 1,
      );

      _positionSubscription = Geolocator.getPositionStream(
        locationSettings: locationSettings,
      ).listen(
        (Position position) {
          _onNewPosition(position);
        },
        onError: (error) {
          _errorMessage = "GPS Error: $error";
          debugPrint(_errorMessage);
          notifyListeners();
        },
      );
    }
  }

  void _onNewPosition(Position position) {
    _currentPosition = position;
    _currentSpeed = (position.speed * 3.6).clamp(0.0, 300.0);
    _errorMessage = '';

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
      batteryLevel: _batteryLevel.toDouble(),
      deviceId: 'Xiaomi 21091116AI (My Phone)',
    );

    TursoDbService.instance.insertLocation(log);
    notifyListeners();
  }

  void stopTracking() {
    _isTracking = false;
    _positionSubscription?.cancel();
    notifyListeners();
  }

  @override
  void dispose() {
    _batteryTimer?.cancel();
    _compassSubscription?.cancel();
    _positionSubscription?.cancel();
    super.dispose();
  }
}
