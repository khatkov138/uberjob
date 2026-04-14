import { getServerSession } from "@/lib/get-session";
import { redirect } from "next/navigation";
import { Role } from "../../../prisma/generated";

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  
  if(!session) redirect("/sign-in")

  if (session?.user.role !== Role.CLIENT) {
  //  redirect("/pro/dashboard");
  }

  return (
    <div className="flex min-h-screen">
      {/* Здесь будет боковое меню клиента */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}