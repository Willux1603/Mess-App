import { REQUEST_STATUSES, type RequestStatusKey } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: RequestStatusKey
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = REQUEST_STATUSES[status]

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', config.color, className)}>
      {config.label}
    </span>
  )
}
