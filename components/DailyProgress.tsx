import { Progress } from '@/components/ui/progress'
import { Sparkles } from 'lucide-react'
import { AppIcon } from '@/components/AppIcon'

interface DailyProgressProps {
  completed: number
  total: number
}

export function DailyProgress({ completed, total }: DailyProgressProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
  const isAllDone = completed === total && total > 0

  return (
    <div className="sticky top-0 z-10 border-b bg-background/90 px-5 py-3 backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold">今日進度</span>
          {isAllDone && (
            <AppIcon
              icon={Sparkles}
              size="sm"
              className="h-3.5 w-3.5 text-primary animate-pulse"
            />
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{completed}</span>
          {' / '}
          {total}
          <span className="ml-1.5 font-medium text-primary">{percentage}%</span>
        </span>
      </div>

      <Progress value={percentage} className="h-2" />
    </div>
  )
}
