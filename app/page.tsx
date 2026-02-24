import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { RealTimeDashboard } from '@/components/dashboard/real-time-dashboard'

export default function HomePage() {
  // In a real app, this would come from user session/device selection
  const deviceId = "LACTEVA_001" // Default device for demo
  
  return (
    <DashboardLayout>
      <RealTimeDashboard deviceId={deviceId} />
    </DashboardLayout>
  )
}