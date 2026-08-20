import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../../models/location_log.dart';
import '../../services/location_service.dart';
import '../../services/turso_db_service.dart';
import '../../services/ble_mesh_service.dart';
import '../theme/app_theme.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({Key? key}) : super(key: key);

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();
  bool _followTarget = true;
  int _selectedTileStyle = 0; // 0: Dark Vector, 1: OpenStreetMap, 2: Satellite/Topo

  final List<Map<String, String>> _tileProviders = [
    {
      'name': 'Dark Obsidian',
      'url': 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    },
    {
      'name': 'OpenStreetMap',
      'url': 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    },
    {
      'name': 'Carto Voyage',
      'url': 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    },
  ];

  List<LatLng> _routePoints = [];

  @override
  void initState() {
    super.initState();
    _loadHistoricalRoute();
  }

  Future<void> _loadHistoricalRoute() async {
    final logs = await TursoDbService.instance.getAllLogs(limit: 50);
    if (logs.isNotEmpty) {
      setState(() {
        _routePoints = logs.map((l) => LatLng(l.latitude, l.longitude)).toList();
      });
    }
  }

  void _onLocationChanged(LocationLog log) {
    final currentLatLng = LatLng(log.latitude, log.longitude);
    
    if (_routePoints.isEmpty || _routePoints.first != currentLatLng) {
      _routePoints.insert(0, currentLatLng);
      if (_routePoints.length > 100) _routePoints.removeLast();
    }

    if (_followTarget) {
      _mapController.move(currentLatLng, 16.5);
    }
  }

  @override
  Widget build(BuildContext context) {
    final locationService = Provider.of<LocationService>(context);
    final tursoService = Provider.of<TursoDbService>(context);
    final bleService = Provider.of<BleMeshService>(context);

    return StreamBuilder<LocationLog>(
      stream: tursoService.onLocationUpdated,
      builder: (context, snapshot) {
        if (snapshot.hasData) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            _onLocationChanged(snapshot.data!);
          });
        }

        final lastLog = snapshot.data ??
            (locationService.currentPosition != null
                ? LocationLog(
                    id: 'temp',
                    latitude: locationService.currentPosition!.latitude,
                    longitude: locationService.currentPosition!.longitude,
                    altitude: locationService.currentPosition!.altitude,
                    accuracy: locationService.currentPosition!.accuracy,
                    speed: locationService.currentSpeed,
                    heading: locationService.currentHeading,
                    timestamp: DateTime.now(),
                    batteryLevel: 94.0,
                    deviceId: 'TargetPhone_Pixel8',
                  )
                : LocationLog(
                    id: 'default',
                    latitude: 37.7749,
                    longitude: -122.4194,
                    altitude: 45.0,
                    accuracy: 3.5,
                    speed: 0.0,
                    heading: 0.0,
                    timestamp: DateTime.now(),
                    batteryLevel: 100.0,
                    deviceId: 'TargetPhone_Pixel8',
                  ));

        final currentCenter = LatLng(lastLog.latitude, lastLog.longitude);

        return Scaffold(
          body: Stack(
            children: [
              // Custom Open-Source Offline Tile Map Engine
              FlutterMap(
                mapController: _mapController,
                options: MapOptions(
                  initialCenter: currentCenter,
                  initialZoom: 16.0,
                  maxZoom: 19.0,
                  minZoom: 3.0,
                  onPositionChanged: (position, hasGesture) {
                    if (hasGesture && _followTarget) {
                      setState(() => _followTarget = false);
                    }
                  },
                ),
                children: [
                  // Tile Layer (API Keyless)
                  TileLayer(
                    urlTemplate: _tileProviders[_selectedTileStyle]['url']!,
                    userAgentPackageName: 'com.devicelocator.app',
                    tileBuilder: (context, tileWidget, tile) {
                      return AnimatedOpacity(
                        opacity: 1.0,
                        duration: const Duration(milliseconds: 300),
                        child: tileWidget,
                      );
                    },
                  ),

                  // Route Polylines
                  PolylineLayer(
                    polylines: [
                      Polyline(
                        points: _routePoints,
                        strokeWidth: 4.5,
                        color: AppTheme.neonCyan,
                        gradientColors: [
                          AppTheme.neonCyan,
                          AppTheme.electricPurple,
                        ],
                      ),
                    ],
                  ),

                  // Accuracy Radius Circle
                  CircleLayer(
                    circles: [
                      CircleMarker(
                        point: currentCenter,
                        radius: lastLog.accuracy * 1.5,
                        useRadiusInMeter: true,
                        color: AppTheme.neonCyan.withOpacity(0.18),
                        borderColor: AppTheme.neonCyan,
                        borderStrokeWidth: 1.5,
                      ),
                    ],
                  ),

                  // Target Marker with Radar Pulse
                  MarkerLayer(
                    markers: [
                      Marker(
                        point: currentCenter,
                        width: 70,
                        height: 70,
                        child: _buildRadarPulseMarker(lastLog),
                      ),
                    ],
                  ),
                ],
              ),

              // Header HUD Card with Mode Selectors
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: AppTheme.glassDecoration(),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppTheme.neonCyan.withOpacity(0.2),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                locationService.isTracking
                                    ? Icons.radar_rounded
                                    : Icons.location_disabled_rounded,
                                color: AppTheme.neonCyan,
                                size: 22,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    lastLog.deviceId,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Row(
                                    children: [
                                      Container(
                                        width: 8,
                                        height: 8,
                                        decoration: BoxDecoration(
                                          color: tursoService.isCloudConnected
                                              ? AppTheme.emeraldGreen
                                              : AppTheme.warningAmber,
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        tursoService.isCloudConnected
                                            ? 'Turso Edge DB Live'
                                            : 'Turso Offline Edge Cache (${tursoService.pendingSyncCount})',
                                        style: TextStyle(
                                          color: Colors.white.withOpacity(0.7),
                                          fontSize: 11,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.layers_rounded, color: Colors.white),
                              onPressed: () {
                                setState(() {
                                  _selectedTileStyle = (_selectedTileStyle + 1) % _tileProviders.length;
                                });
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Map Style: ${_tileProviders[_selectedTileStyle]['name']}'),
                                    duration: const Duration(seconds: 1),
                                  ),
                                );
                              },
                            ),
                          ],
                        ),
                      ),

                      // Connectivity Pills
                      const SizedBox(height: 10),
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _buildModeChip(
                              label: 'Online IP',
                              icon: Icons.wifi_rounded,
                              mode: ConnectivityMode.online,
                              currentMode: locationService.currentMode,
                              onTap: () => locationService.setConnectivityMode(ConnectivityMode.online),
                            ),
                            const SizedBox(width: 8),
                            _buildModeChip(
                              label: 'BLE Mesh (${bleService.activePeers.length})',
                              icon: Icons.bluetooth_audio_rounded,
                              mode: ConnectivityMode.bleMeshRelay,
                              currentMode: locationService.currentMode,
                              onTap: () {
                                locationService.setConnectivityMode(ConnectivityMode.bleMeshRelay);
                                bleService.startMeshService();
                              },
                            ),
                            const SizedBox(width: 8),
                            _buildModeChip(
                              label: 'SMS Stream',
                              icon: Icons.sms_rounded,
                              mode: ConnectivityMode.smsStream,
                              currentMode: locationService.currentMode,
                              onTap: () => locationService.setConnectivityMode(ConnectivityMode.smsStream),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Bottom Telemetry HUD Card
              Positioned(
                bottom: 24,
                left: 16,
                right: 16,
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        FloatingActionButton.small(
                          heroTag: 'recenter_map_btn',
                          backgroundColor: AppTheme.darkCardBackground,
                          child: Icon(
                            _followTarget ? Icons.my_location : Icons.location_searching,
                            color: AppTheme.neonCyan,
                          ),
                          onPressed: () {
                            setState(() => _followTarget = true);
                            _mapController.move(currentCenter, 16.5);
                          },
                        ),
                        const SizedBox(width: 10),
                        FloatingActionButton.small(
                          heroTag: 'tracking_map_toggle_btn',
                          backgroundColor: locationService.isTracking
                              ? AppTheme.neonCyan
                              : AppTheme.darkCardBackground,
                          child: Icon(
                            locationService.isTracking ? Icons.pause : Icons.play_arrow,
                            color: locationService.isTracking ? Colors.black : Colors.white,
                          ),
                          onPressed: () {
                            if (locationService.isTracking) {
                              locationService.stopTracking();
                            } else {
                              locationService.startTracking();
                            }
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Telemetry Overlay Card
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: AppTheme.glassDecoration(
                        borderColor: AppTheme.neonCyan.withOpacity(0.4),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildTelemetryMetric(
                            icon: Icons.speed_rounded,
                            value: lastLog.speed.toStringAsFixed(1),
                            unit: 'km/h',
                            label: 'Speed',
                            color: AppTheme.neonCyan,
                          ),
                          _buildDivider(),
                          _buildTelemetryMetric(
                            icon: Icons.height_rounded,
                            value: lastLog.altitude.toInt().toString(),
                            unit: 'm',
                            label: 'Altitude',
                            color: AppTheme.electricPurple,
                          ),
                          _buildDivider(),
                          _buildTelemetryMetric(
                            icon: Icons.gps_fixed_rounded,
                            value: '±${lastLog.accuracy.toStringAsFixed(1)}',
                            unit: 'm',
                            label: 'Accuracy',
                            color: AppTheme.emeraldGreen,
                          ),
                          _buildDivider(),
                          _buildTelemetryMetric(
                            icon: Icons.battery_charging_full_rounded,
                            value: lastLog.batteryLevel.toInt().toString(),
                            unit: '%',
                            label: 'Battery',
                            color: AppTheme.warningAmber,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildRadarPulseMarker(LocationLog log) {
    final modeColor = log.connectionMode == ConnectivityMode.online
        ? AppTheme.neonCyan
        : log.connectionMode == ConnectivityMode.bleMeshRelay
            ? AppTheme.electricPurple
            : AppTheme.warningAmber;

    return Stack(
      alignment: Alignment.center,
      children: [
        Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: modeColor.withOpacity(0.25),
            border: Border.all(color: modeColor.withOpacity(0.6), width: 1.5),
          ),
        ),
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: modeColor,
            boxShadow: [
              BoxShadow(color: modeColor.withOpacity(0.8), blurRadius: 12),
            ],
          ),
          child: Transform.rotate(
            angle: log.heading * (3.141592653589793 / 180),
            child: const Icon(
              Icons.navigation_rounded,
              color: Colors.black,
              size: 20,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildModeChip({
    required String label,
    required IconData icon,
    required ConnectivityMode mode,
    required ConnectivityMode currentMode,
    required VoidCallback onTap,
  }) {
    final isSelected = mode == currentMode;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.neonCyan.withOpacity(0.25) : AppTheme.darkCardBackground.withOpacity(0.8),
          borderRadius: BorderRadius.circular(30),
          border: Border.all(
            color: isSelected ? AppTheme.neonCyan : Colors.white.withOpacity(0.15),
            width: 1.2,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, size: 15, color: isSelected ? AppTheme.neonCyan : Colors.white70),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : Colors.white70,
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTelemetryMetric({
    required IconData icon,
    required String value,
    required String unit,
    required String label,
    required Color color,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(height: 4),
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(
              value,
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.extrabold,
                fontSize: 18,
                shadows: [
                  Shadow(color: color.withOpacity(0.5), blurRadius: 8),
                ],
              ),
            ),
            const SizedBox(width: 2),
            Text(
              unit,
              style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 10),
            ),
          ],
        ),
        Text(
          label,
          style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 10),
        ),
      ],
    );
  }

  Widget _buildDivider() {
    return Container(
      height: 32,
      width: 1,
      color: Colors.white.withOpacity(0.1),
    );
  }
}
