import 'dart:async';
import 'package:flutter/foundation.dart';

enum TrafficCongestionLevel { freeFlow, moderate, heavy, severeJam }

class TrafficService extends ChangeNotifier {
  static final TrafficService instance = TrafficService._internal();
  TrafficService._internal();

  bool _isTrafficOverlayEnabled = true;
  TrafficCongestionLevel _currentLocalCongestion = TrafficCongestionLevel.freeFlow;
  Timer? _trafficRefreshTimer;

  bool get isTrafficOverlayEnabled => _isTrafficOverlayEnabled;
  TrafficCongestionLevel get currentLocalCongestion => _currentLocalCongestion;

  void toggleTrafficOverlay() {
    _isTrafficOverlayEnabled = !_isTrafficOverlayEnabled;
    notifyListeners();
  }

  void setTrafficOverlay(bool enabled) {
    _isTrafficOverlayEnabled = enabled;
    notifyListeners();
  }

  // TomTom & HERE real-time traffic flow tile URLs
  String getTrafficTileUrl(int z, int x, int y) {
    return 'https://api.tomtom.com/traffic/map/4/tile/flow/relative0/$z/$x/$y.png?key=g3jQ25hFA37uS9dG5A1xZ9XQ4z';
  }

  String getCongestionLabel(TrafficCongestionLevel level) {
    switch (level) {
      case TrafficCongestionLevel.freeFlow:
        return 'Clear Traffic (Free Flow)';
      case TrafficCongestionLevel.moderate:
        return 'Moderate Congestion';
      case TrafficCongestionLevel.heavy:
        return 'Heavy Traffic';
      case TrafficCongestionLevel.severeJam:
        return 'Severe Traffic Jam';
    }
  }
}
