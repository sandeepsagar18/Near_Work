import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

class RouteResult {
  final List<LatLng> points;
  final double distanceKm;
  final double durationMinutes;
  final List<String> instructions;
  final String destinationName;

  RouteResult({
    required this.points,
    required this.distanceKm,
    required this.durationMinutes,
    required this.instructions,
    required this.destinationName,
  });
}

class SearchPlace {
  final String displayName;
  final double lat;
  final double lon;

  SearchPlace({
    required this.displayName,
    required this.lat,
    required this.lon,
  });
}

class RoutingService extends ChangeNotifier {
  static final RoutingService instance = RoutingService._internal();
  RoutingService._internal();

  bool _isLoading = false;
  RouteResult? _currentRoute;
  List<SearchPlace> _searchResults = [];
  String _errorMessage = '';

  bool get isLoading => _isLoading;
  RouteResult? get currentRoute => _currentRoute;
  List<SearchPlace> get searchResults => _searchResults;
  String get errorMessage => _errorMessage;

  void clearRoute() {
    _currentRoute = null;
    _searchResults = [];
    _errorMessage = '';
    notifyListeners();
  }

  Future<List<SearchPlace>> searchPlaces(String query) async {
    if (query.trim().isEmpty) {
      _searchResults = [];
      notifyListeners();
      return [];
    }

    _isLoading = true;
    notifyListeners();

    try {
      final url = Uri.parse(
          'https://nominatim.openstreetmap.org/search?format=json&q=${Uri.encodeComponent(query)}&countrycodes=in&limit=8');
      final response = await http.get(url, headers: {
        'User-Agent': 'DeviceLocatorApp/1.0',
      });

      if (response.statusCode == 200) {
        final List data = json.decode(response.body);
        _searchResults = data.map((item) {
          return SearchPlace(
            displayName: item['display_name'] ?? 'Unknown Location',
            lat: double.parse(item['lat']),
            lon: double.parse(item['lon']),
          );
        }).toList();
        _errorMessage = '';
      } else {
        _errorMessage = 'Search service error (${response.statusCode})';
      }
    } catch (e) {
      _errorMessage = 'Search error: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return _searchResults;
  }

  Future<RouteResult?> calculateRoute(LatLng start, LatLng destination, String destName) async {
    _isLoading = true;
    _errorMessage = '';
    notifyListeners();

    try {
      final url = Uri.parse(
          'https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&steps=true');

      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final routes = data['routes'] as List;
        if (routes.isNotEmpty) {
          final route = routes[0];
          final geometry = route['geometry'];
          final coordinates = geometry['coordinates'] as List;

          List<LatLng> points = coordinates.map((coord) {
            return LatLng((coord[1] as num).toDouble(), (coord[0] as num).toDouble());
          }).toList();

          double distanceKm = ((route['distance'] as num).toDouble()) / 1000.0;
          double durationMin = ((route['duration'] as num).toDouble()) / 60.0;

          List<String> instructions = [];
          final legs = route['legs'] as List;
          if (legs.isNotEmpty) {
            final steps = legs[0]['steps'] as List;
            for (var step in steps) {
              final maneuver = step['maneuver'];
              final type = maneuver['type'] ?? 'move';
              final modifier = maneuver['modifier'] ?? '';
              final name = step['name'] ?? 'road';
              final dist = (step['distance'] as num).toDouble();

              String instr = 'Drive on $name for ${dist.toInt()}m';
              if (type == 'turn') {
                instr = 'Turn $modifier onto $name in ${dist.toInt()}m';
              } else if (type == 'new name') {
                instr = 'Continue onto $name';
              } else if (type == 'arrive') {
                instr = 'Arrive at destination: $destName';
              }
              instructions.add(instr);
            }
          }

          _currentRoute = RouteResult(
            points: points,
            distanceKm: distanceKm,
            durationMinutes: durationMin,
            instructions: instructions,
            destinationName: destName,
          );
          _errorMessage = '';
          notifyListeners();
          return _currentRoute;
        }
      }
      _errorMessage = 'Could not calculate driving route to destination.';
    } catch (e) {
      _errorMessage = 'Route calculation error: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return null;
  }
}
