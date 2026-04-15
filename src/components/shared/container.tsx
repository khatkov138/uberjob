import { cn } from "@/lib/utils"

interface ContainerProps {
  children: React.ReactNode
  className?: string
  scrollable?: boolean
}

export function Container({ children, className, scrollable = true }: ContainerProps) {
  return (
    <div className={cn(
      "w-full h-full bg-white flex flex-col items-center px-4",
      // pt-4 md:pt-8 — этого достаточно, чтобы контент не лип к бегущей строке
      scrollable && "overflow-y-auto no-scrollbar pt-4 md:pt-8" 
    )}>
      <div className={cn(
        /**
         * Убрали mt-4 и гигантские pt-12/16.
         * Оставили только базовый паддинг p-6 для мобилок и p-10 для десктопа.
         */
        "w-full max-w-4xl p-6 md:p-10 mb-20 shrink-0 min-h-fit",
        className
      )}>
        {children}
      </div>
    </div>
  )
}
