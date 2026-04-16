// components/navbar/role-switcher.tsx
"use client"

import { useRoleModeStore } from "@/store/use-role-store"
import { cn } from "@/lib/utils"
import { User, BriefcaseBusiness } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

export function RoleSwitcher() {
  const { mode, setMode } = useRoleModeStore()
  const router = useRouter()

  const handleSwitch = (newMode: 'CLIENT' | 'PRO') => {
    if (mode === newMode) return
    setMode(newMode)
    router.push(newMode === 'PRO' ? '/pro/dashboard' : '/client/dashboard')
  }

  return (
    <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 relative overflow-hidden">
      <button
        onClick={() => handleSwitch('CLIENT')}
        className={cn(
          "relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer",
          mode === 'CLIENT' ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
        )}
      >
        <User className="w-4 h-4" /> 
        <span>КЛИЕНТ</span>
        
        {mode === 'CLIENT' && (
          <motion.div
            layoutId="active-pill"
            className="absolute inset-0 bg-white rounded-xl shadow-md -z-10 border border-blue-50"
            transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
          />
        )}
      </button>

      <button
        onClick={() => handleSwitch('PRO')}
        className={cn(
          "relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer",
          mode === 'PRO' ? "text-white" : "text-slate-400 hover:text-slate-600"
        )}
      >
        <BriefcaseBusiness className="w-4 h-4" /> 
        <span>МАСТЕР</span>

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
