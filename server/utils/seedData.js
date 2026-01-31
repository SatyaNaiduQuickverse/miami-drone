const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Drone = require('../models/Drone');

dotenv.config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Drone.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@miamipolice.gov',
      password: 'admin123',
      role: 'admin',
      badge: 'MPD-001'
    });
    console.log('Created admin user');

    // Create operator user
    const operator = await User.create({
      name: 'John Operator',
      email: 'operator@miamipolice.gov',
      password: 'operator123',
      role: 'operator',
      badge: 'MPD-101'
    });
    console.log('Created operator user');

    // Create sample drones - spread across Miami
    // Valid statuses: 'online', 'offline', 'maintenance', 'deployed', 'returning'
    const drones = await Drone.create([
      {
        droneId: 'MPD-DRONE-001',
        name: 'Eagle One',
        model: 'DJI Matrice 300 RTK',
        status: 'deployed',
        batteryLevel: 95,
        location: {
          latitude: 25.7617,
          longitude: -80.1918,
          altitude: 45
        },
        homeLocation: {
          latitude: 25.7617,
          longitude: -80.1918,
          altitude: 0
        },
        lastTelemetry: { speed: 12.5, satellites: 18 },
        apiEndpoint: 'http://localhost:3003',
        cameraStreamUrl: 'http://localhost:8083/watch.html'
      },
      {
        droneId: 'MPD-DRONE-002',
        name: 'Hawk Two',
        model: 'DJI Matrice 300 RTK',
        status: 'online',
        batteryLevel: 78,
        location: {
          latitude: 25.7850,
          longitude: -80.2100,
          altitude: 0
        },
        homeLocation: {
          latitude: 25.7850,
          longitude: -80.2100,
          altitude: 0
        },
        lastTelemetry: { speed: 0, satellites: 14 },
        apiEndpoint: 'http://localhost:3003',
        cameraStreamUrl: ''
      },
      {
        droneId: 'MPD-DRONE-003',
        name: 'Falcon Three',
        model: 'DJI Mavic 3 Enterprise',
        status: 'maintenance',
        batteryLevel: 45,
        location: {
          latitude: 25.7500,
          longitude: -80.2000,
          altitude: 0
        },
        homeLocation: {
          latitude: 25.7500,
          longitude: -80.2000,
          altitude: 0
        },
        lastTelemetry: { speed: 0, satellites: 0 },
        apiEndpoint: 'http://localhost:3003'
      },
      {
        droneId: 'MPD-DRONE-004',
        name: 'Raven Four',
        model: 'Skydio X2',
        status: 'deployed',
        batteryLevel: 100,
        location: {
          latitude: 25.7700,
          longitude: -80.1850,
          altitude: 30
        },
        homeLocation: {
          latitude: 25.7700,
          longitude: -80.1850,
          altitude: 0
        },
        lastTelemetry: { speed: 8.2, satellites: 16 },
        apiEndpoint: 'http://localhost:3003'
      },
      {
        droneId: 'MPD-DRONE-005',
        name: 'Phoenix Five',
        model: 'DJI Matrice 300 RTK',
        status: 'deployed',
        batteryLevel: 67,
        location: {
          latitude: 25.7789,
          longitude: -80.1870,
          altitude: 55
        },
        homeLocation: {
          latitude: 25.7617,
          longitude: -80.1918,
          altitude: 0
        },
        lastTelemetry: { speed: 15.3, satellites: 19 },
        apiEndpoint: 'http://localhost:3003'
      },
      {
        droneId: 'MPD-DRONE-006',
        name: 'Osprey Six',
        model: 'Autel EVO II Pro',
        status: 'online',
        batteryLevel: 92,
        location: {
          latitude: 25.7550,
          longitude: -80.1750,
          altitude: 0
        },
        homeLocation: {
          latitude: 25.7550,
          longitude: -80.1750,
          altitude: 0
        },
        lastTelemetry: { speed: 0, satellites: 12 },
        apiEndpoint: 'http://localhost:3003'
      },
      {
        droneId: 'MPD-DRONE-007',
        name: 'Condor Seven',
        model: 'DJI Mavic 3 Enterprise',
        status: 'returning',
        batteryLevel: 54,
        location: {
          latitude: 25.7680,
          longitude: -80.2050,
          altitude: 40
        },
        homeLocation: {
          latitude: 25.7617,
          longitude: -80.1918,
          altitude: 0
        },
        lastTelemetry: { speed: 10.1, satellites: 17 },
        apiEndpoint: 'http://localhost:3003'
      },
      {
        droneId: 'MPD-DRONE-008',
        name: 'Kestrel Eight',
        model: 'Skydio X2',
        status: 'offline',
        batteryLevel: 12,
        location: {
          latitude: 25.7420,
          longitude: -80.1900,
          altitude: 0
        },
        homeLocation: {
          latitude: 25.7420,
          longitude: -80.1900,
          altitude: 0
        },
        lastTelemetry: { speed: 0, satellites: 0 },
        apiEndpoint: 'http://localhost:3003'
      },
      {
        droneId: 'MPD-DRONE-009',
        name: 'Harrier Nine',
        model: 'DJI Matrice 300 RTK',
        status: 'deployed',
        batteryLevel: 81,
        location: {
          latitude: 25.7900,
          longitude: -80.1800,
          altitude: 65
        },
        homeLocation: {
          latitude: 25.7850,
          longitude: -80.2100,
          altitude: 0
        },
        lastTelemetry: { speed: 18.7, satellites: 21 },
        apiEndpoint: 'http://localhost:3003'
      },
      {
        droneId: 'MPD-DRONE-010',
        name: 'Vulture Ten',
        model: 'Autel EVO II Pro',
        status: 'returning',
        batteryLevel: 34,
        location: {
          latitude: 25.7580,
          longitude: -80.2200,
          altitude: 15
        },
        homeLocation: {
          latitude: 25.7500,
          longitude: -80.2000,
          altitude: 0
        },
        lastTelemetry: { speed: 5.5, satellites: 8 },
        apiEndpoint: 'http://localhost:3003'
      },
      {
        droneId: 'MPD-DRONE-011',
        name: 'Sparrow Eleven',
        model: 'DJI Mavic 3 Enterprise',
        status: 'online',
        batteryLevel: 88,
        location: {
          latitude: 25.7750,
          longitude: -80.1650,
          altitude: 0
        },
        homeLocation: {
          latitude: 25.7750,
          longitude: -80.1650,
          altitude: 0
        },
        lastTelemetry: { speed: 0, satellites: 15 },
        apiEndpoint: 'http://localhost:3003'
      },
      {
        droneId: 'MPD-DRONE-012',
        name: 'Albatross Twelve',
        model: 'DJI Matrice 300 RTK',
        status: 'maintenance',
        batteryLevel: 0,
        location: {
          latitude: 25.7650,
          longitude: -80.1980,
          altitude: 0
        },
        homeLocation: {
          latitude: 25.7650,
          longitude: -80.1980,
          altitude: 0
        },
        lastTelemetry: { speed: 0, satellites: 0 },
        apiEndpoint: 'http://localhost:3003'
      }
    ]);
    console.log(`Created ${drones.length} sample drones`);

    console.log('\n=== SEED DATA COMPLETE ===');
    console.log('Admin Login: admin@miamipolice.gov / admin123');
    console.log('Operator Login: operator@miamipolice.gov / operator123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
