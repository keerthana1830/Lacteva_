import mongoose, { Schema, Document } from 'mongoose';
import { SpectralReading, SpectralFeatures, MilkPredictions } from '@/types';

const SpectralFeaturesSchema = new Schema<SpectralFeatures>({
  peakWavelength: { type: Number, required: true },
  peakIntensity: { type: Number, required: true },
  areaUnderCurve: { type: Number, required: true },
  visNirDelta: { type: Number, required: true },
  redGreenBlueRatio: { type: [Number], required: true },
  turbidityIndex: { type: Number, required: true },
  proteinColorEst: { type: Number, required: true },
  fatColorEst: { type: Number, required: true },
  a680_a550_ratio: { type: Number, required: true },
  a630Slope: { type: Number, required: true },
  uvBlueRatio: { type: Number, required: true },
  nirAbsorptionIndex: { type: Number, required: true },
  kValueSpoilage: { type: Number, required: true },
  movingAverage: { type: Number, required: true },
  exponentialDecay: { type: Number, required: true },
  fermentationSlope: { type: Number, required: true },
});

const MilkPredictionsSchema = new Schema<MilkPredictions>({
  freshness: { type: String, enum: ['fresh', 'moderate', 'spoiled'], required: true },
  freshnessScore: { type: Number, min: 0, max: 1, required: true },
  shelfLifeHours: { type: Number, required: true },
  confidence: { type: Number, min: 0, max: 1, required: true },
  riskLevel: { type: String, enum: ['low', 'medium', 'high'], required: true },
});

const SpectralReadingSchema = new Schema<SpectralReading>({
  deviceId: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  timestampMs: { type: Number, required: true },
  vocRaw: { type: Number, required: true },
  vocVoltage: { type: Number, required: true },
  ledMode: { type: String, required: true },
  rawChannels: { type: [Number], required: true, validate: [arrayLimit, '{PATH} must have 12 elements'] },
  reflectChannels: { type: [Number], required: true, validate: [arrayLimit, '{PATH} must have 12 elements'] },
  absChannels: { type: [Number], required: true, validate: [arrayLimit, '{PATH} must have 12 elements'] },
  cfuEstimate: { type: Number, required: true },
  features: { type: SpectralFeaturesSchema },
  predictions: { type: MilkPredictionsSchema },
}, {
  timestamps: true,
  collection: 'spectral_readings'
});

function arrayLimit(val: number[]) {
  return val.length === 12;
}

// Indexes for performance
SpectralReadingSchema.index({ deviceId: 1, timestamp: -1 });
SpectralReadingSchema.index({ 'predictions.freshness': 1 });
SpectralReadingSchema.index({ 'predictions.shelfLifeHours': 1 });

export default mongoose.models.SpectralReading || mongoose.model<SpectralReading>('SpectralReading', SpectralReadingSchema);