"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (status === "loading") return;
    if (session) router.push("/pos");
    else router.push("/login");
  }, [session, status, router]);
  return <div className="flex h-screen items-center justify-center">Loading...</div>;
}