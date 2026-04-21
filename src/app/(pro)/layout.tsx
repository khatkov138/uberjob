export default async function ProLayout({ children }: { children: React.ReactNode }) {
  // Тут в будущем можно добавить проверку: 
  // if (user.role !== 'PRO') redirect('/client/feed')
  
  return <>{children}</>; // Никаких div и p-6, чтобы не ломать верстку Container
}