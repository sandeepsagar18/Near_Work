import 'dart:async';
import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../../services/location_service.dart';
import '../../services/routing_service.dart';
import '../theme/app_theme.dart';

class DirectionsScreen extends StatefulWidget {
  final Function(int)? onNavigateToMap;

  const DirectionsScreen({Key? key, this.onNavigateToMap}) : super(key: key);

  @override
  State<DirectionsScreen> createState() => _DirectionsScreenState();
}

class _DirectionsScreenState extends State<DirectionsScreen> {
  final TextEditingController _sourceController = TextEditingController(text: 'My Current Location (Real GPS)');
  final TextEditingController _destController = TextEditingController();
  
  Timer? _debounce;
  List<SearchPlace> _autoSuggestions = [];
  bool _isSearchingSuggestions = false;
  String _selectedRouteType = 'least_traffic';

  final List<Map<String, String>> _popularPlaces = [
    {'name': 'Dental Hospital, Lanka', 'subtitle': 'Medical Landmark'},
    {'name': 'Banaras Hindu University (BHU)', 'subtitle': 'University Campus'},
    {'name': 'Varanasi Junction Railway Station', 'subtitle': 'Transit Hub'},
    {'name': 'Dr Agrahari Homeopathy Clinic', 'subtitle': 'Healthcare'},
    {'name': 'BK Heart Hospital Pvt Ltd', 'subtitle': 'Hospital'},
  ];

