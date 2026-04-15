// components/dashboard/order-status-card.tsx
import { Badge } from "@/components/ui/badge"
import { Calendar, Info, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"

interface OrderStatusCardProps {
  order: any
  showPrice?: boolean // Добавляем флаг
}

export function OrderStatusCard({ order, showPrice = false }: OrderStatusCardProps) {
  const isNegotiable = order.price === 0

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-xl font-black italic leading-tight text-slate-900">
          {order.title || order.description?.slice(0, 30) + "..."}
        </h3>
        
        {/* Показываем цену в дашбордах, если передан флаг */}
        {showPrice && (
          <div className={cn(
            "shrink-0 px-3 py-1 rounded-xl border-2 font-black italic text-sm",
            isNegotiable ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-slate-900 border-slate-900 text-white"
          )}>
            {isNegotiable ? "Договорная" : `${order.price / 100} ₽`}
          </div>
        )}
      </div>
      
      <p className="text-sm text-slate-500 line-clamp-2 font-medium">
        {order.description}
      </p>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
          <Calendar className="w-3 h-3" />
          {order.dateType === "ASAP" ? "Срочно" : "В срок"}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-blue-500 bg-blue-50 px-2 py-1 rounded-md">
          <Info className="w-3 h-3" />
          ID: {order.id.slice(-6)}
        </div>
        {/* Бейдж статуса (нужен для дашбордов) */}
        <Badge variant="outline" className="text-[9px] uppercase font-black border-2 border-slate-100">
          {order.status}
        </Badge>
      </div>
    </div>
  )
}
