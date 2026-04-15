import { CreateOrderForm } from "./create-order-form";

export default function NewOrderPage() {
  return (
    <div className="max-w-2xl mx-auto py-10 space-y-8 px-4">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-black tracking-tight italic uppercase italic">Создать заказ</h1>
        <p className="text-muted-foreground font-medium italic text-sm">
          Расскажите, что нужно сделать. ИИ сам подберет категорию работ.
        </p>
      </header>

      {/* Вынесенный компонент формы */}
      <CreateOrderForm />
      
      <footer className="text-center">
        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
          UberJob AI System v2.0
        </p>
      </footer>
    </div>
  )
}
