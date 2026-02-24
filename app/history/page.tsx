import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { HistoryDashboard } from '@/components/dashboard/history-dashboard'

export default function HistoryPage() {
  return (
    <DashboardLayout>
      <HistoryDashboard />
    </DashboardLayout>
  )
}