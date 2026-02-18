import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LUNAVEX Token Tracker",
  description: "Personal transaction tracker for LUNAVEX (LXV)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-text antialiased">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="mb-8 text-2xl font-bold text-text">
            LUNAVEX Token Tracker
          </h1>
          {children}
        </div>
      </body>
    </html>
  );
}
