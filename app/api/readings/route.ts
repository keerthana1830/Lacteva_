import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import { calculateSpectralFeatures, validateSpectralReading } from '@/lib/utils'
import { SpectralReading as ISpectralReading } from '@/types'
import { mockDB, useMockDB } from '@/lib/mock-db'

// Dynamically import SpectralReading model only when needed
let SpectralReading: any = null

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = parseInt(searchParams.get('skip') || '0')
    
    let readings
    
    if (useMockDB) {
      // Use mock database
      const query = deviceId ? { deviceId } : {}
      readings = await mockDB.findReadings(query, { 
        sort: { timestamp: -1 }, 
        limit, 
        skip 
      })
    } else {
      // Use MongoDB
      const connection = await connectDB()
      if (!connection) {
        throw new Error('Database connection failed')
      }
      
      if (!SpectralReading) {
        SpectralReading = (await import('@/lib/models/SpectralReading')).default
      }
      
      const query = deviceId ? { deviceId } : {}
      readings = await SpectralReading.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .lean()
    }
    
    return NextResponse.json({
      success: true,
      data: readings,
      count: readings.length
    })
  } catch (error) {
    console.error('Error fetching readings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch readings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the reading data
    const errors = validateSpectralReading(body)
    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: errors },
        { status: 400 }
      )
    }
    
    // Calculate spectral features
    const features = calculateSpectralFeatures(body as ISpectralReading)
    
    // Get ML predictions
    let predictions = null
    try {
      const mlResponse = await fetch(`${process.env.ML_SERVICE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: Object.values(features),
          deviceId: body.deviceId,
          timestamp: body.timestampMs
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
      // Continue without predictions if ML service is unavailable
    }
    
    // Create the reading with features and predictions
    const readingData = {
      ...body,
      timestamp: new Date(body.timestampMs || Date.now()),
      features,
      predictions
    }
    
    let reading
    
    if (useMockDB) {
      // Use mock database
      reading = await mockDB.saveReading(readingData as ISpectralReading)
    } else {
      // Use MongoDB
      const connection = await connectDB()
      if (!connection) {
        throw new Error('Database connection failed')
      }
      
      if (!SpectralReading) {
        SpectralReading = (await import('@/lib/models/SpectralReading')).default
      }
      
      const spectralReading = new SpectralReading(readingData)
      reading = await spectralReading.save()
    }
    
    return NextResponse.json({
      success: true,
      data: reading,
      message: 'Reading saved successfully'
    })
  } catch (error) {
    console.error('Error saving reading:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save reading' },
      { status: 500 }
    )
  }
}