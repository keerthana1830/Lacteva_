import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Device from '@/lib/models/Device'

export async function GET(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  try {
    await connectDB()
    
    const device = await Device.findOne({ deviceId: params.deviceId }).lean()
    
    if (!device) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      device
    })
  } catch (error) {
    console.error('Error fetching device:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch device' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  try {
    await connectDB()
    
    const body = await request.json()
    
    const device = await Device.findOneAndUpdate(
      { deviceId: params.deviceId },
      { 
        ...body,
        lastSeen: new Date()
      },
      { new: true }
    )
    
    if (!device) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      device,
      message: 'Device updated successfully'
    })
  } catch (error) {
    console.error('Error updating device:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update device' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  try {
    await connectDB()
    
    const device = await Device.findOneAndDelete({ deviceId: params.deviceId })
    
    if (!device) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Device deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting device:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete device' },
      { status: 500 }
    )
  }
}