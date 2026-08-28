import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// What a search result and a shared link say about Run. The description is
// the README's own first claim, so the two never drift; "squad" lived here
// for weeks after squads were deleted from the product.
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://tryrun.today";
const DESCRIPTION =
  "Run turns a sentence into an assistant. Tell it the job and it reads, sorts and drafts in your real Gmail and Google Drive until the job is done. Anything that changes something asks you first.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Run", template: "%s · Run" },
  description: DESCRIPTION,
  applicationName: "Run",
  icons: { icon: "/run-icon.png" },
  openGraph: {
    type: "website",
    siteName: "Run",
    title: "Run turns a sentence into an assistant",
    description: DESCRIPTION,
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Run: an agent asking its setup questions in the chat" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Run turns a sentence into an assistant",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
