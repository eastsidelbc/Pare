import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pare: Sports Stat Comparison",
  description: "Professional sports statistics comparison platform for NFL and NBA teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
