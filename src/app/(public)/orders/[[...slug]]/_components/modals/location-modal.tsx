"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useLocationStore } from "@/store/use-location-store"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Search, MapPin, Loader2, Target, ArrowUpRight } from "lucide-react"
import { handleAction, handleApi, cn } from "@/lib/utils"

import { getOrCreateLocation } from "@/actions/location/manage"

import { useQueryClient } from "@tanstack/react-query"
import { useActiveFeed, useStaticFeed } from "../providers/FeedController"


export function LocationModal() {


  const router = useRouter()
  const { isModalOpen, closeModal } = useLocationStore() // Убрали лишний setGlobalLocation здесь
  const currentContext = useStaticFeed()
  const setGlobalLocation = useLocationStore(s => s.setGlobalLocation);
  const [query, setQuery] = React.useState("")
  const [suggestions, setSuggestions] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedUri, setSelectedUri] = React.useState<string | null>(null)

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    if (value.length < 3) { setSuggestions([]); return; }
    setIsLoading(true)
    try {
      const data = await handleApi<any[]>(fetch(`/api/geo/suggest?text=${encodeURIComponent(value)}`))
      setSuggestions(data || [])
    } finally { setIsLoading(false) }
  }

  const handleSelect = async (item: any) => {
    if (isLoading) return; // Педантичный блок повторных нажатий

    setIsLoading(true);
    setSelectedUri(item.uri);

    try {
      const location = await handleAction(getOrCreateLocation(item.uri));
      setGlobalLocation(location.id);

      // 🔥 ВЫЖЖЕНО: queryClient.removeQueries({ queryKey: ['orders'] });
      // Больше никакого преждевременного уничтожения данных под ногами у живого Хедера!

      // Мягко переводим роутер на новый город
      router.push(`/orders/${location.slug}`);

    } catch (error) {
      console.error("Shift error:", error);
      setSelectedUri(null);
      setIsLoading(false);
    }
  };


  return (
    <Dialog
      open={isModalOpen}
      onOpenChange={(open) => {
        // Блокируем закрытие, если идет процесс перехода
        if (!open && isLoading) return;
        if (!open) closeModal();
      }}
    >
      <DialogContent className="sm:max-w-[600px] p-0 border-none bg-white rounded-[3.5rem] shadow-2xl overflow-hidden">

        <div className="px-10 pt-12 pb-8 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">LOCATION / HUB</span>
            <div className={cn("w-1 h-1 bg-blue-600 rounded-full", isLoading && "animate-pulse")} />
          </div>
          <DialogTitle className="text-6xl font-black italic uppercase tracking-tighter text-slate-900 leading-[0.8]">
            Где <span className="text-blue-600">ищем?</span>
          </DialogTitle>

          {/* ФИКС ОШИБКИ Accessibility: Добавляем описание (скрыто визуально) */}
          <DialogDescription className="sr-only">
            Выберите город для поиска актуальных заказов в системе ZWORK.
          </DialogDescription>
        </div>

        <div className="px-10 pb-12 flex flex-col items-stretch">
          <div className="relative mb-10 w-full">
            <Search className={cn(
              "absolute left-7 top-1/2 -translate-y-1/2 w-6 h-6 transition-colors",
              query ? "text-blue-600" : "text-slate-300"
            )} />
            <Input
              placeholder={selectedUri ? "ПОДКЛЮЧЕНИЕ..." : "НАЗВАНИЕ ГОРОДА..."}
              value={query}
              onChange={handleSearch}
              disabled={!!selectedUri}
              className="h-24 w-full pl-16 pr-14 rounded-[2.5rem] border-slate-100 bg-slate-50/50 focus-visible:bg-white focus-visible:ring-0 focus-visible:border-blue-600 focus-visible:shadow-2xl focus-visible:shadow-blue-100/50 font-black italic text-2xl uppercase transition-all disabled:opacity-50"
              autoFocus
            />
            {isLoading && (
              <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 w-6 h-6 animate-spin text-blue-600" />
            )}
          </div>

          <div className="min-h-[350px] max-h-[450px] overflow-y-auto custom-scrollbar w-full">
            <div className="space-y-4 w-full">
              {suggestions.length > 0 ? (
                suggestions.map((s, i) => (
                  <button
                    key={i}
                    disabled={!!selectedUri}
                    onClick={() => handleSelect(s)} // Внутри handleSelect теперь НЕТ closeModal()
                    className={cn(
                      "group w-full flex items-center justify-between p-7 border rounded-[2.5rem] transition-all animate-in fade-in slide-in-from-bottom-2",
                      selectedUri === s.uri
                        ? "bg-blue-600 border-blue-600 shadow-xl shadow-blue-100"
                        : "bg-white hover:bg-slate-50 border-slate-100 hover:shadow-xl"
                    )}
                  >
                    <div className="flex items-center gap-6">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm shrink-0 transition-colors",
                        selectedUri === s.uri ? "bg-blue-500 border-blue-400" : "bg-slate-50 border-slate-100 group-hover:bg-white"
                      )}>
                        {selectedUri === s.uri ? (
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        ) : (
                          <MapPin className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className={cn(
                          "font-black uppercase italic text-2xl tracking-tighter leading-none mb-1 transition-colors",
                          selectedUri === s.uri ? "text-white" : "text-slate-900"
                        )}>
                          {s.title.text}
                        </span>
                        <span className={cn(
                          "text-[11px] font-bold uppercase tracking-widest italic transition-colors",
                          selectedUri === s.uri ? "text-blue-100" : "text-slate-400"
                        )}>
                          {selectedUri === s.uri ? "Перенаправление..." : s.subtitle?.text}
                        </span>
                      </div>
                    </div>
                    {!selectedUri && <ArrowUpRight className="w-7 h-7 text-blue-600 opacity-0 group-hover:opacity-100 transition-all" />}
                  </button>
                ))
              ) : !query && (
                <div className="w-full bg-blue-50 border border-blue-100 p-10 rounded-[3rem] flex items-center justify-between animate-in fade-in">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">ВАШ РАДАР СЕЙЧАС:</p>
                    <p className="text-5xl font-black italic text-slate-900 tracking-tighter leading-none">
                      {currentContext?.name || "Поиск..."}
                    </p>
                  </div>
                  <Target className="w-12 h-12 text-blue-600 animate-pulse opacity-20" />
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

  )
}
