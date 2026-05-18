// @/components/navbar/Navbar.tsx (Server Component)
import { cookies } from 'next/headers'
import { getServerSession } from "@/lib/get-session"
import { NavbarUI } from "./navbar-ui"
import { RoleMode } from "@/store/use-role-store"
import { NavbarProvider } from './navbar-provider'

function isValidRoleMode(value: string | undefined): value is RoleMode {
    return value === 'CLIENT' || value === 'PRO'
}

export default async function Navbar() {
    // Вызываем сессию и куки параллельно, возвращаясь к чистому исходному коду 🚀
    const [session, cookieStore] = await Promise.all([
        getServerSession(),
        cookies()
    ])

    const rawCookie = cookieStore.get('zwork-mode')?.value
    const savedMode: RoleMode = isValidRoleMode(rawCookie) ? rawCookie : 'CLIENT'
    const user = session?.user ?? null

    console.log(`[SERVER NAVBAR] Mode: ${savedMode} | User: ${!!user}`)

    return (
        // Убираем прокидывание локации — клиентский Zustand теперь автономен на 100% 🚀
        <NavbarProvider initialMode={savedMode} user={user}>
            <NavbarUI />
        </NavbarProvider>
    )
}
