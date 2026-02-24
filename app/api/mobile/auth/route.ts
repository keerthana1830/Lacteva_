import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import connectDB from '@/lib/mongodb'
import { mockDB, useMockDB } from '@/lib/mock-db'

// Dynamically import models only when needed
let User: any = null
let Device: any = null

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { email, deviceId } = body
    
    if (!email || !deviceId) {
      return NextResponse.json(
        { success: false, error: 'Email and device ID are required' },
        { status: 400 }
      )
    }
    
    let user, device
    
    if (useMockDB) {
      // Use mock database
      user = await mockDB.findUser(email)
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        )
      }
      
      device = await mockDB.findDevice(deviceId)
      if (!device || device.userId !== user._id) {
        return NextResponse.json(
          { success: false, error: 'Device not found or access denied' },
          { status: 403 }
        )
      }
    } else {
      // Use MongoDB
      await connectDB()
      
      if (!User) {
        User = (await import('@/lib/models/User')).default
      }
      if (!Device) {
        Device = (await import('@/lib/models/Device')).default
      }
      
      user = await User.findOne({ email }).lean()
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        )
      }
      
      device = await Device.findOne({ 
        deviceId, 
        userId: user._id.toString() 
      }).lean()
      
      if (!device) {
        return NextResponse.json(
          { success: false, error: 'Device not found or access denied' },
          { status: 403 }
        )
      }
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        deviceId,
        role: user.role
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )
    
    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      device: {
        id: device._id,
        deviceId: device.deviceId,
        name: device.name,
        location: device.location,
        status: device.status
      }
    })
    
  } catch (error) {
    console.error('Mobile auth error:', error)
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    )
  }
}