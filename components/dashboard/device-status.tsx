"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Wifi, WifiOff, RefreshCw, Settings, MapPin } from 'lucide-react'
import { Device } from '@/types'
import { formatTimestamp } from '@/lib/utils'

interface DeviceStatusProps {
  device: Device | null
  onRefresh?: () => void
  onSettings?: () => void
}

export function DeviceStatus({ device, onRefresh, onSettings }: DeviceStatusProps) {
  if (!device) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WifiOff className="h-5 w-5 text-gray-400" />
            No Device Connected
          </CardTitle>
          <CardDescription>Connect a LACTEVA device to start monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <WifiOff className="h-8 w-8 text-gray-400" />
            </div>
            <Button variant="outline" className="w-full">
              Pair New Device
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusIcon = () => {
    switch (device.status) {
      case 'online':
        return <Wifi className="h-5 w-5 text-green-500" />
      case 'syncing':
        return <RefreshCw className="h-5 w-5 text-yellow-500 animate-spin" />
      case 'offline':
      default:
        return <WifiOff className="h-5 w-5 text-red-500" />
    }
  }

  const getStatusColor = () => {
    switch (device.status) {
      case 'online':
        return 'bg-green-100 text-green-800'
      case 'syncing':
        return 'bg-yellow-100 text-yellow-800'
      case 'offline':
      default:
        return 'bg-red-100 text-red-800'
    }
  }

  const getConnectionQuality = () => {
    const timeSinceLastSeen = Date.now() - new Date(device.lastSeen).getTime()
    const minutesAgo = Math.floor(timeSinceLastSeen / (1000 * 60))
    
    if (minutesAgo < 1) return { quality: 'Excellent', color: 'text-green-600' }
    if (minutesAgo < 5) return { quality: 'Good', color: 'text-blue-600' }
    if (minutesAgo < 15) return { quality: 'Fair', color: 'text-yellow-600' }
    return { quality: 'Poor', color: 'text-red-600' }
  }

  const connectionQuality = getConnectionQuality()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            {device.name}
          </div>
          <Badge className={getStatusColor()}>
            {device.status.toUpperCase()}
          </Badge>
        </CardTitle>
        <CardDescription>
          Device ID: {device.deviceId}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location */}
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{device.location}</span>
        </div>

        {/* Connection Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Last Seen:</span>
            <p className="font-medium">{formatTimestamp(device.lastSeen)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Connection:</span>
            <p className={`font-medium ${connectionQuality.color}`}>
              {connectionQuality.quality}
            </p>
          </div>
        </div>

        {/* Firmware & Calibration */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Firmware:</span>
            <p className="font-medium">{device.firmwareVersion}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Calibrated:</span>
            <p className="font-medium">
              {formatTimestamp(device.calibrationDate)}
            </p>
          </div>
        </div>

        {/* Settings */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Sampling Interval:</span>
            <span className="font-medium">{device.settings.samplingInterval}s</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Auto Calibration:</span>
            <Badge variant={device.settings.autoCalibration ? "default" : "secondary"}>
              {device.settings.autoCalibration ? "ON" : "OFF"}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh}
            className="flex-1"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onSettings}
            className="flex-1"
          >
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}