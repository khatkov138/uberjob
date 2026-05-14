import { getServerSession } from "@/lib/get-session"
import { HeartbeatClient } from "./heartbeat-client"


export default async function Heartbeat() {
    // Используем тот же системный кэш сессии, что и Navbar
    const session = await getServerSession()
    const isAuthenticated = !!session?.user

    console.log(`🧬 [SERVER HEARTBEAT] Статус авторизации определен: ${isAuthenticated}`)

    // Рендерим клиентскую часть, передавая только стабильный булевый примитив
    return <HeartbeatClient isAuthenticated={isAuthenticated} />
}
