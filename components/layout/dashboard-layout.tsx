"use client"

import { Navigation } from '@/components/navigation'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Main content */}
      <div className="md:pl-64">
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}