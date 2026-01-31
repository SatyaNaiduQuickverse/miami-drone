# Miami Police Drone Management System - Architecture Documentation

## Project Overview

A comprehensive drone fleet management system built for Miami Police Department, branded under **Nova Robotics**. The system provides real-time drone tracking, mission planning, camera feeds, and robotic arm control through a modern dark-themed web interface.

**Repository:** https://github.com/SatyaNaiduQuickverse/miami-drone

---

## Tech Stack

### Frontend (Client)
- **Framework:** React 18 with Vite
- **Routing:** React Router DOM
- **Maps:** Leaflet with React-Leaflet
- **3D Graphics:** React Three Fiber, Three.js, @react-three/drei
- **Icons:** Lucide React
- **HTTP Client:** Axios
- **Styling:** Custom CSS with CSS variables (dark theme)

### Backend (Server)
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (jsonwebtoken), bcryptjs for password hashing
- **Middleware:** CORS, cookie-parser

### Gateway
- **Language:** Python
- **Framework:** Flask
- **Purpose:** Drone communication layer, GPS simulation

---

## Directory Structure

```
miami-police/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   │   ├── Header.jsx     # Nova Robotics branded header
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── RoboticArm3D.jsx  # 3D arm visualization
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # Authentication state
│   │   ├── pages/
│   │   │   ├── Login.jsx         # Login page
│   │   │   ├── DroneList.jsx     # Fleet overview
│   │   │   └── DroneDashboard.jsx # Main drone control UI
│   │   ├── services/
│   │   │   ├── api.js            # Axios instance
│   │   │   └── droneService.js   # Drone API calls
│   │   ├── App.jsx
│   │   ├── App.css               # All styles (dark theme)
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
│
├── server/                    # Node.js backend
│   ├── models/
│   │   ├── User.js              # User model (admin, operator roles)
│   │   └── Drone.js             # Drone model with telemetry
│   ├── routes/
│   │   ├── auth.js              # Login/logout/register
│   │   └── drones.js            # Drone CRUD & commands
│   ├── middleware/
│   │   └── auth.js              # JWT verification
│   ├── utils/
│   │   └── seedData.js          # Database seeding script
│   ├── server.js                # Main entry point
│   └── package.json
│
├── gateway/                   # Python gateway
│   ├── app.py                   # Flask application
│   ├── config.py
│   ├── gps_simulator.py         # Simulates drone movement
│   └── requirements.txt
│
├── start.sh                   # Start all services
├── stop.sh                    # Stop all services
├── README.md
└── ARCHITECTURE.md            # This file
```

---

## Database Models

