import { useState, useEffect } from 'react';
import api from './api';
import { useNavigate } from 'react-router-dom';

function OngoingEvents() {
    const [events, setEvents] = useState([]);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) { navigate('/login'); return; }

        const fetchOngoingEvents = async () => {
            try {
                const response = await api.get('/dashboard', {
                    headers: { 'auth-token': token }
                });
                const organizedEvents = response.data.eventsOrganized || [];
                // Filter only ongoing events
                const ongoing = organizedEvents.filter(e => e.status === 'Ongoing');
                setEvents(ongoing);
            } catch (err) {
                setError('Failed to load ongoing events.');
            }
        };
        fetchOngoingEvents();
    }, [navigate, token]);

    if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
            <h1>🎯 Ongoing Events</h1>
            <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
            <hr />

            {events.length === 0 ? (
                <p style={{ color: 'gray' }}>No ongoing events at the moment.</p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {events.map(event => (
                        <li key={event._id} style={{ 
                            marginBottom: '15px', padding: '15px', 
                            border: '2px solid #2196F3', borderRadius: '8px',
                            backgroundColor: '#e3f2fd'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <strong style={{ fontSize: '18px' }}>{event.eventName}</strong>
                                    <span style={{
                                        marginLeft: '10px', fontSize: '12px', padding: '2px 8px',
                                        borderRadius: '10px', backgroundColor: '#2196F3', color: 'white'
                                    }}>
                                        Ongoing
                                    </span>
                                    <span style={{
                                        marginLeft: '5px', fontSize: '12px', padding: '2px 8px',
                                        borderRadius: '10px', backgroundColor: '#f3e5f5', color: '#9C27B0'
                                    }}>
                                        {event.eventType}
                                    </span>
                                </div>
                            </div>
                            
                            <p style={{ margin: '10px 0', color: '#555' }}>
                                {new Date(event.eventStart).toLocaleDateString()} — {new Date(event.eventEnd).toLocaleDateString()}
                            </p>

                            {/* Quick Stats */}
                            <div style={{ display: 'flex', gap: '15px', marginBottom: '10px', flexWrap: 'wrap' }}>
                                <div style={{ padding: '5px 10px', backgroundColor: 'white', borderRadius: '5px' }}>
                                    <span style={{ fontSize: '12px', color: 'gray' }}>Registrations:</span>
                                    <strong style={{ marginLeft: '5px' }}>{event.totalRegistrations || 0}</strong>
                                </div>
                                <div style={{ padding: '5px 10px', backgroundColor: 'white', borderRadius: '5px' }}>
                                    <span style={{ fontSize: '12px', color: 'gray' }}>Attended:</span>
                                    <strong style={{ marginLeft: '5px' }}>{event.attendedCount || 0}</strong>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button onClick={() => navigate(`/organizer/event/${event._id}`)} 
                                    style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '5px' }}>
                                    View Details
                                </button>
                                <button onClick={() => navigate('/scan')} 
                                    style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}>
                                    Scan Tickets
                                </button>
                                <button onClick={() => navigate(`/forum/${event._id}`)} 
                                    style={{ padding: '8px 15px', cursor: 'pointer' }}>
                                    Forum
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default OngoingEvents;
