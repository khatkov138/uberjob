import { cn } from "@/lib/utils"

interface ContainerProps {
  children: React.ReactNode
  className?: string
}

export function Container({ children, className }: ContainerProps) {
  return (
    /** 
     * Теперь используем max-w-5xl (1024px) как стандарт. 
     * Это даст больше места для твоих карточек заказов и откликов.
     */
    <div className="w-full flex flex-col items-center px-4 py-6 md:py-10">
      <div className={cn(
        "w-full max-w-5xl bg-slate-50/50 p-6 md:p-10 shrink-0 min-h-fit rounded-xl",
        className
      )}>
        {children}
      </div>
    </div>
  )
}
