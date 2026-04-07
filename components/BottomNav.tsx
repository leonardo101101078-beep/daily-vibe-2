'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarCheck, CalendarDays, Target, UserRound } from 'lucide-react'
import { AppIcon } from '@/components/AppIcon'
import { cn } from '@/lib/utils'

const links = [
  { href: '/focus', label: '重點', icon: Target },
  { href: '/today', label: '今日', icon: CalendarCheck },
  { href: '/weekly', label: '每週', icon: CalendarDays },
  { href: '/settings', label: '個人', icon: UserRound },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 mx-auto max-w-md rounded-t-3xl border border-border/60 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.12)] backdrop-blur-md supports-[backdrop-filter]:bg-card/90">
      <div className="flex items-stretch justify-around px-1 pt-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/today'
              ? pathname === '/today' || pathname === '/'
              : pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-2 text-[10px] font-semibold transition-all duration-200 active:scale-95 motion-reduce:active:scale-100',
                active
                  ? 'bg-primary/12 text-primary'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              )}
            >
              <AppIcon
                icon={Icon}
                size="md"
                className="transition-transform duration-200"
              />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
