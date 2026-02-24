import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function ClubsListing() {
    const [organizers, setOrganizers] = useState([]);
    const [following, setFollowing] = useState([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) { navigate('/login'); return; }

        const fetchData = async () => {
            try {
                const [orgRes, dashRes] = await Promise.all([
                    axios.get('http://localhost:3001/all-organizers', { headers: { 'auth-token': token } }),
                    axios.get('http://localhost:3001/dashboard', { headers: { 'auth-token': token } })
                ]);
                setOrganizers(orgRes.data);
                setFollowing(dashRes.data.user.following || []);
            } catch (err) {
                setError('Failed to load clubs.');
            }
        };
        fetchData();
    }, [navigate, token]);

    const handleFollow = async (organizerId) => {
        setMessage('');
        try {
            const res = await axios.post(`http://localhost:3001/follow/${organizerId}`, {}, {
                headers: { 'auth-token': token }
            });
            setFollowing(res.data.following);
            setMessage(res.data.message);
        } catch (err) {
            setError(err.response?.data?.error || 'Action failed.');
        }
    };

    const isFollowing = (orgId) => following.includes(orgId);

    return (
        <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
            <h1>Clubs & Organizers</h1>
            <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
            <hr />

            {message && <p style={{ color: 'green', fontWeight: 'bold' }}>{message}</p>}
            {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

            {organizers.length === 0 ? (
                <p>No clubs/organizers found.</p>
            ) : (
                <div style={{ display: 'grid', gap: '15px' }}>
                    {organizers.map((org, index) => (
                        <div key={org._id} style={{
                            border: org._preferenceScore > 0 ? '2px solid #4CAF50' : '1px solid #ddd', 
                            padding: '15px', borderRadius: '8px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            backgroundColor: isFollowing(org._id) ? '#e8f5e9' : org._preferenceScore > 0 ? '#f1f8e9' : 'white'
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                                    <h3 style={{ margin: 0, cursor: 'pointer', color: '#1976d2' }}
                                        onClick={() => navigate(`/organizer/${org._id}`)}
                                    >
                                        {org.orgName || `${org.firstName} ${org.lastName}`}
                                    </h3>
                                    {org._preferenceScore >= 100 && (
                                        <span style={{
                                            backgroundColor: '#4CAF50', color: 'white',
                                            padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold'
                                        }}>
                                            Following
                                        </span>
                                    )}
                                    {org._preferenceScore > 0 && org._preferenceScore < 100 && (
                                        <span style={{
                                            backgroundColor: '#ff9800', color: 'white',
                                            padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold'
                                        }}>
                                            Recommended
                                        </span>
                                    )}
                                </div>
                                {org.category && (
                                    <span style={{
                                        backgroundColor: '#e3f2fd', color: '#1976d2',
                                        padding: '2px 8px', borderRadius: '10px', fontSize: '12px', marginRight: '8px'
                                    }}>
                                        {org.category}
                                    </span>
                                )}
                                <p style={{ margin: '5px 0', color: '#555' }}>
                                    {org.description || 'No description available.'}
                                </p>
                                <p style={{ margin: '2px 0', color: 'gray', fontSize: '13px' }}>
                                    Email: {org.email}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'center' }}>
                                <button
                                    onClick={() => handleFollow(org._id)}
                                    style={{
                                        backgroundColor: isFollowing(org._id) ? '#f44336' : '#4CAF50',
                                        color: 'white', border: 'none', padding: '8px 16px',
                                        borderRadius: '5px', cursor: 'pointer', minWidth: '100px'
                                    }}
                                >
                                    {isFollowing(org._id) ? 'Unfollow' : 'Follow'}
                                </button>
                                <button
                                    onClick={() => navigate(`/organizer/${org._id}`)}
                                    style={{
                                        backgroundColor: '#1976d2', color: 'white', border: 'none',
                                        padding: '8px 16px', borderRadius: '5px', cursor: 'pointer', minWidth: '100px'
                                    }}
                                >
                                    View Profile
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ClubsListing;
