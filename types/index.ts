export interface SpectralReading {
  _id?: string;
  deviceId: string;
  timestamp: Date;
  timestampMs: number;
  vocRaw: number;
  vocVoltage: number;
  ledMode: string;
  rawChannels: number[]; // raw_ch0 to raw_ch11
  reflectChannels: number[]; // reflect_ch0 to reflect_ch11
  absChannels: number[]; // abs_ch0 to abs_ch11
  cfuEstimate: number;
  features?: SpectralFeatures;
  predictions?: MilkPredictions;
}


export interface SpectralFeatures {
  peakWavelength: number;
  peakIntensity: number;
  areaUnderCurve: number;
  visNirDelta: number;
  redGreenBlueRatio: [number, number, number];
  turbidityIndex: number;
  proteinColorEst: number;
  fatColorEst: number;
  a680_a550_ratio: number;
  a630Slope: number;
  uvBlueRatio: number;
  nirAbsorptionIndex: number;
  kValueSpoilage: number;
  movingAverage: number;
  exponentialDecay: number;
  fermentationSlope: number;
}

export interface MilkPredictions {
  freshness: 'fresh' | 'moderate' | 'spoiled';
  freshnessScore: number; // 0-1
  shelfLifeHours: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface Device {
  _id?: string;
  deviceId: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'syncing';
  lastSeen: Date;
  firmwareVersion: string;
  calibrationDate: Date;
  userId: string;
  settings: DeviceSettings;
}

export interface DeviceSettings {
  samplingInterval: number; // seconds
  autoCalibration: boolean;
  alertThresholds: {
    vocHigh: number;
    cfuHigh: number;
    shelfLifeLow: number; // hours
  };
}

export interface User {
  _id?: string;
  email: string;
  name: string;
  role: 'admin' | 'lab_technician' | 'field_operator';
  createdAt: Date;
  lastLogin: Date;
  devices: string[]; // device IDs
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  dashboard: {
    defaultView: 'realtime' | 'history' | 'analytics';
    refreshInterval: number; // seconds
  };
}

export interface BatchAnalysis {
  _id?: string;
  batchId: string;
  deviceId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  sampleCount: number;
  averageReadings: SpectralReading;
  qualityGrade: 'A' | 'B' | 'C' | 'D';
  shelfLifePrediction: number; // hours
  riskAssessment: string;
  notes: string;
  exportedAt?: Date;
}

export interface Alert {
  _id?: string;
  deviceId: string;
  userId: string;
  type: 'voc_high' | 'cfu_high' | 'shelf_life_low' | 'sensor_deviation' | 'contamination';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DashboardStats {
  totalSamples: number;
  activeSamples: number;
  spoiledSamples: number;
  averageShelfLife: number;
  deviceCount: number;
  onlineDevices: number;
  alertCount: number;
  criticalAlerts: number;
}

export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface SpectralChartData {
  wavelengths: number[];
  intensities: number[];
  reflectance: number[];
  absorbance: number[];
}

// ML Model interfaces
export interface MLModelInput {
  features: number[];
  deviceId: string;
  timestamp: number;
}

export interface MLModelOutput {
  freshness_prediction: number;
  shelf_life_hours: number;
  confidence: number;
  feature_importance: Record<string, number>;
}

// Mobile API interfaces
export interface MobileAuthRequest {
  email: string;
  deviceId: string;
}

export interface MobileSampleRequest {
  deviceId: string;
  reading: Omit<SpectralReading, '_id' | 'features' | 'predictions'>;
}

export interface MobileHistoryRequest {
  deviceId: string;
  startDate: string;
  endDate: string;
  limit?: number;
}