  void _onDestinationChanged(String text, LocationService locationService, RoutingService routingService) {
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    
    if (text.trim().length < 2) {
      setState(() {
        _autoSuggestions = [];
        _isSearchingSuggestions = false;
      });
      return;
    }

    setState(() => _isSearchingSuggestions = true);

    _debounce = Timer(const Duration(milliseconds: 300), () async {
      final results = await routingService.searchPlaces(text);
      if (mounted) {
        setState(() {
          _autoSuggestions = results;
          _isSearchingSuggestions = false;
        });
      }
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _sourceController.dispose();
    _destController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final locationService = Provider.of<LocationService>(context);
    final routingService = Provider.of<RoutingService>(context);
    final activeRoute = routingService.currentRoute;

    return Scaffold(
      backgroundColor: AppTheme.obsidianBackground,
      appBar: AppBar(
        backgroundColor: AppTheme.darkCardBackground,
        elevation: 0,
        title: const Row(
          children: [
            Icon(Icons.directions_rounded, color: AppTheme.neonCyan),
            SizedBox(width: 10),
            Text(
              'Route & Directions',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Source & Destination Input Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.darkCardBackground,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.electricPurple.withOpacity(0.3)),
              ),
              child: Column(
                children: [
                  // Source Input
                  Row(
                    children: [
                      const Icon(Icons.my_location_rounded, color: AppTheme.emeraldGreen, size: 22),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _sourceController,
                          readOnly: true,
                          style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                          decoration: const InputDecoration(
                            labelText: 'Source (Start)',
                            labelStyle: TextStyle(color: AppTheme.emeraldGreen, fontSize: 11),
                            border: InputBorder.none,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Divider(color: Colors.white12),

                  // Destination Input with Live Real-time Typing Auto-Suggestions
                  Row(
                    children: [
                      const Icon(Icons.location_on_rounded, color: Colors.redAccent, size: 24),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _destController,
                          style: const TextStyle(color: Colors.white, fontSize: 14),
                          decoration: InputDecoration(
                            hintText: 'Type Destination (e.g. Den, BHU, Rail)...',
                            hintStyle: const TextStyle(color: Colors.white38, fontSize: 13),
                            labelText: 'Destination (Target)',
                            labelStyle: const TextStyle(color: Colors.redAccent, fontSize: 11),
                            border: InputBorder.none,
                            suffixIcon: _isSearchingSuggestions
                                ? const Padding(
                                    padding: EdgeInsets.all(10.0),
                                    child: SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.neonCyan),
                                    ),
                                  )
                                : null,
                          ),
                          onChanged: (val) => _onDestinationChanged(val, locationService, routingService),
                        ),
                      ),
                      if (_destController.text.isNotEmpty)
                        IconButton(
                          icon: const Icon(Icons.clear, color: Colors.white54, size: 18),
                          onPressed: () {
                            _destController.clear();
                            routingService.clearRoute();
                            setState(() => _autoSuggestions = []);
                          },
                        ),
                    ],
                  ),
                ],
              ),
            ),

            // Instant Typing Auto-Suggestions Dropdown List
            if (_autoSuggestions.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  color: AppTheme.darkCardBackground,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.neonCyan.withOpacity(0.5)),
                  boxShadow: const [
                    BoxShadow(color: Colors.black38, blurRadius: 10, offset: Offset(0, 4)),
                  ],
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _autoSuggestions.length.clamp(0, 5),
                  separatorBuilder: (context, index) => const Divider(color: Colors.white12, height: 1),
                  itemBuilder: (context, index) {
                    final place = _autoSuggestions[index];
                    return ListTile(
                      dense: true,
                      leading: const Icon(Icons.search_rounded, color: AppTheme.neonCyan, size: 18),
                      title: Text(
                        place.displayName.split(',')[0],
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      subtitle: Text(
                        place.displayName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white54, fontSize: 11),
                      ),
                      onTap: () {
                        _destController.text = place.displayName.split(',')[0];
                        setState(() => _autoSuggestions = []);
                        _selectDestinationPlace(place, locationService, routingService);
                      },
                    );
                  },
                ),
              ),
            ],

            const SizedBox(height: 16),

            // Route Optimization Options
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedRouteType = 'least_traffic'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                      decoration: BoxDecoration(
                        color: _selectedRouteType == 'least_traffic'
                            ? AppTheme.electricPurple
                            : AppTheme.darkCardBackground,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: _selectedRouteType == 'least_traffic'
                              ? AppTheme.neonCyan
                              : Colors.white12,
                        ),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.traffic_rounded, color: Colors.white, size: 16),
                          SizedBox(width: 6),
                          Text(
                            'Least Traffic',
                            style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedRouteType = 'shortest'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                      decoration: BoxDecoration(
                        color: _selectedRouteType == 'shortest'
                            ? AppTheme.electricPurple
                            : AppTheme.darkCardBackground,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: _selectedRouteType == 'shortest'
                              ? AppTheme.neonCyan
                              : Colors.white12,
                        ),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.bolt_rounded, color: Colors.white, size: 16),
                          SizedBox(width: 6),
                          Text(
                            'Shortest Path',
                            style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Active Route Summary Card
            if (activeRoute != null) ...[
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppTheme.darkCardBackground,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppTheme.neonCyan, width: 1.5),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      activeRoute.destinationName,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.timer_rounded, color: AppTheme.emeraldGreen, size: 20),
                        const SizedBox(width: 6),
                        Text(
                          '${activeRoute.durationMinutes.toInt()} mins',
                          style: const TextStyle(color: AppTheme.emeraldGreen, fontWeight: FontWeight.w800, fontSize: 18),
                        ),
                        const SizedBox(width: 12),
                        const Icon(Icons.route_rounded, color: AppTheme.neonCyan, size: 20),
                        const SizedBox(width: 6),
                        Text(
                          '${activeRoute.distanceKm.toStringAsFixed(1)} km',
                          style: const TextStyle(color: Colors.white70, fontSize: 15, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.electricPurple,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                        onPressed: () {
                          if (widget.onNavigateToMap != null) {
                            widget.onNavigateToMap!(0); // Switch to Live Map screen
                          }
                        },
                        icon: const Icon(Icons.navigation_rounded),
                        label: const Text('Start Live Navigation on Blue Polyline', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Turn-by-turn list
              const Text(
                'Step-by-Step Turn Directions:',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
              ),
              const SizedBox(height: 10),
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: activeRoute.instructions.length,
                itemBuilder: (context, index) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.darkCardBackground,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 14,
                          backgroundColor: AppTheme.electricPurple.withOpacity(0.3),
                          child: Text('${index + 1}', style: const TextStyle(color: AppTheme.neonCyan, fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            activeRoute.instructions[index],
                            style: const TextStyle(color: Colors.white70, fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ] else ...[
              // Popular Destinations
              const Text(
                'Popular Destinations:',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
              ),
              const SizedBox(height: 10),
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _popularPlaces.length,
                itemBuilder: (context, index) {
                  final place = _popularPlaces[index];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    decoration: BoxDecoration(
                      color: AppTheme.darkCardBackground,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: ListTile(
                      leading: const Icon(Icons.place_rounded, color: AppTheme.neonCyan),
                      title: Text(place['name']!, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
                      subtitle: Text(place['subtitle']!, style: const TextStyle(color: Colors.white54, fontSize: 11)),
                      onTap: () {
                        _destController.text = place['name']!;
                        _calculateRouteToQuery(place['name']!, locationService, routingService);
                      },
                    ),
                  );
                },
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _selectDestinationPlace(SearchPlace place, LocationService locationService, RoutingService routingService) async {
    final currentPos = locationService.currentPosition;
    if (currentPos == null) return;
    final startCenter = LatLng(currentPos.latitude, currentPos.longitude);
    final destLatLng = LatLng(place.lat, place.lon);
    await routingService.calculateRoute(startCenter, destLatLng, place.displayName.split(',')[0]);
  }

  void _calculateRouteToQuery(String query, LocationService locationService, RoutingService routingService) async {
    final currentPos = locationService.currentPosition;
    if (currentPos == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Acquiring Real GPS Location... Please try again in a moment.')),
      );
      return;
    }

    final startCenter = LatLng(currentPos.latitude, currentPos.longitude);
    final places = await routingService.searchPlaces(query);

    if (places.isNotEmpty) {
      final destPlace = places.first;
      final destLatLng = LatLng(destPlace.lat, destPlace.lon);
      await routingService.calculateRoute(startCenter, destLatLng, destPlace.displayName.split(',')[0]);
    }
  }
}
