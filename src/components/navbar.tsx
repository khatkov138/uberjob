import { Button } from "@/components/ui/button";
import { UserDropdown } from "@/components/user-dropdown";
import { getServerSession } from "@/lib/get-session";
import Link from "next/link";
import { RoleSwitcher } from "./role-switcher";

export default async function Navbar() {
    const session = await getServerSession();
    const user = session?.user;

    return (
        // Добавляем липкость, фон и нижнюю границу
        <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                
                {/* Логотип */}
                <div className="flex items-center gap-8">
                    <Link href="/" className="transition-transform hover:scale-105 active:scale-95">
                        <span className="font-black text-2xl tracking-tighter text-blue-600">
                            Uber<span className="text-foreground">Job</span>
                        </span>
                    </Link>

                    {/* Сюда можно добавить ссылки для десктопа, если нужно */}
                </div>

                {/* Правая часть */}
                <div className="flex items-center gap-3">
                    {user ? (
                        <>
                            <div className="hidden md:block">
                                <RoleSwitcher currentRole={user.role} />
                            </div>
                            <UserDropdown user={user} />
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button asChild variant="ghost" className="hidden sm:inline-flex">
                                <Link href="/sign-in">Вход</Link>
                            </Button>
                            <Button asChild className="rounded-xl font-bold">
                                <Link href="/sign-up">Начать работу</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}