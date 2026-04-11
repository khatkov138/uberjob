

import { getServerSession } from "@/lib/get-session";
import Link from "next/link";
import { notFound, redirect, unauthorized } from "next/navigation";
import { ReactNode } from "react";
import AdminNavigation from "./admin/admin-navigation";

export default async function AdminLayout({ children }: { children: ReactNode }) {

    const session = await getServerSession();
    const user = session?.user;

    if (!user || user.role !== "admin") notFound()



    return <div className="">
        <Link href="/admin"><h1 className="font-semibold text-xl">Админка</h1></Link>
        <AdminNavigation />
        {children}
    </div>;
}
