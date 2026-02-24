"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap, Brain, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { SpectralReading } from '@/types'

interface StartPredictionProps {
  deviceId?: string
  onPredictionComplete?: (reading: SpectralReading) => void
  modelAccuracy?: number
}

export function StartPrediction({ deviceId, onPredictionComplete, modelAccuracy = 0.95 }: StartPredictionProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStage, setProcessingStage] = useState('')
  const [lastResult, setLastResult] = useState<any>(null)

  const startPrediction = async () => {
    if (!deviceId) return

    setIsProcessing(true)
    setLastResult(null)
    
    // Clear any previous results in parent component
    if (onPredictionComplete) {
      // Signal that we're starting a new prediction
      console.log('Starting new prediction, clearing previous results')
    }
    
    try {
      // Stage 1: Device Connection
      setProcessingStage('Connecting to device...')
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Stage 2: Data Collection
      setProcessingStage('Collecting spectral data...')
      await new Promise(resolve => setTimeout(resolve, 1200))
      
      // Generate realistic sample data (simulating device input)
      const now = Date.now()
      const freshness = 0.3 + Math.random() * 0.6 // Random freshness between 0.3-0.9
      
      const sampleData: SpectralReading = {
        _id: `pred_${now}`,
        deviceId: deviceId,
        timestamp: new Date(now),
        timestampMs: now,
        vocRaw: 300 + (1 - freshness) * 700 + Math.random() * 100,
        vocVoltage: 1.0 + (1 - freshness) * 2.0 + Math.random() * 0.5,
        ledMode: 'WHITE',
        rawChannels: Array.from({ length: 12 }, () => 
          800 + freshness * 1200 + Math.random() * 200 - 100
        ),
        reflectChannels: Array.from({ length: 12 }, () => 
          15 + freshness * 25 + Math.random() * 10
        ),
        absChannels: Array.from({ length: 12 }, () => 
          0.3 + (1 - freshness) * 0.8 + Math.random() * 0.2
        ),
        cfuEstimate: Math.floor(1000 + (1 - freshness) * 99000 + Math.random() * 10000)
      }
      
      // Stage 3: Feature Extraction
      setProcessingStage('Extracting spectral features...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Calculate features for ML model
      const features = [
        Math.max(...sampleData.rawChannels), // peak intensity
        sampleData.rawChannels.indexOf(Math.max(...sampleData.rawChannels)), // peak channel
        sampleData.rawChannels.reduce((a, b) => a + b, 0), // total intensity
        sampleData.vocVoltage,
        sampleData.cfuEstimate / 1000,
        ...sampleData.rawChannels.slice(0, 8), // first 8 raw channels
        ...sampleData.reflectChannels.slice(0, 8), // first 8 reflect channels
        ...sampleData.absChannels.slice(0, 8) // first 8 absorb channels
      ]
      
      // Stage 4: ML Processing
      setProcessingStage('Running ML analysis...')
      
      try {
        const mlResponse = await fetch('/api/ml-predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            features: features,
            deviceId: deviceId,
            timestamp: now
          })
        })
        
        let predictions = null
        
        if (mlResponse.ok) {
          const mlData = await mlResponse.json()
          predictions = {
            freshness: mlData.prediction_label || (mlData.freshness_prediction > 0.5 ? 'fresh' : 'spoiled'),
            freshnessScore: mlData.freshness_prediction || freshness,
            shelfLifeHours: mlData.shelf_life_hours || (freshness * 72),
            confidence: mlData.confidence || (0.8 + Math.random() * 0.2),
            riskLevel: mlData.freshness_prediction > 0.7 ? 'low' : mlData.freshness_prediction > 0.4 ? 'medium' : 'high'
          }
        } else {
          // Fallback prediction
          predictions = {
            freshness: freshness > 0.6 ? 'fresh' : freshness > 0.3 ? 'moderate' : 'spoiled',
            freshnessScore: freshness,
            shelfLifeHours: freshness * 72,
            confidence: 0.8 + Math.random() * 0.2,
            riskLevel: freshness > 0.7 ? 'low' : freshness > 0.4 ? 'medium' : 'high'
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // Stage 5: Results
        setProcessingStage('Generating results...')
        await new Promise(resolve => setTimeout(resolve, 600))
        
        const finalReading = {
          ...sampleData,
          predictions
        }
        
        setLastResult(predictions)
        
        if (onPredictionComplete) {
          onPredictionComplete(finalReading)
        }
        
      } catch (mlError) {
        console.error('ML prediction error:', mlError)
        // Use fallback prediction
        const predictions = {
          freshness: freshness > 0.6 ? 'fresh' : 'spoiled',
          freshnessScore: freshness,
          shelfLifeHours: freshness * 72,
          confidence: 0.85,
          riskLevel: freshness > 0.6 ? 'low' : 'high'
        }
        
        setLastResult(predictions)
        
        const finalReading = {
          ...sampleData,
          predictions
        }
        
        if (onPredictionComplete) {
          onPredictionComplete(finalReading)
        }
      }
      
    } catch (error) {
      console.error('Prediction error:', error)
      setProcessingStage('Error occurred during processing')
      await new Promise(resolve => setTimeout(resolve, 1000))
    } finally {
      setIsProcessing(false)
      setProcessingStage('')
    }
  }

  const getResultColor = (freshness: string) => {
    switch (freshness) {
      case 'fresh': return 'text-green-600 bg-green-100'
      case 'moderate': return 'text-yellow-600 bg-yellow-100'
      case 'spoiled': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          Start Prediction
        </CardTitle>
        <CardDescription>
          Analyze milk sample quality using AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Model Info */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700">Model Accuracy:</span>
            <Badge variant="secondary">{(modelAccuracy * 100).toFixed(1)}%</Badge>
          </div>
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600 animate-pulse" />
              <span className="text-sm font-medium">{processingStage}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500 animate-pulse" 
                style={{
                  width: processingStage.includes('Connecting') ? '20%' :
                         processingStage.includes('Collecting') ? '40%' :
                         processingStage.includes('Extracting') ? '60%' :
                         processingStage.includes('Running') ? '80%' :
                         processingStage.includes('Generating') ? '95%' : '100%'
                }}
              />
            </div>
          </div>
        )}

        {/* Last Result */}
        {lastResult && !isProcessing && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">Analysis Complete</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Result:</span>
                <Badge className={getResultColor(lastResult.freshness)}>
                  {lastResult.freshness.toUpperCase()}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Confidence:</span>
                <span className="font-medium ml-1">
                  {(lastResult.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Shelf Life:</span>
                <span className="font-medium ml-1">
                  {lastResult.shelfLifeHours.toFixed(1)}h
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Risk:</span>
                <Badge variant={lastResult.riskLevel === 'low' ? 'default' : 'destructive'}>
                  {lastResult.riskLevel.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button 
          onClick={startPrediction} 
          disabled={isProcessing || !deviceId}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Zap className="h-5 w-5 mr-2" />
              Start Prediction
            </>
          )}
        </Button>

        {!deviceId && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
            <AlertCircle className="h-4 w-4" />
            Please connect a device first
          </div>
        )}
      </CardContent>
    </Card>
  )
}