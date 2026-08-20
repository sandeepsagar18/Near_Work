import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/turso_db_service.dart';
import '../theme/app_theme.dart';

class TursoDashboardScreen extends StatefulWidget {
  const TursoDashboardScreen({Key? key}) : super(key: key);

  @override
  State<TursoDashboardScreen> createState() => _TursoDashboardScreenState();
}

class _TursoDashboardScreenState extends State<TursoDashboardScreen> {
  late TextEditingController _urlController;
  late TextEditingController _tokenController;

  @override
  void initState() {
    super.initState();
    final tursoService = TursoDbService.instance;
    _urlController = TextEditingController(text: tursoService.tursoUrl);
    _tokenController = TextEditingController(text: '');
  }

  @override
  void dispose() {
    _urlController.dispose();
    _tokenController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tursoService = Provider.of<TursoDbService>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Turso Edge DB Manager',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        backgroundColor: AppTheme.darkCardBackground,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            children: [
              // Connection Status Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: AppTheme.glassDecoration(
                  borderColor: tursoService.isCloudConnected
                      ? AppTheme.emeraldGreen
                      : AppTheme.warningAmber,
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: (tursoService.isCloudConnected
                                    ? AppTheme.emeraldGreen
                                    : AppTheme.warningAmber)
                                .withOpacity(0.2),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            tursoService.isCloudConnected
                                ? Icons.cloud_done_rounded
                                : Icons.cloud_off_rounded,
                            color: tursoService.isCloudConnected
                                ? AppTheme.emeraldGreen
                                : AppTheme.warningAmber,
                            size: 28,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                tursoService.isCloudConnected
                                    ? 'Turso Cloud Synced'
                                    : 'Offline Edge Mode Active',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${tursoService.pendingSyncCount} logs queued locally in SQLite',
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.6),
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        icon: tursoService.isSyncing
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.black,
                                ),
                              )
                            : const Icon(Icons.sync_rounded, size: 18),
                        label: Text(tursoService.isSyncing ? 'Syncing...' : 'Sync to Turso Edge Cloud Now'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.neonCyan,
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: tursoService.isSyncing
                            ? null
                            : () => tursoService.syncToTursoCloud(),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Configuration Form Card
              Container(
                padding: const EdgeInsets.all(18),
                decoration: AppTheme.glassDecoration(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Turso Database Connection Settings',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Enter your Turso Database URL and Auth Token to enable remote edge database sync.',
                      style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 12),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _urlController,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        labelText: 'Turso Database HTTP Endpoint',
                        labelStyle: TextStyle(color: Colors.white.withOpacity(0.6)),
                        prefixIcon: const Icon(Icons.link_rounded, color: AppTheme.neonCyan),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppTheme.neonCyan),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: _tokenController,
                      obscureText: true,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        labelText: 'Auth Token / JWT Key',
                        labelStyle: TextStyle(color: Colors.white.withOpacity(0.6)),
                        prefixIcon: const Icon(Icons.key_rounded, color: AppTheme.neonCyan),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: Colors.white.withOpacity(0.2)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppTheme.neonCyan),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppTheme.neonCyan),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: () {
                          tursoService.configureTurso(
                            url: _urlController.text.trim(),
                            authToken: _tokenController.text.trim(),
                          );
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Turso Credentials Saved!'),
                              backgroundColor: AppTheme.emeraldGreen,
                            ),
                          );
                        },
                        child: const Text('Save Credentials', style: TextStyle(color: AppTheme.neonCyan)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
