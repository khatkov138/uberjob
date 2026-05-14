import { cookies } from 'next/headers'
import { getServerSession } from "@/lib/get-session"

import { NavbarUI } from "./navbar-ui"
import { RoleMode } from "@/store/use-role-store"
import { NavbarProvider } from './navbar-provider'

function isValidRoleMode(value: string | undefined): value is RoleMode {
    return value === 'CLIENT' || value === 'PRO'
}

export default async function Navbar() {
    const [session, cookieStore] = await Promise.all([
        getServerSession(),
        cookies()
    ])

    const rawCookie = cookieStore.get('zwork-mode')?.value
    const savedMode: RoleMode = isValidRoleMode(rawCookie) ? rawCookie : 'CLIENT'
    const user = session?.user ?? null

    console.log(`[SERVER NAVBAR] Cookie Mode: ${savedMode} | User: ${!!user}`)

    return (
        // Пробрасываем user в провайдер. На клиенте это сработает за 0мс.
        <NavbarProvider initialMode={savedMode} user={user}>
            <NavbarUI />
        </NavbarProvider>
    )
}
