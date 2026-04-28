import { getClientOrders } from "@/actions/order/get"
import { unwrap } from "@/lib/utils"

export async function OrdersCounter() {
  // Тот самый delay для теста
//  await new Promise((res) => setTimeout(res, 2500))
  
  const orders = unwrap(await getClientOrders(), [])
  const count = orders.filter(o => o.status !== "COMPLETED" && o.status !== "CANCELLED").length

  return (
    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 italic animate-in fade-in duration-500">
      {count} активных задач сейчас
    </p>
  )
}
