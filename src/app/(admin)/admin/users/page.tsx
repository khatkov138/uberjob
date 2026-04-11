import prisma from "@/lib/prisma";
import { columns } from "./columns";
import UsersTable from "./users-table";
import { adminUsersQuery } from "@/lib/types";

 

async function getUsers() {

    const users = await prisma.user.findMany(adminUsersQuery);
    return users;
}

export default async function AdminUsersPage() {

    const users = await getUsers()

    return (
        <>

            <div className="container mx-auto py-10">
                <UsersTable columns={columns} data={users} />
            </div>

        </>
    );
}