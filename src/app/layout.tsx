import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Bricolage_Grotesque, Outfit } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display-var",
});

const sans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans-var",
});

export const metadata: Metadata = {
  title: "Mova · Muévete entre clases",
  description:
    "Micro-rutinas de 3 minutos, retos diarios progresivos y recompensas para estudiantes que quieren vencer el sedentarismo.",
};

export const viewport: Viewport = {
  themeColor: "#c9f24f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`}>
      <body className="bg-paper font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
