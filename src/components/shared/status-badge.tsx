import { cn } from '@/lib/utils'

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple'

interface StatusBadgeProps { label: string; variant: BadgeVariant }

const styles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50  text-amber-700  border-amber-200',
  error:   'bg-red-50    text-red-700    border-red-200',
  info:    'bg-blue-50   text-blue-700   border-blue-200',
  neutral: 'bg-slate-100 text-slate-600  border-slate-200',
  purple:  'bg-purple-50 text-purple-700 border-purple-200',
}

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
      styles[variant]
    )}>
      {label}
    </span>
  )
}