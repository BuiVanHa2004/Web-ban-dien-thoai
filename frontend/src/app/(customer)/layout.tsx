import React from "react";

import CustomerLayout from "@/components/customers/layout";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <CustomerLayout>{children}</CustomerLayout>;
}
