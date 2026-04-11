"use client"

import { useTransition } from "react"
import { useRouter, usePathname } from "next/navigation"
import { toggleUserRole } from "@/app/actions/user"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { toast } from "sonner"
import { Loader2, User, Hammer } from "lucide-react"
import { Role } from "../../prisma/generated"

export function RoleSwitcher({ currentRole }: { currentRole: Role }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const pathname = usePathname()

  const handleRoleChange = (value: string) => {
    const newRole = value as Role
    if (newRole === currentRole) return

    startTransition(async () => {
      const res = await toggleUserRole(newRole)
      
      if (res.success) {
        toast.success("Режим изменен", {
          description: `Добро пожаловать в кабинет ${newRole === Role.PRO ? "мастера" : "клиента"}.`,
        })
        
        // Редирект на соответствующие дашборды
        const targetPath = newRole === Role.PRO ? "/pro/dashboard" : "/client/dashboard"
        
        router.push(targetPath)
        router.refresh()
      } else {
        toast.error("Ошибка", { description: res.error })
      }
    })
  }

  return (
    <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
      {isPending && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
      
      <Tabs defaultValue={currentRole} onValueChange={handleRoleChange} className="w-[180px]">
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value={Role.CLIENT} disabled={isPending} className="text-[11px] uppercase font-bold gap-1">
            <User className="w-3 h-3" /> Я клиент
          </TabsTrigger>
          <TabsTrigger value={Role.PRO} disabled={isPending} className="text-[11px] uppercase font-bold gap-1">
            <Hammer className="w-3 h-3" /> Мастер
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )
}