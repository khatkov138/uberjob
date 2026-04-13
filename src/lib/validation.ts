import z from "zod";

export const passwordSchema = z
  .string()
  .min(1, { message: "Password is required" })
  .min(8, { message: "Password must be at least 8 characters" })
  .regex(/[^A-Za-z0-9]/, {
    message: "Password must contain at least one special character",
  });

export const createOrderSchema = z.object({
  title: z.string().min(5, "Заголовок слишком короткий"),
  description: z.string().min(20, "Опишите задачу подробнее для AI"),
  address: z.string().min(3, "Введите адрес"),
  price: z.coerce.number().min(500, "Минимальный бюджет — 500 ₽"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  dateType: z.enum(["ASAP", "SCHEDULED"]),
  scheduledDate: z.date().optional(),
});



export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Имя обязательно"),
  // Используем .catch(null) или объединение типов, чтобы TS не путался
  image: z.union([z.string(), z.null()]).optional(),
  bio: z.union([z.string(), z.null()]).optional(),
  // Массив должен быть обязательным в схеме, чтобы совпадать с типом формы
  skills: z.array(z.string()),
});

export type UpdateProfileValues = z.infer<typeof updateProfileSchema>;