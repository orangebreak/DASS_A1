import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

function OrganizerProfile() {
    const { id } = useParams();
    const [profileData, setProfileData] = useState(null);
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) { navigate('/login'); return; }

        const fetchProfile = async () => {
            try {
                const res = await axios.get(`http://localhost:3001/organizer/${id}`, {
                    headers: { 'auth-token': token }
                });
                setProfileData(res.data);
            } catch (err) {
                setError('Failed to load organizer profile.');
            }
        };
        fetchProfile();
    }, [id, navigate, token]);

    if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;
    if (!profileData) return <div style={{ padding: '20px' }}>Loading...</div>;

    const { organizer, upcomingEvents, pastEvents } = profileData;

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <button onClick={() => navigate(-1)} style={{ marginBottom: '10px' }}>← Back</button>

            {/* Organizer Info */}
            <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '10px', marginBottom: '20px' }}>
                <h1 style={{ margin: '0 0 5px 0' }}>{organizer.orgName || `${organizer.firstName} ${organizer.lastName}`}</h1>
                {organizer.category && (
                    <span style={{
                        backgroundColor: '#e3f2fd', color: '#1976d2',
                        padding: '3px 10px', borderRadius: '12px', fontSize: '13px'
                    }}>
                        {organizer.category}
                    </span>
                )}
                <p style={{ marginTop: '10px', color: '#555' }}>{organizer.description || 'No description provided.'}</p>
                <p><strong>Contact:</strong> {organizer.contactEmail || organizer.email}</p>
                {organizer.contactNumber && <p><strong>Phone:</strong> {organizer.contactNumber}</p>}
            </div>

            {/* Upcoming Events */}
            <h2>Upcoming Events ({upcomingEvents.length})</h2>
            {upcomingEvents.length === 0 ? (
                <p style={{ color: 'gray' }}>No upcoming events.</p>
            ) : (
                upcomingEvents.map(event => (
                    <div key={event._id} style={{
                        border: '1px solid #ddd', padding: '12px', marginBottom: '10px', borderRadius: '8px',
                        borderLeft: '4px solid #4CAF50'
                    }}>
                        <h3 style={{ margin: '0 0 5px 0' }}>{event.eventName}</h3>
                        <p style={{ margin: '2px 0', color: '#555' }}>{event.eventDescription?.substring(0, 150)}...</p>
                        <p style={{ margin: '2px 0', fontSize: '13px', color: 'gray' }}>
                            {new Date(event.eventStart).toLocaleDateString()} — {new Date(event.eventEnd).toLocaleDateString()}
                            &nbsp;&nbsp;|&nbsp;&nbsp;
                            ₹{event.regFee || 0}
                            &nbsp;&nbsp;|&nbsp;&nbsp;
                            {event.eventType}
                        </p>
                    </div>
                ))
            )}

            {/* Past Events */}
            <h2 style={{ marginTop: '30px' }}>Past Events ({pastEvents.length})</h2>
            {pastEvents.length === 0 ? (
                <p style={{ color: 'gray' }}>No past events.</p>
            ) : (
                pastEvents.map(event => (
                    <div key={event._id} style={{
                        border: '1px solid #eee', padding: '12px', marginBottom: '10px', borderRadius: '8px',
                        borderLeft: '4px solid #9e9e9e', backgroundColor: '#fafafa'
                    }}>
                        <h3 style={{ margin: '0 0 5px 0', color: '#666' }}>{event.eventName}</h3>
                        <p style={{ margin: '2px 0', color: '#888' }}>{event.eventDescription?.substring(0, 150)}...</p>
                        <p style={{ margin: '2px 0', fontSize: '13px', color: 'gray' }}>
                            {new Date(event.eventStart).toLocaleDateString()} — {new Date(event.eventEnd).toLocaleDateString()}
                            &nbsp;&nbsp;|&nbsp;&nbsp;
                            Status: {event.status}
                        </p>
                    </div>
                ))
            )}
        </div>
    );
}

export default OrganizerProfile;
