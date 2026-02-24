import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';

function ScanTicket() {
    const [ticketId, setTicketId] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    
    // Event selection
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState('');
    
    // Live attendance stats
    const [liveStats, setLiveStats] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [attendanceTab, setAttendanceTab] = useState('notScanned'); // 'scanned' or 'notScanned'
    
    // QR upload
    const [qrProcessing, setQrProcessing] = useState(false);
    const canvasRef = useRef(null);

    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        
        // Fetch organizer's events
        const fetchEvents = async () => {
            try {
                const res = await axios.get('http://localhost:3001/dashboard', {
                    headers: { 'auth-token': token }
                });
                // Filter to only ongoing/published events
                const myEvents = (res.data.eventsOrganized || []).filter(e => 
                    e.status === 'Published' || e.status === 'Ongoing'
                );
                setEvents(myEvents);
                if (myEvents.length > 0) {
                    setSelectedEvent(myEvents[0]._id);
                }
            } catch (err) {
                console.error('Failed to fetch events');
            }
        };
        fetchEvents();
    }, [navigate, token]);

    // Fetch live stats
    const fetchLiveStats = async () => {
        if (!selectedEvent) return;
        try {
            const res = await axios.get(`http://localhost:3001/events/${selectedEvent}/attendance-live`, {
                headers: { 'auth-token': token }
            });
            setLiveStats(res.data);
        } catch (err) {
            console.error('Failed to fetch live stats');
        }
    };

    useEffect(() => {
        if (selectedEvent) {
            fetchLiveStats();
        }
    }, [selectedEvent]);

    // Auto-refresh live stats
    useEffect(() => {
        if (!autoRefresh || !selectedEvent) return;
        const interval = setInterval(fetchLiveStats, 5000); // every 5 seconds
        return () => clearInterval(interval);
    }, [autoRefresh, selectedEvent]);

    // Export attendance CSV
    const handleExportCSV = async () => {
        if (!selectedEvent) {
            setError('Please select an event first');
            return;
        }
        try {
            const response = await axios.get(`http://localhost:3001/events/${selectedEvent}/attendance-csv`, {
                headers: { 'auth-token': token },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${liveStats?.eventName || 'event'}_attendance.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            setMessage('CSV exported successfully!');
        } catch (err) {
            setError('Failed to export CSV.');
        }
    };

    const handleScan = async (e) => {
        if (e) e.preventDefault();
        setMessage('');
        setError('');

        if (!ticketId.trim()) {
            setError('Please enter a ticket ID');
            return;
        }

        if (!selectedEvent) {
            setError('Please select an event first');
            return;
        }

        try {
            const response = await axios.post('http://localhost:3001/events/scan-ticket', {
                ticketId: ticketId.trim(),
                eventId: selectedEvent
            }, {
                headers: { 'auth-token': token }
            });

            setMessage(`${response.data.message} (${new Date(response.data.attendanceTime).toLocaleTimeString()})`);
            setTicketId(''); 
            fetchLiveStats(); // refresh stats
            
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to scan ticket.');
        }
    };

    // Handle QR image upload
    const handleQRUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setQrProcessing(true);
        setError('');
        setMessage('');

        try {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            
            img.onload = async () => {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                
                // Set canvas size to image size
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                // Get image data
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                // Decode QR code using jsQR
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                
                if (code) {
                    // Try to parse the QR data
                    let extractedTicketId = code.data;
                    
                    // If the QR data is JSON, try to extract ticketId
                    try {
                        const parsed = JSON.parse(code.data);
                        if (parsed.ticketId) {
                            extractedTicketId = parsed.ticketId;
                        }
                    } catch {
                        // Not JSON, use the raw data as ticket ID
                    }
                    
                    setTicketId(extractedTicketId);
                    setMessage('QR code decoded successfully! Click "Mark Attendance" to confirm.');
                } else {
                    setError('Could not decode QR code from image. Please try a clearer image or enter ticket ID manually.');
                }
                
                setQrProcessing(false);
                URL.revokeObjectURL(img.src);
            };
            
            img.onerror = () => {
                setError('Failed to load image.');
                setQrProcessing(false);
            };
        } catch (err) {
            setError('Error processing QR image.');
            setQrProcessing(false);
        }
        
        // Clear file input
        e.target.value = '';
    };

    return (
        <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
            <h1>Ticket Scanner & Attendance</h1>
            <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
            <hr />

            {/* Event Selection */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: 'bold' }}>Select Event: </label>
                <select 
                    value={selectedEvent} 
                    onChange={(e) => setSelectedEvent(e.target.value)}
                    style={{ padding: '8px', fontSize: '14px', minWidth: '300px' }}
                >
                    {events.map(ev => (
                        <option key={ev._id} value={ev._id}>{ev.eventName}</option>
                    ))}
                </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Left: Scanner */}
                <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '10px' }}>
                    <h3>Scan Ticket</h3>
                    
                    {error && <p style={{ color: 'red', fontWeight: 'bold', padding: '10px', backgroundColor: '#ffebee', borderRadius: '5px' }}>{error}</p>}
                    {message && <p style={{ color: 'green', fontWeight: 'bold', padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '5px' }}>{message}</p>}

                    {/* Manual Entry */}
                    <form onSubmit={handleScan}>
                        <div style={{ marginBottom: '15px' }}>
                            <label>Ticket ID: </label>
                            <input 
                                type="text" 
                                value={ticketId} 
                                onChange={(e) => setTicketId(e.target.value)} 
                                placeholder="Enter or scan ticket ID"
                                style={{ width: '100%', padding: '10px', fontSize: '16px' }}
                                autoFocus
                            />
                        </div>
                        <button type="submit" style={{ 
                            padding: '12px 25px', fontSize: '16px', 
                            backgroundColor: '#4CAF50', color: 'white', 
                            border: 'none', cursor: 'pointer', borderRadius: '5px',
                            width: '100%'
                        }}>
                            Mark Attendance
                        </button>
                    </form>

                    <hr style={{ margin: '20px 0' }} />

                    {/* QR Image Upload */}
                    <div>
                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
                            Or Upload QR Code Image:
                        </label>
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleQRUpload}
                            disabled={qrProcessing}
                            style={{ width: '100%' }}
                        />
                        {qrProcessing && <p style={{ color: 'blue' }}>Processing image...</p>}
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                    </div>
                </div>

                {/* Right: Live Stats Dashboard */}
                <div style={{ padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0 }}>Live Attendance</h3>
                        <label style={{ fontSize: '12px', cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={autoRefresh} 
                                onChange={(e) => setAutoRefresh(e.target.checked)} 
                            />
                            Auto-refresh
                        </label>
                    </div>

                    {liveStats ? (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1976d2' }}>
                                        {liveStats.attendedCount}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'gray' }}>Attended</div>
                                </div>
                                <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ff9800' }}>
                                        {liveStats.pending}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'gray' }}>Pending</div>
                                </div>
                            </div>

                            <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
                                <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                                    Attendance Rate: <strong>{liveStats.attendanceRate}%</strong>
                                </div>
                                <div style={{ 
                                    height: '10px', backgroundColor: '#ddd', borderRadius: '5px', overflow: 'hidden'
                                }}>
                                    <div style={{ 
                                        width: `${liveStats.attendanceRate}%`, 
                                        height: '100%', 
                                        backgroundColor: '#4CAF50',
                                        transition: 'width 0.3s ease'
                                    }}></div>
                                </div>
                            </div>

                            {/* Recent Scans */}
                            <div>
                                <h4 style={{ margin: '0 0 10px 0' }}>Recent Check-ins:</h4>
                                {liveStats.recentScans.length === 0 ? (
                                    <p style={{ color: 'gray', fontSize: '13px' }}>No check-ins yet</p>
                                ) : (
                                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {liveStats.recentScans.map((scan, idx) => (
                                            <div key={idx} style={{ 
                                                padding: '8px', backgroundColor: 'white', 
                                                marginBottom: '5px', borderRadius: '5px',
                                                fontSize: '13px'
                                            }}>
                                                <div style={{ fontWeight: 'bold' }}>{scan.name}</div>
                                                <div style={{ color: 'gray', fontSize: '11px' }}>
                                                    {scan.email} • {scan.participantType} • {new Date(scan.attendanceTime).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <p style={{ color: 'gray' }}>Loading stats...</p>
                    )}

                    <button 
                        onClick={fetchLiveStats}
                        style={{ marginTop: '15px', padding: '8px 16px', cursor: 'pointer' }}
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Attendance Dashboard - Full Participant Lists */}
            {selectedEvent && liveStats && (
                <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0 }}>Attendance Dashboard</h3>
                        <button 
                            onClick={handleExportCSV}
                            style={{ 
                                padding: '10px 20px', cursor: 'pointer',
                                backgroundColor: '#1976d2', color: 'white', 
                                border: 'none', borderRadius: '5px'
                            }}
                        >
                            Export CSV
                        </button>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                        <button 
                            onClick={() => setAttendanceTab('notScanned')}
                            style={{
                                padding: '10px 20px', border: 'none', cursor: 'pointer', borderRadius: '5px',
                                backgroundColor: attendanceTab === 'notScanned' ? '#ff9800' : '#ddd',
                                color: attendanceTab === 'notScanned' ? 'white' : 'black',
                                fontWeight: attendanceTab === 'notScanned' ? 'bold' : 'normal'
                            }}
                        >
                            Not Yet Scanned ({liveStats.notScannedParticipants?.length || 0})
                        </button>
                        <button 
                            onClick={() => setAttendanceTab('scanned')}
                            style={{
                                padding: '10px 20px', border: 'none', cursor: 'pointer', borderRadius: '5px',
                                backgroundColor: attendanceTab === 'scanned' ? '#4CAF50' : '#ddd',
                                color: attendanceTab === 'scanned' ? 'white' : 'black',
                                fontWeight: attendanceTab === 'scanned' ? 'bold' : 'normal'
                            }}
                        >
                            Scanned ({liveStats.scannedParticipants?.length || 0})
                        </button>
                    </div>

                    {/* Participant List */}
                    <div style={{ maxHeight: '400px', overflowY: 'auto', backgroundColor: 'white', borderRadius: '8px', padding: '10px' }}>
                        {attendanceTab === 'notScanned' ? (
                            liveStats.notScannedParticipants?.length > 0 ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f9f9f9' }}>
                                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Name</th>
                                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Email</th>
                                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Type</th>
                                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Ticket ID</th>
                                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {liveStats.notScannedParticipants.map((p, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '8px' }}>{p.name}</td>
                                                <td style={{ padding: '8px', color: 'gray' }}>{p.email}</td>
                                                <td style={{ padding: '8px' }}>{p.participantType}</td>
                                                <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '12px' }}>{p.ticketId}</td>
                                                <td style={{ padding: '8px' }}>
                                                    <span style={{ 
                                                        padding: '3px 8px', borderRadius: '10px', fontSize: '11px',
                                                        backgroundColor: p.status === 'Registered' ? '#e3f2fd' : '#fff3e0',
                                                        color: p.status === 'Registered' ? '#1976d2' : '#ff9800'
                                                    }}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p style={{ color: 'gray', textAlign: 'center' }}>All participants have been scanned!</p>
                            )
                        ) : (
                            liveStats.scannedParticipants?.length > 0 ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f9f9f9' }}>
                                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Name</th>
                                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Email</th>
                                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Type</th>
                                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Ticket ID</th>
                                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Scan Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {liveStats.scannedParticipants.map((p, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: '8px' }}>{p.name}</td>
                                                <td style={{ padding: '8px', color: 'gray' }}>{p.email}</td>
                                                <td style={{ padding: '8px' }}>{p.participantType}</td>
                                                <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '12px' }}>{p.ticketId}</td>
                                                <td style={{ padding: '8px', color: '#4CAF50' }}>
                                                    {new Date(p.attendanceTime).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p style={{ color: 'gray', textAlign: 'center' }}>No participants scanned yet</p>
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ScanTicket;