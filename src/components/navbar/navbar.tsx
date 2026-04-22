import { getServerSession } from "@/lib/get-session"
import { NavbarUI } from "./navbar-ui"

export default async function Navbar() {


    const session = await getServerSession()

    // Просто прокидываем данные вниз как пропсы
    // Никаких useSession() на клиенте при загрузке — данные уже в HTML!
    return <NavbarUI user={session?.user ?? null} />
}