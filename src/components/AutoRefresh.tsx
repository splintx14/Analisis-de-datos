"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Vuelve a pedir los datos de la página cada cierto tiempo, sin recargarla.
export default function AutoRefresh({ minutes }: { minutes: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), minutes * 60_000);
    return () => clearInterval(id);
  }, [minutes, router]);

  return null;
}
