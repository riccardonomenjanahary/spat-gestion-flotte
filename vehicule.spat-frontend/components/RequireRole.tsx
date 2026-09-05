"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RequireRole({
  allow,
  children,
}: {
  allow: string[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [autorise, setAutorise] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || !role || !allow.includes(role)) {
      router.replace("/login");
      return;
    }

    setAutorise(true);
  }, [allow, router]);

  if (!autorise) {
    return null;
  }

  return <>{children}</>;
}