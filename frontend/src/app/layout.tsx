import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AuthProvider } from "@/components/providers/auth-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Let's Play Padel League — Platform Manajemen Turnamen Padel Modern",
  description:
    "Otomatiskan jadwal pertandingan, alokasi lapangan, live scoring dengan konfirmasi otomatis pemain, dan klasemen real-time untuk komunitas Padel Anda.",
  keywords: ["padel", "padel league", "americano", "mexicano", "round robin", "padel tournament", "live scoring"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body className={`${inter.variable} font-sans antialiased min-h-screen flex flex-col justify-between`}>
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
