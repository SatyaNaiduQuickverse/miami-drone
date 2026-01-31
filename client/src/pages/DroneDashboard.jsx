import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import Header from '../components/Header';
import { droneService } from '../services/droneService';
import {
  ArrowLeft, Play, Home, PlaneLanding, RotateCcw, Pause, Video, Battery,
  MapPin, Navigation, Satellite, Gauge, RefreshCw, Trash2, Target,
  Crosshair, Route, Clock, AlertTriangle, CheckCircle, Circle, Settings, Camera,
  Map as MapIcon, X, Plane, Maximize2, Minimize2, ArrowUp, Columns, Square,
  Grip, Hand, RotateCw, Move, Anchor, Power, Zap, ChevronUp, ChevronDown
} from 'lucide-react';
import RoboticArm3D from '../components/RoboticArm3D';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createDroneIcon = () => new L.DivIcon({
  className: 'drone-marker',
  html: `<div class="drone-marker-pulse"></div><div class="drone-marker-dot"></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

// Icons for other drones based on status
const createOtherDroneIcon = (status) => {
  const statusColors = {
    deployed: { bg: '#10b981', pulse: 'rgba(16, 185, 129, 0.4)' },    // Green - flying/deployed
    online: { bg: '#8b5cf6', pulse: 'rgba(139, 92, 246, 0.4)' },      // Purple - online/standby
    returning: { bg: '#06b6d4', pulse: 'rgba(6, 182, 212, 0.4)' },    // Cyan - returning home
    maintenance: { bg: '#f59e0b', pulse: 'rgba(245, 158, 11, 0.4)' }, // Orange - maintenance
    offline: { bg: '#6b7280', pulse: 'rgba(107, 114, 128, 0.4)' },    // Gray - offline
  };
  const colors = statusColors[status] || statusColors.offline;

  return new L.DivIcon({
    className: 'other-drone-marker',
    html: `<div class="other-drone-pulse" style="background: ${colors.pulse}"></div>
           <div class="other-drone-dot" style="background: ${colors.bg}"></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const createWaypointIcon = (index) => new L.DivIcon({
  className: 'waypoint-marker',
  html: `<div class="waypoint-number">${index + 1}</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const MapController = ({ center, zoom, followDrone, onUserInteraction }) => {
  const map = useMap();
  useMapEvents({
    dragstart: () => onUserInteraction(),
    zoomstart: () => { if (!map._isFollowZoom) onUserInteraction(); }
  });
  useEffect(() => {
    if (followDrone && center) {
      map._isFollowZoom = true;
      map.setView(center, zoom || map.getZoom(), { animate: true });
      setTimeout(() => { map._isFollowZoom = false; }, 100);
    }
  }, [center, followDrone, map, zoom]);
  return null;
};

const MapClickHandler = ({ onMapClick, isPlanning }) => {
  useMapEvents({ click: (e) => { if (isPlanning) onMapClick(e.latlng); } });
  return null;
};

const DroneDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const mapRef = useRef(null);

  const [drone, setDrone] = useState(null);
  const [allDrones, setAllDrones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('controls');

  const [mapType, setMapType] = useState('satellite');
  const [followDrone, setFollowDrone] = useState(true);
  const [flightPath, setFlightPath] = useState([]);

  const [isPlanning, setIsPlanning] = useState(false);
  const [waypoints, setWaypoints] = useState([]);
  const [selectedWaypoint, setSelectedWaypoint] = useState(null);
  const [missionSettings, setMissionSettings] = useState({ altitude: 30, speed: 5, returnHome: true });

  // Camera state
  const [activeCamera, setActiveCamera] = useState('front');
  const [cameraSize, setCameraSize] = useState('normal'); // 'normal', 'large', 'fullscreen'
  const [cameraViewMode, setCameraViewMode] = useState('single'); // 'single', 'split'
  const [cameras, setCameras] = useState({
    front: { connected: false, url: '' },
    bottom: { connected: false, url: '' }
  });

  const [hoverAltitude, setHoverAltitude] = useState(10);
  const [commandStatus, setCommandStatus] = useState({ message: 'Ready', type: 'idle' });
  const refreshInterval = useRef(null);

  // Robotic Arm State
  const [armState, setArmState] = useState({
    enabled: false,
    joints: {
      base: 0,      // -180 to 180 degrees (rotation)
      shoulder: 45, // 0 to 90 degrees
      elbow: 90,    // 0 to 135 degrees
      wrist: 0      // -90 to 90 degrees
    },
    gripper: 0,     // 0 (closed) to 100 (fully open)
    speed: 50       // 1 to 100 percent
  });

  useEffect(() => {
    // Clear flight path when switching to a different drone
    setFlightPath([]);
    fetchDroneData();
    refreshInterval.current = setInterval(fetchDroneData, 3000);
    return () => clearInterval(refreshInterval.current);
  }, [id]);

  const fetchDroneData = async () => {
    try {
      // Fetch current drone and all drones in parallel
      const [droneResponse, allDronesResponse] = await Promise.all([
        droneService.getDrone(id),
        droneService.getAllDrones()
      ]);

      setDrone(droneResponse.data);

      // Filter out current drone and set other drones
      const otherDrones = (allDronesResponse.data || []).filter(d => d._id !== id);
      setAllDrones(otherDrones);

      // Only set connected if URL exists AND is not empty AND is a valid URL (not localhost for now)
      const frontUrl = droneResponse.data.cameraStreamUrl;
      const bottomUrl = droneResponse.data.bottomCameraUrl;

      setCameras({
        front: {
          connected: !!(frontUrl && frontUrl.trim() && !frontUrl.includes('localhost')),
          url: frontUrl || ''
        },
        bottom: {
          connected: !!(bottomUrl && bottomUrl.trim() && !bottomUrl.includes('localhost')),
          url: bottomUrl || ''
        }
      });

      if (droneResponse.data.location) {
        setFlightPath(prev => {
          const newPoint = [droneResponse.data.location.latitude, droneResponse.data.location.longitude];
          if (prev.length === 0) return [newPoint];
          const lastPoint = prev[prev.length - 1];
          if (lastPoint[0] !== newPoint[0] || lastPoint[1] !== newPoint[1]) {
            return [...prev.slice(-100), newPoint];
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Failed to fetch drone:', err);
    } finally {
      setLoading(false);
    }
  };

  const executeCommand = async (command, params = {}) => {
    setCommandStatus({ message: `Executing ${command}...`, type: 'pending' });
    try {
      await droneService.executeCommand(id, command, params);
      setCommandStatus({ message: `${command}: Success`, type: 'success' });
      setTimeout(() => setCommandStatus({ message: 'Ready', type: 'idle' }), 3000);
    } catch (err) {
      setCommandStatus({ message: `Error: ${err.message}`, type: 'error' });
    }
  };

  const handleHoverAtHeight = () => executeCommand('hover_at_altitude', { altitude: hoverAltitude });

  // Arm Control Functions
  const updateJoint = (joint, value) => {
    const newJoints = { ...armState.joints, [joint]: value };
    setArmState({ ...armState, joints: newJoints });
    executeCommand('arm_move_joint', { joint, angle: value, speed: armState.speed });
  };

  const updateGripper = (value) => {
    setArmState({ ...armState, gripper: value });
    executeCommand('arm_gripper', { position: value, speed: armState.speed });
  };

  const updateArmSpeed = (value) => {
    setArmState({ ...armState, speed: value });
  };

  const toggleArm = () => {
    const newEnabled = !armState.enabled;
    setArmState({ ...armState, enabled: newEnabled });
    executeCommand(newEnabled ? 'arm_enable' : 'arm_disable', {});
  };

  const armPreset = (preset) => {
    const presets = {
      home: { base: 0, shoulder: 45, elbow: 90, wrist: 0, gripper: 0 },
      extended: { base: 0, shoulder: 20, elbow: 30, wrist: 0, gripper: 50 },
      pickup: { base: 0, shoulder: 60, elbow: 120, wrist: -30, gripper: 100 },
      drop: { base: 0, shoulder: 30, elbow: 60, wrist: 0, gripper: 100 },
      stowed: { base: 0, shoulder: 90, elbow: 135, wrist: 0, gripper: 0 }
    };
    const p = presets[preset];
    if (p) {
      setArmState({ ...armState, joints: { base: p.base, shoulder: p.shoulder, elbow: p.elbow, wrist: p.wrist }, gripper: p.gripper });
      executeCommand('arm_preset', { preset, speed: armState.speed });
    }
  };

  const addWaypoint = (latlng) => {
    setWaypoints([...waypoints, {
      id: Date.now(), lat: latlng.lat, lng: latlng.lng,
      altitude: missionSettings.altitude, speed: missionSettings.speed, action: 'waypoint'
    }]);
  };

  const removeWaypoint = (index) => { setWaypoints(waypoints.filter((_, i) => i !== index)); setSelectedWaypoint(null); };
  const clearWaypoints = () => { setWaypoints([]); setSelectedWaypoint(null); };

  const executeMission = async () => {
    if (waypoints.length === 0) return;
    setCommandStatus({ message: 'Uploading mission...', type: 'pending' });
    const mission = waypoints.map((wp, i) => ({ seq: i, lat: wp.lat, lng: wp.lng, alt: wp.altitude, speed: wp.speed }));
    try {
      await droneService.executeCommand(id, 'execute_mission', { waypoints: mission });
      setCommandStatus({ message: 'Mission started', type: 'success' });
      setIsPlanning(false);
    } catch (err) {
      setCommandStatus({ message: 'Mission upload failed', type: 'error' });
    }
  };

  const calculateMissionStats = () => {
    if (waypoints.length < 2) return { distance: 0, time: 0 };
    let totalDistance = 0;
    for (let i = 1; i < waypoints.length; i++) {
      totalDistance += L.latLng(waypoints[i - 1].lat, waypoints[i - 1].lng).distanceTo(L.latLng(waypoints[i].lat, waypoints[i].lng));
    }
    const avgSpeed = waypoints.reduce((acc, wp) => acc + wp.speed, 0) / waypoints.length;
    return { distance: (totalDistance / 1000).toFixed(2), time: Math.ceil(totalDistance / avgSpeed / 60) };
  };

  const handleMapUserInteraction = () => setFollowDrone(false);

  const cycleCameraSize = () => {
    if (cameraSize === 'normal') setCameraSize('large');
    else if (cameraSize === 'large') setCameraSize('fullscreen');
    else setCameraSize('normal');
  };

  const renderCameraView = (cameraType, showLabel = true) => {
    const cam = cameras[cameraType];
    const isConnected = cam.connected && cam.url;

    return (
      <div className="camera-view-box">
        {isConnected ? (
          <iframe src={cam.url} title={`${cameraType} Camera`} className="camera-iframe" />
        ) : (
          <div className="camera-no-signal">
            <Video size={28} />
            <span>No Signal</span>
            <small>{cameraType === 'front' ? 'Front Camera' : 'Bottom Camera'}</small>
          </div>
        )}
        {showLabel && (
          <div className="camera-view-label">
            <Circle size={6} fill={isConnected ? '#10b981' : '#6b7280'} stroke="none" />
            {cameraType === 'front' ? 'FRONT' : 'BOTTOM'}
          </div>
        )}
      </div>
    );
  };

  if (loading || !drone) {
    return (
      <div className="dashboard-page">
        <Header />
        <div className="loading-state"><RefreshCw className="spin" size={40} /><p>Connecting to drone...</p></div>
      </div>
    );
  }

  const dronePosition = drone.location ? [drone.location.latitude, drone.location.longitude] : [25.7617, -80.1918];
  const missionStats = calculateMissionStats();

  return (
    <div className="dashboard-page">
      <Header />
      <div className="dashboard-layout">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <button className="back-btn" onClick={() => navigate('/drones')}>
            <ArrowLeft size={18} /><span>Back to Fleet</span>
          </button>

          <div className="drone-header-card">
            <div className="drone-avatar">
              <Plane size={24} />
              <span className={`status-dot ${drone.status}`}></span>
            </div>
            <div className="drone-meta">
              <h2>{drone.name}</h2>
              <span>{drone.droneId}</span>
            </div>
          </div>

          <div className="telemetry-grid">
            <div className="telem-item">
              <Battery size={16} className={drone.batteryLevel < 30 ? 'text-red' : 'text-green'} />
              <div className="telem-data">
                <span className="telem-value">{drone.batteryLevel}%</span>
                <span className="telem-label">Battery</span>
              </div>
            </div>
            <div className="telem-item">
              <Navigation size={16} />
              <div className="telem-data">
                <span className="telem-value">{drone.location?.altitude?.toFixed(1) || 0}m</span>
                <span className="telem-label">Altitude</span>
              </div>
            </div>
            <div className="telem-item">
              <Gauge size={16} />
              <div className="telem-data">
                <span className="telem-value">{drone.lastTelemetry?.speed?.toFixed(1) || 0}</span>
                <span className="telem-label">m/s</span>
              </div>
            </div>
            <div className="telem-item">
              <Satellite size={16} />
              <div className="telem-data">
                <span className="telem-value">{drone.lastTelemetry?.satellites || 0}</span>
                <span className="telem-label">Sats</span>
              </div>
            </div>
          </div>

          <div className="sidebar-section-label">Quick Actions</div>

          <div className="controls-panel">
            <div className="control-group">
              <h4>Flight Commands</h4>
              <div className="control-buttons">
                <button className="cmd-btn warning" onClick={() => executeCommand('takeoff_assist')}><Play size={14} /> Takeoff</button>
                <button className="cmd-btn success" onClick={() => executeCommand('land')}><PlaneLanding size={14} /> Land</button>
                <button className="cmd-btn primary" onClick={() => executeCommand('rtl')}><RotateCcw size={14} /> RTL</button>
                <button className="cmd-btn" onClick={() => executeCommand('loiter')}><Pause size={14} /> Hold</button>
              </div>
            </div>

            <div className="control-group">
              <h4>Hover at Height</h4>
              <div className="hover-control">
                <div className="altitude-slider">
                  <input type="range" min="1" max="50" value={hoverAltitude} onChange={(e) => setHoverAltitude(Number(e.target.value))} />
                  <div className="slider-value"><ArrowUp size={14} /><span>{hoverAltitude}m</span></div>
                </div>
                <button className="cmd-btn primary full-width" onClick={handleHoverAtHeight}><Navigation size={14} /> Go to Height</button>
              </div>
            </div>

            <div className="control-group">
              <h4>Home Position</h4>
              <button className="cmd-btn full-width" onClick={() => executeCommand('set_home')}><Home size={14} /> Set Current as Home</button>
            </div>
          </div>

          <div className="sidebar-section-label">Panels</div>
          <div className="panel-toggles">
            <button className={`panel-toggle-btn ${activeTab === 'mission' ? 'active' : ''}`} onClick={() => setActiveTab(activeTab === 'mission' ? 'controls' : 'mission')}>
              <Route size={18} />
              <span>Mission Planner</span>
              {waypoints.length > 0 && <span className="panel-badge">{waypoints.length}</span>}
            </button>
            <button className={`panel-toggle-btn ${activeTab === 'arm' ? 'active' : ''}`} onClick={() => setActiveTab(activeTab === 'arm' ? 'controls' : 'arm')}>
              <Grip size={18} />
              <span>Robotic Arm</span>
              {armState.enabled && <span className="panel-status-dot"></span>}
            </button>
          </div>


          <div className={`command-status ${commandStatus.type}`}>
            {commandStatus.type === 'pending' && <RefreshCw size={12} className="spin" />}
            {commandStatus.type === 'success' && <CheckCircle size={12} />}
            {commandStatus.type === 'error' && <AlertTriangle size={12} />}
            <span>{commandStatus.message}</span>
          </div>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          <div className="map-fullscreen">
            <div className="map-header">
              <div className="section-title"><MapIcon size={16} /><span>Navigation</span></div>
              <div className="map-controls">
                <button className={`map-btn ${mapType === 'satellite' ? 'active' : ''}`} onClick={() => setMapType('satellite')}><Satellite size={12} /> Satellite</button>
                <button className={`map-btn ${mapType === 'street' ? 'active' : ''}`} onClick={() => setMapType('street')}><MapIcon size={12} /> Street</button>
                <div className="map-divider"></div>
                <button className={`map-btn ${followDrone ? 'active' : ''}`} onClick={() => setFollowDrone(!followDrone)}><Crosshair size={12} /> {followDrone ? 'Following' : 'Follow'}</button>
              </div>
            </div>

            <div className="map-wrapper">
              <MapContainer center={dronePosition} zoom={17} ref={mapRef} style={{ height: '100%', width: '100%' }}>
                {mapType === 'satellite' ? (
                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" maxZoom={19} />
                ) : (
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                )}
                <MapController center={dronePosition} zoom={17} followDrone={followDrone} onUserInteraction={handleMapUserInteraction} />
                <MapClickHandler onMapClick={addWaypoint} isPlanning={isPlanning} />
                {flightPath.length > 1 && <Polyline positions={flightPath} color="#3b82f6" weight={3} opacity={0.8} />}
                {waypoints.map((wp, index) => (
                  <Marker key={wp.id} position={[wp.lat, wp.lng]} icon={createWaypointIcon(index)}>
                    <Popup><div className="wp-popup"><strong>Waypoint {index + 1}</strong><p>Alt: {wp.altitude}m · Speed: {wp.speed}m/s</p></div></Popup>
                  </Marker>
                ))}
                {waypoints.length > 1 && <Polyline positions={waypoints.map(wp => [wp.lat, wp.lng])} color="#f59e0b" weight={2} dashArray="10, 10" />}

                {/* Other drones in fleet */}
                {allDrones.map(otherDrone => {
                  if (!otherDrone.location) return null;
                  const pos = [otherDrone.location.latitude, otherDrone.location.longitude];
                  return (
                    <Marker
                      key={otherDrone._id}
                      position={pos}
                      icon={createOtherDroneIcon(otherDrone.status)}
                    >
                      <Popup>
                        <div className="drone-popup other">
                          <div className="popup-header">
                            <strong>{otherDrone.name}</strong>
                            <span className={`status-tag ${otherDrone.status}`}>{otherDrone.status}</span>
                          </div>
                          <div className="popup-id">{otherDrone.droneId}</div>
                          <div className="popup-stats">
                            <div className="popup-stat">
                              <span className="label">Altitude</span>
                              <span className="value">{otherDrone.location?.altitude?.toFixed(1) || 0}m</span>
                            </div>
                            <div className="popup-stat">
                              <span className="label">Battery</span>
                              <span className={`value ${otherDrone.batteryLevel < 30 ? 'low' : ''}`}>{otherDrone.batteryLevel}%</span>
                            </div>
                            <div className="popup-stat">
                              <span className="label">Speed</span>
                              <span className="value">{otherDrone.lastTelemetry?.speed?.toFixed(1) || 0} m/s</span>
                            </div>
                            <div className="popup-stat">
                              <span className="label">Satellites</span>
                              <span className="value">{otherDrone.lastTelemetry?.satellites || 0}</span>
                            </div>
                          </div>
                          <div className="popup-coords">
                            {otherDrone.location.latitude.toFixed(5)}, {otherDrone.location.longitude.toFixed(5)}
                          </div>
                          <button className="popup-view-btn" onClick={() => navigate(`/drone/${otherDrone._id}`)}>
                            Control
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                {/* Current drone (highlighted) */}
                <Marker position={dronePosition} icon={createDroneIcon()}>
                  <Popup><div className="drone-popup"><strong>{drone.name}</strong><p>Alt: {drone.location?.altitude?.toFixed(1)}m</p><p>Battery: {drone.batteryLevel}%</p></div></Popup>
                </Marker>
              </MapContainer>

              {/* Floating Camera */}
              <div className={`camera-pip size-${cameraSize}`}>
                <div className="pip-header">
                  <div className="pip-title">
                    <Camera size={14} />
                    <span>Camera Feed</span>
                  </div>
                  <div className="pip-controls">
                    {/* Camera View Mode Slider */}
                    <div className="pip-slider-control">
                      <button
                        className={`pip-slider-option ${cameraViewMode === 'single' ? 'active' : ''}`}
                        onClick={() => setCameraViewMode('single')}
                      >
                        Single
                      </button>
                      <button
                        className={`pip-slider-option ${cameraViewMode === 'split' ? 'active' : ''}`}
                        onClick={() => setCameraViewMode('split')}
                      >
                        Both
                      </button>
                    </div>

                    {/* Camera Select Slider (only in single mode) */}
                    {cameraViewMode === 'single' && (
                      <div className="pip-slider-control">
                        <button className={`pip-slider-option ${activeCamera === 'front' ? 'active' : ''}`} onClick={() => setActiveCamera('front')}>Front</button>
                        <button className={`pip-slider-option ${activeCamera === 'bottom' ? 'active' : ''}`} onClick={() => setActiveCamera('bottom')}>Bottom</button>
                      </div>
                    )}

                    {/* Size Selection Slider */}
                    <div className="pip-slider-control size-slider">
                      <button className={`pip-slider-option ${cameraSize === 'normal' ? 'active' : ''}`} onClick={() => setCameraSize('normal')}>S</button>
                      <button className={`pip-slider-option ${cameraSize === 'large' ? 'active' : ''}`} onClick={() => setCameraSize('large')}>M</button>
                      <button className={`pip-slider-option ${cameraSize === 'fullscreen' ? 'active' : ''}`} onClick={() => setCameraSize('fullscreen')}>L</button>
                    </div>
                  </div>
                </div>

                <div className={`pip-content ${cameraViewMode}`}>
                  {cameraViewMode === 'single' ? (
                    renderCameraView(activeCamera, false)
                  ) : (
                    <div className="pip-split">
                      {renderCameraView('front', true)}
                      {renderCameraView('bottom', true)}
                    </div>
                  )}
                </div>
              </div>

              {/* Mission Planner Panel */}
              {activeTab === 'mission' && (
                <div className="floating-panel mission-floating-panel">
                  <div className="floating-panel-header">
                    <div className="floating-panel-title">
                      <Route size={18} />
                      <span>Mission Planner</span>
                    </div>
                    <button className="floating-panel-close" onClick={() => setActiveTab('controls')}>
                      <span>✕</span>
                    </button>
                  </div>
                  <div className="floating-panel-content">
                    <div className="mission-controls-row">
                      <button className={`mission-mode-btn ${isPlanning ? 'active' : ''}`} onClick={() => setIsPlanning(!isPlanning)}>
                        <Target size={16} />
                        <span>{isPlanning ? 'Exit Planning' : 'Start Planning'}</span>
                      </button>
                      {waypoints.length > 0 && (
                        <button className="mission-clear-btn" onClick={clearWaypoints}>
                          <Trash2 size={16} />
                          <span>Clear</span>
                        </button>
                      )}
                    </div>

                    <div className="mission-params">
                      <div className="mission-param">
                        <label><Navigation size={12} /> Altitude</label>
                        <div className="param-input">
                          <input type="number" value={missionSettings.altitude} onChange={(e) => setMissionSettings({ ...missionSettings, altitude: +e.target.value })} min="5" max="120" />
                          <span>m</span>
                        </div>
                      </div>
                      <div className="mission-param">
                        <label><Gauge size={12} /> Speed</label>
                        <div className="param-input">
                          <input type="number" value={missionSettings.speed} onChange={(e) => setMissionSettings({ ...missionSettings, speed: +e.target.value })} min="1" max="15" />
                          <span>m/s</span>
                        </div>
                      </div>
                    </div>

                    {isPlanning && (
                      <div className="mission-hint">
                        <Target size={14} />
                        <span>Click on map to add waypoints</span>
                      </div>
                    )}

                    {waypoints.length > 0 && (
                      <>
                        <div className="mission-stats-bar">
                          <div className="mission-stat">
                            <span className="stat-num">{waypoints.length}</span>
                            <span className="stat-label">Points</span>
                          </div>
                          <div className="mission-stat">
                            <span className="stat-num">{missionStats.distance}</span>
                            <span className="stat-label">km</span>
                          </div>
                          <div className="mission-stat">
                            <span className="stat-num">{missionSettings.speed}</span>
                            <span className="stat-label">m/s</span>
                          </div>
                          <div className="mission-stat">
                            <span className="stat-num">~{missionStats.time}</span>
                            <span className="stat-label">min</span>
                          </div>
                        </div>

                        <div className="waypoint-cards">
                          {waypoints.map((wp, index) => (
                            <div key={wp.id} className={`waypoint-card ${selectedWaypoint === index ? 'selected' : ''}`} onClick={() => setSelectedWaypoint(index)}>
                              <div className="wp-marker">{index + 1}</div>
                              <div className="wp-data">
                                <span className="wp-coord">{wp.lat.toFixed(5)}</span>
                                <span className="wp-coord">{wp.lng.toFixed(5)}</span>
                              </div>
                              <div className="wp-alt">{wp.altitude}m</div>
                              <button className="wp-remove" onClick={(e) => { e.stopPropagation(); removeWaypoint(index); }}>
                                <span>✕</span>
                              </button>
                            </div>
                          ))}
                        </div>

                        <button className="mission-execute-btn" onClick={executeMission}>
                          <Play size={16} />
                          <span>Execute Mission</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Robotic Arm Panel */}
              {activeTab === 'arm' && (
                <div className="floating-panel arm-floating-panel">
                  <div className="floating-panel-header">
                    <div className="floating-panel-title">
                      <Grip size={18} />
                      <span>Robotic Arm Control</span>
                    </div>
                    <div className="arm-header-controls">
                      <button className={`arm-power-toggle ${armState.enabled ? 'active' : ''}`} onClick={toggleArm}>
                        <span className="power-icon">⏻</span>
                      </button>
                    </div>
                    <button className="floating-panel-close" onClick={() => setActiveTab('controls')}>
                      <span>✕</span>
                    </button>
                  </div>

                  <div className="floating-panel-content arm-content">
                    <div className="arm-layout">
                      {/* Left: 3D Arm Visualization */}
                      <div className="arm-visual-section">
                        <RoboticArm3D armState={armState} />

                        {/* Gripper Control */}
                        <div className="gripper-section">
                          <div className="gripper-label">
                            <Hand size={16} />
                            <span>Gripper</span>
                            <span className="gripper-pct">{armState.gripper}%</span>
                          </div>
                          <div className="gripper-slider-track">
                            <span className="grip-label">Closed</span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={armState.gripper}
                              onChange={(e) => updateGripper(Number(e.target.value))}
                              className="gripper-range"
                              disabled={!armState.enabled}
                            />
                            <span className="grip-label">Open</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Controls */}
                      <div className="arm-controls-section">
                        {/* Speed */}
                        <div className="arm-speed-section">
                          <div className="speed-label">
                            <Zap size={12} />
                            <span>Movement Speed</span>
                            <span className="speed-value">{armState.speed}%</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={armState.speed}
                            onChange={(e) => updateArmSpeed(Number(e.target.value))}
                            className="speed-range"
                          />
                        </div>

                        {/* Presets */}
                        <div className="arm-presets-section">
                          <span className="section-label">Quick Positions</span>
                          <div className="preset-buttons">
                            <button className="preset-btn" onClick={() => armPreset('home')}><Home size={14} /> Home</button>
                            <button className="preset-btn" onClick={() => armPreset('extended')}><Move size={14} /> Extend</button>
                            <button className="preset-btn" onClick={() => armPreset('pickup')}><ChevronDown size={14} /> Pickup</button>
                            <button className="preset-btn" onClick={() => armPreset('drop')}><ChevronUp size={14} /> Drop</button>
                            <button className="preset-btn stow" onClick={() => armPreset('stowed')}><Anchor size={14} /> Stow</button>
                          </div>
                        </div>

                        {/* Joint Sliders */}
                        <div className="joints-section">
                          <span className="section-label">Joint Control</span>
                          <div className="joint-controls">
                            <div className="joint-control base">
                              <div className="joint-info">
                                <RotateCw size={14} className="joint-icon" />
                                <span>Base Rotation</span>
                                <span className="joint-val">{armState.joints.base}°</span>
                              </div>
                              <div className="joint-range-row">
                                <span className="range-label">-180°</span>
                                <input type="range" min="-180" max="180" value={armState.joints.base} onChange={(e) => updateJoint('base', Number(e.target.value))} disabled={!armState.enabled} />
                                <span className="range-label">180°</span>
                              </div>
                            </div>
                            <div className="joint-control shoulder">
                              <div className="joint-info">
                                <Navigation size={14} className="joint-icon" />
                                <span>Shoulder</span>
                                <span className="joint-val">{armState.joints.shoulder}°</span>
                              </div>
                              <div className="joint-range-row">
                                <span className="range-label">0°</span>
                                <input type="range" min="0" max="90" value={armState.joints.shoulder} onChange={(e) => updateJoint('shoulder', Number(e.target.value))} disabled={!armState.enabled} />
                                <span className="range-label">90°</span>
                              </div>
                            </div>
                            <div className="joint-control elbow">
                              <div className="joint-info">
                                <Move size={14} className="joint-icon" />
                                <span>Elbow</span>
                                <span className="joint-val">{armState.joints.elbow}°</span>
                              </div>
                              <div className="joint-range-row">
                                <span className="range-label">0°</span>
                                <input type="range" min="0" max="135" value={armState.joints.elbow} onChange={(e) => updateJoint('elbow', Number(e.target.value))} disabled={!armState.enabled} />
                                <span className="range-label">135°</span>
                              </div>
                            </div>
                            <div className="joint-control wrist">
                              <div className="joint-info">
                                <RotateCcw size={14} className="joint-icon" />
                                <span>Wrist</span>
                                <span className="joint-val">{armState.joints.wrist}°</span>
                              </div>
                              <div className="joint-range-row">
                                <span className="range-label">-90°</span>
                                <input type="range" min="-90" max="90" value={armState.joints.wrist} onChange={(e) => updateJoint('wrist', Number(e.target.value))} disabled={!armState.enabled} />
                                <span className="range-label">90°</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Map Overlays */}
              <div className="map-overlay-info">
                <div className="coords-display"><MapPin size={10} /><span>{dronePosition[0].toFixed(5)}, {dronePosition[1].toFixed(5)}</span></div>
              </div>
              {isPlanning && <div className="planning-badge"><Target size={12} /><span>Planning Mode</span></div>}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DroneDashboard;
