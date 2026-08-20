// Device Locator AI - Real-Time Interactive Simulator Logic

let map;
let marker;
let accuracyCircle;
let polyline;
let pathPoints = [];

let isTracking = true;
let currentSpeed = 45;
let currentMode = 'online';
let angle = 0;
let currentLat = 37.7749;
let currentLng = -122.4194;
let tileStyleIndex = 0;
let simulationInterval;
let logCount = 0;

const tileStyles = [
  { name: 'Dark Obsidian', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' },
  { name: 'OpenStreetMap', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
  { name: 'Carto Voyager', url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png' }
];

let tileLayer;

// Initialize Interactive Map Engine
function initMap() {
  map = L.map('leaflet-map', {
    center: [currentLat, currentLng],
    zoom: 16,
    zoomControl: false
  });

  tileLayer = L.tileLayer(tileStyles[0].url, {
    maxZoom: 19,
    attribution: '© OpenStreetMap © CartoDB'
  }).addTo(map);

  // Custom Futuristic Pulsing Radar Marker Icon
  const radarIcon = L.divIcon({
    className: 'custom-radar-icon',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background: rgba(0, 242, 254, 0.4);
        border: 2px solid #00f2fe;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 16px #00f2fe;
        animation: pulse 1.8s infinite;
      ">
        <div style="width: 14px; height: 14px; background: #00f2fe; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });

  marker = L.marker([currentLat, currentLng], { icon: radarIcon }).addTo(map);
  accuracyCircle = L.circle([currentLat, currentLng], {
    radius: 12,
    color: '#00f2fe',
    fillColor: '#00f2fe',
    fillOpacity: 0.15,
    weight: 1.5
  }).addTo(map);

  polyline = L.polyline([], {
    color: '#00f2fe',
    weight: 4,
    opacity: 0.8
  }).addTo(map);

  startMotionEngine();
}

// Real-Time Motion & Telemetry Simulation Engine
function startMotionEngine() {
  if (simulationInterval) clearInterval(simulationInterval);

  simulationInterval = setInterval(() => {
    if (!isTracking) return;

    angle += 0.05;
    const speedFactor = (currentSpeed / 45) * 0.0003;
    currentLat += Math.cos(angle) * speedFactor + (Math.random() - 0.5) * 0.00005;
    currentLng += Math.sin(angle) * speedFactor + (Math.random() - 0.5) * 0.00005;

    const currentLatLng = [currentLat, currentLng];

    // Update Marker & Circle
    marker.setLatLng(currentLatLng);
    accuracyCircle.setLatLng(currentLatLng);

    // Update Polyline Route Path
    pathPoints.push(currentLatLng);
    if (pathPoints.length > 80) pathPoints.shift();
    polyline.setLatLngs(pathPoints);

    // Center map smoothly
    map.panTo(currentLatLng, { animate: true, duration: 0.5 });

    // Update Telemetry HUD
    updateTelemetryHUD();

    // Log to Turso Edge DB Simulation
    logToTursoEdgeDB();
  }, 2000);
}

function updateTelemetryHUD() {
  document.getElementById('hud-speed').innerHTML = `${currentSpeed.toFixed(1)} <small>km/h</small>`;
  const mockAlt = Math.round(120 + Math.sin(angle) * 15);
  document.getElementById('hud-alt').innerHTML = `${mockAlt} <small>m</small>`;
  const mockAcc = (2.0 + Math.random() * 1.5).toFixed(1);
  document.getElementById('hud-acc').innerHTML = `±${mockAcc} <small>m</small>`;
}

function logToTursoEdgeDB() {
  logCount++;
  const container = document.getElementById('edge-log-container');
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];

  const logEntry = document.createElement('div');
  logEntry.className = 'log-item';
  logEntry.innerHTML = `
    <span class="time">${timeStr}</span>
    <span class="text">[Turso ${currentMode}] Log #${logCount}: ${currentLat.toFixed(5)}, ${currentLng.toFixed(5)} (${currentSpeed} km/h)</span>
  `;

  container.insertBefore(logEntry, container.firstChild);
  if (container.children.length > 20) container.removeChild(container.lastChild);
}

function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));

  if (mode === 'online') {
    document.getElementById('btn-mode-online').classList.add('active');
    document.getElementById('mode-badge').innerHTML = '<span class="dot cyan"></span> Mode: Real-Time Online';
  } else if (mode === 'bleMeshRelay') {
    document.getElementById('btn-mode-ble').classList.add('active');
    document.getElementById('mode-badge').innerHTML = '<span class="dot green"></span> Mode: BLE Mesh Relay Active';
  } else if (mode === 'smsStream') {
    document.getElementById('btn-mode-sms').classList.add('active');
    document.getElementById('mode-badge').innerHTML = '<span class="dot green"></span> Mode: SMS Stream Active';
  }
}

function updateSpeed(val) {
  currentSpeed = parseFloat(val);
  document.getElementById('speed-val').innerText = `${currentSpeed} km/h`;
}

function toggleTracking() {
  isTracking = !isTracking;
  const btn = document.getElementById('btn-toggle-tracking');
  btn.innerText = isTracking ? '⏸️ Pause Motion' : '▶️ Resume Motion';
}

function recenterMap() {
  map.setView([currentLat, currentLng], 17, { animate: true });
}

function toggleTileStyle() {
  tileStyleIndex = (tileStyleIndex + 1) % tileStyles.length;
  map.removeLayer(tileLayer);
  tileLayer = L.tileLayer(tileStyles[tileStyleIndex].url, { maxZoom: 19 }).addTo(map);
  document.getElementById('style-toggle-btn').innerText = `🗺️ Style: ${tileStyles[tileStyleIndex].name}`;
}

function triggerTursoSync() {
  alert(`⚡ Turso Edge Cloud Synced! ${logCount} offline records pushed to Turso Cloud DB.`);
}

function switchTab(tab) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  event.target.classList.add('active');
  if (tab === 'radar') {
    alert('📡 BLE Sonar Radar View Active: Distance estimated at 3.2m (Signal -42 dBm)');
  } else if (tab === 'timeline') {
    alert(`📜 Location History Timeline: Showing ${logCount} recorded positions.`);
  } else if (tab === 'turso') {
    alert('💾 Turso Edge DB Manager: Connection Status 100% Healthy (SQLite + libSQL Engine)');
  }
}

window.onload = initMap;
