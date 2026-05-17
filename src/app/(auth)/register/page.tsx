'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, Stethoscope } from 'lucide-react'

const registerSchema = z.object({
  hospital_name: z.string().min(3, 'Hospital name must be at least 3 characters'),
  full_name: z.string().min(2, 'Your name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Invalid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

type RegisterInput = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(values: RegisterInput) {
    setIsLoading(true)
    setServerError('')

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    const data = await res.json()

    if (!res.ok) {
      setServerError(data.error || 'Something went wrong')
      setIsLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="flex items-center gap-2 justify-center mb-8">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <Stethoscope className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-semibold text-slate-800">MediSaaS</span>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-800">Register your hospital</h1>
          <p className="text-slate-500 text-sm mt-1">Get started in under 2 minutes</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {serverError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Hospital / Clinic name</label>
            <input
              {...register('hospital_name')}
              placeholder="City General Hospital"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
            />
            {errors.hospital_name && (
              <p className="text-xs text-red-500">{errors.hospital_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Your full name</label>
            <input
              {...register('full_name')}
              placeholder="Dr. Arjun Sharma"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
            />
            {errors.full_name && (
              <p className="text-xs text-red-500">{errors.full_name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="admin@hospital.com"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Phone</label>
              <input
                {...register('phone')}
                placeholder="9876543210"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
              />
              {errors.phone && (
                <p className="text-xs text-red-500">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Password</label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Confirm password</label>
            <input
              {...register('confirm_password')}
              type="password"
              placeholder="••••••••"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
            />
            {errors.confirm_password && (
              <p className="text-xs text-red-500">{errors.confirm_password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                       text-white font-medium py-2.5 px-4 rounded-lg text-sm
                       transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}