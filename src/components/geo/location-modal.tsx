"use client"

import * as React from "react"
import { useLocationStore } from "@/store/use-location-store"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Search, MapPin, Loader2 } from "lucide-react"

export function LocationModal() {
  const { isModalOpen, closeModal, setLocation, city: currentCity } = useLocationStore()
  const [query, setQuery] = React.useState("")
  const [suggestions, setSuggestions] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const localApiUrl = "/api/geo/suggest?text=" + encodeURIComponent(value);
      const response = await fetch(localApiUrl);
      const results = await response.json();
      
      // Геосаджест возвращает массив объектов с полями title и subtitle
      setSuggestions(results);
    } catch (err) {
      console.error("Ошибка поиска:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = async (item: any) => {
  setIsLoading(true);
  try {
    // Делаем запрос к нашему геокодеру по URI
    const response = await fetch("/api/geo/geocode?uri=" + encodeURIComponent(item.uri));
    const coords = await response.json();

    if (coords.error) throw new Error(coords.error);

    // Сохраняем в Zustand стор (город, широта, долгота)
    setLocation(item.title.text, coords.lat, coords.lng);

    setQuery("");
    setSuggestions([]);
    closeModal();
    
  } catch (err) {
    console.error("Ошибка при получении координат по URI:", err);
  } finally {
    setIsLoading(false);
  }
};

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-[500px] p-6 rounded-[2rem] border-none shadow-2xl">
        <DialogTitle className="text-2xl font-black italic tracking-tighter mb-4">
          Выберите город
        </DialogTitle>
        <DialogDescription className="sr-only">Поиск населенного пункта</DialogDescription>

        <div className="relative space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Название города..."
              value={query}
              onChange={handleSearch}
              className="h-14 pl-12 pr-10 rounded-2xl border-2 focus-visible:ring-blue-600 font-bold"
              autoFocus
            />
            {isLoading && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-600" />
            )}
          </div>

          <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
            {suggestions.length > 0 ? (
              suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(s)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-blue-50 rounded-2xl transition-colors text-left group"
                >
                  <div className="p-2 bg-slate-100 rounded-xl group-hover:bg-blue-100 transition-colors">
                    <MapPin className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 text-sm">
                      {s.title.text}
                    </span>
                    {s.subtitle?.text && (
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                        {s.subtitle.text}
                      </span>
                    )}
                  </div>
                </button>
              ))
            ) : query.length >= 3 && !isLoading ? (
              <p className="text-center py-6 text-sm text-muted-foreground italic">Ничего не нашли...</p>
            ) : (
              <div className="p-4 bg-slate-50 rounded-2xl border border-dashed text-center">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Сейчас выбрано:</p>
                <p className="font-bold text-blue-600">{currentCity}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
