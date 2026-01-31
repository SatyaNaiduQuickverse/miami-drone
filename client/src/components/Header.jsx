import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-brand" onClick={() => navigate('/drones')}>
        <img
          src="https://i.postimg.cc/9Fz1GGKm/il-fullxfull-4887351355-h8qg.jpg"
          alt="Miami Police"
          className="header-logo miami-logo"
        />
        <div className="header-title">
          <h1>Miami Police Department</h1>
          <span>Drone Command & Control</span>
        </div>
      </div>

      <div className="header-user">
        <div className="user-info">
          <User size={20} />
          <div>
            <span className="user-name">{user?.name}</span>
            <span className="user-badge">Badge: {user?.badge}</span>
          </div>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
