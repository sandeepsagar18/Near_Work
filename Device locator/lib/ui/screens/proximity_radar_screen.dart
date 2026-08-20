import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/ble_mesh_service.dart';
import '../theme/app_theme.dart';

class ProximityRadarScreen extends StatefulWidget {
  const ProximityRadarScreen({Key? key}) : super(key: key);

  @override
  State<ProximityRadarScreen> createState() => _ProximityRadarScreenState();
}

class _ProximityRadarScreenState extends State<ProximityRadarScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bleService = Provider.of<BleMeshService>(context);
    final targetPeer = bleService.activePeers.isNotEmpty ? bleService.activePeers.first : null;
    final distanceMeters = targetPeer?.estimatedDistanceMeters ?? 0.0;
    final rssi = targetPeer?.rssi ?? -90.0;

    // Calculate proximity strength 0-1
    final signalNormalized = ((rssi + 95) / 65).clamp(0.0, 1.0);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'BLE Offline Proximity Radar',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        backgroundColor: AppTheme.darkCardBackground,
        actions: [
          IconButton(
            icon: Icon(
              bleService.isScanning ? Icons.bluetooth_searching : Icons.bluetooth_disabled,
              color: AppTheme.neonCyan,
            ),
            onPressed: () {
              if (bleService.isScanning) {
                bleService.stopMeshService();
              } else {
                bleService.startMeshService();
              }
            },
          )
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            children: [
              // Info Banner
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: AppTheme.glassDecoration(borderColor: AppTheme.electricPurple),
                child: Row(
                  children: [
                    const Icon(Icons.radar_rounded, color: AppTheme.electricPurple),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Locating device locally via Bluetooth RSSI signal without internet/cellular network.',
                        style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),

              const Spacer(),

              // Sonar Radar Canvas View
              Center(
                child: SizedBox(
                  width: 280,
                  height: 280,
                  child: AnimatedBuilder(
                    animation: _pulseController,
                    builder: (context, child) {
                      return CustomPaint(
                        painter: RadarPainter(
                          pulseValue: _pulseController.value,
                          signalStrength: signalNormalized,
                        ),
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.phone_android_rounded,
                                size: 44,
                                color: signalNormalized > 0.6
                                    ? AppTheme.emeraldGreen
                                    : AppTheme.neonCyan,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                distanceMeters > 0
                                    ? '${distanceMeters.toStringAsFixed(1)} m'
                                    : 'Scanning...',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 28,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                '${rssi.toInt()} dBm',
                                style: TextStyle(
                                  color: AppTheme.neonCyan.withOpacity(0.8),
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),

              const Spacer(),

              // Signal Strength Meter
              Container(
                padding: const EdgeInsets.all(20),
                decoration: AppTheme.glassDecoration(),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'BLE Signal Proximity',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                        ),
                        Text(
                          signalNormalized > 0.7
                              ? 'VERY CLOSE (HOT)'
                              : signalNormalized > 0.4
                                  ? 'NEARBY (WARM)'
                                  : 'FAR (COLD)',
                          style: TextStyle(
                            color: signalNormalized > 0.7
                                ? AppTheme.emeraldGreen
                                : signalNormalized > 0.4
                                    ? AppTheme.warningAmber
                                    : AppTheme.alertRed,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    LinearProgressIndicator(
                      value: signalNormalized,
                      minHeight: 10,
                      backgroundColor: Colors.white.withOpacity(0.1),
                      valueColor: AlwaysStoppedAnimation<Color>(
                        signalNormalized > 0.7
                            ? AppTheme.emeraldGreen
                            : signalNormalized > 0.4
                                ? AppTheme.warningAmber
                                : AppTheme.alertRed,
                      ),
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class RadarPainter extends CustomPainter {
  final double pulseValue;
  final double signalStrength;

  RadarPainter({required this.pulseValue, required this.signalStrength});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final maxRadius = size.width / 2;

    final ringPaint = Paint()
      color = AppTheme.neonCyan.withOpacity(0.15)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    // Draw concentric radar rings
    for (int i = 1; i <= 4; i++) {
      canvas.drawCircle(center, (maxRadius / 4) * i, ringPaint);
    }

    // Draw scanning sweep pulse
    final pulsePaint = Paint()
      ..color = AppTheme.neonCyan.withOpacity((1 - pulseValue) * 0.4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.0;

    canvas.drawCircle(center, maxRadius * pulseValue, pulsePaint);

    // Target blip if signal active
    if (signalStrength > 0.1) {
      final angle = DateTime.now().second * 0.5;
      final distanceRadius = maxRadius * (1 - signalStrength).clamp(0.2, 0.85);
      final blipOffset = Offset(
        center.dx + cos(angle) * distanceRadius,
        center.dy + sin(angle) * distanceRadius,
      );

      final blipPaint = Paint()
        ..color = AppTheme.emeraldGreen
        ..style = PaintingStyle.fill;

      canvas.drawCircle(blipOffset, 8, blipPaint);
      canvas.drawCircle(
        blipOffset,
        14,
        Paint()
          ..color = AppTheme.emeraldGreen.withOpacity(0.3)
          ..style = PaintingStyle.fill,
      );
    }
  }

  @override
  bool shouldRepaint(covariant RadarPainter oldDelegate) => true;
}
