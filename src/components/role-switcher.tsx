"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toggleUserRole } from "@/app/actions/user"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { toast } from "sonner" // Импортируем sonner
import { Loader2 } from "lucide-react"
import { Role } from "../../prisma/generated"

export function RoleSwitcher({ currentRole }: { currentRole: Role }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleRoleChange = (value: string) => {
    const newRole = value as Role
    
    // Если роль не изменилась, ничего не делаем
    if (newRole === currentRole) return

    startTransition(async () => {
      const res = await toggleUserRole(newRole)
      
      if (res.success) {
        toast.success("Режим изменен", {
          description: `Вы переключились в кабинет ${newRole === Role.PRO ? "мастера" : "клиента"}.`,
        })
        
        // Редирект в зависимости от роли
        router.push(newRole === Role.PRO ? "/pro" : "/client")
        router.refresh()
      } else {
        toast.error("Ошибка при смене роли", {
          description: res.error,
        })
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      <Tabs defaultValue={currentRole} onValueChange={handleRoleChange} className="w-[200px]">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value={Role.CLIENT} disabled={isPending}>
            Клиент
          </TabsTrigger>
          <TabsTrigger value={Role.PRO} disabled={isPending}>
            Мастер
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}