
import { Container } from "@/components/shared/container";
import { CreateOrderForm } from "./create-order-form";

export default function NewOrderPage() {
  return (
   <Container className="bg-white h-full flex flex-col">
      {/* Уменьшили mb и размер для экономии места */}
      <header className="mb-6 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
          <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.3em] italic">
            Quick Launch
          </p>
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter italic uppercase text-slate-900 leading-none">
          Что нужно <span className="text-blue-600">Сделать?</span>
        </h1>
      </header>

      {/* Форма теперь должна уметь тянуться */}
      <div className="flex-1 min-h-0">
         <CreateOrderForm />
      </div>
    </Container>
  )
}
