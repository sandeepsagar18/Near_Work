import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import '../models/location_log.dart';

class BleMeshPeer {
  final String peerId;
  final String deviceName;
  final double rssi; // Signal strength in dBm (-30 dBm is very close, -90 dBm is far)
  final double estimatedDistanceMeters;
  final LocationLog? lastRelayedLocation;
  final DateTime lastSeen;

  BleMeshPeer({
    required this.peerId,
    required this.deviceName,
    required this.rssi,
    required this.estimatedDistanceMeters,
    this.lastRelayedLocation,
    required this.lastSeen,
  });
}

class BleMeshService extends ChangeNotifier {
  static final BleMeshService instance = BleMeshService._internal();
  BleMeshService._internal();

  bool _isAdvertising = false;
  bool _isScanning = false;
  int _relayedPacketCount = 0;
  List<BleMeshPeer> _activePeers = [];
  Timer? _radarSimulationTimer;

  bool get isAdvertising => _isAdvertising;
  bool get isScanning => _isScanning;
  int get relayedPacketCount => _relayedPacketCount;
  List<BleMeshPeer> get activePeers => List.unmodifiable(_activePeers);

  void startMeshService() {
    _isAdvertising = true;
    _isScanning = true;
    notifyListeners();

    _startProximityRadarSimulation();
  }

  void stopMeshService() {
    _isAdvertising = false;
    _isScanning = false;
    _radarSimulationTimer?.cancel();
    _activePeers = [];
    notifyListeners();
  }

  void _startProximityRadarSimulation() {
    final random = Random();

    _radarSimulationTimer?.cancel();
    _radarSimulationTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
      // Simulate real-time RSSI signal fluctuation & distance estimation for nearby offline target
      final baseDistance = 3.5 + (sin(DateTime.now().second * 0.2) * 1.5);
      final rssiVal = -40.0 - (baseDistance * 6.5) + (random.nextDouble() - 0.5) * 4;

      final targetPeer = BleMeshPeer(
        peerId: 'BLE_TARGET_9X4',
        deviceName: 'Target Device (Offline BLE Mesh)',
        rssi: rssiVal.clamp(-95.0, -30.0),
        estimatedDistanceMeters: baseDistance.clamp(0.5, 30.0),
        lastSeen: DateTime.now(),
        lastRelayedLocation: LocationLog(
          id: 'ble_relay_${DateTime.now().millisecondsSinceEpoch}',
          latitude: 37.7750,
          longitude: -122.4190,
          altitude: 40.0,
          accuracy: 1.5,
          speed: 0.0,
          heading: 120.0,
          timestamp: DateTime.now(),
          syncStatus: SyncStatus.synced,
          connectionMode: ConnectivityMode.bleMeshRelay,
          batteryLevel: 88.0,
          deviceId: 'Target Device (Offline BLE Mesh)',
        ),
      );

      _relayedPacketCount += 1;
      _activePeers = [
        targetPeer,
        BleMeshPeer(
          peerId: 'BLE_NODE_HELPER_02',
          deviceName: 'Helper Node (Relay Phone)',
          rssi: -58.0,
          estimatedDistanceMeters: 8.2,
          lastSeen: DateTime.now().subtract(const Duration(seconds: 10)),
        ),
      ];

      notifyListeners();
    });
  }
}
