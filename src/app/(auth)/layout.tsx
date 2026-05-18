import { Stethoscope } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-cyan-400 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-slate-900" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">CureLink</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Healthcare management,<br />
            <span className="text-cyan-400">reimagined.</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Real-time queues, smart appointments, and a patient discovery platform — all in one place.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { stat: '10,000+', label: 'Patients managed daily' },
              { stat: '500+', label: 'Clinics onboarded' },
              { stat: '99.9%', label: 'Uptime guaranteed' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-4">
                <span className="text-2xl font-bold text-cyan-400">{item.stat}</span>
                <span className="text-slate-400 text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 text-sm">© 2025 CureLink. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 justify-center mb-8 lg:hidden">
            <div className="w-8 h-8 bg-cyan-400 rounded-xl flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-slate-900" />
            </div>
            <span className="text-white font-semibold">CureLink</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}