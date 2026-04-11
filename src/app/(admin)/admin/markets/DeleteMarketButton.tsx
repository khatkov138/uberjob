"use client"

import { Button } from "@/components/ui/button";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useDeleteMarket } from "./mutations";

export default function DeleteMarketButton({ id }: { id: string }) {

    const { mutate, isPending } = useDeleteMarket()

    return (

        <Button variant={"destructive"}
            onClick={() => mutate(id)}><Trash2Icon />
        </Button>
    );
}