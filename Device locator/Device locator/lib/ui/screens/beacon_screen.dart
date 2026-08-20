import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/sms_beacon_service.dart';
import '../theme/app_theme.dart';

class BeaconScreen extends StatefulWidget {
  const BeaconScreen({Key? key}) : super(key: key);

  @override
  State<BeaconScreen> createState() => _BeaconScreenState();
}

class _BeaconScreenState extends State<BeaconScreen> {
  late TextEditingController _phoneController;

  @override
  void initState() {
    super.initState();
    final smsService = SmsBeaconService.instance;
    _phoneController = TextEditingController(text: smsService.emergencyContactNumber);
  }

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final smsService = Provider.of<SmsBeaconService>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Offline SMS Emergency Stream',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        backgroundColor: AppTheme.darkCardBackground,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            children: [
              // Contact Config Glass Card
              Container(
                padding: const EdgeInsets.all(18),
                decoration: AppTheme.glassDecoration(borderColor: AppTheme.warningAmber),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.emergency_share_rounded, color: AppTheme.warningAmber),
                        const SizedBox(width: 10),
                        const Text(
                          'Cellular SMS Real-Time Stream',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'When internet data is off, the target phone streams location updates directly over background encrypted SMS.',
                      style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _phoneController,
                      style: const TextStyle(color: Colors.white),
                      keyboardType: TextInputType.phone,
                      decoration: InputDecoration(
                        labelText: 'Emergency Contact Phone Number',
                        labelStyle: TextStyle(color: Colors.white.withOpacity(0.6)),
                        prefixIcon: const Icon(Icons.phone_rounded, color: AppTheme.neonCyan),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppTheme.neonCyan),
                        ),
                      ),
                      onChanged: (val) => smsService.setEmergencyContact(val),
                    ),
                    const SizedBox(height: 14),
                    SwitchListTile(
                      activeColor: AppTheme.warningAmber,
                      contentPadding: EdgeInsets.zero,
                      title: const Text(
                        'Enable Automated Background SMS Stream',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
                      ),
                      subtitle: Text(
                        'Sends location packet every 15s when offline',
                        style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 11),
                      ),
                      value: smsService.isAutoSmsStreamEnabled,
                      onChanged: (val) => smsService.toggleAutoSmsStream(val),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Received SMS Beacons Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Real-Time Intercepted SMS Stream',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.warningAmber.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${smsService.receivedBeacons.length} Messages',
                      style: const TextStyle(color: AppTheme.warningAmber, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 10),

              // SMS Stream List
              Expanded(
                child: smsService.receivedBeacons.isEmpty
                    ? Center(
                        child: Text(
                          'No SMS location streams received yet.\nEnable automated background SMS stream above to test.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 13),
                        ),
                      )
                    : ListView.builder(
                        itemCount: smsService.receivedBeacons.length,
                        itemBuilder: (context, index) {
                          final msg = smsService.receivedBeacons[index];
                          return Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppTheme.darkCardBackground,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: Colors.white.withOpacity(0.08)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      msg.sender,
                                      style: const TextStyle(color: AppTheme.warningAmber, fontWeight: FontWeight.bold, fontSize: 13),
                                    ),
                                    Text(
                                      '${msg.timestamp.hour.toString().padLeft(2, '0')}:${msg.timestamp.minute.toString().padLeft(2, '0')}:${msg.timestamp.second.toString().padLeft(2, '0')}',
                                      style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 10),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  'Payload: ${msg.rawBody}',
                                  style: const TextStyle(color: AppTheme.neonCyan, fontFamily: 'monospace', fontSize: 11),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Parsed: Lat ${msg.latitude.toStringAsFixed(5)}, Lng ${msg.longitude.toStringAsFixed(5)} @ ${msg.speed} km/h',
                                  style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 11),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
