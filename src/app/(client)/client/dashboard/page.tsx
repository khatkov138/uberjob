import { Suspense } from "react"
import { getServerSession } from "@/lib/get-session"
import { redirect } from "next/navigation"
import { Container } from "@/components/shared/container"
import { StaticTiles } from "./_components/static-tiles"
import { ActiveOrdersTile } from "./_components/active-orders-title"
import { CreateOrderCard } from "./_components/create-order-card"
import { DashboardHeader } from "./_components/dashboard-header"


export default async function ClientDashboardPage() {
    const session = await getServerSession()
    if (!session) redirect("/login")

    return (
        <Container className="bg-white pb-32">
            <DashboardHeader name={session.user.name} />
            <CreateOrderCard />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Плитка с заказами сама внутри решит, когда показать счетчик */}
                <ActiveOrdersTile />

                {/* Чат, История, Настройки — рендерятся СРАЗУ */}
                <StaticTiles />
            </div>
        </Container>
    )
}
