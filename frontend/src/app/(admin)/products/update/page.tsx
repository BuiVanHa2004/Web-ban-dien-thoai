
import React, { Suspense } from "react";
import UpdateProduct from "@/interface/Admin/Product/Update/UpdateProduct";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" /></div>}>
      <UpdateProduct />
    </Suspense>
  );
}

