"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Search, Download, Filter, Eye, Trash2 } from 'lucide-react'
import { SpectralReading } from '@/types'
import { formatTimestamp, getFreshnessColor, exportToCSV } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

interface HistoryDashboardProps {
    deviceId?: string
}

export function HistoryDashboard({ deviceId }: HistoryDashboardProps) {
    const [readings, setReadings] = useState<SpectralReading[]>([])
    const [filteredReadings, setFilteredReadings] = useState<SpectralReading[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [freshnessFilter, setFreshnessFilter] = useState<string>('all')
    const [dateRange, setDateRange] = useState({ start: '', end: '' })
    const { toast } = useToast()

    useEffect(() => {
        fetchReadings()
    }, [deviceId])

    useEffect(() => {
        filterReadings()
    }, [readings, searchTerm, freshnessFilter, dateRange])

    const fetchReadings = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (deviceId) params.append('deviceId', deviceId)
            params.append('limit', '100')

            const response = await fetch(`/api/readings?${params}`)
            if (response.ok) {
                const data = await response.json()
                setReadings(data.data || [])
            }
        } catch (error) {
            console.error('Failed to fetch readings:', error)
            toast({
                title: "Error",
                description: "Failed to fetch historical data",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const filterReadings = () => {
        let filtered = [...readings]

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(reading =>
                reading.deviceId.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        // Freshness filter
        if (freshnessFilter !== 'all') {
            filtered = filtered.filter(reading =>
                reading.predictions?.freshness === freshnessFilter
            )
        }

        // Date range filter
        if (dateRange.start && dateRange.end) {
            const start = new Date(dateRange.start)
            const end = new Date(dateRange.end)
            filtered = filtered.filter(reading => {
                const readingDate = new Date(reading.timestamp)
                return readingDate >= start && readingDate <= end
            })
        }

        setFilteredReadings(filtered)
    }

    const exportData = () => {
        if (filteredReadings.length === 0) {
            toast({
                title: "No Data",
                description: "No readings to export",
                variant: "destructive"
            })
            return
        }

        const exportData = filteredReadings.map(reading => ({
            timestamp: formatTimestamp(reading.timestamp),
            deviceId: reading.deviceId,
            freshness: reading.predictions?.freshness || 'unknown',
            freshnessScore: reading.predictions?.freshnessScore || 0,
            shelfLifeHours: reading.predictions?.shelfLifeHours || 0,
            vocVoltage: reading.vocVoltage,
            cfuEstimate: reading.cfuEstimate,
            confidence: reading.predictions?.confidence || 0
        }))

        exportToCSV(exportData, `lacteva-history-${Date.now()}.csv`)
        toast({
            title: "Export Complete",
            description: `Exported ${exportData.length} readings`
        })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Historical Data</h2>
                    <p className="text-muted-foreground">
                        View and analyze past milk quality readings
                    </p>
                </div>
                <Button onClick={exportData} disabled={filteredReadings.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Search</label>
                            <div className="relative">
                                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                                <Input
                                    placeholder="Search device ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Freshness</label>
                            <Select value={freshnessFilter} onValueChange={setFreshnessFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All freshness levels" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="fresh">Fresh</SelectItem>
                                    <SelectItem value="moderate">Moderate</SelectItem>
                                    <SelectItem value="spoiled">Spoiled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Start Date</label>
                            <Input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">End Date</label>
                            <Input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                            setSearchTerm('')
                            setFreshnessFilter('all')
                            setDateRange({ start: '', end: '' })
                        }}>
                            Clear Filters
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Showing {filteredReadings.length} of {readings.length} readings
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Results */}
            <Card>
                <CardHeader>
                    <CardTitle>Reading History</CardTitle>
                    <CardDescription>
                        Historical milk quality analysis results
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                        </div>
                    ) : filteredReadings.length === 0 ? (
                        <div className="text-center py-8">
                            <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-500">No readings found</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredReadings.map((reading) => (
                                <div key={reading._id} className="border rounded-lg p-4 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <p className="font-medium">{reading.deviceId}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {formatTimestamp(reading.timestamp)}
                                                </p>
                                            </div>

                                            <Badge className={getFreshnessColor(reading.predictions?.freshness || 'unknown')}>
                                                {reading.predictions?.freshness?.toUpperCase() || 'UNKNOWN'}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm">
                                            <div className="text-center">
                                                <p className="text-muted-foreground">Shelf Life</p>
                                                <p className="font-medium">
                                                    {reading.predictions?.shelfLifeHours?.toFixed(1) || 'N/A'}h
                                                </p>
                                            </div>

                                            <div className="text-center">
                                                <p className="text-muted-foreground">Confidence</p>
                                                <p className="font-medium">
                                                    {reading.predictions?.confidence ?
                                                        `${(reading.predictions.confidence * 100).toFixed(1)}%` : 'N/A'}
                                                </p>
                                            </div>

                                            <div className="text-center">
                                                <p className="text-muted-foreground">VOC</p>
                                                <p className="font-medium">
                                                    {reading.vocVoltage?.toFixed(3) || 'N/A'}V
                                                </p>
                                            </div>

                                            <Button variant="ghost" size="sm">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}