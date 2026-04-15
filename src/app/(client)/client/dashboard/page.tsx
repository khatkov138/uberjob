"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { getClientOrders } from "@/app/actions/orders"
import { authClient } from "@/lib/auth-client"
import {
  Plus, ShoppingBag, ClipboardList,
  Settings, Zap, ArrowUpRight, Loader2,
  MessageSquare
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function ClientDashboardPage() {
  const { data: session } = authClient.useSession()

  const { data, isLoading } = useQuery({
    queryKey: ["client-orders"],
    queryFn: () => getClientOrders(),
  })

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-white">
      <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">ZWORK / SYSTEM</p>
    </div>
  )

  const orders = data?.data || []
  const activeCount = orders.filter((o: any) => o.status !== "COMPLETED" && o.status !== "CANCELLED").length

  return (
    <main className="min-h-screen bg-white pb-20">
      <div className="max-w-5xl mx-auto p-6 md:p-12 space-y-12">

        {/* ПРИВЕТСТВИЕ */}
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Dashboard</span>
            <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse" />
          </div>
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
            Привет, <span className="text-blue-600">{session?.user?.name?.split(' ')[0] || "Друг"}</span>
          </h1>
        </header>

        {/* ГЛАВНАЯ КНОПКА */}
        <Link href="/client/new-order" className="group block">
          <div className="bg-blue-600 rounded-[3.5rem] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl shadow-blue-200 transition-all hover:scale-[1.01] active:scale-95">
            <Plus className="absolute top-0 right-0 w-64 h-64 -mr-16 -mt-16 opacity-10 group-hover:rotate-12 transition-transform duration-700" />
            <div className="relative z-10 space-y-6">
              <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
                Опубликовать <br /> новую задачу
              </h2>
              <div className="flex items-center gap-3 bg-white/10 w-fit px-6 py-3 rounded-2xl backdrop-blur-md border border-white/20">
                <Zap className="w-5 h-5 fill-current text-yellow-300" />
                <span className="text-[10px] font-black uppercase tracking-widest">Исполнители уже в сети</span>
              </div>
            </div>
          </div>
        </Link>

        {/* СЕТКА ПЛИТОК */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* МОИ ЗАКАЗЫ */}
          <Link href="/client/my-orders" className="group md:col-span-2">
            <div className="h-full min-h-[220px] rounded-[2.5rem] p-8 bg-blue-600 text-white transition-all duration-500 flex flex-col justify-between hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-200 border-2 border-transparent">
              <div className="flex justify-between items-start">
                <div className="p-4 rounded-2xl bg-white/10 transition-transform duration-500 group-hover:scale-110">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <ArrowUpRight className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
              </div>
              <div>
                <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none mb-1">Мои заказы</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 italic">{activeCount} активных задач сейчас</p>
              </div>
            </div>
          </Link>

          {/* ЦЕНТР СООБЩЕНИЙ */}
          <Link href="/client/messages" className="group">
            <div className="h-full min-h-[220px] rounded-[2.5rem] p-8 bg-slate-900 text-white transition-all duration-500 flex flex-col justify-between hover:-translate-y-1 hover:shadow-xl border-2 border-transparent">
              <div className="flex justify-between items-start">
                <div className="p-4 rounded-2xl bg-white/10 transition-transform duration-500 group-hover:scale-110">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <div className="flex flex-col items-end">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none mb-1">Чат</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 italic">Обсуждение деталей с исполнителями</p>
              </div>
            </div>
          </Link>

          {/* ИСТОРИЯ */}
          <Link href="/client/history" className="group">
            <div className="h-full min-h-[220px] rounded-[2.5rem] p-8 bg-slate-50 text-slate-900 border-2 border-slate-100 transition-all duration-500 flex flex-col justify-between hover:-translate-y-1 hover:shadow-xl hover:bg-white">
              <div className="flex justify-between items-start">
                <div className="p-4 rounded-2xl bg-white shadow-sm transition-transform duration-500 group-hover:scale-110 border border-slate-100">
                  <ClipboardList className="w-8 h-8" />
                </div>
                <ArrowUpRight className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
              </div>
              <div>
                <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none mb-1">История</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 italic">Архив выполненных работ</p>
              </div>
            </div>
          </Link>

          {/* НАСТРОЙКИ */}
          <Link href="/client/settings" className="group">
            <div className="h-full min-h-[220px] rounded-[2.5rem] p-8 bg-slate-50 text-slate-900 border-2 border-slate-100 transition-all duration-500 flex flex-col justify-between hover:-translate-y-1 hover:shadow-xl hover:bg-white">
              <div className="flex justify-between items-start">
                <div className="p-4 rounded-2xl bg-white shadow-sm transition-transform duration-500 group-hover:scale-110 border border-slate-100">
                  <Settings className="w-8 h-8" />
                </div>
                <ArrowUpRight className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
              </div>
              <div>
                <h3 className="text-3xl font-black uppercase italic tracking-tighter leading-none mb-1">Настройки</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 italic">Профиль и доступы</p>
              </div>
            </div>
          </Link>

        </div>
      </div>
    </main>
  )
}
