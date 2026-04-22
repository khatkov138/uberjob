import Pusher from "pusher-js";

// Глобальная переменная, чтобы хранить один инстанс
let pusherClient: Pusher | null = null;

export const getPusherClient = () => {
  if (!pusherClient) {
    // Проверка на наличие ключей, чтобы не падало в консоли
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!key || !cluster) {
      console.error("PUSHER_ERROR: Ключи не найдены в .env");
    }

    pusherClient = new Pusher(key!, {
      cluster: cluster!,
      forceTLS: true,
      // Это предотвращает лишние попытки подключения, если что-то не так
      authEndpoint: "/api/pusher/auth", 
    });
    
    console.log("------------------ [PUSHER] CONNECTION STARTED ------------------");
  }
  return pusherClient;
};
