"use server"

import prisma from "@/lib/prisma"
import { createAuthAction } from "@/lib/server-utils"
import { createOfferSchema } from "@/lib/validation"

export async function createOffer(values: unknown) {
  return createAuthAction(async (userId) => {
    // 1. Валидация
    const data = createOfferSchema.parse(values);

    // 2. Проверка заказа
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      select: { status: true, clientId: true, title: true }
    });

    if (!order) throw new Error("Заказ не найден");
    
    // Блокируем отклики на закрытые заказы
    if (order.status !== "PENDING" && order.status !== "SEARCHING") {
      throw new Error("Заказ уже в работе или закрыт");
    }

    // 3. Транзакция
    const result = await prisma.$transaction(async (tx) => {
      // Создаем/обновляем отклик
      const offer = await tx.offer.upsert({
        where: {
          orderId_workerId: {
            orderId: data.orderId,
            workerId: userId
          }
        },
        create: {
          orderId: data.orderId,
          workerId: userId,
          price: data.price,
          message: data.message || "",
        },
        update: {
          price: data.price,
          message: data.message || "",
        }
      });

      // Обновляем статус заказа
      await tx.order.update({
        where: { id: data.orderId },
        data: { status: "SEARCHING" }
      });

      // Уведомляем клиента
      await tx.notification.create({
        data: {
          userId: order.clientId,
          title: "Новое предложение! 💰",
          message: `Мастер предложил ${data.price / 100} ₽ за: ${order.title}`,
          type: "NEW_OFFER",
          link: `/client/orders/${data.orderId}`,
        }
      });

  

      return offer;
    });

    return result;
  });
}
