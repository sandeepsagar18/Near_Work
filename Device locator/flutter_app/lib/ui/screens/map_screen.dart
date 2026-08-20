import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../../models/location_log.dart';
import '../../services/location_service.dart';
import '../../services/turso_db_service.dart';
import '../../services/ble_mesh_service.dart';
import '../../services/routing_service.dart';
import '../theme/app_theme.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({Key? key}) : super(key: key);

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();
  final TextEditingController _searchController = TextEditingController();
  
  Timer? _searchDebounce;
  List<SearchPlace> _mapAutoSuggestions = [];
  bool _isSearchingSuggestions = false;
  
  bool _followTarget = true;
  int _selectedTileStyle = 0;
  bool _showTrafficOverlay = true;
  bool _isNavigating = false;
  int _currentStepIndex = 0;

  final List<Map<String, String>> _tileProviders = [
    {
      'name': 'Google Live Traffic Map (Full Places & Live Traffic)',
      'url': 'https://mt0.google.com/vt/lyrs=m,traffic&hl=en&x={x}&y={y}&z={z}',
    },
    {
      'name': 'OpenStreetMap Standard HD (Full Names)',
      'url': 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    },
    {
      'name': 'Carto Voyager (Rich Streets & Shops)',
      'url': 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    },
  ];

  void _onSearchQueryChanged(String query, RoutingService routingService) {
    if (_searchDebounce?.isActive ?? false) _searchDebounce!.cancel();

    if (query.trim().length < 2) {
      setState(() {
        _mapAutoSuggestions = [];
        _isSearchingSuggestions = false;
      });
      return;
    }

    setState(() => _isSearchingSuggestions = true);

    _searchDebounce = Timer(const Duration(milliseconds: 300), () async {
      final results = await routingService.searchPlaces(query);
      if (mounted) {
        setState(() {
          _mapAutoSuggestions = results;
          _isSearchingSuggestions = false;
        });
      }
    });
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final locationService = Provider.of<LocationService>(context);
    final tursoService = Provider.of<TursoDbService>(context);
    final routingService = Provider.of<RoutingService>(context);

    return StreamBuilder<LocationLog>(
      stream: tursoService.onLocationUpdated,
      builder: (context, snapshot) {
        final lastLog = snapshot.data ??
            (locationService.currentPosition != null
                ? LocationLog(
                    id: 'real_gps',
                    latitude: locationService.currentPosition!.latitude,
                    longitude: locationService.currentPosition!.longitude,
                    altitude: locationService.currentPosition!.altitude,
                    accuracy: locationService.currentPosition!.accuracy,
                    speed: locationService.currentSpeed,
                    heading: locationService.currentHeading,
                    timestamp: DateTime.now(),
                    batteryLevel: locationService.batteryLevel.toDouble(),
                    deviceId: 'Xiaomi 21091116AI (My Phone)',
                  )
                : null);

        if (lastLog == null) {
          return Scaffold(
            backgroundColor: Colors.white,
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CircularProgressIndicator(color: AppTheme.electricPurple),
                  const SizedBox(height: 16),
                  const Text(
                    'Acquiring Real Phone GPS Location...',
                    style: TextStyle(color: Colors.black87, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    locationService.errorMessage.isNotEmpty
                        ? locationService.errorMessage
                        : 'Please ensure GPS / Location is turned ON on your phone.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.black54, fontSize: 12),
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.electricPurple,
                      foregroundColor: Colors.white,
                    ),
                    onPressed: () {
                      locationService.startTracking();
                    },
                    icon: const Icon(Icons.gps_fixed),
                    label: const Text('Retry Real GPS Search'),
                  ),
                ],
              ),
            ),
          );
        }

        final currentCenter = LatLng(lastLog.latitude, lastLog.longitude);

        if (_followTarget) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            _mapController.move(currentCenter, 17.5);
          });
        }

        final activeRoute = routingService.currentRoute;

        return Scaffold(
          body: Stack(
            children: [
              FlutterMap(
                mapController: _mapController,
                options: MapOptions(
                  initialCenter: currentCenter,
                  initialZoom: 17.5,
                  maxZoom: 19.0,
                  minZoom: 3.0,
                  onPositionChanged: (position, hasGesture) {
                    if (hasGesture && _followTarget) {
                      setState(() => _followTarget = false);
                    }
                  },
                ),
                children: [
                  // Base Layer: Google Live Traffic Map
                  TileLayer(
                    urlTemplate: _showTrafficOverlay && _selectedTileStyle == 0
                        ? 'https://mt0.google.com/vt/lyrs=m,traffic&hl=en&x={x}&y={y}&z={z}'
                        : _tileProviders[_selectedTileStyle]['url']!,
                    userAgentPackageName: 'com.devicelocator.device_locator',
                    maxZoom: 19,
                    maxNativeZoom: 19,
                    retinaMode: false,
                    tileSize: 256,
                    tileBuilder: (context, tileWidget, tile) {
                      return AnimatedOpacity(
                        opacity: 1.0,
                        duration: const Duration(milliseconds: 150),
                        child: tileWidget,
                      );
                    },
                  ),

                  // Electric Blue Polyline Layer Traversing Shortest/Least Traffic Path
                  if (activeRoute != null && activeRoute.points.isNotEmpty)
                    PolylineLayer(
                      polylines: [
                        Polyline(
                          points: activeRoute.points,
                          strokeWidth: 9.0,
                          color: AppTheme.electricPurple.withOpacity(0.4),
                        ),
                        Polyline(
                          points: activeRoute.points,
                          strokeWidth: 5.5,
                          color: AppTheme.neonCyan,
                        ),
                      ],
                    ),

                  // Real GPS Precision Circle
                  CircleLayer(
                    circles: [
                      CircleMarker(
                        point: currentCenter,
                        radius: lastLog.accuracy.clamp(3.0, 30.0),
                        useRadiusInMeter: true,
                        color: AppTheme.electricPurple.withOpacity(0.15),
                        borderColor: AppTheme.electricPurple,
                        borderStrokeWidth: 2.0,
                      ),
                    ],
                  ),

                  // Markers Layer
                  MarkerLayer(
                    markers: [
                      Marker(
                        point: currentCenter,
                        width: 80,
                        height: 80,
                        child: _buildRealtimeCompassMarker(locationService.currentHeading),
                      ),
                      if (activeRoute != null && activeRoute.points.isNotEmpty)
                        Marker(
                          point: activeRoute.points.last,
                          width: 50,
                          height: 50,
                          child: const Icon(
                            Icons.location_on_rounded,
                            color: Colors.redAccent,
                            size: 46,
                          ),
                        ),
                    ],
                  ),
                ],
              ),

              // Top Header Bar & Search Bar
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 10.0),
                  child: Column(
                    children: [
                      // Status Bar
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.95),
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: const [
                            BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 4)),
                          ],
                          border: Border.all(color: AppTheme.electricPurple.withOpacity(0.3)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppTheme.electricPurple.withOpacity(0.15),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.my_location_rounded,
                                color: AppTheme.electricPurple,
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    lastLog.deviceId,
                                    style: const TextStyle(
                                      color: Colors.black87,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                    ),
                                  ),
                                  const SizedBox(height: 1),
                                  Text(
                                    _isNavigating ? '🧭 Navigation Active' : 'Real Phone GPS Live',
                                    style: TextStyle(
                                      color: _isNavigating ? AppTheme.electricPurple : Colors.green.shade800,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            GestureDetector(
                              onTap: () {
                                setState(() {
                                  _showTrafficOverlay = !_showTrafficOverlay;
                                });
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                                decoration: BoxDecoration(
                                  color: _showTrafficOverlay ? AppTheme.emeraldGreen.withOpacity(0.2) : Colors.grey.shade200,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: _showTrafficOverlay ? AppTheme.emeraldGreen : Colors.grey.shade400,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Icon(
                                      Icons.traffic_rounded,
                                      size: 14,
                                      color: _showTrafficOverlay ? Colors.green.shade800 : Colors.grey.shade700,
                                    ),
                                    const SizedBox(width: 3),
                                    Text(
                                      'Traffic',
                                      style: TextStyle(
                                        color: _showTrafficOverlay ? Colors.green.shade900 : Colors.grey.shade700,
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 4),
                            IconButton(
                              icon: const Icon(Icons.layers_rounded, color: Colors.black87, size: 20),
                              onPressed: () {
                                setState(() {
                                  _selectedTileStyle = (_selectedTileStyle + 1) % _tileProviders.length;
                                });
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),

                      // Destination Search Bar Input with Real-time Typing Auto-Suggest
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(25),
                          boxShadow: const [
                            BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 4)),
                          ],
                          border: Border.all(color: AppTheme.electricPurple.withOpacity(0.4)),
                        ),
                        child: TextField(
                          controller: _searchController,
                          style: const TextStyle(color: Colors.black87, fontSize: 14),
                          decoration: InputDecoration(
                            hintText: 'Type Destination (e.g. Den, BHU, Rail)...',
                            hintStyle: const TextStyle(color: Colors.black45, fontSize: 13),
                            prefixIcon: const Icon(Icons.search_rounded, color: AppTheme.electricPurple),
                            suffixIcon: _isSearchingSuggestions
                                ? const Padding(
                                    padding: EdgeInsets.all(12.0),
                                    child: SizedBox(
                                      width: 14,
                                      height: 14,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.electricPurple),
                                    ),
                                  )
                                : (_searchController.text.isNotEmpty
                                    ? IconButton(
                                        icon: const Icon(Icons.clear_rounded, color: Colors.black54),
                                        onPressed: () {
                                          _searchController.clear();
                                          routingService.clearRoute();
                                          setState(() {
                                            _isNavigating = false;
                                            _mapAutoSuggestions = [];
                                          });
                                        },
                                      )
                                    : null),
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          ),
                          onChanged: (val) => _onSearchQueryChanged(val, routingService),
                        ),
                      ),

                      // Instant Live Typing Auto-Suggestions Overlay List
                      if (_mapAutoSuggestions.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.98),
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: const [
                              BoxShadow(color: Colors.black26, blurRadius: 12, offset: Offset(0, 4)),
                            ],
                          ),
                          child: ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: _mapAutoSuggestions.length.clamp(0, 5),
                            separatorBuilder: (context, index) => const Divider(height: 1, color: Colors.black12),
                            itemBuilder: (context, index) {
                              final place = _mapAutoSuggestions[index];
                              return ListTile(
                                dense: true,
                                leading: const Icon(Icons.place_rounded, color: AppTheme.electricPurple, size: 20),
                                title: Text(
                                  place.displayName.split(',')[0],
                                  style: const TextStyle(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                                subtitle: Text(
                                  place.displayName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(color: Colors.black54, fontSize: 11),
                                ),
                                onTap: () async {
                                  _searchController.text = place.displayName.split(',')[0];
                                  setState(() => _mapAutoSuggestions = []);
                                  final destLatLng = LatLng(place.lat, place.lon);
                                  await routingService.calculateRoute(
                                    currentCenter,
                                    destLatLng,
                                    place.displayName.split(',')[0],
                                  );
                                  setState(() {
                                    _isNavigating = true;
                                    _followTarget = true;
                                  });
                                  _mapController.move(currentCenter, 17.5);
                                },
                              );
                            },
                          ),
                        ),
                      ],

                      // Live Turn-by-Turn Instruction Banner
                      if (activeRoute != null && _isNavigating) ...[
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppTheme.electricPurple,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: const [
                              BoxShadow(color: Colors.black26, blurRadius: 8, offset: Offset(0, 4)),
                            ],
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.turn_right_rounded, color: Colors.white, size: 30),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      activeRoute.instructions.isNotEmpty
                                          ? activeRoute.instructions[_currentStepIndex.clamp(0, activeRoute.instructions.length - 1)]
                                          : 'Proceed on blue route line to ${activeRoute.destinationName}',
                                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                                    ),
                                    Text(
                                      'Target: ${activeRoute.destinationName}',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(color: Colors.white70, fontSize: 11),
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.close_rounded, color: Colors.white),
                                onPressed: () {
                                  setState(() => _isNavigating = false);
                                  routingService.clearRoute();
                                },
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              // Bottom Sheet Controls
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
                          backgroundColor: Colors.white,
                          child: Icon(
                            _followTarget ? Icons.my_location : Icons.location_searching,
                            color: AppTheme.electricPurple,
                          ),
                          onPressed: () {
                            setState(() => _followTarget = true);
                            _mapController.move(currentCenter, 17.5);
                          },
                        ),
                        const SizedBox(width: 10),
                        FloatingActionButton.small(
                          heroTag: 'tracking_map_toggle_btn',
                          backgroundColor: locationService.isTracking
                              ? AppTheme.electricPurple
                              : Colors.white,
                          child: Icon(
                            locationService.isTracking ? Icons.pause : Icons.play_arrow,
                            color: locationService.isTracking ? Colors.white : Colors.black87,
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
                    const SizedBox(height: 10),

                    // Navigation Details Card or Telemetry Metric Bar
                    if (activeRoute != null)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.96),
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: const [
                            BoxShadow(color: Colors.black12, blurRadius: 12, offset: Offset(0, 4)),
                          ],
                          border: Border.all(color: AppTheme.neonCyan, width: 2.0),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    activeRoute.destinationName,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(color: Colors.black87, fontWeight: FontWeight.bold, fontSize: 14),
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Text(
                                        '${activeRoute.durationMinutes.toInt()} mins',
                                        style: const TextStyle(color: Colors.green, fontWeight: FontWeight.w800, fontSize: 16),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        '(${activeRoute.distanceKm.toStringAsFixed(1)} km)',
                                        style: const TextStyle(color: Colors.black54, fontSize: 13),
                                      ),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: Colors.blue.shade100,
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: const Text('Least Traffic', style: TextStyle(color: Colors.blue, fontSize: 10, fontWeight: FontWeight.bold)),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: _isNavigating ? Colors.redAccent : AppTheme.electricPurple,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              ),
                              onPressed: () {
                                setState(() {
                                  _isNavigating = !_isNavigating;
                                  if (_isNavigating) {
                                    _followTarget = true;
                                    _mapController.move(currentCenter, 18.0);
                                  }
                                });
                              },
                              icon: Icon(_isNavigating ? Icons.stop_rounded : Icons.navigation_rounded),
                              label: Text(_isNavigating ? 'Stop' : 'Start'),
                            ),
                          ],
                        ),
                      )
                    else
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.95),
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: const [
                            BoxShadow(color: Colors.black12, blurRadius: 12, offset: Offset(0, 4)),
                          ],
                          border: Border.all(color: AppTheme.electricPurple.withOpacity(0.3)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _buildTelemetryMetric(
                              icon: Icons.speed_rounded,
                              value: lastLog.speed.toStringAsFixed(1),
                              unit: 'km/h',
                              label: 'Speed',
                              color: AppTheme.electricPurple,
                            ),
                            _buildDivider(),
                            _buildTelemetryMetric(
                              icon: Icons.height_rounded,
                              value: lastLog.altitude.toStringAsFixed(1),
                              unit: 'm',
                              label: 'Altitude',
                              color: AppTheme.electricPurple,
                            ),
                            _buildDivider(),
                            _buildTelemetryMetric(
                              icon: Icons.compass_calibration_rounded,
                              value: '${locationService.currentHeading.toInt()}°',
                              unit: '',
                              label: 'Heading',
                              color: AppTheme.emeraldGreen,
                            ),
                            _buildDivider(),
                            _buildTelemetryMetric(
                              icon: Icons.battery_charging_full_rounded,
                              value: locationService.batteryLevel.toString(),
                              unit: '%',
                              label: 'Battery',
                              color: AppTheme.emeraldGreen,
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

  Widget _buildRealtimeCompassMarker(double headingDegrees) {
    return Stack(
      alignment: Alignment.center,
      children: [
        Container(
          width: 70,
          height: 70,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppTheme.electricPurple.withOpacity(0.2),
            border: Border.all(color: AppTheme.electricPurple.withOpacity(0.7), width: 1.8),
          ),
        ),
        Transform.rotate(
          angle: headingDegrees * (3.141592653589793 / 180),
          child: Container(
            width: 36,
            height: 36,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: AppTheme.electricPurple,
              boxShadow: [
                BoxShadow(color: AppTheme.electricPurple, blurRadius: 10),
              ],
            ),
            child: const Icon(
              Icons.navigation_rounded,
              color: Colors.white,
              size: 24,
            ),
          ),
        ),
      ],
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
              style: const TextStyle(
                color: Colors.black87,
                fontWeight: FontWeight.w800,
                fontSize: 18,
              ),
            ),
            if (unit.isNotEmpty) ...[
              const SizedBox(width: 2),
              Text(
                unit,
                style: const TextStyle(color: Colors.black54, fontSize: 10),
              ),
            ],
          ],
        ),
        Text(
          label,
          style: const TextStyle(color: Colors.black54, fontSize: 10, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }

  Widget _buildDivider() {
    return Container(
      height: 32,
      width: 1,
      color: Colors.black12,
    );
  }
}
