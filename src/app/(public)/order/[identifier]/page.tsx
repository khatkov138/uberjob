import { notFound } from "next/navigation"
import { getOrderByIdOrSlug } from "@/actions/order/get"
import { OrderDetailsUI } from "./_components/order-details-ui"
import { Container } from "@/components/shared/container"
import { unwrap } from "@/lib/utils"
import { getServerSession } from "@/lib/get-session"

// Добавим SEO, раз у нас проект про заказы
export async function generateMetadata({ params }: { params: Promise<{ identifier: string }> }) {
    const { identifier } = await params
    const data = unwrap(await getOrderByIdOrSlug(identifier), null)
    if (!data) return { title: "Заказ не найден" }

    return {
        title: `${data.order.title} — Zwork`,
        description: data.order.description?.slice(0, 160)
    }
}

export default async function OrderPage({ params }: { params: Promise<{ identifier: string }> }) {
    const { identifier } = await params
    const session = await getServerSession()

    // 1. На сервере ищем по тому, что пришло в URL (id или slug)
    const data = unwrap(await getOrderByIdOrSlug(identifier), null)

    if (!data) return notFound()

    const userId = session?.user?.id || null

    return (
        <Container className="max-w-7xl py-10">
            <OrderDetailsUI
                // ВАЖНО: передаем в UI реальный UUID из базы, 
                // чтобы useQuery зацепился за стабильный ключ
                orderId={data.order.id}
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