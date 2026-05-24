"use client"

import { cn } from "@/lib/utils"
import { User, BriefcaseBusiness } from "lucide-react"
import { motion } from "framer-motion"

interface RoleSwitcherProps {
  mode: 'CLIENT' | 'PRO'
  onSwitch: (newMode: 'CLIENT' | 'PRO') => void
}

export function RoleSwitcher({ mode, onSwitch }: RoleSwitcherProps) {
  return (
    <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 relative overflow-hidden w-full">
      {/* КНОПКА ЗАКАЗЧИКА */}
      <button
        type="button"
        onClick={() => onSwitch('CLIENT')}
        className={cn(
          "relative z-10 flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer select-none min-w-0",
          mode === 'CLIENT' ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
        )}
      >
        <User className="w-4 h-4 shrink-0" />
        <span className="truncate">КЛИЕНТ</span>

        {mode === 'CLIENT' && (
          <motion.div
            layoutId="active-pill"
            className="absolute inset-0 bg-white rounded-xl shadow-md -z-10 border border-blue-50"
            transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
          />
        )}
      </button>

      {/* КНОПКА ИСПОЛНИТЕЛЯ */}
      <button
        type="button"
        onClick={() => onSwitch('PRO')}
        className={cn(
          "relative z-10 flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer select-none min-w-0",
          mode === 'PRO' ? "text-white" : "text-slate-400 hover:text-slate-600"
        )}
      >
        <BriefcaseBusiness className="w-4 h-4 shrink-0" />
        <span className="truncate">Исполнитель</span>

        {mode === 'PRO' && (
          <motion.div
            layoutId="active-pill"
            className="absolute inset-0 bg-slate-900 rounded-xl shadow-lg -z-10"
            transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
          />
        )}
      </button>
    </div>
  )
}
