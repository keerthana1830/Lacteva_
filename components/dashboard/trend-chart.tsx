"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SpectralReading } from '@/types'
import { formatTimestamp } from '@/lib/utils'

interface TrendChartProps {
  readings: SpectralReading[]
  metric: 'freshness' | 'shelfLife' | 'voc' | 'cfu'
  title: string
}

export function TrendChart({ readings, metric, title }: TrendChartProps) {
  if (!readings.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>No trend data available</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-muted-foreground">Waiting for data...</p>
        </CardContent>
      </Card>
    )
  }

  const getValue = (reading: SpectralReading): number => {
    switch (metric) {
      case 'freshness':
        return reading.predictions?.freshnessScore || 0
      case 'shelfLife':
        return reading.predictions?.shelfLifeHours || 0
      case 'voc':
        return reading.vocVoltage
      case 'cfu':
        return reading.cfuEstimate
      default:
        return 0
    }
  }

  const getUnit = (): string => {
    switch (metric) {
      case 'freshness':
        return 'Score (0-1)'
      case 'shelfLife':
        return 'Hours'
      case 'voc':
        return 'Voltage (V)'
      case 'cfu':
        return 'CFU/mL'
      default:
        return ''
    }
  }

  const getColor = (): string => {
    switch (metric) {
      case 'freshness':
        return '#10b981' // green
      case 'shelfLife':
        return '#3b82f6' // blue
      case 'voc':
        return '#f59e0b' // amber
      case 'cfu':
        return '#ef4444' // red
      default:
        return '#6366f1' // indigo
    }
  }

  // Sort readings by timestamp and take last 20 for trend
  const sortedReadings = [...readings]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-20)

  const data = sortedReadings.map((reading, index) => ({
    index: index + 1,
    value: getValue(reading),
    timestamp: reading.timestamp,
    formattedTime: formatTimestamp(reading.timestamp),
  }))

  const formatValue = (value: number): string => {
    switch (metric) {
      case 'freshness':
        return (value * 100).toFixed(1) + '%'
      case 'shelfLife':
        return value.toFixed(1) + 'h'
      case 'voc':
        return value.toFixed(3) + 'V'
      case 'cfu':
        return value.toLocaleString()
      default:
        return value.toString()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Last {data.length} readings | Current: {formatValue(data[data.length - 1]?.value || 0)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="index"
                label={{ value: 'Reading #', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: getUnit(), angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: number) => [formatValue(value), title]}
                labelFormatter={(label) => `Reading #${label}`}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white p-3 border rounded shadow">
                        <p className="font-medium">Reading #{label}</p>
                        <p className="text-sm text-muted-foreground">{data.formattedTime}</p>
                        <p className="text-sm">
                          <span style={{ color: getColor() }}>●</span> {title}: {formatValue(data.value)}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={getColor()}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}