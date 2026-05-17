'use client';

import React, { memo, Suspense } from 'react';

import { RoleMode } from "@/store/use-role-store";
import { NavbarSkeleton } from './navbar/_components/navbar-skeleton';
import { NavbarConnector } from './navbar/navbar-connector';

interface GatewayProps {
    sessionPromise: Promise<any>;
    initialMode: RoleMode;
}

export const NavbarViewGateway = memo(function NavbarViewGateway({ sessionPromise, initialMode }: GatewayProps) {
    console.log("🎛️ [MOCK RENDER] NavbarViewGateway | Включение клиентского затвора Саспенса");

    return (
        <Suspense fallback={<NavbarSkeleton />}>
            <NavbarConnector sessionPromise={sessionPromise} initialMode={initialMode} />
        </Suspense>
    );
});
