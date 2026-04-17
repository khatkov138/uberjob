import { cn } from "@/lib/utils"

interface ContainerProps {
  children: React.ReactNode
  className?: string
}

export function Container({ children, className }: ContainerProps) {
  return (
    /** 
     * 1. Добавили h-full и min-h-0 внешнему div, чтобы он мог передавать высоту.
     * 2. Добавили flex-1, чтобы контейнер мог забирать место в layout.
     */
    <div className="w-full flex-1 flex flex-col items-center px-4 py-6 md:py-10 min-h-0">
      <div className={cn(
        "w-full max-w-5xl bg-slate-50/50 p-6 md:p-10 rounded-xl flex flex-col",
        className
      )}>
        {children}
      </div>
    </div>
  )
}
