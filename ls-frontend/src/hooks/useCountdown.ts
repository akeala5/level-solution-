import { useState, useEffect, useCallback } from 'react'

interface CountdownState {
  hours: number
  minutes: number
  seconds: number
  total: number
  isExpired: boolean
  formatted: string
  urgency: 'normal' | 'warning' | 'critical'
}

const pad = (n: number) => String(n).padStart(2, '0')

export function useCountdown(endsAt: string | Date): CountdownState {
  const compute = useCallback((): CountdownState => {
    const diff = new Date(endsAt).getTime() - Date.now()
    if (diff <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, total: 0, isExpired: true, formatted: '00:00:00', urgency: 'critical' }
    }
    const hours = Math.floor(diff / 3_600_000)
    const minutes = Math.floor((diff % 3_600_000) / 60_000)
    const seconds = Math.floor((diff % 60_000) / 1_000)
    const urgency = diff < 3_600_000 ? 'critical' : diff < 21_600_000 ? 'warning' : 'normal'
    return {
      hours, minutes, seconds, total: diff, isExpired: false,
      formatted: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
      urgency,
    }
  }, [endsAt])

  const [state, setState] = useState<CountdownState>(compute)

  useEffect(() => {
    setState(compute())
    const id = setInterval(() => setState(compute()), 1000)
    return () => clearInterval(id)
  }, [compute])

  return state
}
