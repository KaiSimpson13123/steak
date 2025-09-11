import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "./_components/Navbar";
import { Analytics } from "@vercel/analytics/next";
import Footer from "./_components/Footer";
import { AuthProvider } from "@/components/AuthProvider";
import BlockGuard from "./_components/BlockGuard";

const inter = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Steak",
  description:
    "Experience the thrill of games like Mines and more. Practice and perfect your strategies in a risk-free environment.",
  keywords: [
    "fake stake",
    "practice casino games",
    "free gambling games",
    "mine game",
    "risk-free gaming",
  ],
  openGraph: {
    title: "Steak",
    description:
      "Play games with virtual currency. Perfect for learning and entertainment.",
    type: "website",
    locale: "en_US",
    url: "https://fakestake.vercel.app",
    images: [
      {
        url: "/assets/stake-logo.svg",
        width: 1200,
        height: 630,
        alt: "Fake Stake Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Steak",
    description: "Experience risk-free gaming with virtual currency",
    images: ["/assets/stake-logo.svg"],
  },
  icons: {
    icon: "/assets/logo.png", // ✅ sets favicon
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={inter.className}>
        {/* Wrap everything in AuthProvider */}
        <AuthProvider>
          <BlockGuard>
            <Navbar/>
            {children}
              <Analytics />
            <Footer />
          </BlockGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
