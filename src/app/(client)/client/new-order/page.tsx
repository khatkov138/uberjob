import { getServerSession } from "@/lib/get-session";
import { CreateOrderForm } from "./create-order-form";
import { unauthorized } from "next/navigation";



export default async function Dashboard() {

    const session = await getServerSession();
    const user = session?.user;

    if (!user) unauthorized()

    return (
        <>
            <CreateOrderForm  />
        </>
    );
}