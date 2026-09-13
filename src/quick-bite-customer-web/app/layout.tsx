import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientBootManager from "@/src/components/shared/ClientBootManager";
import Providers from "@/src/components/shared/Providers";
import Header from "@/src/components/shared/Header";

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

const identityUrl = process.env.NEXT_PUBLIC_IDENTITY_URL || "https://quick-bite-identity.onrender.com";
const orderUrl = process.env.NEXT_PUBLIC_ORDER_URL || "https://quick-bite-order.onrender.com/api/app";
const catalogUrl = process.env.NEXT_PUBLIC_CATALOG_URL || "https://quick-bite-catalog.onrender.com";
const inventoryUrl = process.env.NEXT_PUBLIC_INVENTORY_URL || "https://quick-bite-inventory.onrender.com/api/v1";
const paymentUrl = process.env.NEXT_PUBLIC_PAYMENT_URL || "https://quick-bite-payment.onrender.com/v1";
const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "https://quick-bite-gw.onrender.com";

const wakeupScript = `
  (function() {
    if (typeof window === 'undefined') return;
    try {
      if (sessionStorage.getItem('quickbite_system_ready') === 'true') return;
    } catch(e) {}

    var targets = [
      { key: 'gateway', url: '${gatewayUrl}/health' },
      { key: 'identity_service', url: '${identityUrl}/health' },
      { key: 'order_service', url: '${orderUrl}/health' },
      { key: 'catalog_service', url: '${catalogUrl}/health' },
      { key: 'payment_service', url: '${paymentUrl}/health' },
      { key: 'inventory_service', url: '${inventoryUrl}/health' }
    ];

    window.__QUICKBITE_PROMISES = window.__QUICKBITE_PROMISES || {};

    targets.forEach(function(t) {
      if (!window.__QUICKBITE_PROMISES[t.key]) {
        window.__QUICKBITE_PROMISES[t.key] = fetch(t.url, {
          method: 'GET',
          signal: AbortSignal.timeout(90000),
          cache: 'no-store',
          headers: { 'Accept': 'application/json, text/plain, */*' }
        }).then(function(res) {
          return res.json().catch(function() {
            return { status: res.ok ? 'Healthy' : 'Unhealthy' };
          });
        }).catch(function(err) {
          return { status: 'Failed', error: err.message };
        });
      }
    });
  })();
`;

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
      <head>
        <script dangerouslySetInnerHTML={{ __html: wakeupScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <Providers>
          <ClientBootManager>
            <Header />
            <main className="flex-1">{children}</main>
          </ClientBootManager>
        </Providers>
      </body>
    </html>
  );
}


