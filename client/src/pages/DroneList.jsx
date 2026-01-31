import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { droneService } from '../services/droneService';
import {
  Plane,
  Battery,
  MapPin,
  Signal,
  Wifi,
  WifiOff,
  Wrench,
  Navigation,
  RefreshCw,
  Search,
  Filter,
  ChevronRight,
  Circle
} from 'lucide-react';

const DroneList = () => {
  const [drones, setDrones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDrones();
    const interval = setInterval(fetchDrones, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchDrones = async () => {
    try {
      const response = await droneService.getAllDrones();
      setDrones(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      online: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', icon: Wifi, label: 'Online' },
      offline: { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', icon: WifiOff, label: 'Offline' },
      maintenance: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: Wrench, label: 'Maintenance' },
      deployed: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', icon: Navigation, label: 'Deployed' },
      returning: { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', icon: Navigation, label: 'Returning' }
    };
    return configs[status] || configs.offline;
  };

  const getBatteryColor = (level) => {
    if (level > 60) return '#10b981';
    if (level > 30) return '#f59e0b';
    return '#ef4444';
  };

  const filteredDrones = drones.filter(drone => {
    const matchesSearch = drone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         drone.droneId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || drone.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: drones.length,
    online: drones.filter(d => d.status === 'online').length,
    deployed: drones.filter(d => d.status === 'deployed').length,
    offline: drones.filter(d => d.status === 'offline' || d.status === 'maintenance').length
  };

  if (loading) {
    return (
      <div className="fleet-page">
        <Header />
        <div className="loading-state">
          <RefreshCw className="spin" size={40} />
          <p>Loading fleet data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fleet-page">
      <div className="fleet-bg"></div>
      <Header />

      <main className="fleet-content">
        {/* Stats Bar */}
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Fleet</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <Circle size={8} fill="#10b981" stroke="none" />
            <span className="stat-value">{stats.online}</span>
            <span className="stat-label">Online</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <Circle size={8} fill="#3b82f6" stroke="none" />
            <span className="stat-value">{stats.deployed}</span>
            <span className="stat-label">Active Mission</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <Circle size={8} fill="#6b7280" stroke="none" />
            <span className="stat-value">{stats.offline}</span>
            <span className="stat-label">Unavailable</span>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="fleet-toolbar">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search drones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-tabs">
            {['all', 'online', 'deployed', 'offline', 'maintenance'].map(status => (
              <button
                key={status}
                className={`filter-tab ${filterStatus === status ? 'active' : ''}`}
                onClick={() => setFilterStatus(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          <button className="refresh-btn" onClick={fetchDrones}>
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Drone Grid */}
        <div className="drone-grid">
          {filteredDrones.map((drone) => {
            const statusConfig = getStatusConfig(drone.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={drone._id}
                className="drone-card"
                onClick={() => navigate(`/drone/${drone._id}`)}
              >
                <div className="card-glow" style={{ background: statusConfig.color }}></div>

                <div className="card-header">
                  <div className="drone-identity">
                    <div className="drone-icon" style={{ background: statusConfig.bg, color: statusConfig.color }}>
                      <Plane size={20} />
                    </div>
                    <div className="drone-info">
                      <h3>{drone.name}</h3>
                      <span className="drone-id">{drone.droneId}</span>
                    </div>
                  </div>
                  <div className="status-indicator" style={{ background: statusConfig.bg, color: statusConfig.color }}>
                    <StatusIcon size={14} />
                    <span>{statusConfig.label}</span>
                  </div>
                </div>

                <div className="card-body">
                  <div className="metric">
                    <Battery size={16} style={{ color: getBatteryColor(drone.batteryLevel) }} />
                    <div className="metric-bar">
                      <div
                        className="metric-fill"
                        style={{
                          width: `${drone.batteryLevel}%`,
                          background: getBatteryColor(drone.batteryLevel)
                        }}
                      ></div>
                    </div>
                    <span className="metric-value">{drone.batteryLevel}%</span>
                  </div>

                  <div className="metric">
                    <Signal size={16} />
                    <span className="metric-label">Signal</span>
                    <span className="metric-value">{drone.lastTelemetry?.signalStrength || 0}%</span>
                  </div>

                  <div className="metric">
                    <MapPin size={16} />
                    <span className="metric-label">Position</span>
                    <span className="metric-value coords">
                      {drone.location?.latitude?.toFixed(4)}, {drone.location?.longitude?.toFixed(4)}
                    </span>
                  </div>
                </div>

                <div className="card-footer">
                  <span className="model-tag">{drone.model}</span>
                  <ChevronRight size={18} className="arrow" />
                </div>
              </div>
            );
          })}
        </div>

        {filteredDrones.length === 0 && (
          <div className="empty-state">
            <Plane size={48} />
            <h3>No drones found</h3>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default DroneList;
