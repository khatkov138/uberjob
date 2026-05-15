"use client"

import { useEffect } from "react"

export function OrderCardSkeleton() {

  return (
    <div className="w-full bg-white border border-slate-100 rounded-[2.5rem] p-8 space-y-6 animate-pulse">
      {/* Шапка: Заголовок и Цена */}
      <div className="flex justify-between items-start">
        <div className="space-y-3 flex-1">
          <div className="h-8 bg-slate-100 rounded-xl w-3/4" />
          <div className="flex gap-2">
            <div className="h-3 bg-slate-50 rounded-md w-16" />
            <div className="h-3 bg-slate-50 rounded-md w-20" />
          </div>
        </div>
        <div className="w-32 h-12 bg-slate-50 rounded-2xl" />
      </div>

      {/* Описание */}
      <div className="space-y-2 pl-5 border-l-2 border-slate-50">
        <div className="h-4 bg-slate-50 rounded-lg w-full" />
        <div className="h-4 bg-slate-50 rounded-lg w-2/3" />
      </div>

      {/* Футер */}
      <div className="pt-8 border-t border-slate-50 flex justify-between items-center">
        <div className="flex gap-4">
          <div className="h-6 w-24 bg-slate-50 rounded-xl" />
          <div className="h-6 w-24 bg-slate-50 rounded-xl" />
        </div>
        <div className="h-10 w-32 bg-slate-100 rounded-2xl" />
      </div>
    </div>
  )
}
