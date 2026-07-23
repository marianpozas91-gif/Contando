import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mi Balance",
  description: "Control financiero personal, claro y editable.",
  manifest: process.env.GITHUB_PAGES === "true" ? "/Contando/manifest.json" : "/manifest.json",
  icons: {
    icon: process.env.GITHUB_PAGES === "true" ? "/Contando/icon-192.png" : "/icon-192.png",
    shortcut: process.env.GITHUB_PAGES === "true" ? "/Contando/icon-192.png" : "/icon-192.png",
    apple: process.env.GITHUB_PAGES === "true" ? "/Contando/apple-touch-icon.png" : "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#24483a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
