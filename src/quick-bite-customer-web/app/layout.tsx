import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientBootManager from "@/src/components/shared/ClientBootManager";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuickBite - Đặt Món Ăn Nhanh Chóng & Tiện Lợi",
  description: "Trải nghiệm dịch vụ đặt món ăn giao tận nơi hàng đầu cùng QuickBite.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <ClientBootManager>{children}</ClientBootManager>
      </body>
    </html>
  );
}

