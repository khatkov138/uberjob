

export default async function ProLayout({ children }: { children: React.ReactNode }) {

  return (
    <div className="flex min-h-screen">
      {/* Здесь будет боковое меню мастера */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}