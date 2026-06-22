"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import React from "react";

export default function CustomerPageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);
  const prevPathRef = React.useRef(pathname);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    prevPathRef.current = pathname;
  }, [pathname]);

  if (!mounted) {
    return <div className="w-full">{children}</div>;
  }

  const isRouteChange = prevPathRef.current !== pathname;

  return (
    <motion.div
      key={pathname}
      initial={isRouteChange ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}
