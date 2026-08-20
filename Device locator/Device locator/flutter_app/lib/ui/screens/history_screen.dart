import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../models/location_log.dart';
import '../../services/turso_db_service.dart';
import '../theme/app_theme.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({Key? key}) : super(key: key);

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<LocationLog> _historyLogs = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() => _isLoading = true);
    final logs = await TursoDbService.instance.getAllLogs(limit: 150);
    setState(() {
      _historyLogs = logs;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final tursoService = Provider.of<TursoDbService>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Location History Timeline',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        backgroundColor: AppTheme.darkCardBackground,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppTheme.neonCyan),
            onPressed: _loadHistory,
          ),
          IconButton(
            icon: const Icon(Icons.delete_sweep_rounded, color: AppTheme.alertRed),
            onPressed: () async {
              await TursoDbService.instance.clearAll();
              _loadHistory();
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.neonCyan))
          : _historyLogs.isEmpty
              ? _buildEmptyState()
              : Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Container(
                        padding: const EdgeInsets.all(18),
                        decoration: AppTheme.glassDecoration(),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _buildStatItem('Total Logs', '${_historyLogs.length}'),
                            _buildStatItem('Pending Sync', '${tursoService.pendingSyncCount}'),
                            _buildStatItem(
                              'Sync Rate',
                              '${((_historyLogs.where((l) => l.syncStatus == SyncStatus.synced).length / (_historyLogs.isEmpty ? 1 : _historyLogs.length)) * 100).toInt()}%',
                            ),
                          ],
                        ),
                      ),
                    ),
                    Expanded(
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: _historyLogs.length,
                        itemBuilder: (context, index) {
                          final log = _historyLogs[index];
                          final formattedTime = DateFormat('hh:mm:ss a - MMM dd').format(log.timestamp);

                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppTheme.darkCardBackground,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: Colors.white.withOpacity(0.08),
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: _getModeColor(log.connectionMode).withOpacity(0.18),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    _getModeIcon(log.connectionMode),
                                    color: _getModeColor(log.connectionMode),
                                    size: 20,
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '${log.latitude.toStringAsFixed(5)}, ${log.longitude.toStringAsFixed(5)}',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          Text(
                                            formattedTime,
                                            style: TextStyle(
                                              color: Colors.white.withOpacity(0.5),
                                              fontSize: 11,
                                            ),
                                          ),
                                          const SizedBox(width: 10),
                                          Text(
                                            '${log.speed.toStringAsFixed(1)} km/h',
                                            style: const TextStyle(
                                              color: AppTheme.neonCyan,
                                              fontSize: 11,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: log.syncStatus == SyncStatus.synced
                                            ? AppTheme.emeraldGreen.withOpacity(0.2)
                                            : AppTheme.warningAmber.withOpacity(0.2),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Text(
                                        log.syncStatus.name.toUpperCase(),
                                        style: TextStyle(
                                          color: log.syncStatus == SyncStatus.synced
                                              ? AppTheme.emeraldGreen
                                              : AppTheme.warningAmber,
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '±${log.accuracy.toStringAsFixed(1)}m',
                                      style: TextStyle(
                                        color: Colors.white.withOpacity(0.4),
                                        fontSize: 10,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.history_rounded, size: 64, color: Colors.white.withOpacity(0.2)),
          const SizedBox(height: 12),
          Text(
            'No Location History Logs',
            style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 16),
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w800,
            fontSize: 20,
          ),
        ),
        Text(
          label,
          style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 11),
        ),
      ],
    );
  }

  Color _getModeColor(ConnectivityMode mode) {
    switch (mode) {
      case ConnectivityMode.online:
        return AppTheme.neonCyan;
      case ConnectivityMode.bleMeshRelay:
        return AppTheme.electricPurple;
      case ConnectivityMode.smsStream:
        return AppTheme.warningAmber;
      case ConnectivityMode.offlineCache:
        return AppTheme.alertRed;
    }
  }

  IconData _getModeIcon(ConnectivityMode mode) {
    switch (mode) {
      case ConnectivityMode.online:
        return Icons.wifi;
      case ConnectivityMode.bleMeshRelay:
        return Icons.bluetooth;
      case ConnectivityMode.smsStream:
        return Icons.sms;
      case ConnectivityMode.offlineCache:
        return Icons.sd_card;
    }
  }
}
