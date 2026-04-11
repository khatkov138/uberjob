import { getServerSession } from "@/lib/get-session";
import prisma from "@/lib/prisma";
import { adminMarketsQuery } from "@/lib/types";

import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {

    try {

        const session = await getServerSession();
        const user = session?.user;

        if (!user) { 
            return Response.json({ error: "Unauthorized" },
                { status: 401 })
        }

        const data = await prisma.market.findMany(adminMarketsQuery)

        return Response.json(data)

    } catch (error) {
        console.log(error)
        return Response.json({ error: "Internal server error" },
            { status: 500 })
    }

}