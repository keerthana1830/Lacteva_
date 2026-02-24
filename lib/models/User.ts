import mongoose, { Schema } from 'mongoose';
import { User, UserPreferences } from '@/types';

const UserPreferencesSchema = new Schema<UserPreferences>({
  theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
  },
  dashboard: {
    defaultView: { type: String, enum: ['realtime', 'history', 'analytics'], default: 'realtime' },
    refreshInterval: { type: Number, default: 30 },
  },
});

const UserSchema = new Schema<User>({
  email: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'lab_technician', 'field_operator'], required: true },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
  devices: [{ type: String }],
  preferences: { type: UserPreferencesSchema, default: () => ({}) },
}, {
  timestamps: true,
  collection: 'users'
});

// Indexes
UserSchema.index({ role: 1 });
UserSchema.index({ lastLogin: -1 });

export default mongoose.models.User || mongoose.model<User>('User', UserSchema);