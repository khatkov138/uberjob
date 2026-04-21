import { Category, Order, Prisma } from "../../prisma/generated/client";

export type ActionResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: string; // Например, 'AUTH_REQUIRED'
}

export interface OrderWithDetails extends Order {
  client: {
    name: string
    image: string | null
    createdAt: Date
    _count: { ordersCreated: number }
  }
  categories: {
    categoryId: string
    category: Category
  }[]
  _count: { offers: number }
}

interface OrderDetailsUIProps {
  order: OrderWithDetails
  existingOffer: boolean
  userId?: string
}