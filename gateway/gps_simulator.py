#!/usr/bin/env python3
"""
GPS Simulator for Testing
Sends simulated GPS data to the gateway
"""

import requests
import time
import random
import math

GATEWAY_URL = 'http://localhost:8081/api/gps_data'

# Miami coordinates
BASE_LAT = 25.7617
BASE_LON = -80.1918
BASE_ALT = 10

def simulate_flight():
    """Simulate a drone flight pattern"""
    angle = 0
    radius = 0.001  # About 100 meters

    while True:
        # Circular flight pattern
        lat = BASE_LAT + radius * math.sin(math.radians(angle))
        lon = BASE_LON + radius * math.cos(math.radians(angle))
        alt = BASE_ALT + 5 * math.sin(math.radians(angle * 2))  # Oscillating altitude

        data = {
            'drone_id': 'MPD-DRONE-001',
            'latitude': lat,
            'longitude': lon,
            'altitude': max(2, alt),
            'speed': 5 + random.uniform(-1, 1),
            'heading': angle % 360,
            'satellites': random.randint(8, 14),
            'fix_type': '3D',
            'battery': max(20, 100 - (angle / 36))  # Slowly decreasing battery
        }

        try:
            response = requests.post(GATEWAY_URL, json=data, timeout=5)
            print(f"Sent GPS: {lat:.6f}, {lon:.6f}, {alt:.1f}m - Status: {response.status_code}")
        except Exception as e:
            print(f"Error sending GPS data: {e}")

        angle = (angle + 5) % 360
        time.sleep(2)


if __name__ == '__main__':
    print("Starting GPS Simulator...")
    print(f"Sending to: {GATEWAY_URL}")
    print("Press Ctrl+C to stop")
    print("-" * 50)

    try:
        simulate_flight()
    except KeyboardInterrupt:
        print("\nSimulator stopped")
