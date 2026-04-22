import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chat FE",
  description: "ChatGPT-style interface built with Next.js and shadcn patterns",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans">
        <Script id="theme-init" strategy="beforeInteractive">
          {`(() => {
            const savedTheme = window.localStorage.getItem("theme");
            const theme = savedTheme === "dark" || savedTheme === "light" ? savedTheme : "dark";
            document.documentElement.classList.toggle("dark", theme === "dark");
          })();`}
        </Script>
        {children}
      </body>
    </html>
  );
}
