import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { AppLayout } from '@/components/app/app-layout';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FairDesk',
  description: 'Manage rotating seat assignments for your team.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <AppLayout>
          {children}
        </AppLayout>
        <Toaster />
      </body>
    </html>
  );
}
