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
  address: z.string().min(1, "Укажите населенный пункт"),
  // Используем обычный number без refine внутри схемы для типизации, 
  // проверку на 0 оставим, но в более простом виде
  lat: z.number(),
  lng: z.number(),
  price: z.number().min(0),
  dateType: z.enum(["ASAP", "SCHEDULED"]),
});

// Экспортируем тип, который Zod вывел автоматически
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