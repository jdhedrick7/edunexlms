'use client'

import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Clock } from 'lucide-react'

interface QuizTimerProps {
  startedAt: string
  timeLimitMinutes: number
  onTimeUp: () => void
  className?: string
}

export function QuizTimer({ startedAt, timeLimitMinutes, onTimeUp, className }: QuizTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [hasCalledTimeUp, setHasCalledTimeUp] = useState(false)

  const calculateTimeLeft = useCallback(() => {
    const start = new Date(startedAt).getTime()
    const now = Date.now()
    const elapsed = Math.floor((now - start) / 1000)
    const totalSeconds = timeLimitMinutes * 60
    return Math.max(0, totalSeconds - elapsed)
  }, [startedAt, timeLimitMinutes])

  useEffect(() => {
    // Initial calculation
    setTimeLeft(calculateTimeLeft())

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft()
      setTimeLeft(remaining)

      if (remaining === 0 && !hasCalledTimeUp) {
        setHasCalledTimeUp(true)
        onTimeUp()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [calculateTimeLeft, onTimeUp, hasCalledTimeUp])

  if (timeLeft === null) {
    return null
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const isLowTime = timeLeft < 300 // Less than 5 minutes
  const isCriticalTime = timeLeft < 60 // Less than 1 minute

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-lg',
        isLowTime && 'border-yellow-500 bg-yellow-50 text-yellow-700 dark:border-yellow-600 dark:bg-yellow-950 dark:text-yellow-400',
        isCriticalTime && 'border-red-500 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-950 dark:text-red-400 animate-pulse',
        !isLowTime && 'border-border bg-muted',
        className
      )}
    >
      <Clock className="h-5 w-5" />
      <span>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    </div>
  )
}
