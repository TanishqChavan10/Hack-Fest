import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/shared/AuthProvider";
import { Navbar } from "@/components/shared/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TalentMatch — Scalable Talent Discovery Platform",
  description:
    "AI-powered talent matching platform that connects recruiters with candidates using weighted algorithmic scoring and semantic search.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <footer className="border-t bg-muted/40 py-6 mt-8">
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} TalentMatch · Built with Next.js,
              Prisma & pgvector
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
