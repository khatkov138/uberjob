"use client"

import * as React from "react"
import { X, Search, Plus, Check, Loader2 } from "lucide-react"
import { cn, handleAction } from "@/lib/utils"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { DBCategory, getAllCategories } from "@/actions/category/get"

import { useCategoryModalStore } from "@/store/use-category-modal-store"
import { toast } from "sonner"
import { FullProfile } from "@/actions/profile/get"
import { addSkill, removeSkill } from "@/actions/profile/manage"



export function CategorySearchModal() {
  const { isOpen, close } = useCategoryModalStore()
  const [query, setQuery] = React.useState("")
  const queryClient = useQueryClient()

  const { data: dbCategories = [], isLoading } = useQuery<DBCategory[]>({
    queryKey: ["all-categories"],
    queryFn: async () => await handleAction(getAllCategories()),
    enabled: isOpen,
    staleTime: 1000 * 60 * 60,
  });

  // Получаем профиль из кеша: добавляем заглушку и типизацию
  const { data: profile } = useQuery<FullProfile | null>({
    queryKey: ["user-profile"],
    queryFn: () => { throw new Error("Profile should be in cache") },
    // Активен только когда модалка открыта, но не делает запросов сам
    enabled: isOpen,
  });

  const userCategoryIds = React.useMemo(() =>
    new Set(profile?.skills?.map(s => s.categoryId) || []),
    [profile]
  );

  const { mutate: toggleSkill, variables } = useMutation({
    mutationFn: async ({ id, isSelected }: { id: string; isSelected: boolean }) => {
      return isSelected
        ? await handleAction(removeSkill(id))
        : await handleAction(addSkill(id));
    },
    onMutate: async ({ id, isSelected }) => {
      await queryClient.cancelQueries({ queryKey: ["user-profile"] });
      const previousProfile = queryClient.getQueryData<FullProfile>(["user-profile"]);

      queryClient.setQueryData<FullProfile | null>(["user-profile"], (old) => {
        if (!old) return old;

        if (isSelected) {
          return {
            ...old,
            skills: old.skills.filter((s) => s.categoryId !== id),
          };
        } else {
          const cat = dbCategories.find((c) => c.id === id);
          if (!cat) return old;

          // Формируем объект навыка без any, под структуру БД
          const newSkill = {
            profileId: old.id,
            categoryId: id,
            category: cat,
          };

          return {
            ...old,
            skills: [...old.skills, newSkill as any], // as any тут допустим, так как это мок для UI
          };
        }
      });

      return { previousProfile };
    },
    onError: (err, _, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(["user-profile"], context.previousProfile);
      }
      toast.error("Не удалось обновить навыки");
    },
    onSuccess: (_, { id, isSelected }) => {
      const catName = dbCategories.find((c) => c.id === id)?.name;
      toast.success(isSelected ? `Ниша "${catName}" удалена` : `Ниша "${catName}" добавлена`);
    },
  });

  const filtered = React.useMemo(() => {
    return dbCategories.filter((cat) =>
      cat.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [dbCategories, query]);

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Поиск ниши</h2>
            <button onClick={close} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              autoFocus
              placeholder="Напр: Электрика, Уборка..."
              className="w-full h-14 pl-12 pr-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-600 outline-none font-bold text-slate-900"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2 no-scrollbar min-h-[100px] flex flex-col">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              filtered.map((cat) => {
                const isSelected = userCategoryIds.has(cat.id);
                const isPending = variables?.id === cat.id;

                return (
                  <button
                    key={cat.id}
                    disabled={isPending}
                    onClick={() => toggleSkill({ id: cat.id, isSelected })}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all active:scale-[0.98]",
                      isSelected ? "bg-blue-50 border-blue-100 opacity-60" : "bg-white border-slate-100"
                    )}
                  >
                    <span className="font-black uppercase italic text-sm text-slate-900">{cat.name}</span>
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> :
                      isSelected ? <Check className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-slate-300" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
