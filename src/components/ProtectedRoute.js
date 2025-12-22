"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./authContext";

export default function ProtectedRoute({ children }) {
  const { currentUser, userSubscription } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!currentUser || !userSubscription || userSubscription.subscriptionStatus !== "ACTIVE") {
      router.push("/");
    }
  }, [currentUser, userSubscription, router]);

  // Don't render anything while checking authentication
  if (!currentUser || !userSubscription || userSubscription.subscriptionStatus !== "ACTIVE") {
    return null;
  }

  // Render children if user is authenticated and has an active subscription
  return children;
} 