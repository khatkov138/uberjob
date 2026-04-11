import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, User, Clock, ChevronRight } from "lucide-react"

export function OrderStatusCard({ order, type }: { order: any, type: "client" | "pro" }) {
  return (
    <div className="flex flex-col md:flex-row justify-between gap-4 items-center w-full">
      <div className="space-y-2 w-full">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-lg leading-none group-hover:text-blue-600 transition-colors">
            {order.title}
          </h3>
          <Badge variant={order.status === "PENDING" ? "outline" : "default"}>
            {order.status}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {order.address}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(order.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xl font-black text-blue-600 whitespace-nowrap">{order.price / 100} ₽</p>
      </div>
    </div>
  )
}