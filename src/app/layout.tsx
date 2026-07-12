import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { RoleProvider } from "@/lib/roleContext";
import Shell from "@/components/layout/Shell";
import { cn } from "@/lib/utils";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TransitOps - Smart Transport Operations Platform",
  description: "Centralized fleet, driver, trip, and maintenance operations manager",
  icons: {
    icon: [
      { url: '/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon/light.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon/dark.png', media: '(prefers-color-scheme: dark)' }
    ],
    shortcut: '/favicon/favicon.ico',
    apple: '/favicon/apple-touch-icon.png',
  },
  manifest: '/favicon/site.webmanifest'
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={cn("h-full antialiased", geistSans.variable, geistMono.variable)}
        suppressHydrationWarning
      >
        <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <RoleProvider>
              <Shell>{children}</Shell>
            </RoleProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
