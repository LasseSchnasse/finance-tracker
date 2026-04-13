import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance Tracker",
  description: "Tracke deine Bankumsätze via Push-Benachrichtigungen",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="bg-white text-zinc-900 antialiased">{children}</body>
    </html>
  );
}
