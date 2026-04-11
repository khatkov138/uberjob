
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { UserDropdown } from "@/components/user-dropdown";
import { getServerSession } from "@/lib/get-session";
import Link from "next/link";
import { RoleSwitcher } from "./role-switcher";

export default async function Navbar() {

    const session = await getServerSession();
    const user = session?.user;

  
    return (
        <header className="flex justify-between">
            <div>
                <Link href="/"><span className="font-bold text-3xl">UberJob</span></Link>

            </div>

            <div className="flex items-center gap-2">

                {/*  <ModeToggle /> */}
                {user ?
                    <>
                        <RoleSwitcher currentRole={user.role} />
                        <UserDropdown user={user} />
                    </>
                    :
                    <Button asChild variant="outline">
                        <Link href="/sign-in">Sign In</Link>
                    </Button>
                }
            </div>
        </header>
    );
}