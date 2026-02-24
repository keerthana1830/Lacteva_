import mongoose, { Schema } from 'mongoose';
import { BatchAnalysis } from '@/types';

const BatchAnalysisSchema = new Schema<BatchAnalysis>({
  batchId: { type: String, required: true, unique: true, index: true },
  deviceId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  sampleCount: { type: Number, required: true },
  averageReadings: { type: Schema.Types.Mixed, required: true },
  qualityGrade: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
  shelfLifePrediction: { type: Number, required: true },
  riskAssessment: { type: String, required: true },
  notes: { type: String, default: '' },
  exportedAt: { type: Date },
}, {
  timestamps: true,
  collection: 'batch_analyses'
});

// Indexes
BatchAnalysisSchema.index({ deviceId: 1, startTime: -1 });
BatchAnalysisSchema.index({ qualityGrade: 1 });
BatchAnalysisSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.BatchAnalysis || mongoose.model<BatchAnalysis>('BatchAnalysis', BatchAnalysisSchema);