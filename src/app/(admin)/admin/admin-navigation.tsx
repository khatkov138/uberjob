
"use client"

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from 'next/navigation'

const Links = [
    { url: "/admin/markets", name: "Маркеты" },
    { url: "/admin/users", name: "Пользователи" }
]

export default function AdminNavigation() {

    const pathname = usePathname();

    return (
        <div className="flex gap-4">
            {Links.map((link, i) => {
                const isActive = pathname == link.url;
                return (
                    <Link key={i} href={link.url}>
                        <Button
                            variant={isActive ? "default" :  "outline"}
                        >{link.name}</Button>
                    </Link>
                )
            }
            )}

        </div>
    );
}