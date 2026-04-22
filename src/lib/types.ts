import { Category, Order, Prisma, Profile } from "../../prisma/generated/client";

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


export interface ActiveOrder extends Order {
  categories: {
    category: Category
  }[]
  client: {
    name: string
    image: string | null
  }
}

// Тип для профиля со вложенными навыками
export type FullProfile = Profile & {
  skills: {
    category: Category;
  }[];
} | null;

// Тип для заказа (упростим или используй свой OrderWithDetails)
export interface FeedOrder extends Order {
  isMatch?: boolean;
  categories: { category: Category }[];
  client: { name: string; image: string | null };
}
