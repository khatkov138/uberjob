import { Prisma } from "../../prisma/generated/client";

export type ActionResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: string; // Например, 'AUTH_REQUIRED'
}