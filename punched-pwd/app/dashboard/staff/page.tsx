"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Staff default home: redirect to Activity page
export default function StaffDashboardPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/staff/activity");
  }, [router]);
  return null;
}
