'use client';
import React, { useState, useEffect, useRef } from 'react';
import { logEvent } from 'firebase/analytics';
import { firebaseClientAnalytics } from '../lib/firebase-client';

const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY;
const REFRESH_TOKEN_EXPIRY_DAYS = REFRESH_TOKEN_EXPIRY ? parseInt(REFRESH_TOKEN_EXPIRY, 10) : 1;

export default function Home() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true); // wait for session
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [seats, setSeats] = useState<any[]>([]);
    const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
    const [processingSeats, setProcessingSeats] = useState<Set<string>>(new Set());
    const [message, setMessage] = useState('');
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [isPaying, setIsPaying] = useState<boolean>(false);

    // 1. check Cookie for valid session and request seats
    const fetchSeats = () => {
        fetch('/api/seats')
            .then((res) => res.json())
            .then((data) => setSeats(data.data));
    };
    useEffect(() => {
        // check session status
        fetch('/api/auth/me')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data && data.loggedIn) {
                    setUser(data.user);

                    // restore HOLD seats
                    if (data.heldSeatIds && data.heldSeatIds.length > 0) {
                        setSelectedSeats(data.heldSeatIds);

                        // calculate expired time
                        const secondsLeft = Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000);
                        if (secondsLeft > 0) {
                            setTimeLeft(secondsLeft);
                        }
                    }
                }
                setLoading(false);
            }).catch(() => setLoading(false));
        
        // auto refresh seats matrix
        const interval = setInterval(fetchSeats, 5000);
        return () => clearInterval(interval);
    }, []);

    // manage reserved seats
    useEffect(() => {
        if (selectedSeats.length > 0) {
            if (timeLeft === null) {
                setTimeLeft(300);
            }
        } else {
            setTimeLeft(null);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    }, [selectedSeats]);

    useEffect(() => {
        if (timeLeft === null) return;
        if (timeLeft === 0) {
            // 💡 Timeout: cancel booking and reset seats Frontend
            setSelectedSeats([]);
            setTimeLeft(null);
            setMessage('⚠️ Reservation window expired! Your selected seats have been released.');

            // call API Backend to release expired seats
            fetch('/api/release', { method: 'POST' }).then(() => fetchSeats());
            return;
        }

        // timer counter
        timerRef.current = setTimeout(() => {
            setTimeLeft(timeLeft - 1);
        }, 1000);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [timeLeft]);

    // beautify timer
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const processSeat = (seatId: string, processing?: boolean) => {
        if (processing) {
            setProcessingSeats((prev) => {
                const next = new Set(prev);
                next.add(seatId);
                return next;
            });

        } else {
            // 🔓 LIFECYCLE RELEASE: Re-enable the target element by evicting its tracking token
            setProcessingSeats((prev) => {
                const next = new Set(prev);
                next.delete(seatId);
                return next;
            });
        }
    };

    // handle select seats
    const handleSeatClick = async (seatId: string) => {
        const currentSelectedStrings = selectedSeats.map(id => String(id).trim());
        const targetSeatString = String(seatId).trim();

        // 🛡️ ANTI-SPAM GUARD: Instantly abort execution if this explicit seat is already processing
        if (processingSeats.has(seatId)) return;

        // 🔥 IMMUTABLE STATE MUTATION: Instantly lock down the button on the UI layer
        const isCurrentlySelectedByMe = currentSelectedStrings.includes(targetSeatString);
        processSeat(targetSeatString, true);

        const unselectSeat = (seatId) => {
            setSelectedSeats((prev) => prev.map(id => String(id).trim()).filter((id) => id !== seatId));
        };
        const selectSeat = (seatId) => {
            setSelectedSeats((prev) => [...prev.map(id => String(id).trim()), seatId]);
        };
        const revertSeatSelection = (seatId, hold: boolean) => {
            hold && unselectSeat(seatId);
            !hold && selectSeat(seatId);
        };
        const handleProcessSeat = (data, seatId, hold: boolean) => {
            if (!data?.success || (data?.error || '').length) {
                // revert seat selection status
                revertSeatSelection(seatId, hold);
                setMessage(hold ? `❌ Failed to reserve seat: ${data?.error || 'Unknown Error'}`
                    : `❌ Failed to release seat: ${data?.error || 'Unknown Error'}`);
            } else {
                setMessage(hold ? '✅ Seat reserved successfully.' : '✅ Seat released successfully.');
            }
            processSeat(seatId, false);
        };

        try {
            if (isCurrentlySelectedByMe) {
                // ===================================================
                // 🔓 RELEASE
                // ===================================================
                setMessage('⏳ Releasing seat reservation...');
                unselectSeat(targetSeatString);
                await fetch('/api/reserve/release-single', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ seatId: targetSeatString }),
                }).then(res => {
                    if (!res?.ok) {
                        throw new Error(`Request Error - Status: ${res.status}`);
                    }
                    return res.json();

                }).then(data => {
                    fetch('/api/seats')
                    .then(res => {
                        if (!res?.ok) {
                            throw new Error(`Request Error - Status: ${res.status}`);
                        }
                        return res.json();
                    }).then(seats => {
                        setSeats(seats.data);
                        handleProcessSeat(data, targetSeatString, false);

                    }).catch(error2 => {
                        handleProcessSeat({ error: error2 }, targetSeatString, false);
                    });

                }).catch(error => {
                    handleProcessSeat({ error: error }, targetSeatString, false);
                });

            } else {
                // ===================================================
                // 🔒 HOLD: Reserve in expired minutes
                // ===================================================
                setMessage('⏳ Holding seat...');
                selectSeat(targetSeatString);
                await fetch('/api/reserve/hold', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ seatId: targetSeatString }),
                }).then(res => {
                    if (!res?.ok) {
                        throw new Error(`Request Error - Status: ${res.status}`);
                    }
                    return res.json();

                }).then(data => {
                    fetch('/api/seats')
                        .then(res => {
                            if (!res?.ok) {
                                throw new Error(`Request Error - Status: ${res.status}`);
                            }
                            return res.json();
                        }).then(seats => {
                            setSeats(seats.data);
                            handleProcessSeat(data, targetSeatString, true);

                        }).catch(error2 => {
                            handleProcessSeat({ error: error2 }, targetSeatString, true);
                        });
                
                }).catch(error => {
                    handleProcessSeat({ error: error }, targetSeatString, true);
                });
            }
        } catch (e) {
            console.error('Transactional communication fracture:', e);
            setMessage('Transactional communication fracture.');
            revertSeatSelection(targetSeatString, !isCurrentlySelectedByMe);
        }
    };

    // handle login
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setMessage('⚠️ Please enter both username and password.');
            return;
        }

        const isFirebaseEnabled = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'firebase';
        if (isFirebaseEnabled) {
            setMessage('⏳ Authenticating via Firebase Cloud...');
            try {
                const { authClient } = require('../lib/firebase-client');
                const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');

                let userCredential;
                try {
                    userCredential = await signInWithEmailAndPassword(authClient, username, password);
                } catch (err: any) {
                    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                        userCredential = await createUserWithEmailAndPassword(authClient, username, password);
                    } else { throw err; }
                }

                // check/store firebase login information to DB
                const idToken = await userCredential.user.getIdToken();
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken, username: userCredential.user.email }),
                });

                // login success
                const data = await res.json();
                if (data.success) {
                    setUser(data.user);
                    setPassword('');
                    setMessage('🎉 Firebase Session connected!');
                } else { setMessage(`❌ Error: ${data.error}`); }
            } catch (error: any) {
                setMessage(`❌ Firebase Refused: ${error.message}`);
            }
            return;
        }

        // custom
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
            setSelectedSeats([]);
            setMessage('🔒 Session terminated safely.');
        }
    };

    // handle reserving seat
    const handleReserve = async (mockSuccess: boolean) => {
        if (selectedSeats.length === 0 || processingSeats.size > 0 || isPaying) return;
        setIsPaying(true);
        setMessage('⏳ Processing payment transaction...');

        try {
            const res = await fetch('/api/reserve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ seatIds: selectedSeats, mockPaymentSuccess: mockSuccess }),
            });

            const data = await res.json();
            if (data.success) {
                // firebase analytics
                if (firebaseClientAnalytics && process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'firebase') {
                    logEvent(firebaseClientAnalytics, 'purchase_seats', {
                        seat_count: selectedSeats.length,
                        seat_numbers: selectedSeats.map(id => seats.find(s => s.id === id)?.number).join(','),
                        transaction_status: mockSuccess ? 'SUCCESS' : 'FAILED'
                    });
                }
                setMessage(mockSuccess ? '🎉 Seats successfully booked!' : '❌ Payment failed. Seats released.');
                setSelectedSeats([]);
                setTimeLeft(null);
                fetchSeats();
            } else {
                setMessage(`❌ Transaction Error: ${data.error}`);
            }
        } catch (e) {
            console.error('Payment connection error:', e);
            setMessage('❌ Payment Connection Error');
        } finally {
            setIsPaying(false);
        }
    };

    return (
        <main className="p-8 max-w-xl mx-auto space-y-6">
            {loading && <div className="top-loading-bar" />}
            {!loading && <h1 className="text-2xl font-bold">Seat Reservation Management</h1>}

            {/* login block */}
            {!loading && !user ? (
                <div className="panel-container" style={{ maxWidth: '100%', margin: '0 auto' }}>
                    <form onSubmit={handleLogin}>
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
                                    placeholder="e.g. hainguyenjc@gmail.com"
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
                            <button className="btn-primary" type="submit">
                                Login / Register
                            </button>
                        </div>
                    </form>
                </div>
            ) : !loading && user && (
                <div
                    style={{
                        display: 'flex',
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
                                Session Active ({REFRESH_TOKEN_EXPIRY_DAYS}d)
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
                <div className="panel-container seat-map-container" style={{ marginTop: '24px', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '1.125rem', color: '#10b981', fontWeight: 600 }}>
                        Select available seats
                    </h3>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                            gap: '12px'
                        }}
                    >
                        {(seats || []).map((seat) => {
                            let bgStyle = '#ffffff';
                            let textStyle = '#1f2937';
                            let borderStyle = '1px solid #e5e7eb';
                            let isCursorAllowed = 'pointer';
                            const isSelected = selectedSeats.includes(seat.id);
                            const isTargetProcessing = processingSeats.has(seat.id);

                            if (isTargetProcessing) {
                                bgStyle = '#858d93'; // DISABLED
                                textStyle = '#ffffff';
                                borderStyle = '2px solid #10b981';
                                isCursorAllowed = 'not-allowed';
                            } else if (isSelected) {
                                bgStyle = '#065f46'; // SELECTED
                                textStyle = '#ffffff';
                                borderStyle = '2px solid #10b981';
                            } else if (seat.status === 'PENDING') {
                                bgStyle = 'linear-gradient(135deg, #ffedd5 0%, #f97316 100%)'; // RESERVED
                                textStyle = '#ffffff';
                                borderStyle = '1px solid #ea580c';
                                isCursorAllowed = 'not-allowed';
                            } else if (seat.status === 'BOOKED') {
                                bgStyle = 'linear-gradient(135deg, #fca5a5 0%, #ef4444 100%)'; // BOOKED
                                textStyle = '#ffffff';
                                borderStyle = '1px solid #dc2626';
                                isCursorAllowed = 'not-allowed';
                            }

                            return (
                                <button
                                    key={seat.id}
                                    disabled={isTargetProcessing  || (seat.status !== 'AVAILABLE' && !isSelected)}
                                    onClick={() => handleSeatClick(seat.id)}
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
                                        className='seat-status'
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
                                        {isTargetProcessing ? 'RESERVING'
                                            : isSelected ? 'SELECTED' : seat.status === 'PENDING' ? 'Reserved' : seat.status.toLowerCase()}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Payments Mock Up block */}
            {selectedSeats.length > 0 && timeLeft !== null && user && (
                <div className="panel-container" style={{ marginTop: '24px', padding: '24px' }}>
                    {/* Timer countdown */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', backgroundColor: 'rgba(249, 115, 22, 0.08)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
                        <span style={{ fontSize: '0.85rem', color: '#ffeddf' }}>
                            {'⚠️ Complete payment before timeout:'}
                        </span>
                        <strong id="countdown-time" style={{ fontSize: '1.15rem', color: '#f97316', fontFamily: 'monospace', letterSpacing: '1px' }}>
                            {formatTime(timeLeft)}
                        </strong>
                    </div>

                    {/* Selected seats */}
                    <p style={{ margin: '0 0 16px 0', fontSize: '0.875rem', color: '#9ca3af' }}>
                        Reserved Seats: <strong style={{ color: '#10b981', fontSize: '1.125rem' }}>
                            {selectedSeats.map(id => seats.find(s => s.id === id)?.number).join(', ')}
                        </strong><br/>
                        Processing Seats: <strong style={{ color: '#10b981', fontSize: '1.125rem' }}>
                            {Array.from(processingSeats).map(id => seats.find(s => s.id === id)?.number).join(', ')}
                        </strong>
                    </p>

                    {/* Mock Payment */}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>

                        {/* Mock Success Payment */}
                        <button
                            disabled={selectedSeats.length === 0 || processingSeats.size > 0 || isPaying}
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

                        {/* Mock Fail Payment */}
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
