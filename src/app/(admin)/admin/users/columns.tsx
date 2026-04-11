
import { AdminUsersData } from "@/lib/types"
import { ColumnDef } from "@tanstack/react-table"


export const columns: ColumnDef<AdminUsersData>[] = [
    {
        accessorKey: "id",
        header: "ID",
    },
   
     {
        accessorKey: "name",
        header: "name",
    },
    {
        accessorKey: "email",
        header: "Email",
    },
    {
        accessorKey: "role",
        header: "Role",
    },
    {
        accessorKey: "emailVerified",
        header: "Email verified",
    },
]