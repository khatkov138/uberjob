"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function FetchingRadar({ isVisible }: { isVisible: boolean }) {
  const [shouldShow, setShouldShow] = React.useState(false)
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    if (isVisible) {
      setShouldShow(true)
      if (timerRef.current) clearTimeout(timerRef.current)
    } else {
      // Устанавливаем минимальное время показа 800мс
      timerRef.current = setTimeout(() => {
        setShouldShow(false)
      }, 800)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isVisible])

  return (
    /* AnimatePresence нужен для анимации выхода (exit) */
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          // Начальное состояние
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          // Состояние при появлении
          animate={{ opacity: 1, y: 0, scale: 1 }}
          // Состояние при исчезновении (улетает вверх)
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 30 
          }}
          className="absolute inset-x-0 -top-6 z-40 flex justify-center pointer-events-none"
        >
          <div className="bg-slate-900/90 text-white px-6 py-3 rounded-2xl shadow-[8px_8px_0px_0px_rgba(59,130,246,0.3)] flex items-center gap-3 border-2 border-blue-500/30 backdrop-blur-md">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </div>
            
            <span className="text-[9px] font-black uppercase tracking-[0.2em] italic text-blue-50">
              Сканирую эфир...
            </span>

            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <Loader2 className="w-3 h-3 text-blue-400" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
