"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useLocationStore } from "@/store/use-location-store"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Search, MapPin, Loader2, Target } from "lucide-react"
import { handleAction, handleApi } from "@/lib/utils"
import { toast } from "sonner"
import { getOrCreateLocation } from "@/actions/location/manage"
import { FeedContext } from "../../page"



interface YandexSuggestItem {
  title: { text: string }
  subtitle?: { text: string }
  uri: string
}

export function LocationModal() {
  const router = useRouter()
  const { isModalOpen, closeModal, setGlobalLocation } = useLocationStore()

  const [query, setQuery] = React.useState("")
  const [suggestions, setSuggestions] = React.useState<YandexSuggestItem[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  // Достаем данные города из кеша, который наполнил OrdersPageClient
  const { data: currentContext } = useQuery<FeedContext>({
    queryKey: ['current-location'],
    enabled: false, // Используем только как хранилище
    queryFn: () => { throw new Error("Query data not found in cache") },
  })

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)

    if (value.length < 3) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    try {
      const data = await handleApi<YandexSuggestItem[]>(
        fetch(`/api/geo/suggest?text=${encodeURIComponent(value)}`)
      )
      setSuggestions(data || [])
    } catch (err) {
      console.error("ZWORK_GEO_ERROR:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = async (item: YandexSuggestItem) => {
    setIsLoading(true)
    try {
      const location = await handleAction(getOrCreateLocation(item.uri))

      // 1. Обновляем ID в Zustand (и в куках через middleware)
      setGlobalLocation(location.id)

      // 2. Закрываем UI
      closeModal()
      setQuery("")
      setSuggestions([])

      // 3. SSR переход — страница OrdersPage подтянет новые данные в ['current-location']
      router.push(`/orders/${location.slug}`)

      toast.success(`Локация: ${location.name}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ошибка калибровки"
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-[520px] p-0 border-none bg-white rounded-[3.5rem] shadow-2xl overflow-hidden">
        <div className="p-8 pb-4">
          <DialogTitle className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none mb-2">
            Где ищем<span className="text-blue-600">?</span>
          </DialogTitle>
          <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            Выберите город для калибровки эфира
          </DialogDescription>
        </div>

        <div className="px-8 pb-8 space-y-6">
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Название города..."
              value={query}
              onChange={handleSearch}
              className="h-16 pl-16 pr-14 rounded-3xl border-2 border-slate-100 focus-visible:ring-blue-600 font-black italic text-lg uppercase bg-slate-50/50"
              autoFocus
            />
            {isLoading && (
              <Loader2 className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-blue-600" />
            )}
          </div>

          <div className="min-h-[100px] max-h-[380px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {suggestions.length > 0 ? (
              suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(s)}
                  className="w-full flex items-center gap-5 p-5 hover:bg-slate-900 rounded-[2rem] transition-all group text-left"
                  disabled={isLoading}
                >
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-white/10 transition-colors shrink-0">
                    <MapPin className="w-5 h-5 text-slate-400 group-hover:text-blue-400" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-black uppercase italic text-base tracking-tighter text-slate-900 group-hover:text-white truncate">
                      {s.title.text}
                    </span>
                    {s.subtitle?.text && (
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-slate-500 truncate">
                        {s.subtitle.text}
                      </span>
                    )}
                  </div>
                </button>
              ))
            ) : query.length >= 3 && !isLoading ? (
              <div className="py-12 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                <p className="text-slate-400 font-black italic uppercase text-xs">Город не найден</p>
              </div>
            ) : (
              <div className="p-8 bg-blue-50/50 rounded-[2.5rem] border-2 border-blue-100/50 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-blue-400 tracking-[0.2em]">Текущий радар:</p>
                  <p className="font-black text-2xl italic uppercase tracking-tighter text-slate-900">
                    {currentContext?.name || "Поиск..."}
                  </p>
                </div>
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                  <Target className={`w-6 h-6 text-blue-600 ${isLoading ? 'animate-spin' : 'animate-pulse'}`} />
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
