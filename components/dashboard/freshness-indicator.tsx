"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Droplets, AlertTriangle } from 'lucide-react'
import { MilkPredictions } from '@/types'
import { formatDuration, getFreshnessColor } from '@/lib/utils'

interface FreshnessIndicatorProps {
  predictions: MilkPredictions | null
  vocLevel?: number
  cfuLevel?: number
}

export function FreshnessIndicator({ predictions, vocLevel, cfuLevel }: FreshnessIndicatorProps) {
  if (!predictions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-600" />
            Milk Quality Assessment
          </CardTitle>
          <CardDescription>No predictions available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-500">Waiting for analysis...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getFreshnessGrade = (score: number): string => {
    if (score >= 0.8) return 'A'
    if (score >= 0.6) return 'B'
    if (score >= 0.4) return 'C'
    return 'D'
  }

  const getRiskColor = (risk: string): string => {
    switch (risk) {
      case 'low':
        return 'bg-green-100 text-green-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'high':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const grade = getFreshnessGrade(predictions.freshnessScore)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5" />
          Milk Quality Assessment
        </CardTitle>
        <CardDescription>
          Confidence: {Math.round(predictions.confidence * 100)}%
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Freshness Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Freshness Status:</span>
          <Badge className={getFreshnessColor(predictions.freshness)}>
            {predictions.freshness.toUpperCase()}
          </Badge>
        </div>

        {/* Quality Grade */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Quality Grade:</span>
          <Badge variant="outline" className="text-lg font-bold">
            {grade}
          </Badge>
        </div>

        {/* Shelf Life */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Shelf Life Remaining:
          </span>
          <span className="font-semibold">
            {formatDuration(predictions.shelfLifeHours)}
          </span>
        </div>

        {/* Risk Level */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            Risk Level:
          </span>
          <Badge className={getRiskColor(predictions.riskLevel)}>
            {predictions.riskLevel.toUpperCase()}
          </Badge>
        </div>

        {/* Additional Metrics */}
        {(vocLevel !== undefined || cfuLevel !== undefined) && (
          <div className="pt-4 border-t space-y-2">
            {vocLevel !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span>VOC Level:</span>
                <span className={vocLevel > 1000 ? 'text-red-600 font-semibold' : ''}>
                  {vocLevel.toFixed(1)} ppm
                </span>
              </div>
            )}
            {cfuLevel !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span>CFU Estimate:</span>
                <span className={cfuLevel > 100000 ? 'text-red-600 font-semibold' : ''}>
                  {cfuLevel.toLocaleString()} CFU/mL
                </span>
              </div>
            )}
          </div>
        )}

        {/* Freshness Score Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Freshness Score:</span>
            <span className="font-semibold">{Math.round(predictions.freshnessScore * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                predictions.freshnessScore >= 0.7 ? 'bg-green-500' :
                predictions.freshnessScore >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${predictions.freshnessScore * 100}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}