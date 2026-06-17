'use client';
import { useState, useEffect } from 'react';

export default function Home() {
    const [user, setUser] = useState<any>(null);
    const [username, setUsername] = useState('');
    const [seats, setSeats] = useState<any[]>([]);
    const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
    const [message, setMessage] = useState('');

    // 1. Initialize default 3 seats
    useEffect(() => {
        fetch('/api/seats').then(res => res.json()).then(data => setSeats(data));
    }, []);

    const handleLogin = async () => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password: 'password123' }),
        });
        const data = await res.json();
        if (data.success) setUser(data.user);
    };

    const handleReserve = async (mockSuccess: boolean) => {
        if (!selectedSeat) return;
        setMessage('Processing transaction...');
        const res = await fetch('/api/reserve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seatId: selectedSeat, mockPaymentSuccess: mockSuccess }),
        });
        const data = await res.json();
        if (data.success) {
            setMessage('🎉 Seat successfully reserved!');
            // Reload seats list
            fetch('/api/seats').then(res => res.json()).then(data => setSeats(data));
        } else {
            setMessage(`❌ Failed: ${data.error}`);
        }
    };

    return (
        <main className="p-8 max-w-xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">Seat Reservation Platform (Linkz Assessment)</h1>

            {/* login block */}
            {!user ? (
                <div className="p-4 border rounded space-y-3">
                    <h3 className="font-semibold">Login (Session: 90 days)</h3>
                    <input className="border p-2 w-full text-black" placeholder="Enter Username" value={username} onChange={e => setUsername(e.target.value)} />
                    <button className="bg-green-600 text-white px-4 py-2 rounded w-full" onClick={handleLogin}>Login / Register</button>
                </div>
            ) : (
                <p className="text-green-400">Logged in as: <strong>{user.username}</strong></p>
            )}

            {/* sets map */}
            <div className="p-4 border rounded">
                <h3 className="font-semibold mb-3">Select a Seat (3 Available Initially)</h3>
                <div className="grid grid-cols-3 gap-4">
                    {seats.map((seat) => (
                        <button
                            key={seat.id}
                            disabled={seat.status !== 'AVAILABLE' || !user}
                            onClick={() => setSelectedSeat(seat.id)}
                            className={`p-6 rounded text-center font-bold text-white transition-all ${seat.status === 'BOOKED' ? 'bg-red-600' :
                                    seat.status === 'PENDING' ? 'bg-yellow-600' :
                                        selectedSeat === seat.id ? 'bg-blue-600 ring-4' : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                        >
                            {seat.number} <br /> <span className="text-xs font-normal">({seat.status})</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Payments Mock Up block */}
            {selectedSeat && user && (
                <div className="p-4 border border-blue-500 rounded bg-blue-900/20 space-y-3">
                    <p>You selected Seat ID: <strong>{selectedSeat}</strong></p>
                    <div className="flex gap-2">
                        <button className="bg-blue-600 text-white px-4 py-2 rounded flex-1" onClick={() => handleReserve(true)}>Simulate Success Payment</button>
                        <button className="bg-red-600 text-white px-4 py-2 rounded flex-1" onClick={() => handleReserve(false)}>Simulate Fail Payment</button>
                    </div>
                </div>
            )}

            {message && <div className="p-3 bg-gray-800 text-center rounded">{message}</div>}
        </main>
    );
}
