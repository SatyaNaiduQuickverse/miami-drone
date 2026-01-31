import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, AlertCircle, Loader2, Shield } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate('/drones');
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      {/* Background with cop car image */}
      <div className="login-bg">
        <div className="login-bg-image"></div>
        <div className="login-bg-overlay"></div>
        <div className="login-bg-grid"></div>
      </div>

      {/* Floating particles */}
      <div className="particles">
        {[...Array(15)].map((_, i) => (
          <div key={i} className="particle" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${15 + Math.random() * 10}s`
          }}></div>
        ))}
      </div>

      <div className="login-container">
        <div className="login-card">
          {/* Logo Section */}
          <div className="login-header">
            <div className="login-logos">
              <img
                src="https://i.postimg.cc/9Fz1GGKm/il-fullxfull-4887351355-h8qg.jpg"
                alt="Miami Police Department"
                className="login-miami-logo"
              />
            </div>
            <h1>Miami Police Department</h1>
            <p>Drone Command & Control System</p>
          </div>

          {/* Form */}
          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div className="error-alert">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="input-group">
              <label htmlFor="email">Email</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={20} className="spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <div className="login-footer">
            <div className="security-badge">
              <Shield size={14} />
              <span>256-bit Encrypted</span>
            </div>
            <p>Authorized Personnel Only</p>
          </div>

          {/* Powered by Nova Robotics */}
          <div className="login-powered-by">
            <span>Powered by</span>
            <img
              src="https://i.postimg.cc/hPJbJKQn/whitesmalllogo.png"
              alt="Nova Robotics"
              className="login-nova-logo"
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
