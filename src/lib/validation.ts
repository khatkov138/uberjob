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
