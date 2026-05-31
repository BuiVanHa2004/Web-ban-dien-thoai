"use client";

import dynamic from "next/dynamic";

const StatisticalPage = dynamic(() => import("@/interface/Admin/Statistical/StatisticalPage"), {
  ssr: false,
});

export default function Page() {
  return <StatisticalPage />;
}
