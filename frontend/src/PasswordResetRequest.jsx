import { useState } from 'react';
import api from './api';
import { useNavigate } from 'react-router-dom';

function PasswordResetRequest() {
    const [email, setEmail] = useState('');
    const [reason, setReason] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(''); setError('');

        try {
            if (token) {
                // Authenticated request (organizer is logged in)
                const res = await api.post('/password-reset/request', { reason }, {
                    headers: { 'auth-token': token }
                });
                setMessage(res.data.message);
            } else {
                // Unauthenticated request (organizer forgot password)
                const res = await api.post('/password-reset/request-unauthenticated', { email, reason });
                setMessage(res.data.message);
            }
            setReason('');
            setEmail('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit request.');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
            <h1>Request Password Reset</h1>
            {token ? (
                <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
            ) : (
                <button onClick={() => navigate('/login')}>Back to Login</button>
            )}
            <hr />

            <p style={{ color: 'gray' }}>
                Submit a password reset request to the administrator. They will review and generate a new password for you.
            </p>

            {message && <p style={{ color: 'green', fontWeight: 'bold' }}>{message}</p>}
            {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

            <form onSubmit={handleSubmit}>
                {!token && (
                    <div style={{ marginBottom: '15px' }}>
                        <label><strong>Your Email:</strong></label><br />
                        <input
                            type="email" value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            placeholder="Enter your organizer email"
                            style={{ width: '100%', padding: '10px', marginTop: '5px' }}
                        />
                    </div>
                )}

                <div style={{ marginBottom: '15px' }}>
                    <label><strong>Reason for Password Reset:</strong></label><br />
                    <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        required
                        rows="4"
                        placeholder="Please explain why you need a password reset..."
                        style={{ width: '100%', padding: '10px', marginTop: '5px' }}
                    />
                </div>

                <button type="submit" style={{
                    backgroundColor: '#1976d2', color: 'white',
                    border: 'none', padding: '10px 20px', cursor: 'pointer',
                    borderRadius: '5px', fontSize: '16px'
                }}>
                    Submit Reset Request
                </button>
            </form>
        </div>
    );
}

export default PasswordResetRequest;
