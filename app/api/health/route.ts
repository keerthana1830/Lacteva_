import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check ML service health
    let mlServiceStatus = 'unknown'
    try {
      const mlResponse = await fetch(`${process.env.ML_SERVICE_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      mlServiceStatus = mlResponse.ok ? 'healthy' : 'unhealthy'
    } catch {
      mlServiceStatus = 'unreachable'
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
        ml_service: mlServiceStatus,
        database: process.env.MONGODB_URI ? 'configured' : 'mock'
      },
      version: '1.0.0'
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      },
      { status: 500 }
    )
  }
}