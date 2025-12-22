"use client";

import dynamic from "next/dynamic";

const PersistentToast = dynamic(() => import("@/components/PersistentToast"), {
  ssr: false,
});

export default function PersistentToastWrapper() {
  return <PersistentToast />;
}