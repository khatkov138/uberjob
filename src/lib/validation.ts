import z from "zod";

export const passwordSchema = z
  .string()
  .min(1, { message: "Password is required" })
  .min(8, { message: "Password must be at least 8 characters" })
  .regex(/[^A-Za-z0-9]/, {
    message: "Password must contain at least one special character",
  });



export const createOrderSchema = z.object({
  description: z.string().min(10, "Опишите задачу подробнее"),
  city: z.string().min(1, "Укажите населенный пункт"),
  yandexUri: z.string().min(1, "Ошибка идентификатора локации"),
  lat: z.number().refine(n => n !== 0, "Укажите место на карте"),
  lng: z.number().refine(n => n !== 0, "Укажите место на карте"),
  // Просто число, без coerce. Валидация пройдет, так как в инпуте valueAsNumber
  price: z.number().min(0, "Цена не может быть отрицательной"),
  dateType: z.enum(["ASAP", "SCHEDULED"]),
});
export type CreateOrderValues = z.infer<typeof createOrderSchema>;



export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Имя обязательно"),
  // Используем .catch(null) или объединение типов, чтобы TS не путался
  image: z.union([z.string(), z.null()]).optional(),
  bio: z.union([z.string(), z.null()]).optional(),
  // Массив должен быть обязательным в схеме, чтобы совпадать с типом формы
  skills: z.array(z.string()),
});

export type UpdateProfileValues = z.infer<typeof updateProfileSchema>;


export const sendMessageSchema = z.object({
  // Заменяем .uuid() на просто .min(1)
  recipientId: z.string().min(1, "ID получателя обязателен"),
  orderId: z.string().optional().nullable().or(z.literal("")),
  text: z.string().min(1).max(1000).trim().transform(val => val.replace(/\s+/g, ' '))
});

export type SendMessageValues = z.infer<typeof sendMessageSchema>;

export const reviewSchema = z.object({
  orderId: z.string(), // Оставляем только ID заказа
  rating: z.number()
    .min(1, "Поставьте хотя бы одну звезду")
    .max(5),
  comment: z.string()
    .min(10, "Опишите подробнее (минимум 10 символов)")
    .max(500, "Слишком длинный отзыв"),
});

export type ReviewValues = z.infer<typeof reviewSchema>;


export const createOfferSchema = z.object({
  orderId: z.string(),
  price: z.number().min(1, "Укажите цену"),
  message: z.string().optional(),
});

export type CreateOfferValues = z.infer<typeof createOfferSchema>;

