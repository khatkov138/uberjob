// app/(shared)/orders/[id]/page.tsx
import { notFound } from "next/navigation"

import { getOrderById } from "@/actions/order/get"
import { OrderDetailsUI } from "./_components/order-details-ui"
import { Container } from "@/components/shared/container"
import { unwrap } from "@/lib/utils"
import { getServerSession } from "@/lib/get-session"

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await getServerSession()
    const data = unwrap(await getOrderById(id), null)

    if (!data) return notFound()

    const userId = session?.user?.id || null

    return (
        <Container className="max-w-7xl border-none shadow-none">
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
