import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Canoe Trip Split",
  description: "Track and split expenses for the trip",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="page">{children}</div>
      </body>
    </html>
  );
}
