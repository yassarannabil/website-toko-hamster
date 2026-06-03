import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Noska Hamster — Katalog Live Eksklusif",
  description:
    "Temukan hamster berkualitas premium dari Noska Hamster. Syrian, Campbell, Winter White dengan genetik terjamin. Pesan langsung via WhatsApp!",
  keywords: ["hamster", "jual hamster", "syrian hamster", "noska hamster", "hamster premium"],
  openGraph: {
    title: "Noska Hamster — Katalog Live Eksklusif",
    description: "Hamster premium berkualitas dengan genetik terjamin.",
    type: "website",
  },
};

import AppLayoutWrapper from "./components/AppLayoutWrapper";
import Script from "next/script";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <Script src="https://sandbox.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js" strategy="beforeInteractive" />
        <AppLayoutWrapper>{children}</AppLayoutWrapper>
      </body>
    </html>
  );
}
