import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import DroneList from './pages/DroneList';
import DroneDashboard from './pages/DroneDashboard';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/drones"
            element={
              <ProtectedRoute>
                <DroneList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/drone/:id"
            element={
              <ProtectedRoute>
                <DroneDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/drones" replace />} />
          <Route path="*" element={<Navigate to="/drones" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
