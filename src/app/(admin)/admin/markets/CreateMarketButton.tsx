"use client"

import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useCreateMarket } from "./mutations";


export default function CreateMarketButton() {

    const { mutate, isPending } = useCreateMarket()

    return (
        <Button onClick={() => mutate()}><PlusIcon /> Создать маркет</Button>
    );
}