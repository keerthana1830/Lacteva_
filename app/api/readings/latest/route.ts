import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import SpectralReading from '@/lib/models/SpectralReading'
import { mockDB, useMockDB } from '@/lib/mock-db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')
    
    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'Device ID is required' },
        { status: 400 }
      )
    }
    
    let reading
    
    if (useMockDB) {
      // Use mock database
      reading = await mockDB.findLatestReading(deviceId)
    } else {
      // Use MongoDB
      await connectDB()
      reading = await SpectralReading.findOne({ deviceId })
        .sort({ timestamp: -1 })
        .lean()
    }
    
    if (!reading) {
      return NextResponse.json({
        success: true,
        reading: null,
        message: 'No readings found for this device'
      })
    }
    
    return NextResponse.json({
      success: true,
      reading
    })
  } catch (error) {
    console.error('Error fetching latest reading:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch latest reading' },
      { status: 500 }
    )
  }
}