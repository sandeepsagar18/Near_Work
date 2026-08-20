let map, marker, accuracyCircle, polyline;
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

function initMap() {
  map = L.map('leaflet-map', { center: [currentLat, currentLng], zoom: 16, zoomControl: false });
  tileLayer = L.tileLayer(tileStyles[0].url, { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);

  const radarIcon = L.divIcon({
    className: 'custom-radar-icon',
    html: `<div style="width:30px;height:30px;background:rgba(0,242,254,0.4);border:2px solid #00f2fe;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px #00f2fe;"><div style="width:10px;height:10px;background:#00f2fe;border-radius:50%;"></div></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });

  marker = L.marker([currentLat, currentLng], { icon: radarIcon }).addTo(map);
  accuracyCircle = L.circle([currentLat, currentLng], { radius: 12, color: '#00f2fe', fillColor: '#00f2fe', fillOpacity: 0.15, weight: 1.5 }).addTo(map);
  polyline = L.polyline([], { color: '#00f2fe', weight: 4, opacity: 0.8 }).addTo(map);

  startMotionEngine();
}

function startMotionEngine() {
  if (simulationInterval) clearInterval(simulationInterval);
  simulationInterval = setInterval(() => {
    if (!isTracking) return;
    angle += 0.05;
    const speedFactor = (currentSpeed / 45) * 0.0003;
    currentLat += Math.cos(angle) * speedFactor + (Math.random() - 0.5) * 0.00005;
    currentLng += Math.sin(angle) * speedFactor + (Math.random() - 0.5) * 0.00005;
    const currentLatLng = [currentLat, currentLng];

    marker.setLatLng(currentLatLng);
    accuracyCircle.setLatLng(currentLatLng);
    pathPoints.push(currentLatLng);
    if (pathPoints.length > 80) pathPoints.shift();
    polyline.setLatLngs(pathPoints);
    map.panTo(currentLatLng, { animate: true, duration: 0.5 });

    updateTelemetryHUD();
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
  logEntry.innerHTML = `<span class="time">${timeStr}</span><span class="text">[Turso ${currentMode}] Log #${logCount}: ${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}</span>`;
  container.insertBefore(logEntry, container.firstChild);
  if (container.children.length > 15) container.removeChild(container.lastChild);
}

function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
  if (mode === 'online') document.getElementById('btn-mode-online').classList.add('active');
  else if (mode === 'bleMeshRelay') document.getElementById('btn-mode-ble').classList.add('active');
  else if (mode === 'smsStream') document.getElementById('btn-mode-sms').classList.add('active');
}

function recenterMap() { map.setView([currentLat, currentLng], 17, { animate: true }); }
function toggleTileStyle() {
  tileStyleIndex = (tileStyleIndex + 1) % tileStyles.length;
  map.removeLayer(tileLayer);
  tileLayer = L.tileLayer(tileStyles[tileStyleIndex].url, { maxZoom: 19 }).addTo(map);
  document.getElementById('style-toggle-btn').innerText = `🗺️ Style: ${tileStyles[tileStyleIndex].name}`;
}

function switchTab(tab) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  event.target.classList.add('active');
  if (tab === 'radar') alert('📡 BLE Sonar Radar View Active: Distance estimated at 3.2m (Signal -42 dBm)');
  else if (tab === 'timeline') alert(`📜 Location History Timeline: Showing ${logCount} recorded positions.`);
  else if (tab === 'turso') alert('💾 Turso Edge DB Manager: Connection Status 100% Healthy (SQLite + libSQL Engine)');
}

window.onload = initMap;
