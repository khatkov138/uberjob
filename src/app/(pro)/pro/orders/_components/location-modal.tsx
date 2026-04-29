"use client"

import * as React from "react"
import { useLocationStore } from "@/store/use-location-store"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Search, MapPin, Loader2, Target } from "lucide-react"
import { handleApi } from "@/lib/utils"
import { toast } from "sonner"

// --- ТИПИЗАЦИЯ ЯНДЕКС API ---

interface YandexSuggestItem {
  title: { text: string }
  subtitle?: { text: string }
  uri: string
  distance?: { value: number; text: string }
}

interface GeocodeResponse {
  lat: number
  lng: number
}

// ----------------------------

export function LocationModal() {
  const { isModalOpen, closeModal, setLocation, city: currentCity } = useLocationStore()

  const [query, setQuery] = React.useState("")
  const [suggestions, setSuggestions] = React.useState<YandexSuggestItem[]>([]) // Без any
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)

    if (value.length < 3) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    try {
      // Типизируем вызов handleApi
      const data = await handleApi<YandexSuggestItem[]>(
        fetch(`/api/geo/suggest?text=${encodeURIComponent(value)}`)
      )
      setSuggestions(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Ошибка поиска"
      console.error("ZWORK_GEO_ERROR:", message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = async (item: YandexSuggestItem) => { // Типизированный параметр
    setIsLoading(true)
    try {
      const coords = await handleApi<GeocodeResponse>(
        fetch(`/api/geo/geocode?uri=${encodeURIComponent(item.uri)}`)
      )

      setLocation(item.title.text, coords.lat, coords.lng)

      setQuery("")
      setSuggestions([])
      closeModal()

      toast.success(`Локация: ${item.title.text}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Ошибка координат"
      toast.error(message)
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
                  <p className="font-black text-2xl italic uppercase tracking-tighter text-slate-900">{currentCity}</p>
                </div>
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                  <Target className="w-6 h-6 text-blue-600 animate-pulse" />
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
