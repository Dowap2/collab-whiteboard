import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Collab Whiteboard",
  description: "Real-time collaborative whiteboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
