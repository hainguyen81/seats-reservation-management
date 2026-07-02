import type { Metadata } from 'next';
import './globals.css';
import { AppLanguageProvider } from '@/lib/i18n/provider';

export const metadata: Metadata = {
    title: 'Seats Reservation Management',
    description: 'Senior/Lead Engineer Coding Challenge - Author: hainguyenjc@gmail.com',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="bg-gray-950 text-gray-100 antialiased min-h-screen">
                {/* 🔥 THE INJECTION HUB: Encapsulate the tree to populate multi-language strings [3.2] */}
                <AppLanguageProvider>
                    {children}
                </AppLanguageProvider>
            </body>
        </html>
    );
}
