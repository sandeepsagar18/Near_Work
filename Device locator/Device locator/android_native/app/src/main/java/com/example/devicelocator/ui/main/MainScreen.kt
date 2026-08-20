package com.example.devicelocator.ui.main

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

val ObsidianBackground = Color(0xFF0A0E17)
val DarkCardBackground = Color(0xFF111827)
val NeonCyan = Color(0xFF00F2FE)
val ElectricPurple = Color(0xFF4FACFE)
val EmeraldGreen = Color(0xFF00E676)
val WarningAmber = Color(0xFFFFD600)
val TextMuted = Color(0xFF9CA3AF)

enum class ConnectivityMode { ONLINE, BLE_MESH, SMS_STREAM }

data class EdgeLogItem(val time: String, val text: String)

@Composable
fun MainScreen(modifier: Modifier = Modifier) {
    var selectedTab by remember { mutableStateOf(0) }
    var selectedMode by remember { mutableStateOf(ConnectivityMode.ONLINE) }
    var speed by remember { mutableStateOf(45.2f) }
    var isTracking by remember { mutableStateOf(true) }
    
    val logs = remember {
        mutableStateListOf(
            EdgeLogItem("14:40:00", "[Turso Engine] SQLite edge cache active."),
            EdgeLogItem("14:39:58", "[GPS Engine] High accuracy signal locked (±2.5m).")
        )
    }

    // Motion Simulation Coroutine
    LaunchedEffect(isTracking) {
        while (isTracking) {
            delay(2000)
            speed = (35f + (Math.random() * 25).toFloat())
            val time = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
            logs.add(0, EdgeLogItem(time, "[Turso ${selectedMode.name}] Log #${logs.size + 1}: Speed ${String.format("%.1f", speed)} km/h"))
            if (logs.size > 20) logs.removeLast()
        }
    }

    Scaffold(
        containerColor = ObsidianBackground,
        bottomBar = {
            NavigationBar(containerColor = DarkCardBackground, contentColor = NeonCyan) {
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    icon = { Icon(Icons.Default.Map, contentDescription = "Map") },
                    label = { Text("Map", fontSize = 11.sp) }
                )
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    icon = { Icon(Icons.Default.Radar, contentDescription = "Radar") },
                    label = { Text("BLE Radar", fontSize = 11.sp) }
                )
                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    icon = { Icon(Icons.Default.History, contentDescription = "Timeline") },
                    label = { Text("Timeline", fontSize = 11.sp) }
                )
                NavigationBarItem(
                    selected = selectedTab == 3,
                    onClick = { selectedTab = 3 },
                    icon = { Icon(Icons.Default.Storage, contentDescription = "Turso DB") },
                    label = { Text("Turso DB", fontSize = 11.sp) }
                )
            }
        }
    ) { innerPadding ->
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(ObsidianBackground)
        ) {
            // Header Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(DarkCardBackground)
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(NeonCyan)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Device Locator AI", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Pure Native", color = NeonCyan, fontSize = 11.sp)
                }
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(NeonCyan.copy(alpha = 0.15f))
                        .border(1.dp, NeonCyan.copy(alpha = 0.4f), RoundedCornerShape(20.dp))
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text("Turso Edge DB", color = Color.White, fontSize = 11.sp)
                }
            }

            // Central View Container
            when (selectedTab) {
                0 -> NativeMapView(speed = speed, currentMode = selectedMode, onModeSelect = { selectedMode = it }, logs = logs)
                1 -> NativeRadarView()
                2 -> NativeTimelineView(logs = logs)
                3 -> NativeTursoDbView(logsCount = logs.size)
            }
        }
    }
}

