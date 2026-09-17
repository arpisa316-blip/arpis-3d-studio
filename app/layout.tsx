import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARPIS 3D - AI Model Studio",
  description: "Generate 3D Models with AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0c] text-white">
        {children}
      </body>
    </html>
  );
}