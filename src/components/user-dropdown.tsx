"use client";

import { LogOutIcon, SettingsIcon, ShieldIcon, UserIcon, BriefcaseIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "./ui/avatar"; // Убедись, что компонент установлен
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { User } from "@/lib/auth";

interface UserDropdownProps {
  user: User
}

export function UserDropdown({ user }: UserDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Делаем триггер более чистым: только аватар и имя */}
        <button className="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-muted/50 transition-all outline-none group">
          <Avatar className="h-9 w-9 border-2 border-background shadow-sm transition-transform group-active:scale-95">
            <AvatarImage src={user.image || ""} alt={user.name} />
            <AvatarFallback className="bg-blue-600 text-white font-bold">
              {user.name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:block text-sm font-bold max-w-[8rem] truncate">
            {user.name}
          </span>
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-xl border-blue-50/50">
        <DropdownMenuLabel className="font-normal p-3">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-black leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground mt-1 italic">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="my-2" />
        
        {/* Ссылки на кабинеты в зависимости от роли */}
        <DropdownMenuItem asChild className="rounded-xl h-10 cursor-pointer">
          <Link href={user.role === "PRO" ? "/pro/dashboard" : "/client/dashboard"}>
            <BriefcaseIcon className="mr-2 size-4 text-blue-600" />
            <span className="font-medium">Рабочий стол</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="rounded-xl h-10 cursor-pointer">
          <Link href="/settings">
            <SettingsIcon className="mr-2 size-4 text-slate-500" />
            <span className="font-medium">Настройки</span>
          </Link>
        </DropdownMenuItem>

        {user.role === "admin" && (
          <DropdownMenuItem asChild className="rounded-xl h-10 cursor-pointer text-red-600 focus:text-red-600">
            <Link href="/admin">
              <ShieldIcon className="mr-2 size-4" />
              <span className="font-medium">Админ-панель</span>
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="my-2" />
        
        <SignOutItem />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SignOutItem() {
  const router = useRouter();

  async function handleSignOut() {
    const { error } = await authClient.signOut()
    if (error) {
      toast.error(error.message || "Ошибка выхода")
    } else {
      toast.success("Вы вышли из системы")
      router.push('/')
      router.refresh()
    }
  }

  return (
    <DropdownMenuItem 
      onClick={handleSignOut} 
      className="rounded-xl h-10 cursor-pointer text-slate-500 focus:bg-red-50 focus:text-red-600 transition-colors"
    >
      <LogOutIcon className="mr-2 size-4" />
      <span className="font-bold">Выйти</span>
    </DropdownMenuItem>
  );
}