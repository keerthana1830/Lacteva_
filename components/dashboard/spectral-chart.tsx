"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SpectralReading } from '@/types'

interface SpectralChartProps {
  reading: SpectralReading | null
  type: 'raw' | 'reflectance' | 'absorbance'
}

export function SpectralChart({ reading, type }: SpectralChartProps) {
  if (!reading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Spectral Analysis</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-500">Waiting for device data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // AS7341 wavelengths (approximate)
  const wavelengths = [415, 445, 480, 515, 555, 590, 630, 680, 910, 940, 960, 980]
  
  const getChannelData = () => {
    switch (type) {
      case 'raw':
        return reading.rawChannels
      case 'reflectance':
        return reading.reflectChannels
      case 'absorbance':
        return reading.absChannels
      default:
        return reading.rawChannels
    }
  }

  const data = wavelengths.map((wavelength, index) => ({
    wavelength,
    intensity: getChannelData()[index] || 0,
    channel: `CH${index}`,
  }))

  const getTitle = () => {
    switch (type) {
      case 'raw':
        return 'Raw Spectral Intensity'
      case 'reflectance':
        return 'Reflectance Spectrum'
      case 'absorbance':
        return 'Absorbance Spectrum'
      default:
        return 'Spectral Data'
    }
  }

  const getYAxisLabel = () => {
    switch (type) {
      case 'raw':
        return 'Intensity (counts)'
      case 'reflectance':
        return 'Reflectance (%)'
      case 'absorbance':
        return 'Absorbance (AU)'
      default:
        return 'Value'
    }
  }

  const getLineColor = () => {
    switch (type) {
      case 'raw':
        return '#3b82f6' // blue
      case 'reflectance':
        return '#10b981' // green
      case 'absorbance':
        return '#f59e0b' // amber
      default:
        return '#6366f1' // indigo
    }
  }

  return (
    <Card className="spectral-chart">
      <CardHeader>
        <CardTitle>{getTitle()}</CardTitle>
        <CardDescription>
          Device: {reading.deviceId} | LED Mode: {reading.ledMode}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="wavelength" 
                label={{ value: 'Wavelength (nm)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: getYAxisLabel(), angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value, name) => [value, getYAxisLabel()]}
                labelFormatter={(label) => `${label} nm`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="intensity" 
                stroke={getLineColor()}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}