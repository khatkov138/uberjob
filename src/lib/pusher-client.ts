import Pusher from "pusher-js";

// Singleton инстанс, живущий вне цикла рендеринга React
let pusherClient: Pusher | null = null;

export const getPusherClient = () => {
  // 1. Строгая проверка среды исполнения
  if (typeof window === 'undefined') return null;

  // 2. Возвращаем существующий, если он уже инициализирован
  if (pusherClient) return pusherClient;

  // 3. Ленивая инициализация при первом реальном вызове
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!key || !cluster) {
    console.warn("⚠️ [PUSHER] Missing keys. Check your .env file.");
    return null;
  }

  try {
    pusherClient = new Pusher(key, {
      cluster: cluster,
      forceTLS: true,
      authEndpoint: "/api/pusher/auth",
      // ws/wss — самые быстрые транспорты, исключаем медленный лонг-поллинг
      enabledTransports: ["ws", "wss"],
      // Отключаем логи в продакшене для чистоты консоли
      disableStats: true, 
    });

    console.log("🛠️ [PUSHER] Instance Born & Socket Connected");
    return pusherClient;
  } catch (error) {
    console.error("❌ [PUSHER] Initialization failed:", error);
    return null;
  }
};

/**
 * Дополнительный хелпер для корректного закрытия соединения (опционально)
 */
export const disconnectPusher = () => {
  if (pusherClient) {
    pusherClient.disconnect();
    pusherClient = null;
    console.log("🔌 [PUSHER] Disconnected");
  }
};
