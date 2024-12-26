'use client';
import React from 'react';
import './globals.css';
import { Inter } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { UserMenu } from './components/UserMenu';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-100">
              <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
                <h1 className="text-xl font-semibold text-gray-900">Tweet Translator</h1>
                <UserMenu />
              </div>
            </header>

            {/* Main Content */}
            {children}
          </div>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
} 