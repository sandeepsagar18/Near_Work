import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'services/turso_db_service.dart';
import 'services/location_service.dart';
import 'services/ble_mesh_service.dart';
import 'services/sms_beacon_service.dart';
import 'ui/screens/map_screen.dart';
import 'ui/screens/proximity_radar_screen.dart';
import 'ui/screens/history_screen.dart';
import 'ui/screens/beacon_screen.dart';
import 'ui/screens/turso_dashboard_screen.dart';
import 'ui/theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set dark status bar layout
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: AppTheme.darkCardBackground,
    ),
  );

  // Initialize Turso Edge DB
  await TursoDbService.instance.init();

  runApp(const DeviceLocatorApp());
}

class DeviceLocatorApp extends StatelessWidget {
  const DeviceLocatorApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: TursoDbService.instance),
        ChangeNotifierProvider.value(value: LocationService.instance),
        ChangeNotifierProvider.value(value: BleMeshService.instance),
        ChangeNotifierProvider.value(value: SmsBeaconService.instance),
      ],
      child: MaterialApp(
        title: 'Device Locator AI',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        home: const MainNavigationScreen(),
      ),
    );
  }
}

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({Key? key}) : super(key: key);

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    MapScreen(),
    ProximityRadarScreen(),
    HistoryScreen(),
    BeaconScreen(),
    TursoDashboardScreen(),
  ];

  @override
  void initState() {
    super.initState();
    // Auto-start tracking on launch
    WidgetsBinding.instance.addPostFrameCallback((_) {
      LocationService.instance.startTracking();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.map_rounded),
            activeIcon: Icon(Icons.map_rounded, color: AppTheme.neonCyan),
            label: 'Live Map',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.radar_rounded),
            activeIcon: Icon(Icons.radar_rounded, color: AppTheme.neonCyan),
            label: 'Radar',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.history_rounded),
            activeIcon: Icon(Icons.history_rounded, color: AppTheme.neonCyan),
            label: 'Timeline',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.sms_rounded),
            activeIcon: Icon(Icons.sms_rounded, color: AppTheme.neonCyan),
            label: 'SMS Stream',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.storage_rounded),
            activeIcon: Icon(Icons.storage_rounded, color: AppTheme.neonCyan),
            label: 'Turso DB',
          ),
        ],
      ),
    );
  }
}
