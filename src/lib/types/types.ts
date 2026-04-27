import { Category, Order, Profile } from "@prisma/client";
import { ActionResponse } from "../server-utils";


export type InferActionResult<T extends (...args: any) => Promise<ActionResponse<any>>> =
  Awaited<ReturnType<T>> extends { data: infer D }
  ? (D extends (infer U)[] ? U : D)
  : never;
/*

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
*/