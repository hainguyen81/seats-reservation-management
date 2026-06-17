'use client';
import { useState, useEffect } from 'react';

const SESSION_EXPIRY = process.env.SESSION_EXPIRY;
const SESSION_EXPIRY_DAYS = SESSION_EXPIRY ? parseInt(SESSION_EXPIRY, 10) : 1;

export default function Home() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true); // wait for session
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [seats, setSeats] = useState<any[]>([]);
    const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
    const [message, setMessage] = useState('');

    // 1. check Cookie for valid session and request 3 seats
    useEffect(() => {
        // check session status
        fetch('/api/auth/me')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data && data.loggedIn) {
                    setUser(data.user);
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));

        // request 3 seats
        fetch('/api/seats')
            .then((res) => res.json())
            .then((data) => setSeats(data));
    }, []);

    // handle login
    const handleLogin = async () => {
        if (!username.trim() || !password.trim()) {
            setMessage('⚠️ Please enter both username and password.');
            return;
        }
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (data.success) {
            setUser(data.user);
            setPassword(''); // clear password after login successful
            setMessage('👋 Welcome back!');
        } else {
            setMessage(`❌ Login failed: ${data.error}`);
        }
    };

    // handle logout
    const handleLogout = async () => {
        const res = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        if (res.ok) {
            setUser(null);
            setSelectedSeat(null);
            setMessage('🔒 Session terminated safely.');
        }
    };

    // handle reserving seat
    const handleReserve = async (mockSuccess: boolean) => {
        if (!selectedSeat) return;
        setMessage('Processing transaction...');
        const res = await fetch('/api/reserve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
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
            {loading && <div className="top-loading-bar" />}
            {!loading && <h1 className="text-2xl font-bold">Seat Reservation Management</h1>}

            {/* login block */}
            {!loading && !user ? (
                <div className="panel-container" style={{ maxWidth: '100%', margin: '0 auto' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <h3 className="font-semibold text-lg text-emerald-400" style={{ margin: 0, fontSize: '1.25rem', color: '#10b981' }}>
                            Identity Authentication
                        </h3>
                        <p className="text-xs text-gray-400" style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
                            Please authenticate to unblock the seat matrix mapping loop.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>

                        {/* username */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500, textAlign: 'left' }}>
                                Username
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. linkz_senior_lead"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>

                        {/* password */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500, textAlign: 'left' }}>
                                Password
                            </label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* login/register */}
                    <div>
                        <button className="btn-primary" onClick={handleLogin}>
                            Login / Register
                        </button>
                    </div>
                </div>
            ) : !loading && user && (
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'between',
                        alignItems: 'center',
                        backgroundColor: 'rgba(16, 185, 129, 0.05)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        padding: '16px',
                        borderRadius: '12px',
                        marginBottom: '24px',
                        justifyContent: 'space-between'
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#d1d5db' }}>
                            Secured Operator: <span style={{ color: '#10b981', fontWeight: 'bold' }}>{user.username}</span>
                        </p>
                        <div>
                            <span
                                style={{
                                    fontSize: '0.65rem',
                                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                    color: '#10b981',
                                    padding: '2px 8px',
                                    borderRadius: '9999px',
                                    fontWeight: 500,
                                    display: 'inline-block'
                                }}
                            >
                                Session Active ({SESSION_EXPIRY_DAYS}d)
                            </span>
                        </div>
                    </div>

                    {/* log out */}
                    <button
                        onClick={handleLogout}
                        style={{
                            fontSize: '0.75rem',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: '#f87171',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = '#ef4444';
                            e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                            e.currentTarget.style.color = '#f87171';
                        }}
                    >
                        Sign Out
                    </button>
                </div>
            )}

            {/* seats map */}
            {user && (
                <div className="panel-container" style={{ marginTop: '24px', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '1.125rem', color: '#10b981', fontWeight: 600 }}>
                        Select an Available Seat
                    </h3>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                            gap: '12px'
                        }}
                    >
                        {seats.map((seat) => {
                            let bgStyle = '#ffffff';
                            let textStyle = '#1f2937';
                            let borderStyle = '1px solid #e5e7eb';
                            let isCursorAllowed = 'pointer';

                            if (seat.status === 'PENDING') {
                                bgStyle = 'linear-gradient(135deg, #ffedd5 0%, #f97316 100%)'; // RESERVED
                                textStyle = '#ffffff';
                                borderStyle = '1px solid #ea580c';
                            } else if (seat.status === 'BOOKED') {
                                bgStyle = 'linear-gradient(135deg, #fca5a5 0%, #ef4444 100%)'; // BOOKED
                                textStyle = '#ffffff';
                                borderStyle = '1px solid #dc2626';
                                isCursorAllowed = 'not-allowed';
                            } else if (selectedSeat === seat.id) {
                                bgStyle = '#065f46'; // SELETED
                                textStyle = '#ffffff';
                                borderStyle = '2px solid #10b981';
                            }

                            return (
                                <button
                                    key={seat.id}
                                    disabled={seat.status !== 'AVAILABLE'}
                                    onClick={() => setSelectedSeat(seat.id)}
                                    style={{
                                        padding: '12px 8px',
                                        background: bgStyle,
                                        color: textStyle,
                                        border: borderStyle,
                                        borderRadius: '10px',
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                        cursor: isCursorAllowed,
                                        fontSize: '0.85rem',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                        transition: 'all 0.2s ease',
                                        outline: 'none'
                                    }}
                                    onMouseOver={(e) => {
                                        if (seat.status === 'AVAILABLE') {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,255,255,0.2)';
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (seat.status === 'AVAILABLE') {
                                            e.currentTarget.style.transform = 'none';
                                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
                                        }
                                    }}
                                >
                                    {seat.number}
                                    <span
                                        style={{
                                            display: 'block',
                                            fontSize: '0.55rem',
                                            fontWeight: 'normal',
                                            marginTop: '4px',
                                            opacity: 0.8,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}
                                    >
                                        {seat.status === 'PENDING' ? 'Reserved' : seat.status.toLowerCase()}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Payments Mock Up block */}
            {selectedSeat && user && (
                <div className="panel-container" style={{ marginTop: '24px', padding: '24px' }}>
                    <p style={{ margin: '0 0 16px 0', fontSize: '0.875rem', color: '#9ca3af' }}>
                        Staging Reservation Target: <strong style={{ color: '#10b981', fontSize: '1.125rem' }}>
                            {seats.find(s => s.id === selectedSeat)?.number}
                        </strong>
                    </p>

                    {/* Bọc Flexbox hàng ngang cho 2 nút bấm, tự động bẻ dọc trên mobile */}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>

                        {/* NÚT THANH TOÁN THÀNH CÔNG (TÔNG XANH LÁ) */}
                        <button
                            onClick={() => handleReserve(true)}
                            style={{
                                flex: 1,
                                minWidth: '150px',
                                padding: '12px 16px',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                            onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
                        >
                            Simulate Success Payment
                        </button>

                        {/* NÚT THANH TOÁN THẤT BẠI (TÔNG ĐỎ) */}
                        <button
                            onClick={() => handleReserve(false)}
                            style={{
                                flex: 1,
                                minWidth: '150px',
                                padding: '12px 16px',
                                background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                            onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
                        >
                            Simulate Fail Payment
                        </button>

                    </div>
                </div>
            )}

            {message && <div className="p-3 bg-gray-800 text-center rounded">{message}</div>}
        </main>
    );
}
