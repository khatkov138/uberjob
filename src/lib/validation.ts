import z from "zod";

export const passwordSchema = z
  .string()
  .min(1, { message: "Password is required" })
  .min(8, { message: "Password must be at least 8 characters" })
  .regex(/[^A-Za-z0-9]/, {
    message: "Password must contain at least one special character",
  });



// @/lib/validation.ts

// 1. Базовая схема (для сервера)
export const createOrderSchema = z.object({
  description: z.string().min(10, "Опишите задачу подробнее"),
  locationId: z.string().min(1, "Локация не определена"),
  lat: z.number().optional(),
  lng: z.number().optional(),
  price: z.coerce.number().min(0, "Цена не может быть отрицательной"),
  dateType: z.enum(["ASAP", "SCHEDULED"]),
  scheduledDate: z.date().optional(),
});

// 2. Схема для формы (добавляем city)
export const createOrderFormSchema = createOrderSchema.extend({
  city: z.string().optional(),
});

// 3. Генерируем типы ТОЛЬКО из схем (это критично для типизации RHF)
export type CreateOrderValues = z.infer<typeof createOrderSchema>;
export type CreateOrderFormValues = z.infer<typeof createOrderFormSchema>;




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

