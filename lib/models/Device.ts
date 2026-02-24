import mongoose, { Schema } from 'mongoose';
import { Device, DeviceSettings } from '@/types';

const DeviceSettingsSchema = new Schema<DeviceSettings>({
  samplingInterval: { type: Number, default: 60 },
  autoCalibration: { type: Boolean, default: true },
  alertThresholds: {
    vocHigh: { type: Number, default: 1000 },
    cfuHigh: { type: Number, default: 100000 },
    shelfLifeLow: { type: Number, default: 24 },
  },
});

const DeviceSchema = new Schema<Device>({
  deviceId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  location: { type: String, required: true },
  status: { type: String, enum: ['online', 'offline', 'syncing'], default: 'offline' },
  lastSeen: { type: Date, default: Date.now },
  firmwareVersion: { type: String, required: true },
  calibrationDate: { type: Date, default: Date.now },
  userId: { type: String, required: true, index: true },
  settings: { type: DeviceSettingsSchema, default: () => ({}) },
}, {
  timestamps: true,
  collection: 'devices'
});

// Indexes
DeviceSchema.index({ userId: 1, status: 1 });
DeviceSchema.index({ lastSeen: -1 });

export default mongoose.models.Device || mongoose.model<Device>('Device', DeviceSchema);