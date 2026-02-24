// Mock database for development when MongoDB is not available
import { SpectralReading, Device, User, Alert } from '@/types'

// In-memory storage for development
let mockReadings: SpectralReading[] = []
let mockDevices: Device[] = []
let mockUsers: User[] = []
let mockAlerts: Alert[] = []

// Generate multiple sample readings with varying quality
const generateSampleReadings = () => {
  const readings: SpectralReading[] = []
  const now = Date.now()
  
  for (let i = 0; i < 50; i++) {
    const timestamp = new Date(now - (i * 1800000)) // Each reading 30 minutes apart
    const freshness = Math.max(0.1, 0.9 - (i * 0.015)) // Gradual degradation
    
    const reading: SpectralReading = {
      _id: (i + 1).toString(),
      deviceId: i % 3 === 0 ? 'LACTEVA_001' : i % 3 === 1 ? 'LACTEVA_002' : 'LACTEVA_003',
      timestamp,
      timestampMs: timestamp.getTime(),
      vocRaw: 300 + (1 - freshness) * 700 + Math.random() * 100,
      vocVoltage: 1.0 + (1 - freshness) * 2.0 + Math.random() * 0.5,
      ledMode: ['WHITE', 'UV', 'BLUE'][Math.floor(Math.random() * 3)],
      rawChannels: Array.from({ length: 12 }, (_, j) => 
        800 + freshness * 1200 + Math.random() * 200 - 100
      ),
      reflectChannels: Array.from({ length: 12 }, (_, j) => 
        15 + freshness * 25 + Math.random() * 10
      ),
      absChannels: Array.from({ length: 12 }, (_, j) => 
        0.3 + (1 - freshness) * 0.8 + Math.random() * 0.2
      ),
      cfuEstimate: Math.floor(1000 + (1 - freshness) * 99000 + Math.random() * 10000),
      predictions: {
        freshness: freshness > 0.7 ? 'fresh' : freshness > 0.4 ? 'moderate' : 'spoiled',
        freshnessScore: freshness,
        shelfLifeHours: freshness * 72 + Math.random() * 12,
        confidence: 0.8 + Math.random() * 0.2,
        riskLevel: freshness > 0.7 ? 'low' : freshness > 0.4 ? 'medium' : 'high'
      }
    }
    readings.push(reading)
  }
  return readings
}

// Initialize with sample data
const initializeMockData = () => {
  // Sample devices
  const devices: Device[] = [
    {
      _id: '1',
      deviceId: 'LACTEVA_001',
      name: 'Lab Device #1',
      location: 'Main Laboratory',
      status: 'online',
      lastSeen: new Date(),
      firmwareVersion: '1.2.3',
      calibrationDate: new Date(),
      userId: 'user1',
      settings: {
        samplingInterval: 60,
        autoCalibration: true,
        alertThresholds: {
          vocHigh: 1000,
          cfuHigh: 100000,
          shelfLifeLow: 24
        }
      }
    },
    {
      _id: '2',
      deviceId: 'LACTEVA_002',
      name: 'Field Device #1',
      location: 'Dairy Farm A',
      status: 'offline',
      lastSeen: new Date(Date.now() - 3600000),
      firmwareVersion: '1.2.1',
      calibrationDate: new Date(Date.now() - 86400000 * 7),
      userId: 'user1',
      settings: {
        samplingInterval: 120,
        autoCalibration: true,
        alertThresholds: {
          vocHigh: 800,
          cfuHigh: 50000,
          shelfLifeLow: 48
        }
      }
    }
  ]

  // Sample users
  const users: User[] = [
    {
      _id: 'user1',
      email: 'tech@lacteva.com',
      name: 'Lab Technician',
      role: 'lab_technician',
      createdAt: new Date(),
      lastLogin: new Date(),
      devices: ['LACTEVA_001', 'LACTEVA_002'],
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
    },
    {
      _id: 'admin1',
      email: 'admin@lacteva.com',
      name: 'System Administrator',
      role: 'admin',
      createdAt: new Date(),
      lastLogin: new Date(),
      devices: ['LACTEVA_001', 'LACTEVA_002'],
      preferences: {
        theme: 'dark',
        notifications: {
          email: true,
          push: true,
          sms: true
        },
        dashboard: {
          defaultView: 'analytics',
          refreshInterval: 15
        }
      }
    }
  ]

  // Generate multiple sample readings with varying freshness
  const readings: SpectralReading[] = []
  const now = Date.now()
  
  for (let i = 0; i < 50; i++) {
    const timestamp = new Date(now - (i * 300000)) // Every 5 minutes
    const freshness = Math.max(0.1, 0.9 - (i * 0.015)) // Gradual degradation
    
    const reading: SpectralReading = {
      _id: (i + 1).toString(),
      deviceId: 'LACTEVA_001',
      timestamp,
      timestampMs: timestamp.getTime(),
      vocRaw: 300 + (1 - freshness) * 700 + Math.random() * 100,
      vocVoltage: 0.9 + (1 - freshness) * 2.1 + Math.random() * 0.3,
      ledMode: ['WHITE', 'UV', 'BLUE'][i % 3],
      rawChannels: [
        1000 + freshness * 1000 + Math.random() * 200,
        1200 + freshness * 800 + Math.random() * 200,
        1100 + freshness * 900 + Math.random() * 200,
        1300 + freshness * 700 + Math.random() * 200,
        1400 + freshness * 600 + Math.random() * 200,
        1200 + freshness * 800 + Math.random() * 200,
        1100 + freshness * 900 + Math.random() * 200,
        1000 + freshness * 1000 + Math.random() * 200,
        800 + freshness * 400 + Math.random() * 100,
        700 + freshness * 300 + Math.random() * 100,
        600 + freshness * 200 + Math.random() * 100,
        500 + freshness * 100 + Math.random() * 100
      ],
      reflectChannels: [
        20 + freshness * 15 + Math.random() * 5,
        25 + freshness * 10 + Math.random() * 5,
        23 + freshness * 12 + Math.random() * 5,
        27 + freshness * 8 + Math.random() * 5,
        30 + freshness * 5 + Math.random() * 5,
        25 + freshness * 10 + Math.random() * 5,
        23 + freshness * 12 + Math.random() * 5,
        20 + freshness * 15 + Math.random() * 5,
        15 + freshness * 10 + Math.random() * 3,
        13 + freshness * 8 + Math.random() * 3,
        10 + freshness * 5 + Math.random() * 3,
        8 + freshness * 4 + Math.random() * 2
      ],
      absChannels: [
        0.4 + (1 - freshness) * 0.4 + Math.random() * 0.1,
        0.3 + (1 - freshness) * 0.3 + Math.random() * 0.1,
        0.35 + (1 - freshness) * 0.35 + Math.random() * 0.1,
        0.3 + (1 - freshness) * 0.4 + Math.random() * 0.1,
        0.25 + (1 - freshness) * 0.45 + Math.random() * 0.1,
        0.3 + (1 - freshness) * 0.4 + Math.random() * 0.1,
        0.35 + (1 - freshness) * 0.35 + Math.random() * 0.1,
        0.4 + (1 - freshness) * 0.4 + Math.random() * 0.1,
        0.5 + (1 - freshness) * 0.3 + Math.random() * 0.1,
        0.55 + (1 - freshness) * 0.25 + Math.random() * 0.1,
        0.6 + (1 - freshness) * 0.2 + Math.random() * 0.1,
        0.7 + (1 - freshness) * 0.2 + Math.random() * 0.1
      ],
      cfuEstimate: Math.floor(1000 + (1 - freshness) * 99000 + Math.random() * 10000),
      predictions: {
        freshness: freshness > 0.7 ? 'fresh' : freshness > 0.4 ? 'moderate' : 'spoiled',
        freshnessScore: freshness,
        shelfLifeHours: Math.floor(freshness * 72 + Math.random() * 12),
        confidence: 0.8 + Math.random() * 0.2,
        riskLevel: freshness > 0.7 ? 'low' : freshness > 0.4 ? 'medium' : 'high'
      }
    }
    readings.push(reading)
  }

  // Sample alerts
  const alerts: Alert[] = [
    {
      _id: '1',
      deviceId: 'LACTEVA_001',
      userId: 'user1',
      type: 'shelf_life_low',
      severity: 'medium',
      message: 'Milk sample shelf life is below 24 hours threshold',
      timestamp: new Date(now - 1800000), // 30 minutes ago
      acknowledged: false
    },
    {
      _id: '2',
      deviceId: 'LACTEVA_002',
      userId: 'user1',
      type: 'sensor_deviation',
      severity: 'high',
      message: 'Device has been offline for more than 1 hour',
      timestamp: new Date(now - 3600000), // 1 hour ago
      acknowledged: false
    }
  ]

  mockDevices = devices
  mockUsers = users
  mockReadings = readings
  mockAlerts = alerts
}

