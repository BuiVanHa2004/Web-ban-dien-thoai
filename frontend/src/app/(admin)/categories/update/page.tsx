import React, { Suspense } from "react";
import UpdateCategory from "@/interface/Admin/Category/Update/UpdateCategory";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
        </div>
      }
    >
      <UpdateCategory />
    </Suspense>
  );
}