### User Model (`server/models/User.js`)
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: 'admin' | 'operator',
  badge: String
}
```

### Drone Model (`server/models/Drone.js`)
```javascript
{
  droneId: String (unique),      // e.g., "MPD-DRONE-001"
  name: String,                   // e.g., "Eagle One"
  model: String,                  // e.g., "DJI Matrice 300 RTK"
  status: 'online' | 'offline' | 'maintenance' | 'deployed' | 'returning',
  batteryLevel: Number (0-100),
  location: {
    latitude: Number,
    longitude: Number,
    altitude: Number
  },
  homeLocation: {
    latitude: Number,
    longitude: Number,
    altitude: Number
  },
  lastTelemetry: {
    speed: Number,
    satellites: Number
  },
  apiEndpoint: String,
  cameraStreamUrl: String,
  bottomCameraUrl: String
}
```

---

## Key Features Implemented

### 1. Authentication
- JWT-based login system
- Protected routes
- Admin and operator roles
- Credentials stored in HTTP-only cookies

### 2. Fleet Overview (`DroneList.jsx`)
- Grid view of all drones
- Status indicators with color coding
- Battery level display
- Click to access individual drone dashboard

### 3. Drone Dashboard (`DroneDashboard.jsx`)
Main control interface with:

#### Map View
- Satellite and street map modes (Leaflet)
- Real-time drone position tracking
- Follow drone toggle
- Flight path trail (blue polyline)
- All fleet drones visible with status-based colors:
  - **Blue:** Current drone being controlled
  - **Green:** Deployed drones
  - **Purple:** Online/standby
  - **Cyan:** Returning to home
  - **Orange:** Maintenance
  - **Gray:** Offline
- Clickable drone markers with popup info and "Control" button

#### Flight Commands
- Takeoff
- Land
- Return to Launch (RTL)
- Hold/Loiter
- Hover at specific height (1-50m slider)
- Set current position as home

#### Mission Planner
- Click on map to add waypoints
- Configurable altitude and speed per waypoint
- Mission statistics (distance, estimated time)
- Execute mission command
- Planning mode indicator badge

#### Camera Feeds
- Picture-in-picture floating panel
- Front and bottom camera support
- Single or split view modes
- Three sizes: Small, Medium, Large (fullscreen)
- "No Signal" placeholder when camera unavailable

#### Robotic Arm Control
- **3D Visualization** (React Three Fiber):
  - Real-time arm position rendering
  - Proper kinematic chain (parent-child transforms)
  - Color scheme: Slate gray base, orange arms, blue joints, green gripper tips
  - Orbit controls for rotating view
  - Light background with grid
- **Joint Controls:**
  - Base rotation: -180° to 180°
  - Shoulder: 0° to 90°
  - Elbow: 0° to 135°
  - Wrist: -90° to 90°
- **Gripper:** 0% (closed) to 100% (open)
- **Speed control:** 1-100%
- **Presets:** Home, Extended, Pickup, Drop, Stowed
- **Power toggle** with unicode power symbol ⏻

### 4. Real-time Updates
- Polling every 3 seconds for telemetry
- Flight path accumulation (last 100 points)
- Flight path clears when switching drones

---

## API Endpoints

### Auth Routes (`/api/auth`)
- `POST /register` - Create new user
- `POST /login` - Login, returns JWT
- `POST /logout` - Clear auth cookie
- `GET /me` - Get current user

### Drone Routes (`/api/drones`)
- `GET /` - Get all drones
- `GET /:id` - Get single drone
- `POST /` - Create drone (admin)
- `PUT /:id` - Update drone
- `DELETE /:id` - Delete drone (admin)
- `POST /:id/command` - Execute drone command

---

## UI/UX Decisions

### Dark Theme
All CSS uses CSS variables for consistent dark theme:
```css
:root {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --accent: #3b82f6;
  --accent-hover: #2563eb;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --border: #334155;
  --border-light: #475569;
}
```

### Styling Notes
- No focus outlines on buttons (cleaner look)
- Custom scrollbar styling (dark theme)
- Floating panels for mission planner and robotic arm
- Planning mode badge positioned at `top: 80px` to avoid map zoom controls
- Drone popups use dark theme variables for visibility

---

## Seed Data

Run `node server/utils/seedData.js` to populate database with:

### Users
| Email | Password | Role |
|-------|----------|------|
| admin@miamipolice.gov | admin123 | admin |
| operator@miamipolice.gov | operator123 | operator |

### Drones (12 total)
| Name | Status | Model |
|------|--------|-------|
| Eagle One | deployed | DJI Matrice 300 RTK |
| Hawk Two | online | DJI Matrice 300 RTK |
| Falcon Three | maintenance | DJI Mavic 3 Enterprise |
| Raven Four | deployed | Skydio X2 |
| Phoenix Five | deployed | DJI Matrice 300 RTK |
| Osprey Six | online | Autel EVO II Pro |
| Condor Seven | returning | DJI Mavic 3 Enterprise |
| Kestrel Eight | offline | Skydio X2 |
| Harrier Nine | deployed | DJI Matrice 300 RTK |
| Vulture Ten | returning | Autel EVO II Pro |
| Sparrow Eleven | online | DJI Mavic 3 Enterprise |
| Albatross Twelve | maintenance | DJI Matrice 300 RTK |

---

## Running the Application

### Prerequisites
- Node.js 18+
- MongoDB running locally or Atlas connection
- Python 3.10+ (for gateway)

### Environment Variables
Create `.env` in server directory:
```
MONGODB_URI=mongodb://localhost:27017/miami-police
JWT_SECRET=your-secret-key
PORT=5000
```

### Start All Services
```bash
./start.sh
```

### Stop All Services
```bash
./stop.sh
```

### Individual Services
```bash
# Client (port 5173)
cd client && npm run dev

# Server (port 5000)
cd server && npm run dev

# Gateway (port 3003)
cd gateway && source venv/bin/activate && python app.py
```

---

## Known Issues & Future Work

### Completed Fixes
- ✅ Gripper fingers crossing when closed (fixed rotation direction)
- ✅ Power button icon not visible (switched to unicode ⏻)
- ✅ Flight path persisting when switching drones (cleared on drone ID change)
- ✅ Planning badge overlapping zoom controls (moved to top: 80px)
- ✅ White focus outline on buttons (removed with outline: none)
- ✅ Popup text not visible (switched to CSS variables)

### Potential Enhancements
- [ ] WebSocket for real-time updates (replace polling)
- [ ] Video streaming integration for cameras
- [ ] Geofencing and no-fly zones
- [ ] Historical flight data and playback
- [ ] Multi-user collaboration
- [ ] Mobile responsive design
- [ ] Drone-to-drone communication
- [ ] AI-powered object detection overlay

---

## Branding

- **Company:** Nova Robotics
- **Favicon:** Shield emoji 🛡️
- **Header:** "NOVA ROBOTICS" with tagline "ADVANCED DRONE SYSTEMS"
- **Color Accent:** Blue (#3b82f6)

---

*Last updated: January 31, 2026*
