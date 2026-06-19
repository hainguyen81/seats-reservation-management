import type { Metadata } from 'next';
import './globals.css';

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
                {children}
            </body>
        </html>
    );
}
