import { Category, Order, Profile } from "@prisma/client";
import { ActionResponse } from "../server-utils";


// lib/server-utils.ts

export type InferActionResult<T extends (...args: any) => Promise<ActionResponse<any>>> =
  // 1. Сначала достаем data и СРАЗУ говорим, что нам не нужен null
  NonNullable<Awaited<ReturnType<T>>['data']> extends (infer U)[]
  ? U // 2. Если внутри массив — отдаем тип элемента
  : NonNullable<Awaited<ReturnType<T>>['data']>; 
  // 3. Если объект — отдаем чистый объект

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