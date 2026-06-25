import "./globals.css";
import { AuthProvider } from "./providers";
import AppFrame from "./components/AppFrame";

export const metadata = {
  title: "Scotch — Deutsch lernen",
  description: "Flashcards, notes and an AI answer-checker for learning German.",
  manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#E8620E",
};

/**
 * Root layout. Loads the brand fonts (Bricolage Grotesque for display, Plus
 * Jakarta Sans for body) via Google Fonts, provides auth context and wraps every
 * page in the responsive app frame (sidebar on desktop, bottom nav on mobile).
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <AppFrame>{children}</AppFrame>
        </AuthProvider>
      </body>
    </html>
  );
}
