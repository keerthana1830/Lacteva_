import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { DeviceManagement } from '@/components/dashboard/device-management'

export default function DevicesPage() {
  return (
    <DashboardLayout>
      <DeviceManagement />
    </DashboardLayout>
  )
}