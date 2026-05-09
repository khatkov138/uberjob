"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Rocket, Mail, MapPin, ArrowUpRight, Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import { GitHubIcon } from "./icons/GitHubIcon"
import { XIcon } from "lucide-react"

export function Footer({ className }: { className?: string }) {
  const pathname = usePathname()
  const currentYear = new Date().getFullYear()

  // Скрываем футер на страницах чата и в самой ленте (если там бесконечный скролл)
  const isHideFooter = pathname.includes("/chat") || pathname.includes("/orders")

  if (isHideFooter) return null

  return (
    <footer className={cn("w-full bg-white border-t border-slate-100 pt-24 pb-12", className)}>
      <div className="max-w-[1400px] mx-auto px-6">

        {/* ВЕРХНИЙ БЛОК: АГРЕССИВНЫЙ БРЕНДИНГ */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-16 mb-20">
          <div className="max-w-sm space-y-6">
            <Link href="/" className="group">
              <span className="text-4xl font-[1000] tracking-[ -0.08em] uppercase italic leading-none text-slate-950 group-hover:text-blue-600 transition-colors">
                ZWORK<span className="text-blue-600">.</span>
              </span>
            </Link>
            <p className="text-sm font-bold uppercase italic tracking-tighter text-slate-400 leading-relaxed">
              Умный протокол распределения задач. <br />
              <span className="text-slate-900">AI-классификация</span> и <span className="text-slate-900">Uber-механика</span> в архитектуре Next.js 15.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-xl hover:bg-slate-950 hover:text-white transition-all">
                <XIcon className="w-4 h-4" />
              </Link>
              <Link href="#" className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-xl hover:bg-slate-950 hover:text-white transition-all">
                <GitHubIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* НАВИГАЦИЯ В СТИЛЕ ТЕХНО-ТАБЛИЦЫ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-12 sm:gap-24">
            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Система</h4>
              <ul className="flex flex-col gap-4 text-sm font-black uppercase italic tracking-tighter">
                <li><Link href="/client/new-order" className="hover:translate-x-1 inline-block transition-transform">Создать таск</Link></li>
                <li><Link href="/orders" className="hover:translate-x-1 inline-block transition-transform text-slate-400">Лента заказов</Link></li>
                <li><Link href="/about" className="hover:translate-x-1 inline-block transition-transform">Протокол</Link></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Партнерам</h4>
              <ul className="flex flex-col gap-4 text-sm font-black uppercase italic tracking-tighter">
                <li><Link href="/pro/dashboard" className="hover:translate-x-1 inline-block transition-transform">Дашборд</Link></li>
                <li><Link href="/settings" className="hover:translate-x-1 inline-block transition-transform">Профиль</Link></li>
                <li><Link href="#" className="flex items-center gap-1 text-slate-400 hover:text-slate-950 transition-colors">
                  API Docs <ArrowUpRight size={12} />
                </Link></li>
              </ul>
            </div>

            <div className="hidden sm:block space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Связь</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-black italic">
                  <Globe size={14} className="text-slate-400" />
                  <span>ИРКУТСК / РФ</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 group hover:border-blue-200 transition-colors cursor-pointer">
                  <Rocket className="w-5 h-5 text-blue-600 group-hover:animate-bounce" />
                  <span className="text-[9px] font-black uppercase leading-tight">
                    Vercel Edge <br /> Deployment
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* НИЖНЯЯ ПАНЕЛЬ */}
        <div className="pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-black text-slate-950 uppercase tracking-widest">
              © {currentYear} ZWORK INC.
            </span>
            <div className="h-4 w-px bg-slate-200 hidden md:block" />
            <div className="flex gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <Link href="/privacy" className="hover:text-slate-950 transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-slate-950 transition-colors">Terms</Link>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  )
}
