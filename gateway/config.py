import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Gateway settings
    HOST = os.getenv('GATEWAY_HOST', '0.0.0.0')
    PORT = int(os.getenv('GATEWAY_PORT', 3003))
    DEBUG = os.getenv('GATEWAY_DEBUG', 'True').lower() == 'true'

    # Drone API endpoint (the actual drone controller)
    DRONE_API_URL = os.getenv('DRONE_API_URL', 'http://localhost:5001')

    # Logging
    HISTORY_FILE = os.getenv('HISTORY_FILE', 'action_history.txt')
    GPS_HISTORY_SIZE = int(os.getenv('GPS_HISTORY_SIZE', 100))
