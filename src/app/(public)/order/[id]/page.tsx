import { notFound } from "next/navigation"
import { getOrderById } from "@/actions/order/get"
import { OrderDetailsUI } from "./_components/order-details-ui"
import { Container } from "@/components/shared/container"
import { unwrap } from "@/lib/utils"
import { getServerSession } from "@/lib/get-session"

// Добавим SEO, раз у нас проект про заказы
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const data = unwrap(await getOrderById(id), null)
    if (!data) return { title: "Заказ не найден" }

    return {
        title: `${data.order.title} — Zwork`,
        description: data.order.description?.slice(0, 160)
    }
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await getServerSession()
    const data = unwrap(await getOrderById(id), null)

    if (!data) return notFound()

    const userId = session?.user?.id || null

    return (
        /* Убрал bg-white, чтобы оставить системный фон контейнера */
        <Container className="max-w-7xl">
            <OrderDetailsUI
                orderId={id}
                initialData={data}
                context={{
                    userId,
                    isOwner: data.order.clientId === userId,
                    isAssignedWorker: data.order.workerId === userId
                }}
            />
        </Container>
    )
}
