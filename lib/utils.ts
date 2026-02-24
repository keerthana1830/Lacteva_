import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { SpectralReading, SpectralFeatures } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimestamp(timestamp: Date | string | number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

export function formatDuration(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)} minutes`;
  } else if (hours < 24) {
    return `${Math.round(hours)} hours`;
  } else {
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return `${days}d ${remainingHours}h`;
  }
}

export function getFreshnessColor(freshness: string): string {
  switch (freshness) {
    case 'fresh':
      return 'text-green-600 bg-green-100';
    case 'moderate':
      return 'text-yellow-600 bg-yellow-100';
    case 'spoiled':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function getQualityGradeColor(grade: string): string {
  switch (grade) {
    case 'A':
      return 'text-green-600 bg-green-100';
    case 'B':
      return 'text-blue-600 bg-blue-100';
    case 'C':
      return 'text-yellow-600 bg-yellow-100';
    case 'D':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function calculateSpectralFeatures(reading: SpectralReading): SpectralFeatures {
  const { rawChannels, reflectChannels, absChannels } = reading;
  
  // Wavelengths for AS7341 channels (approximate)
  const wavelengths = [415, 445, 480, 515, 555, 590, 630, 680, 910, 940, 960, 980];
  
  // Find peak wavelength and intensity
  const maxIntensityIndex = rawChannels.indexOf(Math.max(...rawChannels));
  const peakWavelength = wavelengths[maxIntensityIndex];
  const peakIntensity = rawChannels[maxIntensityIndex];
  
  // Calculate area under curve (simple trapezoidal rule)
  const areaUnderCurve = rawChannels.reduce((sum, val, i) => {
    if (i === 0) return val;
    return sum + (val + rawChannels[i - 1]) / 2;
  }, 0);
  
  // VIS vs NIR delta (channels 0-7 vs 8-11)
  const visSum = rawChannels.slice(0, 8).reduce((a, b) => a + b, 0);
  const nirSum = rawChannels.slice(8).reduce((a, b) => a + b, 0);
  const visNirDelta = visSum - nirSum;
  
  // RGB ratio approximation (using closest channels)
  const red = rawChannels[6]; // 630nm
  const green = rawChannels[4]; // 555nm
  const blue = rawChannels[2]; // 480nm
  const total = red + green + blue;
  const redGreenBlueRatio: [number, number, number] = [
    red / total,
    green / total,
    blue / total
  ];
  
  // Turbidity index (abs680/abs515)
  const turbidityIndex = absChannels[7] / absChannels[3];
  
  // Protein and fat color estimation (empirical)
  const proteinColorEst = (absChannels[2] + absChannels[3]) / 2; // Blue-green region
  const fatColorEst = (absChannels[5] + absChannels[6]) / 2; // Yellow-red region
  
  // Absorbance ratios
  const a680_a550_ratio = absChannels[7] / absChannels[4];
  
  // A630 slope (approximate derivative)
  const a630Slope = absChannels[6] - absChannels[5];
  
  // UV-Blue ratio
  const uvBlueRatio = absChannels[0] / absChannels[2];
  
  // NIR absorption index
  const nirAbsorptionIndex = nirSum / rawChannels.length;
  
  // K-value spoilage indicator (empirical formula)
  const kValueSpoilage = (absChannels[7] + absChannels[6]) / (absChannels[3] + absChannels[4]);
  
  // Time series features (simplified - would need historical data)
  const movingAverage = rawChannels.reduce((a, b) => a + b, 0) / rawChannels.length;
  const exponentialDecay = Math.exp(-reading.timestampMs / 1000000); // Decay factor
  const fermentationSlope = reading.cfuEstimate / 1000; // Simplified
  
  return {
    peakWavelength,
    peakIntensity,
    areaUnderCurve,
    visNirDelta,
    redGreenBlueRatio,
    turbidityIndex,
    proteinColorEst,
    fatColorEst,
    a680_a550_ratio,
    a630Slope,
    uvBlueRatio,
    nirAbsorptionIndex,
    kValueSpoilage,
    movingAverage,
    exponentialDecay,
    fermentationSlope,
  };
}

export function generateBatchId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `BATCH_${timestamp}_${random}`.toUpperCase();
}

export function exportToCSV(data: any[], filename: string): void {
  if (!data.length) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value}"` : value;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

export function validateSpectralReading(reading: Partial<SpectralReading>): string[] {
  const errors: string[] = [];
  
  if (!reading.deviceId) errors.push('Device ID is required');
  if (!reading.timestampMs) errors.push('Timestamp is required');
  if (typeof reading.vocRaw !== 'number') errors.push('VOC raw value must be a number');
  if (typeof reading.vocVoltage !== 'number') errors.push('VOC voltage must be a number');
  if (!reading.ledMode) errors.push('LED mode is required');
  if (!Array.isArray(reading.rawChannels) || reading.rawChannels.length !== 12) {
    errors.push('Raw channels must be an array of 12 numbers');
  }
  if (!Array.isArray(reading.reflectChannels) || reading.reflectChannels.length !== 12) {
    errors.push('Reflect channels must be an array of 12 numbers');
  }
  if (!Array.isArray(reading.absChannels) || reading.absChannels.length !== 12) {
    errors.push('Absorbance channels must be an array of 12 numbers');
  }
  if (typeof reading.cfuEstimate !== 'number') errors.push('CFU estimate must be a number');
  
  return errors;
}