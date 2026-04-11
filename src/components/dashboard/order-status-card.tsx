import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, User, Clock } from "lucide-react"

export function OrderStatusCard({ order, type }: { order: any, type: "client" | "pro" }) {
  const isPending = order.status === "PENDING"
  
  return (
    <Card className="overflow-hidden border-l-4 border-l-blue-500">
      <CardContent className="p-5 flex flex-col md:flex-row justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg leading-none">{order.title}</h3>
            <Badge variant={isPending ? "outline" : "default"}>
              {order.status}
            </Badge>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {/* ИСПРАВЛЕНО: убрал лишние символы внутри тегов */}
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {order.address}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {new Date(order.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-2 text-sm border-t mt-2">
            <User className="w-4 h-4" />
            <span>
              {type === "client" 
                ? (order.worker?.name || "Поиск мастера...") 
                : (order.client?.name || "Заказчик")}
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between items-end">
          <p className="text-xl font-black text-blue-600">{order.price / 100} ₽</p>
          {/* Здесь будет кнопка действий */}
        </div>
      </CardContent>
    </Card>
  )
}
