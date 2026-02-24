import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function AdminPasswordResets() {
    const [requests, setRequests] = useState([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [commentInputs, setCommentInputs] = useState({});
    const [newPassword, setNewPassword] = useState('');

    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const fetchRequests = async () => {
        try {
            const res = await axios.get('http://localhost:3001/admin/password-resets', {
                headers: { 'auth-token': token }
            });
            setRequests(res.data);
        } catch (err) {
            setError('Failed to fetch password reset requests.');
        }
    };

    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        fetchRequests();
    }, [navigate, token]);

    const handleAction = async (requestId, action) => {
        setMessage(''); setError(''); setNewPassword('');
        try {
            const res = await axios.put(`http://localhost:3001/admin/password-resets/${requestId}`, {
                action,
                comments: commentInputs[requestId] || ''
            }, {
                headers: { 'auth-token': token }
            });
            setMessage(res.data.message);
            if (res.data.newPassword) {
                setNewPassword(res.data.newPassword);
            }
            fetchRequests();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to process request.');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return '#ff9800';
            case 'Approved': return '#4CAF50';
            case 'Rejected': return '#f44336';
            default: return 'gray';
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
            <h1>Password Reset Requests</h1>
            <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
            <hr />

            {message && <p style={{ color: 'green', fontWeight: 'bold' }}>{message}</p>}
            {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}
            {newPassword && (
                <div style={{ padding: '15px', backgroundColor: '#e8f5e9', border: '2px solid #4CAF50', borderRadius: '8px', marginBottom: '15px' }}>
                    <strong>New Password Generated:</strong>
                    <code style={{ display: 'block', marginTop: '5px', fontSize: '18px', padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
                        {newPassword}
                    </code>
                    <p style={{ fontSize: '12px', color: 'gray', marginTop: '5px' }}>Please share this password with the organizer securely.</p>
                </div>
            )}

            {requests.length === 0 ? (
                <p>No password reset requests found.</p>
            ) : (
                requests.map(req => (
                    <div key={req._id} style={{
                        border: '1px solid #ddd', padding: '15px', marginBottom: '15px', borderRadius: '8px',
                        backgroundColor: req.status === 'Pending' ? '#fff8e1' : '#f9f9f9'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: '0 0 5px 0' }}>
                                    {req.organizerId?.orgName || 'Unknown Club'}
                                    <span style={{ fontSize: '14px', color: 'gray', marginLeft: '10px' }}>
                                        ({req.organizerId?.email})
                                    </span>
                                </h3>
                                <p style={{ margin: '5px 0', color: 'gray', fontSize: '13px' }}>
                                    {new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString()}
                                </p>
                            </div>
                            <span style={{
                                color: 'white', backgroundColor: getStatusColor(req.status),
                                padding: '5px 12px', borderRadius: '15px', fontWeight: 'bold', fontSize: '13px'
                            }}>
                                {req.status}
                            </span>
                        </div>

                        <p><strong>Reason:</strong> {req.reason}</p>

                        {req.adminComments && (
                            <p style={{ color: '#555' }}><strong>Admin Comments:</strong> {req.adminComments}</p>
                        )}

                        {req.status === 'Pending' && (
                            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: 'white', borderRadius: '5px' }}>
                                <div style={{ marginBottom: '8px' }}>
                                    <label>Admin Comments: </label>
                                    <input
                                        type="text"
                                        value={commentInputs[req._id] || ''}
                                        onChange={e => setCommentInputs({ ...commentInputs, [req._id]: e.target.value })}
                                        placeholder="Add optional comments..."
                                        style={{ width: '60%', padding: '5px' }}
                                    />
                                </div>
                                <button
                                    onClick={() => handleAction(req._id, 'approve')}
                                    style={{ backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '8px 16px', cursor: 'pointer', marginRight: '10px' }}
                                >
                                    Approve
                                </button>
                                <button
                                    onClick={() => handleAction(req._id, 'reject')}
                                    style={{ backgroundColor: '#f44336', color: 'white', border: 'none', padding: '8px 16px', cursor: 'pointer' }}
                                >
                                    Reject
                                </button>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}

export default AdminPasswordResets;
