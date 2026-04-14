import z from "zod";

export const passwordSchema = z
  .string()
  .min(1, { message: "Password is required" })
  .min(8, { message: "Password must be at least 8 characters" })
  .regex(/[^A-Za-z0-9]/, {
    message: "Password must contain at least one special character",
  });



export const createOrderSchema = z.object({
  description: z.string().min(10, "Опишите задачу подробнее (минимум 10 символов)"),
  address: z.string().min(1, "Укажите населенный пункт"),
  // Валидация координат: не должны быть 0
  lat: z.number().refine(val => val !== 0, "Нужно выбрать город из списка"),
  lng: z.number().refine(val => val !== 0, "Нужно выбрать город из списка"),
  price: z.number().min(100, "Минимальный бюджет 100₽"),
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