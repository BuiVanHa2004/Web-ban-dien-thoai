"use client";

import React from "react";

type AvatarProps = {
  src?: string | null;
  name?: string | null;
  className?: string;
  textClassName?: string;
};

export default function Avatar({
  src,
  name,
  className = "h-12 w-12 rounded-full",
  textClassName = "text-base font-semibold",
}: AvatarProps) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";

  if (src) {
    return (
      <div className={`overflow-hidden bg-slate-100 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10 ${className}`}>
        <img
          src={src}
          alt={name || "Avatar"}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 text-white ring-1 ring-black/5 dark:ring-white/10 ${className} ${textClassName}`}
      aria-label={name || "Avatar"}
    >
      {initial}
    </div>
  );
}
