"use client"

import * as React from "react"
import Link from "next/link"
import { 
  Rocket, 
  Zap, 
  ShieldCheck, 
  MapPin, 
  BrainCircuit,
  ArrowUpRight,
  Activity,
  Fingerprint,
  Target
} from "lucide-react"
import { Container } from "@/components/shared/container"
import { cn } from "@/lib/utils"

export default function AboutPage() {
  return (
    <Container className="bg-white pb-20">
      {/* 1. HEADER: PROTOCOL ID */}
      <header className="space-y-4 mb-20 pt-10">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em]">ZWORK / SYSTEM / ABOUT</span>
          <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse" />
        </div>
        <h1 className="text-6xl md:text-[100px] font-black italic uppercase tracking-tighter text-slate-900 leading-[0.85]">
          Переосмысляя <br /> <span className="text-blue-600">рынок услуг.</span>
        </h1>
        <p className="text-xl md:text-2xl text-slate-400 font-bold uppercase italic tracking-tighter max-w-2xl border-l-4 border-slate-100 pl-6 mt-8">
          Мы объединили ИИ-протокол и Uber-механику, чтобы сократить путь от задачи до исполнения до 300 секунд.
        </p>
      </header>

      {/* 2. CORE TECH: GRID 12 COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20">
        
        {/* AI CLASSIFIER BLOCK */}
        <div className="lg:col-span-8 bg-slate-950 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
          <BrainCircuit className="absolute -top-10 -right-10 w-64 h-64 opacity-5 group-hover:rotate-12 transition-transform duration-1000" />
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-lg">
              <Zap size={14} className="text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 font-black">AI Classifier v.1.2</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">
              ИИ понимает <br /> ваши задачи.
            </h2>
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest leading-relaxed max-w-md">
              Вам больше не нужно копаться в списках категорий. Просто опишите проблему. Наш алгоритм сам определит тип работ и найдет нужного спеца.
            </p>
          </div>
        </div>

        {/* STATS BLOCK */}
        <div className="lg:col-span-4 grid grid-rows-2 gap-8">
          <div className="bg-blue-600 rounded-[2rem] p-8 text-white flex flex-col justify-between italic">
            <Activity className="w-8 h-8 opacity-50" />
            <div>
              <p className="text-4xl font-black tracking-tighter leading-none">300 сек.</p>
              <p className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-70">Среднее время отклика</p>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8 text-slate-950 flex flex-col justify-between italic">
            <Fingerprint className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-4xl font-black tracking-tighter leading-none">100%</p>
              <p className="text-[10px] font-black uppercase tracking-widest mt-2 text-slate-400">Безопасность сделки</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DUAL SECTIONS (КЛИЕНТ / МАСТЕР) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* FOR CLIENTS */}
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-10 space-y-10 group hover:shadow-2xl transition-all">
          <div className="flex items-center gap-3">
             <Target className="w-6 h-6 text-blue-600" />
             <h3 className="text-2xl font-black uppercase italic tracking-tighter">Заказчикам</h3>
          </div>
          <div className="space-y-6">
            <Step number="01" text="Мгновенная публикация через AI" />
            <Step number="02" text="Мастера в радиусе 10 км" />
            <Step number="03" text="Оплата после подтверждения" />
          </div>
          <Link href="/client/new-order" className="flex items-center justify-between w-full p-6 bg-slate-950 text-white rounded-2xl group/btn">
             <span className="font-black uppercase italic tracking-tighter">Создать задачу</span>
             <ArrowUpRight size={24} className="group-hover/btn:rotate-45 transition-transform" />
          </Link>
        </div>

        {/* FOR PROS */}
        <div className="bg-slate-900 rounded-[2.5rem] p-10 space-y-10 text-white group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px]" />
          <div className="flex items-center gap-3 relative z-10">
             <MapPin className="w-6 h-6 text-blue-400" />
             <h3 className="text-2xl font-black uppercase italic tracking-tighter">Мастерам</h3>
          </div>
          <div className="space-y-6 relative z-10">
            <Step number="01" text="Радар заказов в реальном времени" dark />
            <Step number="02" text="Никаких комиссий за просмотр" dark />
            <Step number="03" text="Прямой чат с клиентом" dark />
          </div>
          <Link href="/pro/feed" className="flex items-center justify-between w-full p-6 bg-blue-600 text-white rounded-2xl group/btn relative z-10">
             <span className="font-black uppercase italic tracking-tighter">Найти работу</span>
             <ArrowUpRight size={24} className="group-hover/btn:rotate-45 transition-transform" />
          </Link>
        </div>
      </div>
    </Container>
  )
}

function Step({ number, text, dark }: { number: string, text: string, dark?: boolean }) {
  return (
    <div className="flex items-start gap-4">
      <span className={cn("text-xl font-black italic", dark ? "text-blue-400" : "text-blue-600")}>{number}</span>
      <p className={cn("text-sm font-bold uppercase italic tracking-tighter", dark ? "text-slate-400" : "text-slate-600")}>{text}</p>
    </div>
  )
}
