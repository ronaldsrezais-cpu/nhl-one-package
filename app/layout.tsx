import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NHL Prediction League",
  description: "Daily NHL predictions and playoff bracket scoring"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
