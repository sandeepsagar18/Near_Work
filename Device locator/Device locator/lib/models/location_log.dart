import 'dart:convert';

enum SyncStatus { pending, synced, failed }
enum ConnectivityMode { online, bleMeshRelay, smsStream, offlineCache }

class LocationLog {
  final String id;
  final double latitude;
  final double longitude;
  final double altitude;
  final double accuracy;
  final double speed; // in km/h
  final double heading; // bearing angle 0-360
  final DateTime timestamp;
  final SyncStatus syncStatus;
  final ConnectivityMode connectionMode;
  final double batteryLevel;
  final String deviceId;

  LocationLog({
    required this.id,
    required this.latitude,
    required this.longitude,
    required this.altitude,
    required this.accuracy,
    required this.speed,
    required this.heading,
    required this.timestamp,
    this.syncStatus = SyncStatus.pending,
    this.connectionMode = ConnectivityMode.online,
    required this.batteryLevel,
    required this.deviceId,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'latitude': latitude,
      'longitude': longitude,
      'altitude': altitude,
      'accuracy': accuracy,
      'speed': speed,
      'heading': heading,
      'timestamp': timestamp.toIso8601String(),
      'syncStatus': syncStatus.name,
      'connectionMode': connectionMode.name,
      'batteryLevel': batteryLevel,
      'deviceId': deviceId,
    };
  }

  factory LocationLog.fromMap(Map<String, dynamic> map) {
    return LocationLog(
      id: map['id'] ?? '',
      latitude: (map['latitude'] as num).toDouble(),
      longitude: (map['longitude'] as num).toDouble(),
      altitude: (map['altitude'] as num).toDouble(),
      accuracy: (map['accuracy'] as num).toDouble(),
      speed: (map['speed'] as num).toDouble(),
      heading: (map['heading'] as num).toDouble(),
      timestamp: DateTime.parse(map['timestamp']),
      syncStatus: SyncStatus.values.firstWhere(
        (e) => e.name == map['syncStatus'],
        orElse: () => SyncStatus.pending,
      ),
      connectionMode: ConnectivityMode.values.firstWhere(
        (e) => e.name == map['connectionMode'],
        orElse: () => ConnectivityMode.online,
      ),
      batteryLevel: (map['batteryLevel'] as num?)?.toDouble() ?? 100.0,
      deviceId: map['deviceId'] ?? 'target_device_01',
    );
  }

  String toJson() => json.encode(toMap());

  factory LocationLog.fromJson(String source) => LocationLog.fromMap(json.decode(source));

  LocationLog copyWith({
    SyncStatus? syncStatus,
    ConnectivityMode? connectionMode,
  }) {
    return LocationLog(
      id: id,
      latitude: latitude,
      longitude: longitude,
      altitude: altitude,
      accuracy: accuracy,
      speed: speed,
      heading: heading,
      timestamp: timestamp,
      syncStatus: syncStatus ?? this.syncStatus,
      connectionMode: connectionMode ?? this.connectionMode,
      batteryLevel: batteryLevel,
      deviceId: deviceId,
    );
  }
}
