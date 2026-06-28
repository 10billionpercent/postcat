import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Postcat",
  description: "Lightweight API Client",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden bg-gray-900 text-gray-50">
        {children}
      </body>
    </html>
  );
}
