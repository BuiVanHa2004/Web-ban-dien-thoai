import { Suspense } from "react";

import PaymentPage from "@/interface/Customer/Payment/PaymentPage";

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    }>
      <PaymentPage />
    </Suspense>
  );
}

