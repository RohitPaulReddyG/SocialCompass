
import type { Metadata } from 'next';
import { Poppins as FontSans } from 'next/font/google'; // Changed from Inter to Poppins
import './globals.css';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700'], // Added typical weights for Poppins
});

export const metadata: Metadata = {
  title: 'Social Compass',
  description: 'Recharge your life by understanding your people.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          fontSans.variable
        )}
      >
        <AuthProvider>
          <ThemeProvider>
            <AppLayout>{children}</AppLayout>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
