import mongoose, { Schema } from 'mongoose';
import { Alert } from '@/types';

const AlertSchema = new Schema<Alert>({
  deviceId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  type: { 
    type: String, 
    enum: ['voc_high', 'cfu_high', 'shelf_life_low', 'sensor_deviation', 'contamination'], 
    required: true 
  },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: true },
  acknowledged: { type: Boolean, default: false },
  acknowledgedBy: { type: String },
  acknowledgedAt: { type: Date },
}, {
  timestamps: true,
  collection: 'alerts'
});

// Indexes
AlertSchema.index({ deviceId: 1, acknowledged: 1, timestamp: -1 });
AlertSchema.index({ severity: 1, acknowledged: 1 });
AlertSchema.index({ userId: 1, acknowledged: 1, timestamp: -1 });

export default mongoose.models.Alert || mongoose.model<Alert>('Alert', AlertSchema);