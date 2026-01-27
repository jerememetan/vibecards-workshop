import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import BackgroundVideo from "@/components/background-video";

export const metadata: Metadata = {
  title: "VibeCards - AI Flashcards",
  description: "Generate flashcards from topics using AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <BackgroundVideo />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
