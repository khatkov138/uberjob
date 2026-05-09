"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useLocationStore } from "@/store/use-location-store"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Search, MapPin, Loader2, Target, ArrowUpRight } from "lucide-react"
import { handleAction, handleApi, cn } from "@/lib/utils"

import { getOrCreateLocation } from "@/actions/location/manage"
import { useActiveFeed } from "../layout/feed-context-provider"

export function LocationModal() {
  const router = useRouter()
  const { isModalOpen, closeModal, setGlobalLocation } = useLocationStore()
  const currentContext = useActiveFeed()

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
    setIsLoading(true)
    setSelectedUri(item.uri)
    try {
      const location = await handleAction(getOrCreateLocation(item.uri))
      setGlobalLocation(location.id)
      closeModal()
      router.push(`/orders/${location.slug}`)
    } finally { setIsLoading(false); setSelectedUri(null) }
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-[600px] p-0 border-none bg-white rounded-[3.5rem] shadow-2xl overflow-hidden">
        
        {/* ХЕДЕР — выравниваем паддинги */}
        <div className="px-10 pt-12 pb-8 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">LOCATION / HUB</span>
            <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse" />
          </div>
          <DialogTitle className="text-6xl font-black italic uppercase tracking-tighter text-slate-900 leading-[0.8]">
            Где <span className="text-blue-600">ищем?</span>
          </DialogTitle>
        </div>

        {/* ОСНОВНОЙ КОНТЕЙНЕР — строго одна ширина для всего */}
        <div className="px-10 pb-12 flex flex-col items-stretch">
          
          {/* ПОИСК — теперь он на всю ширину контейнера */}
          <div className="relative mb-10 w-full">
            <Search className={cn(
              "absolute left-7 top-1/2 -translate-y-1/2 w-6 h-6 transition-colors",
              query ? "text-blue-600" : "text-slate-300"
            )} />
            <Input
              placeholder="НАЗВАНИЕ ГОРОДА..."
              value={query}
              onChange={handleSearch}
              className="h-24 w-full pl-16 pr-14 rounded-[2.5rem] border-slate-100 bg-slate-50/50 focus-visible:bg-white focus-visible:ring-0 focus-visible:border-blue-600 focus-visible:shadow-2xl focus-visible:shadow-blue-100/50 font-black italic text-2xl uppercase transition-all"
              autoFocus
            />
            {isLoading && !selectedUri && (
              <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 w-6 h-6 animate-spin text-blue-600" />
            )}
          </div>

          {/* СПИСОК — такая же ширина w-full */}
          <div className="min-h-[350px] max-h-[450px] overflow-y-auto custom-scrollbar w-full">
            <div className="space-y-4 w-full">
              {suggestions.length > 0 ? (
                suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelect(s)}
                    className="group w-full flex items-center justify-between p-7 bg-white hover:bg-slate-50 border border-slate-100 rounded-[2.5rem] transition-all hover:shadow-xl animate-in fade-in slide-in-from-bottom-2"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:bg-white shadow-sm shrink-0">
                        <MapPin className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="font-black uppercase italic text-2xl tracking-tighter text-slate-900 leading-none mb-1">
                          {s.title.text}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 italic">
                          {s.subtitle?.text}
                        </span>
                      </div>
                    </div>
                    <ArrowUpRight className="w-7 h-7 text-blue-600 opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                ))
              ) : !query && (
                /* ТЕКУЩИЙ ГОРОД — тоже w-full */
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
