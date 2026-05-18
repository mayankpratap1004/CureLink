'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

const schema = z.object({
  hospital_name: z.string().min(3, 'Hospital name must be at least 3 characters'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Invalid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})
type FormInput = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(schema) as any,
  })

  async function onSubmit(values: FormInput) {
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

    const supabase = createClient()
    await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    router.push('/dashboard')
    router.refresh()
  }

  const inputClass = `w-full px-4 py-3 text-sm bg-white/5 border border-white/10 rounded-xl
    text-white placeholder:text-slate-500 outline-none
    focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20`

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Register your hospital</h2>
        <p className="text-slate-400 text-sm mt-1">Get started in under 2 minutes</p>
      </div>

      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
              {serverError}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Hospital / Clinic name</label>
            <input {...register('hospital_name')} placeholder="City General Hospital" className={inputClass} />
            {errors.hospital_name && <p className="text-xs text-red-400">{errors.hospital_name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Your full name</label>
            <input {...register('full_name')} placeholder="Dr. Arjun Sharma" className={inputClass} />
            {errors.full_name && <p className="text-xs text-red-400">{errors.full_name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Email</label>
              <input {...register('email')} type="email" placeholder="admin@hospital.com" className={inputClass} />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Phone</label>
              <input {...register('phone')} placeholder="9876543210" className={inputClass} />
              {errors.phone && <p className="text-xs text-red-400">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Password</label>
            <div className="relative">
              <input {...register('password')} type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters" className={`${inputClass} pr-11`} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Confirm password</label>
            <input {...register('confirm_password')} type="password" placeholder="••••••••" className={inputClass} />
            {errors.confirm_password && <p className="text-xs text-red-400">{errors.confirm_password.message}</p>}
          </div>

          <button type="submit" disabled={isLoading}
            className="w-full bg-cyan-400 hover:bg-cyan-300 disabled:bg-cyan-400/50
                       text-slate-900 font-semibold py-3 px-4 rounded-xl text-sm
                       flex items-center justify-center gap-2 mt-2">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}