// Initialize mock data
initializeMockData()

export const mockDB = {
  // Readings
  async findReadings(query: any = {}, options: any = {}) {
    let results = [...mockReadings]
    
    if (query.deviceId) {
      results = results.filter(r => r.deviceId === query.deviceId)
    }
    
    if (options.sort?.timestamp === -1) {
      results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    }
    
    if (options.limit) {
      results = results.slice(0, options.limit)
    }
    
    return results
  },

  async findLatestReading(deviceId: string) {
    const readings = mockReadings.filter(r => r.deviceId === deviceId)
    return readings.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] || null
  },

  async saveReading(reading: SpectralReading) {
    const newReading = {
      ...reading,
      _id: (mockReadings.length + 1).toString(),
      timestamp: new Date(reading.timestampMs || Date.now())
    }
    mockReadings.push(newReading)
    return newReading
  },

  // Devices
  async findDevices(query: any = {}) {
    let results = [...mockDevices]
    
    if (query.userId) {
      results = results.filter(d => d.userId === query.userId)
    }
    
    return results
  },

  async findDevice(deviceId: string) {
    return mockDevices.find(d => d.deviceId === deviceId) || null
  },

  async saveDevice(device: Device) {
    const newDevice = {
      ...device,
      _id: (mockDevices.length + 1).toString()
    }
    mockDevices.push(newDevice)
    return newDevice
  },

  async updateDevice(deviceId: string, updates: Partial<Device>) {
    const index = mockDevices.findIndex(d => d.deviceId === deviceId)
    if (index >= 0) {
      mockDevices[index] = { ...mockDevices[index], ...updates }
      return mockDevices[index]
    }
    return null
  },

  // Users
  async findUser(email: string) {
    return mockUsers.find(u => u.email === email) || null
  },

  // Alerts
  async findAlerts(query: any = {}) {
    let results = [...mockAlerts]
    
    if (query.deviceId) {
      results = results.filter(a => a.deviceId === query.deviceId)
    }
    
    if (query.acknowledged !== undefined) {
      results = results.filter(a => a.acknowledged === query.acknowledged)
    }
    
    return results
  },

  async saveAlert(alert: Alert) {
    const newAlert = {
      ...alert,
      _id: (mockAlerts.length + 1).toString()
    }
    mockAlerts.push(newAlert)
    return newAlert
  }
}

export const useMockDB = process.env.NODE_ENV === 'development' && !process.env.MONGODB_URI?.includes('mongodb+srv')