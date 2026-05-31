import React, { Suspense } from "react";
import MainPage from "@/interface/Customer/MainPage";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-700 border-t-zinc-300" />
        </div>
      }
    >
      <MainPage />
    </Suspense>
  );
}
