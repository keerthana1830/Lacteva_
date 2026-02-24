"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Settings, Wifi, WifiOff, RefreshCw, Trash2, Edit } from 'lucide-react'
import { Device } from '@/types'
import { useToast } from '@/components/ui/use-toast'

export function DeviceManagement() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchDevices()
  }, [])

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/devices')
      if (response.ok) {
        const data = await response.json()
        setDevices(data.devices || [])
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddDevice = async (formData: FormData) => {
    try {
      const deviceData = {
        deviceId: formData.get('deviceId'),
        name: formData.get('name'),
        location: formData.get('location'),
        firmwareVersion: formData.get('firmwareVersion') || '1.0.0',
        userId: 'user1' // In real app, get from auth context
      }

      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceData)
      })

      if (response.ok) {
        toast({
          title: "Device Added",
          description: "New device has been successfully registered"
        })
        setIsAddDialogOpen(false)
        fetchDevices()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to add device",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add device",
        variant: "destructive"
      })
    }
  }

  const handleUpdateDevice = async (deviceId: string, updates: Partial<Device>) => {
    try {
      const response = await fetch(`/api/devices/${deviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        toast({
          title: "Device Updated",
          description: "Device settings have been saved"
        })
        setIsEditDialogOpen(false)
        fetchDevices()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update device",
        variant: "destructive"
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'syncing': return 'bg-yellow-500 animate-pulse'
      case 'offline': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      online: 'bg-green-100 text-green-800',
      syncing: 'bg-yellow-100 text-yellow-800',
      offline: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Device Management</h2>
          <p className="text-gray-600">Manage your LACTEVA devices and settings</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Device</DialogTitle>
              <DialogDescription>
                Register a new LACTEVA device to your account
              </DialogDescription>
            </DialogHeader>
            <form action={handleAddDevice}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="deviceId" className="text-right">Device ID</Label>
                  <Input id="deviceId" name="deviceId" placeholder="LACTEVA_XXX" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input id="name" name="name" placeholder="Lab Device #1" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="location" className="text-right">Location</Label>
                  <Input id="location" name="location" placeholder="Main Laboratory" className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="firmwareVersion" className="text-right">Firmware</Label>
                  <Input id="firmwareVersion" name="firmwareVersion" placeholder="1.0.0" className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Add Device</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((device) => (
          <Card key={device.deviceId} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(device.status)}`}></div>
                  <CardTitle className="text-lg">{device.name}</CardTitle>
                </div>
                <Badge className={getStatusBadge(device.status)}>
                  {device.status.toUpperCase()}
                </Badge>
              </div>
              <CardDescription>{device.location}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Device ID:</span>
                  <p className="font-mono">{device.deviceId}</p>
                </div>
                <div>
                  <span className="text-gray-500">Firmware:</span>
                  <p>{device.firmwareVersion}</p>
                </div>
                <div>
                  <span className="text-gray-500">Last Seen:</span>
                  <p>{new Date(device.lastSeen).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-500">Calibrated:</span>
                  <p>{new Date(device.calibrationDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    setSelectedDevice(device)
                    setIsEditDialogOpen(true)
                  }}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Settings
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleUpdateDevice(device.deviceId, { lastSeen: new Date() })}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Device Settings Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Device Settings - {selectedDevice?.name}</DialogTitle>
            <DialogDescription>
              Configure device parameters and alert thresholds
            </DialogDescription>
          </DialogHeader>
          
          {selectedDevice && (
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="sampling">Sampling</TabsTrigger>
                <TabsTrigger value="alerts">Alerts</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="edit-name">Device Name</Label>
                    <Input 
                      id="edit-name" 
                      defaultValue={selectedDevice.name}
                      onChange={(e) => setSelectedDevice({...selectedDevice, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-location">Location</Label>
                    <Input 
                      id="edit-location" 
                      defaultValue={selectedDevice.location}
                      onChange={(e) => setSelectedDevice({...selectedDevice, location: e.target.value})}
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="sampling" className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="sampling-interval">Sampling Interval (seconds)</Label>
                    <Input 
                      id="sampling-interval" 
                      type="number"
                      defaultValue={selectedDevice.settings.samplingInterval}
                      onChange={(e) => setSelectedDevice({
                        ...selectedDevice, 
                        settings: {...selectedDevice.settings, samplingInterval: parseInt(e.target.value)}
                      })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="auto-calibration"
                      defaultChecked={selectedDevice.settings.autoCalibration}
                      onChange={(e) => setSelectedDevice({
                        ...selectedDevice,
                        settings: {...selectedDevice.settings, autoCalibration: e.target.checked}
                      })}
                    />
                    <Label htmlFor="auto-calibration">Enable Auto Calibration</Label>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="alerts" className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="voc-threshold">VOC High Threshold</Label>
                    <Input 
                      id="voc-threshold" 
                      type="number"
                      defaultValue={selectedDevice.settings.alertThresholds.vocHigh}
                      onChange={(e) => setSelectedDevice({
                        ...selectedDevice,
                        settings: {
                          ...selectedDevice.settings,
                          alertThresholds: {
                            ...selectedDevice.settings.alertThresholds,
                            vocHigh: parseInt(e.target.value)
                          }
                        }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cfu-threshold">CFU High Threshold</Label>
                    <Input 
                      id="cfu-threshold" 
                      type="number"
                      defaultValue={selectedDevice.settings.alertThresholds.cfuHigh}
                      onChange={(e) => setSelectedDevice({
                        ...selectedDevice,
                        settings: {
                          ...selectedDevice.settings,
                          alertThresholds: {
                            ...selectedDevice.settings.alertThresholds,
                            cfuHigh: parseInt(e.target.value)
                          }
                        }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="shelf-life-threshold">Shelf Life Low Threshold (hours)</Label>
                    <Input 
                      id="shelf-life-threshold" 
                      type="number"
                      defaultValue={selectedDevice.settings.alertThresholds.shelfLifeLow}
                      onChange={(e) => setSelectedDevice({
                        ...selectedDevice,
                        settings: {
                          ...selectedDevice.settings,
                          alertThresholds: {
                            ...selectedDevice.settings.alertThresholds,
                            shelfLifeLow: parseInt(e.target.value)
                          }
                        }
                      })}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter>
            <Button 
              onClick={() => selectedDevice && handleUpdateDevice(selectedDevice.deviceId, selectedDevice)}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}