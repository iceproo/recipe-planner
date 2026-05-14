// app/layout.tsx
// This wraps EVERY page in the app.
// It sets the HTML <head> (title, fonts) and the outer shell.
// Think of it like a master page / base template.

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recipe App",
  description: "Import and manage your recipes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Navigation bar shown on every page */}
        <nav className="nav">
          <a href="/" className="nav-logo">🍴 Recipes</a>
          <div className="nav-links">
            <a href="/" className="nav-link">My Recipes</a>
            <a href="/import" className="nav-link nav-link-primary">+ Import</a>
          </div>
        </nav>

        {/* Page content is injected here */}
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
