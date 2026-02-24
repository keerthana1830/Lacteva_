import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Device from '@/lib/models/Device'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    const query = userId ? { userId } : {}
    
    const devices = await Device.find(query)
      .sort({ lastSeen: -1 })
      .lean()
    
    return NextResponse.json({
      success: true,
      devices
    })
  } catch (error) {
    console.error('Error fetching devices:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch devices' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    
    // Validate required fields
    if (!body.deviceId || !body.name || !body.userId) {
      return NextResponse.json(
        { success: false, error: 'Device ID, name, and user ID are required' },
        { status: 400 }
      )
    }
    
    // Check if device already exists
    const existingDevice = await Device.findOne({ deviceId: body.deviceId })
    if (existingDevice) {
      return NextResponse.json(
        { success: false, error: 'Device already exists' },
        { status: 409 }
      )
    }
    
    const device = new Device({
      deviceId: body.deviceId,
      name: body.name,
      location: body.location || 'Unknown',
      userId: body.userId,
      firmwareVersion: body.firmwareVersion || '1.0.0',
      status: 'offline',
      lastSeen: new Date(),
      calibrationDate: new Date(),
      settings: {
        samplingInterval: 60,
        autoCalibration: true,
        alertThresholds: {
          vocHigh: 1000,
          cfuHigh: 100000,
          shelfLifeLow: 24
        }
      }
    })
    
    await device.save()
    
    return NextResponse.json({
      success: true,
      device,
      message: 'Device registered successfully'
    })
  } catch (error) {
    console.error('Error creating device:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create device' },
      { status: 500 }
    )
  }
}