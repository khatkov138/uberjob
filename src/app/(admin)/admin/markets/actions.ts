"use server"


import { v4 as uuidv4 } from 'uuid';

import { getServerSession } from "@/lib/get-session";
import prisma from "@/lib/prisma";


export async function CreateMarket() {
    const session = await getServerSession();
    const user = session?.user;

    if (!user) return { error: "Unauthorized" }

    try {
        let randomName = uuidv4();
       

        const createdMarket = await prisma.market.create({
            data: {
                name: randomName,
                slug: randomName

            },
            include: { showcases: true }

        })

        return { error: null, data: createdMarket };
    } catch (error) {
        console.log(error)
        throw new Error("Something went wrong",)
    }

}

export async function DeleteMarket(id: string) {
    const session = await getServerSession();
    const user = session?.user;

    if (!user) return { error: "Unauthorized" }

    try {

        const deletedMarket = await prisma.market.delete({
            where: {
                id
            }

        })

        return { error: null, data: deletedMarket };
    } catch (error) {
        console.log(error)
        throw new Error("Something went wrong",)
    }

}