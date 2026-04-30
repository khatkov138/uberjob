"use client"

import * as React from "react"
import { Loader2, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface ConfirmOfferModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading: boolean
  workerName?: string
}

export function ConfirmOfferModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  workerName
}: ConfirmOfferModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      {/* 
        1. Добавили overflow-hidden, чтобы ничего не вылетало.
        2. Добавили [&>button]:top-8 [&>button]:right-8 — это ПРАВИЛЬНЫЙ способ сдвинуть системный крестик вглубь модалки.
      */}
      <DialogContent className="sm:max-w-[420px] rounded-[3rem] border-none shadow-2xl bg-white p-8 pt-16 overflow-hidden [&>button]:top-8 [&>button]:right-8">
        
        <DialogHeader className="space-y-6 items-center text-center">
          <div className="w-20 h-20 bg-amber-50 rounded-[2rem] flex items-center justify-center ring-8 ring-amber-50/50">
            <AlertCircle className="w-10 h-10 text-amber-500" />
          </div>
          
          <div className="space-y-3">
            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
              Назначить мастера?
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 italic leading-relaxed">
              Вы выбираете <span className="text-blue-600 font-black">{workerName}</span> исполнителем. <br /> 
              Остальные предложения будут отклонены.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-10">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="h-16 rounded-2xl bg-slate-50 font-black uppercase italic text-[10px] tracking-widest text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={cn(
              "h-16 bg-slate-900 text-white rounded-2xl font-black uppercase italic text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200 disabled:opacity-50",
              "hover:bg-blue-600 hover:shadow-blue-100 hover:-translate-y-1"
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Подтвердить"
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
