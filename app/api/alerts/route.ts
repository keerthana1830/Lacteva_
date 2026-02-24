import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Alert from '@/lib/models/Alert'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')
    const userId = searchParams.get('userId')
    const acknowledged = searchParams.get('acknowledged')
    const severity = searchParams.get('severity')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    const query: any = {}
    
    if (deviceId) query.deviceId = deviceId
    if (userId) query.userId = userId
    if (acknowledged !== null) query.acknowledged = acknowledged === 'true'
    if (severity) query.severity = severity
    
    const alerts = await Alert.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()
    
    return NextResponse.json({
      success: true,
      alerts
    })
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    
    // Validate required fields
    if (!body.deviceId || !body.userId || !body.type || !body.message) {
      return NextResponse.json(
        { success: false, error: 'Device ID, user ID, type, and message are required' },
        { status: 400 }
      )
    }
    
    const alert = new Alert({
      deviceId: body.deviceId,
      userId: body.userId,
      type: body.type,
      severity: body.severity || 'medium',
      message: body.message,
      timestamp: new Date(),
      acknowledged: false
    })
    
    await alert.save()
    
    return NextResponse.json({
      success: true,
      alert,
      message: 'Alert created successfully'
    })
  } catch (error) {
    console.error('Error creating alert:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create alert' },
      { status: 500 }
    )
  }
}