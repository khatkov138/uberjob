"use client"

import * as React from "react"
import { X, Search, Plus, Check, Loader2, SearchX } from "lucide-react"
import { cn, handleAction } from "@/lib/utils"
import { useQuery, useMutation, useQueryClient, useMutationState } from "@tanstack/react-query"
import { DBCategory, getAllCategories } from "@/actions/category/get"
import { useCategoryModalStore } from "@/store/use-category-modal-store"
import { toast } from "sonner"
import { addSkill, removeSkill } from "@/actions/profile/manage"
import { useUserSkills } from "@/hooks/use-user-skills"
import { FullProfile } from "@/actions/profile/get"

const CategoryItemSkeleton = () => (
  <div className="w-full flex items-center justify-between p-5 rounded-[1.5rem] border-2 border-slate-50 bg-white/50 relative overflow-hidden">
    <div className="h-4 bg-slate-100 rounded-md w-1/3 animate-pulse" />
    <div className="w-8 h-8 rounded-xl bg-slate-50 animate-pulse" />
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50/50 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
  </div>
)

export function CategorySearchModal() {
  const { isOpen, close } = useCategoryModalStore()
  const [query, setQuery] = React.useState("")
  const queryClient = useQueryClient()

  // Подключаем кастомный хук профиля пользователя
  const { skillIds } = useUserSkills()

  // ЗАГРУЗКА КАТЕГОРИЙ (Кэш на 1 час)
  const { data: dbCategories = [], isLoading } = useQuery<DBCategory[]>({
    queryKey: ["all-categories"],
    queryFn: async () => await handleAction(getAllCategories()),
    enabled: isOpen,
    staleTime: 1000 * 60 * 60,
  })

  // Индексация категорий для быстрого O(1) поиска в onSuccess коммите
  const categoriesMap = React.useMemo(() => new Map(dbCategories.map(c => [c.id, c])), [dbCategories])

  // 📡 ГЛОБАЛЬНЫЙ СКАНЕР МУТАЦИЙ ТАНСТЕКА СТРОГО ДЛЯ МОДАЛКИ:
  // Извлекает из шины данных ID всех категорий, которые прямо сейчас добавляются/удаляются
  const itemsBeingProcessed = useMutationState({
    filters: { mutationKey: ["toggle-skill-niche"], status: "pending" },
    select: (mutation) => (mutation.state.variables as any)?.id as string,
  })

  // МУТАЦИЯ: Лоадер на экране ➡️ Обновление DOM-состояния по факту успеха
  const { mutate: toggleSkill } = useMutation({
    mutationKey: ["toggle-skill-niche"], // Жесткий ключ привязки к сканеру
    mutationFn: async ({ id, isSelected }: { id: string; isSelected: boolean }) => {
      return isSelected ? await handleAction(removeSkill(id)) : await handleAction(addSkill(id))
    },
    
    // БОЛЬШЕ НЕ ДЕЛАЕМ деструктивных правок в onMutate. Кэш стабилен, пока идет сеть
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["user-profile"] })
    },
    
    // 🔥 ЧЕСТНЫЙ ПОСТ-КОММИТ КЭША: Цвет плашки и стейт меняются за 0мс строго после ответа сервера
    // Ни одного повторного сетевого fetch-запроса на чтение профиля к базе данных!
    onSuccess: (_, { id, isSelected }) => {
      const catName = categoriesMap.get(id)?.name || "Ниша"
      
      queryClient.setQueryData<FullProfile>(["user-profile"], (old: any) => {
        if (!old) return old
        if (isSelected) {
          // Если был выбран — чисто вырезаем локально
          return { ...old, skills: old.skills.filter((s: any) => s.categoryId !== id) }
        } else {
          // Если не был выбран — подмешиваем эталонный объект
          const cat = categoriesMap.get(id)
          if (!cat) return old
          return {
            ...old,
            skills: [...old.skills, { categoryId: id, category: cat, profileId: old.id }],
          }
        }
      })

      toast.success(isSelected ? `Удалено: ${catName}` : `Добавлено: ${catName}`)
    },
    onError: () => {
      toast.error("Ошибка синхронизации радара ниш")
    }
  })

  const filtered = React.useMemo(() => {
    const lowerQuery = query.toLowerCase()
    return dbCategories.filter((cat) => cat.name.toLowerCase().includes(lowerQuery))
  }, [dbCategories, query])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 select-none">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={close} />

      <div className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
        <div className="p-8 space-y-6">

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-950 leading-none">Ниши</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mt-2 italic">Выбор specialization</p>
            </div>
            <button onClick={close} className="w-12 h-12 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-full transition-all active:scale-90 group">
              <X className="w-6 h-6 text-slate-950 group-hover:rotate-90 transition-transform" strokeWidth={3} />
            </button>
          </div>

          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              autoFocus
              placeholder="Поиск направления..."
              className="w-full h-16 pl-14 pr-6 bg-slate-50 border-2 border-slate-50 rounded-[1.5rem] focus:border-blue-600 focus:bg-white outline-none font-bold text-slate-950 transition-all placeholder:text-slate-300"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="relative">
            <div className="max-h-[380px] overflow-y-auto pr-2 space-y-2 no-scrollbar min-h-[280px]">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <CategoryItemSkeleton key={i} />)}
                </div>
              ) : filtered.length > 0 ? (
                filtered.map((cat) => {
                  const isSelected = skillIds.has(cat.id)
                  
                  // 💡 ИСТИННЫЙ PENDING ИЗ ЯДРА ТАНСТЕКА:
                  // Сканер проверяет, обрабатывается ли данный конкретный ID прямо сейчас сетью
                  const isPending = itemsBeingProcessed.includes(cat.id)

                  return (
                    <button
                      key={cat.id}
                      disabled={isPending}
                      onClick={() => toggleSkill({ id: cat.id, isSelected })}
                      className={cn(
                        "w-full flex items-center justify-between p-5 rounded-[1.5rem] border-2 transition-all active:scale-[0.98] group",
                        isSelected
                          ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                          : "bg-white border-slate-100 hover:border-blue-200 text-slate-950",
                        isPending && "opacity-70 pointer-events-none"
                      )}
                    >
                      <span className="font-black uppercase italic text-sm tracking-tight">{cat.name}</span>
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                        isSelected ? "bg-white/20" : "bg-slate-50 group-hover:bg-blue-50"
                      )}>
                        {isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin text-current" strokeWidth={3} />
                        ) : isSelected ? (
                          <Check className="w-4 h-4 text-white" strokeWidth={4} />
                        ) : (
                          <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-600" strokeWidth={3} />
                        )}
                      </div>
                    </button>
                  )
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                  <SearchX size={48} strokeWidth={1.5} className="mb-4 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-center leading-relaxed">
                    Ничего не нашли по запросу <br />
                    <span className="text-slate-950 italic">"{query}"</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
