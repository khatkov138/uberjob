"use server"

import prisma from "@/lib/prisma";
import { createAction } from "@/lib/server-utils";
import { InferActionResult } from "@/lib/types/types";

export async function getAllCategories() {
  return createAction(async () => {
    const categories = await prisma.category.findMany({
      orderBy: {
        name: 'asc'
      },
      select: {
        id: true,
        name: true
      }
    });

    return categories;
  });
}
export type DBCategory = InferActionResult<typeof getAllCategories>;
