"use client"

import { Bell, Loader2 } from "lucide-react"
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

import { Notification } from "../../prisma/generated"
import { markAllAsRead, markAsRead } from "@/actions/notifications"

export function NotificationsBell() {
  const queryClient = useQueryClient()

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
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
  })

  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* КНОПКА: Теперь 1 в 1 как чат */}
        <button className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:bg-white hover:text-blue-600 transition-all relative group bg-white/50 border border-transparent hover:border-slate-200 shadow-sm outline-none cursor-pointer">
          <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
          
          {unreadCount > 0 && (
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-600 rounded-full border-2 border-white shadow-sm animate-in zoom-in" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0 rounded-[1.5rem] border-2 border-slate-100 shadow-2xl mt-4" align="end">
        {/* ХЕДЕР */}
        <div className="p-4 flex items-center justify-between border-b border-slate-50">
          <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-900">Уведомления</h4>
          {unreadCount > 0 && (
            <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg font-black uppercase italic">
              {unreadCount} NEW
            </span>
          )}
        </div>

        {/* СПИСОК */}
        <div className="max-h-[350px] overflow-y-auto no-scrollbar">
          {isLoading ? (
            <div className="p-10 text-center">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600" />
            </div>
          ) : notifications && notifications.length > 0 ? (
            notifications.map((n) => (
              <Link
                key={n.id}
                href={n.link || "#"}
                onClick={() => !n.isRead && markOneMutation.mutate(n.id)}
                className={cn(
                  "block p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors relative group/item",
                  !n.isRead && "bg-blue-50/20"
                )}
              >
                {!n.isRead && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                )}
                <p className="font-black uppercase italic text-[11px] text-slate-900 leading-tight">
                  {n.title}
                </p>
                <p className="text-slate-500 text-[11px] mt-1 line-clamp-2 font-medium italic">
                  {n.message}
                </p>
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-tighter mt-2 group-hover/item:text-slate-400 transition-colors">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ru })}
                </p>
              </Link>
            ))
          ) : (
            <div className="p-12 text-center">
              <Bell className="w-8 h-8 text-slate-100 mx-auto mb-2" />
              <p className="text-[10px] font-black text-slate-300 uppercase italic">Пусто</p>
            </div>
          )}
        </div>

        {/* ФУТЕР */}
        {unreadCount > 0 && (
          <div className="p-2 border-t border-slate-50 bg-slate-50/50">
            <button
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="w-full py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-red-600 transition-all active:scale-95"
            >
              {markAllMutation.isPending ? "СИНХРОНИЗАЦИЯ..." : "ОЧИСТИТЬ ВСЁ"}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
