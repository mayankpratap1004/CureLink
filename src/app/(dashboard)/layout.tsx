import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/services/auth.service'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const userWithRole = { ...user, role: (user.role ?? 'admin') as typeof user.role }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar user={userWithRole} />

      {/* Main content — offset by sidebar on desktop, top bar on mobile */}
      <div className="lg:pl-60">
        <div className="pt-14 lg:pt-0">
          <Topbar user={userWithRole} />
          <main className="p-4 sm:p-6 max-w-7xl mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}