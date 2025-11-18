import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'YouTube Shorts Uploader',
  description: 'Upload and schedule YouTube Shorts directly from your browser',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <header className="header">
            <div className="brand">YouTube Shorts Uploader</div>
            <nav className="nav">
              <a href="/" className="link">Home</a>
              <a href="https://developers.google.com/youtube/v3" target="_blank" rel="noreferrer" className="link">API Docs</a>
            </nav>
          </header>
          <main>{children}</main>
          <footer className="footer">Built for fast Shorts publishing</footer>
        </div>
      </body>
    </html>
  );
}
