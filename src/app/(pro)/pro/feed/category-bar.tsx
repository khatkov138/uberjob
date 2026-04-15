"use client"

import * as React from "react"
import { X, Filter } from "lucide-react"

interface CategoryBarProps {
  userCategories: string[]
  onRemove: (skill: string) => void
}

export function CategoryBar({ userCategories, onRemove }: CategoryBarProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
          Ваши активные категории
        </h3>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        {userCategories.length > 0 ? (
          userCategories.map((skill) => (
            <button
              key={skill}
              onClick={() => onRemove(skill)}
              className="group flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase whitespace-nowrap shadow-md shadow-blue-100 transition-all hover:bg-red-500 active:scale-95"
            >
              {skill}
              <X className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
            </button>
          ))
        ) : (
          <div className="flex items-center gap-2 px-2 py-2 text-[10px] font-bold text-slate-400 italic">
            <Filter className="w-3 h-3" /> 
            Подпишитесь на категории работ, нажимая на теги в карточках заказов
          </div>
        )}
      </div>
    </div>
  )
}
