import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/services/auth.service'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // If user has no role yet, default to admin for the owner
  const userWithRole = {
    ...user,
    role: user.role ?? 'admin' as const,
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar user={userWithRole} />
      <div className="ml-64 flex flex-col min-h-screen">
        <Topbar user={userWithRole} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}