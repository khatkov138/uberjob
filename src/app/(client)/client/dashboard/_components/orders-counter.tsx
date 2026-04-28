import { getActiveOrdersCount, getClientOrders } from "@/actions/order/get"
import { unwrap } from "@/lib/utils"

export async function OrdersCounter() {
  // Тот самый delay для теста
  //  await new Promise((res) => setTimeout(res, 2500))

  const count = unwrap(await getActiveOrdersCount('CLIENT'), 0)

  return (
    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 italic animate-in fade-in duration-500">
      {count} активных задач сейчас
    </p>
  )
}
