// File: components/Providers.jsx
"use client";

import { SessionProvider } from "next-auth/react";
import { StudioSessionProvider } from "@/components/StudioSessionProvider";

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <StudioSessionProvider>{children}</StudioSessionProvider>
    </SessionProvider>
  );
}
