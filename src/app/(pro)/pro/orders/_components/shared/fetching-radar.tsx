"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

export function FetchingRadar({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null

  return (
    <div className="absolute inset-x-0 -top-4 z-40 flex justify-center pointer-events-none">
      <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-[8px_8px_0px_0px_rgba(59,130,246,0.3)] flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 border-2 border-blue-500/30 backdrop-blur-md">
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </div>
        <span className="text-[9px] font-black uppercase tracking-[0.2em] italic text-blue-50">
          Сканирую эфир...
        </span>
        <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
      </div>
    </div>
  )
}
