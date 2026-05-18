import { cn } from '@/lib/utils'

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral'

interface StatusBadgeProps {
  label: string
  variant: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  error:   'bg-red-50 text-red-700 border-red-200',
  info:    'bg-blue-50 text-blue-700 border-blue-200',
  neutral: 'bg-slate-50 text-slate-600 border-slate-200',
}

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
      variantStyles[variant]
    )}>
      {label}
    </span>
  )
}