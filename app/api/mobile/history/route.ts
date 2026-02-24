import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import connectDB from '@/lib/mongodb'
import SpectralReading from '@/lib/models/SpectralReading'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    // Verify JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authorization token required' },
        { status: 401 }
      )
    }
    
    const token = authHeader.substring(7)
    let decoded: any
    
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch (jwtError) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    // Verify device access
    if (deviceId && deviceId !== decoded.deviceId) {
      return NextResponse.json(
        { success: false, error: 'Device access denied' },
        { status: 403 }
      )
    }
    
    // Build query
    const query: any = { deviceId: decoded.deviceId }
    
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }
    
    // Fetch readings
    const readings = await SpectralReading.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('timestamp deviceId predictions features vocVoltage cfuEstimate')
      .lean()
    
    // Format for mobile response
    const formattedReadings = readings.map(reading => ({
      id: reading._id,
      timestamp: reading.timestamp,
      deviceId: reading.deviceId,
      freshness: reading.predictions?.freshness || 'unknown',
      freshnessScore: reading.predictions?.freshnessScore || 0,
      shelfLifeHours: reading.predictions?.shelfLifeHours || 0,
      confidence: reading.predictions?.confidence || 0,
      riskLevel: reading.predictions?.riskLevel || 'unknown',
      vocLevel: reading.vocVoltage || 0,
      cfuLevel: reading.cfuEstimate || 0
    }))
    
    return NextResponse.json({
      success: true,
      readings: formattedReadings,
      count: formattedReadings.length,
      deviceId: decoded.deviceId
    })
    
  } catch (error) {
    console.error('Mobile history error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch history' },
      { status: 500 }
    )
  }
}