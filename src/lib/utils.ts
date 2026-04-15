import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isWeekend, setHours, setMinutes, differenceInHours } from 'date-fns'
import { fr } from 'date-fns/locale'
import { BUSINESS_HOURS, MIN_ADVANCE_HOURS, BLOCK_ADVANCE_HOURS } from './constants'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy', { locale: fr })
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: fr })
}

export function isWithinBusinessHours(date: Date): boolean {
  if (isWeekend(date)) return false

  const startOfBusiness = setMinutes(setHours(date, BUSINESS_HOURS.start.hour), BUSINESS_HOURS.start.minute)
  const endOfBusiness = setMinutes(setHours(date, BUSINESS_HOURS.end.hour), BUSINESS_HOURS.end.minute)

  return date >= startOfBusiness && date <= endOfBusiness
}

export function getAdvanceWarning(startDate: Date): 'ok' | 'warning' | 'blocked' {
  const now = new Date()
  const hoursUntilStart = differenceInHours(startDate, now)

  if (hoursUntilStart < BLOCK_ADVANCE_HOURS) return 'blocked'
  if (hoursUntilStart < MIN_ADVANCE_HOURS) return 'warning'
  return 'ok'
}

export function getAdvanceMessage(level: 'ok' | 'warning' | 'blocked'): string | null {
  switch (level) {
    case 'blocked':
      return 'La demande doit être soumise au moins 2h à l\'avance.'
    case 'warning':
      return 'Attention : nous recommandons de soumettre votre demande au moins 24h à l\'avance pour garantir sa prise en charge.'
    default:
      return null
  }
}
