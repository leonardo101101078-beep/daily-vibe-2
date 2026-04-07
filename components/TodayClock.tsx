'use client'

import { useEffect, useState } from 'react'

export function TodayClock() {
  const [time, setTime] = useState<string>(() =>
    new Date().toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  )

  useEffect(() => {
    const id = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString('zh-TW', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
      )
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <p className="font-display text-3xl font-bold tabular-nums tracking-tight text-foreground">
      {time}
    </p>
  )
}
