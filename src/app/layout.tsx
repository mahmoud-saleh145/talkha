import type { Metadata } from "next";
import { Analytics } from '@vercel/analytics/next';
import "./globals.css";

export const metadata: Metadata = {
  title: "نظام تسجيل الطلاب - Talkha",
  description: "نظام تسجيل بيانات الطلاب وإدارة الأدمنز لسنتر Talkha",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body>
        {children}

        <Analytics />
      </body>
    </html>
  );
}