@Composable
fun NativeMapView(
    speed: Float,
    currentMode: ConnectivityMode,
    onModeSelect: (ConnectivityMode) -> Unit,
    logs: List<EdgeLogItem>
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Native Map Canvas Mock Card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            colors = CardDefaults.cardColors(containerColor = DarkCardBackground),
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, NeonCyan.copy(alpha = 0.3f))
        ) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.Navigation, contentDescription = "Marker", tint = NeonCyan, modifier = Modifier.size(48.dp))
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Live Pure Native GPS Engine", color = Color.White, fontWeight = FontWeight.Bold)
                    Text("San Francisco, CA • 37.7749° N, 122.4194° W", color = TextMuted, fontSize = 12.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Telemetry HUD Grid
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            MetricCard("Speed", String.format("%.1f km/h", speed), NeonCyan, modifier = Modifier.weight(1f))
            MetricCard("Altitude", "128 m", ElectricPurple, modifier = Modifier.weight(1f))
            MetricCard("Accuracy", "±2.5 m", EmeraldGreen, modifier = Modifier.weight(1f))
            MetricCard("Battery", "94%", WarningAmber, modifier = Modifier.weight(1f))
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Options Mode Selector Buttons
        Text("CONNECTIVITY MODE OPTIONS", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(6.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            ConnectivityModeButton("🌐 Online IP", ConnectivityMode.ONLINE, currentMode, modifier = Modifier.weight(1f)) { onModeSelect(ConnectivityMode.ONLINE) }
            ConnectivityModeButton("📡 BLE Mesh", ConnectivityMode.BLE_MESH, currentMode, modifier = Modifier.weight(1f)) { onModeSelect(ConnectivityMode.BLE_MESH) }
            ConnectivityModeButton("💬 SMS Stream", ConnectivityMode.SMS_STREAM, currentMode, modifier = Modifier.weight(1f)) { onModeSelect(ConnectivityMode.SMS_STREAM) }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Real-Time Turso Edge DB Log Container
        Text("REAL-TIME TURSO EDGE DB LOGS", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(4.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(90.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(Color.Black.copy(alpha = 0.5f))
                .padding(8.dp)
        ) {
            LazyColumn {
                items(logs) { log ->
                    Row {
                        Text(log.time, color = TextMuted, fontSize = 10.sp)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(log.text, color = EmeraldGreen, fontSize = 10.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun MetricCard(label: String, value: String, accentColor: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = DarkCardBackground),
        shape = RoundedCornerShape(10.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.1f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(label, color = TextMuted, fontSize = 10.sp)
            Spacer(modifier = Modifier.height(2.dp))
            Text(value, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
        }
    }
}

@Composable
fun ConnectivityModeButton(
    label: String,
    mode: ConnectivityMode,
    currentMode: ConnectivityMode,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val isSelected = mode == currentMode
    val bgColor by animateColorAsState(if (isSelected) NeonCyan.copy(alpha = 0.25f) else Color.White.copy(alpha = 0.05f))
    val borderColor by animateColorAsState(if (isSelected) NeonCyan else Color.White.copy(alpha = 0.15f))

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(bgColor)
            .border(1.dp, borderColor, RoundedCornerShape(10.dp))
            .clickable { onClick() }
            .padding(vertical = 10.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(label, color = if (isSelected) NeonCyan else Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun NativeRadarView() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.Radar, contentDescription = "Radar", tint = NeonCyan, modifier = Modifier.size(72.dp))
            Spacer(modifier = Modifier.height(16.dp))
            Text("BLE Sonar Radar Active", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Text("Proximity: 3.2 meters • RSSI: -42 dBm", color = TextMuted, fontSize = 14.sp)
        }
    }
}

@Composable
fun NativeTimelineView(logs: List<EdgeLogItem>) {
    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        items(logs) { log ->
            Card(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                colors = CardDefaults.cardColors(containerColor = DarkCardBackground)
            ) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.History, contentDescription = null, tint = NeonCyan)
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(log.text, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Text(log.time, color = TextMuted, fontSize = 11.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun NativeTursoDbView(logsCount: Int) {
    Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.Storage, contentDescription = "Turso", tint = EmeraldGreen, modifier = Modifier.size(64.dp))
            Spacer(modifier = Modifier.height(16.dp))
            Text("Turso Edge Database Manager", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Text("Logged Records: $logsCount • Sync Status: 100% Healthy", color = TextMuted, fontSize = 14.sp)
        }
    }
}
