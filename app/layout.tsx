import "./globals.css";
import type { Metadata } from "next";
import AppNavbar from "@/components/app-navbar";

export const metadata: Metadata = {
  title: "Legal AI",
  description: "Création d’entreprise assistée par IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="bg-[#f7f4ee] text-slate-800 antialiased">
        <AppNavbar />
        {children}
      </body>
    </html>
  );
}