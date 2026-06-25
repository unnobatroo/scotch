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
  maximumScale: 1,
  themeColor: "#4f46e5",
};

/**
 * Root layout. Provides auth context and the persistent app frame
 * (top bar + bottom navigation) around every page.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppFrame>{children}</AppFrame>
        </AuthProvider>
      </body>
    </html>
  );
}
