import { getServerSession } from "@/lib/get-session"
import { NavbarUI } from "./navbar-ui"
import { delay } from "@/lib/utils";

export default async function Navbar() {


    const session = await getServerSession()
   // await delay(3000);
    // Просто прокидываем данные вниз как пропсы
    // Никаких useSession() на клиенте при загрузке — данные уже в HTML!
    return <NavbarUI user={session?.user ?? null} />
}