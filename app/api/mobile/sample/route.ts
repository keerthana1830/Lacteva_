import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import connectDB from '@/lib/mongodb'
import SpectralReading from '@/lib/models/SpectralReading'
import { calculateSpectralFeatures, validateSpectralReading } from '@/lib/utils'

export async function POST(request: NextRequest) {
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
    
    const body = await request.json()
    const { deviceId, reading } = body
    
    // Verify device access
    if (deviceId !== decoded.deviceId) {
      return NextResponse.json(
        { success: false, error: 'Device access denied' },
        { status: 403 }
      )
    }
    
    // Validate reading data
    const errors = validateSpectralReading(reading)
    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid reading data', details: errors },
        { status: 400 }
      )
    }
    
    // Calculate features
    const features = calculateSpectralFeatures(reading)
    
    // Get ML predictions
    let predictions = null
    try {
      const mlResponse = await fetch(`${process.env.ML_SERVICE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: Object.values(features),
          deviceId: reading.deviceId,
          timestamp: reading.timestampMs
        })
      })
      
      if (mlResponse.ok) {
        const mlData = await mlResponse.json()
        predictions = {
          freshness: mlData.freshness_prediction > 0.7 ? 'fresh' : 
                    mlData.freshness_prediction > 0.4 ? 'moderate' : 'spoiled',
          freshnessScore: mlData.freshness_prediction,
          shelfLifeHours: mlData.shelf_life_hours,
          confidence: mlData.confidence,
          riskLevel: mlData.freshness_prediction > 0.7 ? 'low' :
                    mlData.freshness_prediction > 0.4 ? 'medium' : 'high'
        }
      }
    } catch (mlError) {
      console.error('ML service error:', mlError)
    }
    
    // Save reading
    const spectralReading = new SpectralReading({
      ...reading,
      timestamp: new Date(reading.timestampMs || Date.now()),
      features,
      predictions
    })
    
    await spectralReading.save()
    
    return NextResponse.json({
      success: true,
      sampleId: spectralReading._id,
      predictions,
      message: 'Sample processed successfully'
    })
    
  } catch (error) {
    console.error('Mobile sample error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process sample' },
      { status: 500 }
    )
  }
}