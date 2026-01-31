#!/usr/bin/env python3
"""
Miami Police Drone System - API Gateway
Handles communication between the frontend and physical drones
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timezone, timedelta
from collections import deque
from threading import Lock
import requests
import os

from config import Config

app = Flask(__name__)
CORS(app)

# Configuration
DRONE_API = Config.DRONE_API_URL
HISTORY_FILE = Config.HISTORY_FILE

# Timezone (EST for Miami)
EST = timezone(timedelta(hours=-5))

# GPS data storage (in memory)
gps_history = deque(maxlen=Config.GPS_HISTORY_SIZE)
current_gps = None

# Thread-safe lock for file writing
history_lock = Lock()


def log_action(ip_address, action, response):
    """Log action to history file with timestamp"""
    try:
        with history_lock:
            timestamp = datetime.now(EST).strftime('%Y-%m-%d %H:%M:%S EST')

            if isinstance(response, dict):
                response_str = response.get('message', str(response))[:200]
            else:
                response_str = str(response)[:200]

            log_entry = f"[{timestamp}] IP: {ip_address} | Action: {action} | Response: {response_str}\n"

            with open(HISTORY_FILE, 'a', encoding='utf-8') as f:
                f.write(log_entry)

            return True
    except Exception as e:
        print(f"Error logging action: {e}")
        return False


def proxy_to_drone(endpoint, method='GET', data=None, files=None):
    """Proxy requests to the actual drone API"""
    try:
        url = f"{DRONE_API}/{endpoint}"

        if method == 'GET':
            response = requests.get(url, timeout=10)
        elif method == 'POST':
            if files:
                response = requests.post(url, files=files, timeout=30)
            else:
                response = requests.post(url, json=data, timeout=10)
        else:
            return {'message': 'Invalid method'}, 400

        return response.json(), response.status_code
    except requests.exceptions.ConnectionError:
        return {'message': 'Drone API not available - running in simulation mode', 'simulation': True}, 200
    except requests.exceptions.Timeout:
        return {'message': 'Drone API timeout'}, 504
    except Exception as e:
        return {'message': f'Gateway error: {str(e)}'}, 500


# ===================
# Health & Info Routes
# ===================

@app.route('/')
def index():
    """Gateway info endpoint"""
    return jsonify({
        'service': 'Miami Police Drone Gateway',
        'version': '1.0.0',
        'status': 'running',
        'drone_api': DRONE_API,
        'timestamp': datetime.now(EST).isoformat()
    })


@app.route('/api/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'gateway': 'running',
        'timestamp': datetime.now(EST).isoformat()
    })


# ===================
# GPS Data Routes
# ===================

@app.route('/api/gps_data', methods=['POST'])
def receive_gps_data():
    """Receive GPS data from drone/simulator"""
    global current_gps

    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        gps_entry = {
            'drone_id': data.get('drone_id', 'unknown'),
            'latitude': float(data.get('latitude', 0)),
            'longitude': float(data.get('longitude', 0)),
            'altitude': float(data.get('altitude', 0)),
            'speed': float(data.get('speed', 0)),
            'heading': float(data.get('heading', 0)),
            'satellites': data.get('satellites', 0),
            'fix_type': data.get('fix_type', 'unknown'),
            'battery': data.get('battery', 100),
            'timestamp': datetime.now(EST).strftime('%Y-%m-%d %H:%M:%S')
        }

        gps_history.append(gps_entry)
        current_gps = gps_entry

        return jsonify({'status': 'success', 'message': 'GPS data received'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/gps_history')
def get_gps_history():
    """Get GPS history and current position"""
    return jsonify({
        'current': current_gps,
        'history': list(gps_history),
        'count': len(gps_history)
    })


# ===================
# Action Logging Routes
# ===================

@app.route('/api/log_action', methods=['POST'])
def log_action_route():
    """Log an action from the frontend"""
    try:
        data = request.get_json()
        action = data.get('action', 'Unknown action')
        response = data.get('response', 'No response')

        ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
        log_action(ip_address, action, response)

        return jsonify({'status': 'success'}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/action_history')
def get_action_history():
    """Get action history from log file"""
    try:
        if not os.path.exists(HISTORY_FILE):
            return jsonify({'history': []}), 200

        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        history = []
        for line in lines[-50:]:
            line = line.strip()
            if line:
                try:
                    parts = line.split(' | ')
                    if len(parts) >= 3:
                        time_ip = parts[0].split(' IP: ')
                        timestamp = time_ip[0].strip('[]')
                        ip = time_ip[1] if len(time_ip) > 1 else 'Unknown'
                        action = parts[1].replace('Action: ', '').strip()
                        response = parts[2].replace('Response: ', '').strip()

                        history.append({
                            'time': timestamp,
                            'ip': ip,
                            'action': action,
                            'response': response
                        })
                except:
                    pass

        history.reverse()
        return jsonify({'history': history}), 200
    except Exception as e:
        return jsonify({'history': [], 'error': str(e)}), 200


# ===================
# Drone Command Routes
# ===================

@app.route('/api/status', methods=['GET', 'POST'])
def get_status():
    """Get drone status"""
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)

    result, status_code = proxy_to_drone('status')

    # If drone not connected, return simulated status
    if result.get('simulation'):
        result = {
            'status': 'simulation',
            'message': 'Drone API not connected - showing simulated data',
            'drone': {
                'connected': False,
                'mode': 'STANDBY',
                'armed': False,
                'battery': 95,
                'gps_fix': True
            }
        }

    log_action(ip, 'GET_STATUS', result.get('message', 'Status retrieved'))
    return jsonify(result), status_code


@app.route('/api/execute_template_mission', methods=['POST'])
def execute_template_mission():
    """Execute a template mission with given coordinates"""
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    data = request.get_json()

    result, status_code = proxy_to_drone('execute_template_mission', 'POST', data)

    if result.get('simulation'):
        result = {
            'status': 'simulation',
            'message': f"Mission queued (simulation): Lat {data.get('latitude')}, Lon {data.get('longitude')}, Alt {data.get('altitude')}m"
        }

    log_action(ip, f"EXECUTE_MISSION: {data}", result.get('message', 'Mission executed'))
    return jsonify(result), status_code


@app.route('/api/takeoff_assist', methods=['POST'])
def takeoff_assist():
    """Assist with takeoff sequence"""
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)

    result, status_code = proxy_to_drone('takeoff_assist', 'POST')

    if result.get('simulation'):
        result = {'status': 'simulation', 'message': 'Takeoff assist initiated (simulation mode)'}

    log_action(ip, 'TAKEOFF_ASSIST', result.get('message', 'Takeoff assist executed'))
    return jsonify(result), status_code


@app.route('/api/set_home', methods=['POST'])
def set_home():
    """Set home location"""
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)

    result, status_code = proxy_to_drone('set_home', 'POST')

    if result.get('simulation'):
        result = {'status': 'simulation', 'message': 'Home location set (simulation mode)'}

    log_action(ip, 'SET_HOME', result.get('message', 'Home set'))
    return jsonify(result), status_code


@app.route('/api/rtl', methods=['POST'])
def return_to_launch():
    """Return to launch command"""
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)

    result, status_code = proxy_to_drone('rtl', 'POST')

    if result.get('simulation'):
        result = {'status': 'simulation', 'message': 'RTL command sent (simulation mode)'}

    log_action(ip, 'RTL', result.get('message', 'RTL executed'))
    return jsonify(result), status_code


@app.route('/api/land', methods=['POST'])
def land():
    """Land command"""
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)

    result, status_code = proxy_to_drone('land', 'POST')

    if result.get('simulation'):
        result = {'status': 'simulation', 'message': 'Land command sent (simulation mode)'}

    log_action(ip, 'LAND', result.get('message', 'Land executed'))
    return jsonify(result), status_code


@app.route('/api/loiter', methods=['POST'])
def loiter():
    """Loiter/Hold command"""
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)

    result, status_code = proxy_to_drone('loiter', 'POST')

    if result.get('simulation'):
        result = {'status': 'simulation', 'message': 'Loiter command sent (simulation mode)'}

    log_action(ip, 'LOITER', result.get('message', 'Loiter executed'))
    return jsonify(result), status_code


@app.route('/api/clear_mission', methods=['POST'])
def clear_mission():
    """Clear current mission"""
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)

    result, status_code = proxy_to_drone('clear_mission', 'POST')

    if result.get('simulation'):
        result = {'status': 'simulation', 'message': 'Mission cleared (simulation mode)'}

    log_action(ip, 'CLEAR_MISSION', result.get('message', 'Mission cleared'))
    return jsonify(result), status_code


@app.route('/api/execute_waypoint_mission', methods=['POST'])
def execute_waypoint_mission():
    """Execute mission from waypoint file"""
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)

    if 'mission_file' not in request.files:
        return jsonify({'message': 'No mission file provided'}), 400

    file = request.files['mission_file']
    files = {'mission_file': (file.filename, file.stream, file.content_type)}

    result, status_code = proxy_to_drone('execute_waypoint_mission', 'POST', files=files)

    if result.get('simulation'):
        result = {'status': 'simulation', 'message': f'Waypoint mission uploaded: {file.filename} (simulation mode)'}

    log_action(ip, f'WAYPOINT_MISSION: {file.filename}', result.get('message', 'Waypoint mission executed'))
    return jsonify(result), status_code


@app.route('/api/validate_waypoint_file', methods=['POST'])
def validate_waypoint_file():
    """Validate waypoint file"""
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)

    if 'mission_file' not in request.files:
        return jsonify({'message': 'No mission file provided'}), 400

    file = request.files['mission_file']
    files = {'mission_file': (file.filename, file.stream, file.content_type)}

    result, status_code = proxy_to_drone('validate_waypoint_file', 'POST', files=files)

    if result.get('simulation'):
        result = {'status': 'success', 'message': f'File validated: {file.filename} (simulation mode)', 'valid': True}

    log_action(ip, f'VALIDATE_WAYPOINT: {file.filename}', result.get('message', 'File validated'))
    return jsonify(result), status_code


@app.route('/api/restart_required', methods=['GET'])
def restart_required():
    """Get restart instructions"""
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)

    result, status_code = proxy_to_drone('restart_required')

    if result.get('simulation'):
        result = {
            'status': 'simulation',
            'message': 'System restart information (simulation mode)',
            'instructions': [
                '1. Ensure drone is landed and disarmed',
                '2. Power cycle the flight controller',
                '3. Restart the companion computer',
                '4. Reconnect to this gateway'
            ]
        }

    log_action(ip, 'RESTART_INFO', result.get('message', 'Restart info retrieved'))
    return jsonify(result), status_code


# Generic command handler for any other commands
@app.route('/api/<command>', methods=['POST'])
def execute_command(command):
    """Execute generic drone command"""
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    data = request.get_json() or {}

    result, status_code = proxy_to_drone(command, 'POST', data)

    if result.get('simulation'):
        result = {'status': 'simulation', 'message': f'Command {command} acknowledged (simulation mode)'}

    log_action(ip, f'COMMAND_{command.upper()}', result.get('message', f'{command} executed'))
    return jsonify(result), status_code


# ===================
# Main Entry Point
# ===================

if __name__ == '__main__':
    print("""
╔════════════════════════════════════════════════════════════╗
║      MIAMI POLICE DRONE SYSTEM - API GATEWAY               ║
╠════════════════════════════════════════════════════════════╣
║  Gateway URL: http://localhost:8081                        ║
║  Drone API:   {drone_api:<42} ║
║  Health:      http://localhost:8081/api/health             ║
╚════════════════════════════════════════════════════════════╝
    """.format(drone_api=DRONE_API))

    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG
    )
