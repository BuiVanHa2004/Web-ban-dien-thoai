import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AppProviders from "@/providers/AppProviders";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "MyPhone Store - Điện thoại chính hãng",
  description: "Hệ thống bán lẻ điện thoại di động chính hãng giá tốt nhất.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
