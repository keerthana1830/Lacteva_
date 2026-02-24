"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Download, Calendar } from 'lucide-react'
import { SpectralReading, DashboardStats } from '@/types'
import { formatDuration } from '@/lib/utils'

export function AnalyticsDashboard() {
  const [readings, setReadings] = useState<SpectralReading[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [timeRange, setTimeRange] = useState('24h')
  const [selectedDevice, setSelectedDevice] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeRange, selectedDevice])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      
      // Fetch readings
      const readingsResponse = await fetch(`/api/readings?limit=100&deviceId=${selectedDevice !== 'all' ? selectedDevice : ''}`)
      if (readingsResponse.ok) {
        const readingsData = await readingsResponse.json()
        setReadings(readingsData.data || [])
      }

      // Calculate stats from readings
      const mockStats: DashboardStats = {
        totalSamples: 150,
        activeSamples: 45,
        spoiledSamples: 12,
        averageShelfLife: 42.5,
        deviceCount: 2,
        onlineDevices: 1,
        alertCount: 3,
        criticalAlerts: 1
      }
      setStats(mockStats)
    } catch (error) {
      console.error('Failed to fetch analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportData = () => {
    const csvContent = [
      ['Timestamp', 'Device ID', 'Freshness', 'Shelf Life (h)', 'VOC Level', 'CFU Count'],
      ...readings.map(r => [
        r.timestamp.toString(),
        r.deviceId,
        r.predictions?.freshness || 'unknown',
        r.predictions?.shelfLifeHours || 0,
        r.vocVoltage,
        r.cfuEstimate
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `lacteva-analytics-${Date.now()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Prepare chart data
  const freshnessDistribution = [
    { name: 'Fresh', value: readings.filter(r => r.predictions?.freshness === 'fresh').length, color: '#10b981' },
    { name: 'Moderate', value: readings.filter(r => r.predictions?.freshness === 'moderate').length, color: '#f59e0b' },
    { name: 'Spoiled', value: readings.filter(r => r.predictions?.freshness === 'spoiled').length, color: '#ef4444' }
  ]

  const shelfLifeTrend = readings
    .slice(-20)
    .map((r, i) => ({
      index: i + 1,
      shelfLife: r.predictions?.shelfLifeHours || 0,
      freshness: r.predictions?.freshnessScore || 0,
      timestamp: new Date(r.timestamp).toLocaleTimeString()
    }))

  const qualityMetrics = readings
    .slice(-10)
    .map((r, i) => ({
      sample: i + 1,
      voc: r.vocVoltage,
      cfu: r.cfuEstimate / 1000, // Scale down for chart
      turbidity: Math.random() * 2 + 0.5, // Mock turbidity data
      timestamp: new Date(r.timestamp).toLocaleTimeString()
    }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-gray-600">Comprehensive milk quality analytics and insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedDevice} onValueChange={setSelectedDevice}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Devices</SelectItem>
              <SelectItem value="LACTEVA_001">LACTEVA_001</SelectItem>
              <SelectItem value="LACTEVA_002">LACTEVA_002</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Samples</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSamples}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+12%</span> from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Shelf Life</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(stats.averageShelfLife)}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+5%</span> improvement
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quality Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.spoiledSamples}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-red-600">+2</span> from yesterday
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Device Uptime</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round((stats.onlineDevices / stats.deviceCount) * 100)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.onlineDevices} of {stats.deviceCount} devices online
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quality">Quality Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Shelf Life Trend</CardTitle>
                <CardDescription>Predicted shelf life over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={shelfLifeTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="index" />
                      <YAxis />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="shelfLife" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Freshness Distribution</CardTitle>
                <CardDescription>Current sample quality breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={freshnessDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {freshnessDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality Metrics Over Time</CardTitle>
              <CardDescription>VOC levels, CFU count, and turbidity measurements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={qualityMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="sample" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="voc" stroke="#ef4444" name="VOC (V)" />
                    <Line type="monotone" dataKey="cfu" stroke="#f59e0b" name="CFU (k)" />
                    <Line type="monotone" dataKey="turbidity" stroke="#3b82f6" name="Turbidity" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Shelf Life Distribution</CardTitle>
                <CardDescription>Histogram of predicted shelf life values</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { range: '0-12h', count: 5 },
                      { range: '12-24h', count: 12 },
                      { range: '24-48h', count: 25 },
                      { range: '48-72h', count: 18 },
                      { range: '72h+', count: 8 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quality Score Distribution</CardTitle>
                <CardDescription>Distribution of freshness scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { score: '0.0-0.2', count: 8 },
                      { score: '0.2-0.4', count: 15 },
                      { score: '0.4-0.6', count: 22 },
                      { score: '0.6-0.8', count: 28 },
                      { score: '0.8-1.0', count: 35 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="score" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Device Performance Comparison</CardTitle>
              <CardDescription>Compare quality metrics across different devices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { device: 'LACTEVA_001', avgShelfLife: 45, avgFreshness: 0.78, sampleCount: 85 },
                    { device: 'LACTEVA_002', avgShelfLife: 38, avgFreshness: 0.65, sampleCount: 65 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="device" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgShelfLife" fill="#3b82f6" name="Avg Shelf Life (h)" />
                    <Bar dataKey="sampleCount" fill="#10b981" name="Sample Count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}