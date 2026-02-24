// MongoDB initialization script for LACTEVA database

// Switch to lacteva database
db = db.getSiblingDB('lacteva');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'name', 'role'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        },
        name: {
          bsonType: 'string',
          minLength: 1
        },
        role: {
          bsonType: 'string',
          enum: ['admin', 'lab_technician', 'field_operator']
        }
      }
    }
  }
});

db.createCollection('devices', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['deviceId', 'name', 'userId'],
      properties: {
        deviceId: {
          bsonType: 'string',
          minLength: 1
        },
        name: {
          bsonType: 'string',
          minLength: 1
        },
        status: {
          bsonType: 'string',
          enum: ['online', 'offline', 'syncing']
        }
      }
    }
  }
});

db.createCollection('spectral_readings', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['deviceId', 'timestampMs', 'rawChannels', 'reflectChannels', 'absChannels'],
      properties: {
        deviceId: {
          bsonType: 'string',
          minLength: 1
        },
        rawChannels: {
          bsonType: 'array',
          minItems: 12,
          maxItems: 12,
          items: {
            bsonType: 'number'
          }
        },
        reflectChannels: {
          bsonType: 'array',
          minItems: 12,
          maxItems: 12,
          items: {
            bsonType: 'number'
          }
        },
        absChannels: {
          bsonType: 'array',
          minItems: 12,
          maxItems: 12,
          items: {
            bsonType: 'number'
          }
        }
      }
    }
  }
});

// Create indexes for performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });

db.devices.createIndex({ deviceId: 1 }, { unique: true });
db.devices.createIndex({ userId: 1 });
db.devices.createIndex({ status: 1 });

db.spectral_readings.createIndex({ deviceId: 1, timestamp: -1 });
db.spectral_readings.createIndex({ 'predictions.freshness': 1 });
db.spectral_readings.createIndex({ timestamp: -1 });

db.alerts.createIndex({ deviceId: 1, acknowledged: 1, timestamp: -1 });
db.alerts.createIndex({ userId: 1, acknowledged: 1 });

db.batch_analyses.createIndex({ deviceId: 1, startTime: -1 });
db.batch_analyses.createIndex({ userId: 1, createdAt: -1 });

// Insert sample admin user
db.users.insertOne({
  email: 'admin@lacteva.com',
  name: 'System Administrator',
  role: 'admin',
  createdAt: new Date(),
  lastLogin: new Date(),
  devices: [],
  preferences: {
    theme: 'system',
    notifications: {
      email: true,
      push: true,
      sms: false
    },
    dashboard: {
      defaultView: 'realtime',
      refreshInterval: 30
    }
  }
});

// Insert sample lab technician
db.users.insertOne({
  email: 'tech@lacteva.com',
  name: 'Lab Technician',
  role: 'lab_technician',
  createdAt: new Date(),
  lastLogin: new Date(),
  devices: ['LACTEVA_001'],
  preferences: {
    theme: 'light',
    notifications: {
      email: true,
      push: true,
      sms: false
    },
    dashboard: {
      defaultView: 'realtime',
      refreshInterval: 15
    }
  }
});

// Insert sample devices
db.devices.insertMany([
  {
    deviceId: 'LACTEVA_001',
    name: 'Lab Device #1',
    location: 'Main Laboratory',
    status: 'online',
    lastSeen: new Date(),
    firmwareVersion: '1.2.3',
    calibrationDate: new Date(),
    userId: 'tech@lacteva.com',
    settings: {
      samplingInterval: 60,
      autoCalibration: true,
      alertThresholds: {
        vocHigh: 1000,
        cfuHigh: 100000,
        shelfLifeLow: 24
      }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    deviceId: 'LACTEVA_002',
    name: 'Field Device #1',
    location: 'Dairy Farm A',
    status: 'offline',
    lastSeen: new Date(Date.now() - 3600000), // 1 hour ago
    firmwareVersion: '1.2.1',
    calibrationDate: new Date(Date.now() - 86400000 * 7), // 1 week ago
    userId: 'tech@lacteva.com',
    settings: {
      samplingInterval: 120,
      autoCalibration: true,
      alertThresholds: {
        vocHigh: 800,
        cfuHigh: 50000,
        shelfLifeLow: 48
      }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print('LACTEVA database initialized successfully!');
print('Created collections: users, devices, spectral_readings, alerts, batch_analyses');
print('Created indexes for optimal performance');
print('Inserted sample users and devices');
print('Database is ready for use.');