"use client"

import * as React from "react"
import { X, Search, Plus, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { getAllCategories } from "@/actions/pro"


interface Category {
  id: string
  name: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  userCategories: string[]
  onAdd: (category: string) => void
}

export function CategorySearchModal({ isOpen, onClose, userCategories, onAdd }: Props) {
  const [query, setQuery] = React.useState("")

  const { data: dbCategories, isLoading } = useQuery<Category[]>({
    queryKey: ["all-categories"],
    queryFn: () => getAllCategories(),
    enabled: isOpen, // Загружаем только когда модалка открыта
  });

  // Фильтруем объекты из базы по полю name
  const filtered = (dbCategories || []).filter((cat) =>
    cat.name.toLowerCase().includes(query.toLowerCase())
  );

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose} 
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Поиск ниши</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              autoFocus
              placeholder="Напр: Электрика, Уборка..."
              className="w-full h-14 pl-12 pr-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-600 outline-none font-bold transition-all"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 no-scrollbar min-h-[100px] flex flex-col">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-[10px] font-black uppercase text-slate-400">Загружаем список...</p>
              </div>
            ) : filtered.length > 0 ? (
              filtered.map((cat) => {
                // Важно: сравниваем строку name с массивом строк userCategories
                const isSelected = userCategories.includes(cat.name)
                
                return (
                  <button
                    key={cat.id}
                    disabled={isSelected}
                    onClick={() => {
                      onAdd(cat.name)
                      // Не закрываем модалку, чтобы можно было добавить несколько сразу
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all active:scale-[0.98] shrink-0",
                      isSelected
                        ? "bg-blue-50 border-blue-100 opacity-60 cursor-default"
                        : "bg-white border-slate-100 hover:border-blue-600 hover:bg-blue-50/30"
                    )}
                  >
                    <span className="font-black uppercase italic text-sm text-slate-900">{cat.name}</span>
                    {isSelected ? (
                      <Check className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Plus className="w-5 h-5 text-slate-300" />
                    )}
                  </button>
                )
              })
            ) : (
              <div className="text-center py-10 space-y-2">
                <p className="text-slate-400 font-bold italic uppercase text-xs tracking-widest">Ничего не нашли</p>
                <p className="text-[10px] text-slate-300">Попробуйте другое слово</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
