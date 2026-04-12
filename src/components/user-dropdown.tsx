"use client";

import { LogOutIcon, SettingsIcon, ShieldIcon, UserIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { User } from "@/lib/auth";

interface UserDropdownProps {
  user: User
}

//import { createAuthClient } from "better-auth/react"
//const { useSession } = createAuthClient()

export function UserDropdown({ user }: UserDropdownProps) {


  /* const {
     data: session,
     isPending, //loading state
     error, //error object 
     refetch //refetch the session 
   } = useSession()*/


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          {/*isPending ? "true" : "false"*/}
          {/*user.image ? (
            <Image
              src={user.image}
              alt={user.name}
              width={16}
              height={16}
              className="rounded-full object-cover"
            />
          ) : (
            <UserIcon />
          )*/}
          <UserIcon />
          <span className="max-w-[12rem] truncate">{user.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* TODO: Hide admin item for non-admin users */}
        {user.role === "admin" && <AdminItem />}
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserIcon className="size-4" /> <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <SettingsIcon className="size-4" /> <span>Settings</span>
          </Link>
        </DropdownMenuItem>


        <SignOutItem />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AdminItem() {
  return (
    <DropdownMenuItem asChild>
      <Link href="/admin">
        <ShieldIcon className="size-4" /> <span>Admin</span>
      </Link>
    </DropdownMenuItem>
  );
}

function SignOutItem() {
  const router = useRouter();

  async function handleSignOut() {
    const { error } = await authClient.signOut()
    if (error) {
      toast.error(error.message || "Something went wrong")
    } else {
      toast.success("Signed out successfuly")
      router.push('/')
      router.refresh()
    }
  }

  return (
    <DropdownMenuItem onClick={handleSignOut}>
      <LogOutIcon className="size-4" /> <span>Sign out</span>
    </DropdownMenuItem>
  );
}
