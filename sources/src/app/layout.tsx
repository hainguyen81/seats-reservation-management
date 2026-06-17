import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Seat Reservation Management',
    description: 'Senior/Lead Engineer Coding Challenge - Author: hainguyenjc@gmail.com',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`p-6 rounded text-center font-bold transition-all ${
                    seat.status === 'BOOKED' ? 'seat-booked' :
                    seat.status === 'PENDING' ? 'seat-reserved' :
                    selectedSeat === seat.id ? 'seat-available ring-4 ring-emerald-500 scale-105' : 'seat-available'
                }`}
            >
                {children}
            </body>
        </html>
    );
}
