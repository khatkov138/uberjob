// components/navbar/navbar.tsx (Server Component)
import { cookies } from 'next/headers'
import { getServerSession } from "@/lib/get-session"

import { NavbarUI } from "./navbar-ui"
import { RoleMode } from "@/store/use-role-store"
import { NavbarProvider } from './navbar-provider'

function isValidRoleMode(value: string | undefined): value is RoleMode {
    return value === 'CLIENT' || value === 'PRO'
}

export default async function Navbar() {
    // Быстро и параллельно вытаскиваем сессию и куки из запроса
    const [session, cookieStore] = await Promise.all([
        getServerSession(),
        cookies()
    ])

    // Берем куку, которую Middleware уже выровнял по URL
    const rawCookie = cookieStore.get('zwork-mode')?.value
    const savedMode: RoleMode = isValidRoleMode(rawCookie) ? rawCookie : 'CLIENT'
    const user = session?.user ?? null

    console.log(`[SERVER NAVBAR] Cookie Mode is 100% correct:`, savedMode)

    return (
        <NavbarProvider initialMode={savedMode}>
            <NavbarUI user={user} />
        </NavbarProvider>
    )
}
