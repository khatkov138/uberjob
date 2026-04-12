"use client"

import { Bell, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { markAllAsRead, markAsRead } from "@/app/actions/notifications"
import { Notification } from "../../prisma/generated"
// 1. Импортируем тип из Prisma

export function NotificationsBell() {
  const queryClient = useQueryClient()

  // 2. Типизируем useQuery
  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications")
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    },
    refetchInterval: 15000,
  })

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0

  const markAllMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  })

  const markOneMutation = useMutation({
    mutationFn: markAsRead,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] })
      const previousNotifications = queryClient.getQueryData<Notification[]>(["notifications"])

      if (previousNotifications) {
        queryClient.setQueryData<Notification[]>(["notifications"],
          previousNotifications.map(n => n.id === id ? { ...n, isRead: true } : n)
        )
      }
      return { previousNotifications }
    },
    onError: (err, id, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications"], context.previousNotifications)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    }
  })



  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-blue-50 transition-colors">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 border-2 border-background text-[9px] font-bold text-white rounded-full flex items-center justify-center animate-in zoom-in">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0 rounded-2xl shadow-xl border-blue-100" align="end">
        <div className="p-4 flex items-center justify-between border-b">
          <h4 className="font-bold text-sm">Уведомления</h4>
          {unreadCount > 0 && (
            <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">
              {unreadCount} новых
            </span>
          )}
        </div>

        <div className="max-h-[350px] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : notifications && notifications.length > 0 ? (
            notifications.map((n) => (
              <Link
                key={n.id}
                href={n.link || "#"}
                onClick={() => !n.isRead && markOneMutation.mutate(n.id)}
                className={cn(
                  "block p-4 border-b last:border-0 hover:bg-muted/50 transition-colors relative",
                  !n.isRead && "bg-blue-50/30"
                )}
              >
                {!n.isRead && (
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-full" />
                )}
                <p className="font-bold text-xs pr-4">{n.title}</p>
                <p className="text-muted-foreground text-[11px] mt-1 line-clamp-2">{n.message}</p>
                <p className="text-[9px] text-slate-400 mt-2">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ru })}
                </p>
              </Link>
            ))
          ) : (
            <div className="p-10 text-center space-y-2">
              <Bell className="w-8 h-8 text-muted-foreground/20 mx-auto" />
              <p className="text-xs text-muted-foreground">У вас пока нет уведомлений</p>
            </div>
          )}
        </div>

        <div className="p-2 border-t bg-muted/20 text-center">
          <Button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending || unreadCount === 0}
            variant="ghost"
            size="sm"
            className="text-[10px] font-bold uppercase w-full"
          >
            {markAllMutation.isPending ? "Обработка..." : "Очистить всё"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}