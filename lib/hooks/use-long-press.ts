'use client'

import { useCallback, useRef } from 'react'

const DEFAULT_MS = 500

/**
 * Long-press (touch + mouse): fires `onLongPress` after holding ~500ms.
 * Cancel on release, leave, or cancel.
 */
export function useLongPress(
  onLongPress: () => void,
  ms: number = DEFAULT_MS,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    clear()
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      onLongPress()
    }, ms)
  }, [clear, onLongPress, ms])

  return {
    onPointerDown: () => {
      start()
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
  }
}
