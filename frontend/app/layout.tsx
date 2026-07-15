import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeowPay",
  description: "Treat money movement for cats and their humans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
