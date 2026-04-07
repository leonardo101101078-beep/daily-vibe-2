import type { LucideIcon, LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'

const SIZE_CLASS = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
} as const

export type AppIconSize = keyof typeof SIZE_CLASS

export type AppIconProps = {
  icon: LucideIcon
  size?: AppIconSize
} & Omit<LucideProps, 'size'>

export function AppIcon({
  icon: Icon,
  size = 'md',
  strokeWidth = 1.5,
  className,
  ...props
}: AppIconProps) {
  return (
    <Icon
      strokeWidth={strokeWidth}
      className={cn(SIZE_CLASS[size], className)}
      {...props}
    />
  )
}
