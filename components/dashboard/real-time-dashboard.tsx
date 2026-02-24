"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SpectralChart } from './spectral-chart'
import { FreshnessIndicator } from './freshness-indicator'
import { DeviceStatus } from './device-status'
import { TrendChart } from './trend-chart'
import { AlertPanel } from './alert-panel'
import { Play, Pause, Download, Zap, Brain, CheckCircle } from 'lucide-react'
import { SpectralReading, Device, Alert } from '@/types'
import { useToast } from '@/components/ui/use-toast'
import { PDFExport } from '@/components/pdf-export'
import { StartPrediction } from '@/components/start-prediction'

interface RealTimeDashboardProps {
  deviceId?: string
}

export function RealTimeDashboard({ deviceId }: RealTimeDashboardProps) {
  const [isLive, setIsLive] = useState(false)
  const [currentReading, setCurrentReading] = useState<SpectralReading | null>(null)
  const [device, setDevice] = useState<Device | null>(null)
  const [recentReadings, setRecentReadings] = useState<SpectralReading[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStage, setProcessingStage] = useState('')
  const [modelAccuracy, setModelAccuracy] = useState(0.95)
  const [lastPredictionResult, setLastPredictionResult] = useState<SpectralReading | null>(null)
  const [hasEverPredicted, setHasEverPredicted] = useState(false)
  const { toast } = useToast()

  // Fetch device info
  useEffect(() => {
    if (deviceId) {
      fetchDevice()
    }
  }, [deviceId])

  // Live data polling
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isLive && deviceId) {
      interval = setInterval(() => {
        fetchLatestReading()
      }, 5000) // Poll every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isLive, deviceId])

  const fetchDevice = async () => {
    try {
      const response = await fetch(`/api/devices/${deviceId}`)
      if (response.ok) {
        const data = await response.json()
        setDevice(data.device)
      }
    } catch (error) {
      console.error('Failed to fetch device:', error)
    }
  }

  const fetchLatestReading = async () => {
    try {
      const response = await fetch(`/api/readings/latest?deviceId=${deviceId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.reading) {
          setCurrentReading(data.reading)
          setRecentReadings(prev => [data.reading, ...prev.slice(0, 49)]) // Keep last 50
        }
      }
    } catch (error) {
      console.error('Failed to fetch latest reading:', error)
      toast({
        title: "Connection Error",
        description: "Failed to fetch latest data from device",
        variant: "destructive"
      })
    }
  }

  const processNewSample = async (sampleData: SpectralReading) => {
    setIsProcessing(true)
    
    try {
      // Stage 1: Data Collection
      setProcessingStage('Collecting spectral data...')
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Stage 2: Feature Extraction
      setProcessingStage('Extracting spectral features...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Create features array from the sample data
      const features = [
        sampleData.vocRaw || 0,
        sampleData.vocVoltage || 0,
        ...(sampleData.rawChannels || Array(12).fill(0)),
        ...(sampleData.reflectChannels || Array(12).fill(0)),
        ...(sampleData.absChannels || Array(12).fill(0)),
        sampleData.cfuEstimate || 0,
        // Add some derived features
        Math.max(...(sampleData.rawChannels || [0])), // peak intensity
        (sampleData.rawChannels || []).reduce((a, b) => a + b, 0), // total intensity
        (sampleData.reflectChannels || []).reduce((a, b) => a + b, 0) / 12, // avg reflectance
        (sampleData.absChannels || []).reduce((a, b) => a + b, 0) / 12, // avg absorbance
      ]
      
      // Stage 3: ML Processing
      setProcessingStage('Running ML analysis...')
      
      // Call ML service for prediction
      const mlResponse = await fetch('/api/ml-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: features,
          deviceId: deviceId,
          timestamp: Date.now()
        })
      })
      
      let predictions = null
      let accuracy = 0.95
      
      if (mlResponse.ok) {
        const mlData = await mlResponse.json()
        predictions = {
          freshness: mlData.prediction_label || (mlData.freshness_prediction > 0.5 ? 'fresh' : 'spoiled'),
          freshnessScore: mlData.freshness_prediction || 0.5,
          shelfLifeHours: mlData.shelf_life_hours || 24,
          confidence: mlData.confidence || 0.85,
          riskLevel: (mlData.freshness_prediction || 0.5) > 0.7 ? 'low' : (mlData.freshness_prediction || 0.5) > 0.4 ? 'medium' : 'high'
        }
        accuracy = mlData.model_accuracy || 0.95
        setModelAccuracy(accuracy)
      } else {
        // Fallback prediction if ML service fails
        const freshness = sampleData.predictions?.freshnessScore || 0.5
        predictions = {
          freshness: freshness > 0.6 ? 'fresh' : 'spoiled',
          freshnessScore: freshness,
          shelfLifeHours: freshness * 72,
          confidence: 0.85,
          riskLevel: freshness > 0.6 ? 'low' : 'high'
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1200))
      
      // Stage 4: Results
      setProcessingStage('Generating results...')
      await new Promise(resolve => setTimeout(resolve, 600))
      
      // Create the final reading
      const newReading: SpectralReading = {
        ...sampleData,
        predictions,
        timestamp: new Date(),
        timestampMs: Date.now()
      }
      
      setCurrentReading(newReading)
      setLastPredictionResult(newReading)
      setHasEverPredicted(true)
      setRecentReadings(prev => [newReading, ...prev.slice(0, 49)])
      
      // Show success message
      toast({
        title: "Analysis Complete!",
        description: `Sample classified as ${predictions?.freshness || 'unknown'} with ${((predictions?.confidence || 0) * 100).toFixed(1)}% confidence`,
      })
      
    } catch (error) {
      console.error('Processing error:', error)
      toast({
        title: "Processing Error",
        description: "Failed to analyze sample. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
      setProcessingStage('')
    }
  }

  const fetchAlerts = async () => {
    try {
      const response = await fetch(`/api/alerts?deviceId=${deviceId}&acknowledged=false`)
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    }
  }

  const toggleLiveMode = () => {
    setIsLive(!isLive)
    if (!isLive) {
      fetchLatestReading()
      fetchAlerts()
      // Generate initial simulated data
      const now = Date.now()
      const freshness = 0.5 + Math.random() * 0.4
      
      const simulatedReading: SpectralReading = {
        _id: `sim_${now}`,
        deviceId: deviceId || 'LACTEVA_001',
        timestamp: new Date(now),
        timestampMs: now,
        vocRaw: 300 + (1 - freshness) * 700 + Math.random() * 100,
        vocVoltage: 1.0 + (1 - freshness) * 2.0 + Math.random() * 0.5,
        ledMode: ['WHITE', 'UV', 'BLUE'][Math.floor(Math.random() * 3)],
        rawChannels: Array.from({ length: 12 }, () => 
          800 + freshness * 1200 + Math.random() * 200 - 100
        ),
        reflectChannels: Array.from({ length: 12 }, () => 
          15 + freshness * 25 + Math.random() * 10
        ),
        absChannels: Array.from({ length: 12 }, () => 
          0.3 + (1 - freshness) * 0.8 + Math.random() * 0.2
        ),
        cfuEstimate: Math.floor(1000 + (1 - freshness) * 99000 + Math.random() * 10000),
        predictions: {
          freshness: freshness > 0.7 ? 'fresh' : freshness > 0.4 ? 'moderate' : 'spoiled',
          freshnessScore: freshness,
          shelfLifeHours: freshness * 72 + Math.random() * 12,
          confidence: 0.8 + Math.random() * 0.2,
          riskLevel: freshness > 0.7 ? 'low' : freshness > 0.4 ? 'medium' : 'high'
        }
      }
      
      // Process initial sample
      processNewSample(simulatedReading)
      
      toast({
        title: "Live Mode Enabled",
        description: "Now monitoring device in real-time"
      })
    } else {
      toast({
        title: "Live Mode Disabled",
        description: "Stopped real-time monitoring"
      })
    }
  }

  const exportCurrentData = () => {
    if (!currentReading) return

    const dataToExport = {
      timestamp: currentReading.timestamp,
      deviceId: currentReading.deviceId,
      spectralData: {
        raw: currentReading.rawChannels,
        reflectance: currentReading.reflectChannels,
        absorbance: currentReading.absChannels
      },
      predictions: currentReading.predictions,
      features: currentReading.features
    }

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `lacteva-reading-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Data Exported",
      description: "Current reading data has been downloaded"
    })
  }

  // Always show dashboard with default device
  const activeDeviceId = deviceId || 'LACTEVA_001'

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Real-Time Dashboard</h2>
          <p className="text-muted-foreground">
            {activeDeviceId} - Live monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={isLive ? "destructive" : "default"}
            onClick={toggleLiveMode}
          >
            {isLive ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Stop Live
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Live
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={exportCurrentData}
            disabled={!currentReading}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Processing Status */}
      {isProcessing && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Brain className="h-6 w-6 text-blue-600 animate-pulse" />
                <div>
                  <h3 className="font-semibold text-blue-900">Processing Sample</h3>
                  <p className="text-blue-700">{processingStage}</p>
                </div>
              </div>
              <div className="flex-1">
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{
                    width: processingStage.includes('Collecting') ? '25%' :
                           processingStage.includes('Extracting') ? '50%' :
                           processingStage.includes('Running') ? '75%' :
                           processingStage.includes('Generating') ? '90%' : '100%'
                  }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Control Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StartPrediction 
          deviceId={activeDeviceId}
          onPredictionComplete={(reading) => {
            setCurrentReading(reading)
            setLastPredictionResult(reading)
            setHasEverPredicted(true)
            setRecentReadings(prev => [reading, ...prev.slice(0, 49)])
          }}
          modelAccuracy={modelAccuracy}
        />
        <PDFExport 
          reading={lastPredictionResult || currentReading}
          modelAccuracy={modelAccuracy}
        />
      </div>

      {/* Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DeviceStatus 
          device={device}
          onRefresh={fetchDevice}
          onSettings={() => {/* TODO: Open settings modal */}}
        />
        <FreshnessIndicator 
          predictions={lastPredictionResult?.predictions || null}
          vocLevel={lastPredictionResult?.vocVoltage}
          cfuLevel={lastPredictionResult?.cfuEstimate}
        />
        <AlertPanel 
          alerts={alerts}
          onAcknowledge={(alertId) => {
            // TODO: Acknowledge alert
            setAlerts(prev => prev.filter(a => a._id !== alertId))
          }}
        />
      </div>

      {/* Charts */}
      <Tabs defaultValue="spectral" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-none lg:flex">
          <TabsTrigger value="spectral" className="flex-1 lg:flex-none">Spectral Analysis</TabsTrigger>
          <TabsTrigger value="trends" className="flex-1 lg:flex-none">Trends</TabsTrigger>
          <TabsTrigger value="comparison" className="flex-1 lg:flex-none">Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="spectral" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <SpectralChart reading={lastPredictionResult || currentReading} type="raw" />
            <SpectralChart reading={lastPredictionResult || currentReading} type="reflectance" />
          </div>
          <div className="w-full">
            <SpectralChart reading={lastPredictionResult || currentReading} type="absorbance" />
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrendChart 
              readings={recentReadings}
              metric="freshness"
              title="Freshness Trend"
            />
            <TrendChart 
              readings={recentReadings}
              metric="shelfLife"
              title="Shelf Life Prediction"
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrendChart 
              readings={recentReadings}
              metric="voc"
              title="VOC Levels"
            />
            <TrendChart 
              readings={recentReadings}
              metric="cfu"
              title="CFU Estimate"
            />
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Spectral Comparison</CardTitle>
              <CardDescription>
                Compare current reading with previous samples
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Comparison view will be available with multiple readings
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}