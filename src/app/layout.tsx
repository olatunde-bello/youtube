import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YouTube Dashboard",
  description: "Your channels at a glance",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0e1116" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
