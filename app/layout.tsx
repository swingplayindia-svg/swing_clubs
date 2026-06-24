import type { Metadata } from "next";
import { Sora } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/lib/theme-provider";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Swing Organizer",
    template: "%s · Swing Organizer",
  },
  applicationName: "Swing Organizer Portal",
  description: "Command center for Swing club and tournament organizers.",
};

// Inline script applied before paint — prevents flash of wrong theme
const themeScript = `
  try {
    var t = localStorage.getItem('swing-theme') || 'dark';
    if (t === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch(e) {
    document.documentElement.classList.add('dark');
  }
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${sora.variable} antialiased font-sans`} suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
