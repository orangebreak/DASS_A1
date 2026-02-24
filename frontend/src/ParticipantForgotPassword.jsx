import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function ParticipantForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!email) {
            setError('Please enter your email address.');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post('http://localhost:3001/participant/forgot-password', { email });
            setMessage(res.data.message);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send reset email. Please try again.');
        }
        setLoading(false);
    };

    return (
        <div style={{ padding: '20px', maxWidth: '450px', margin: '50px auto' }}>
            <h1>Forgot Password?</h1>
            <p style={{ color: '#666', marginBottom: '20px' }}>
                Enter your email address and we'll send you a link to reset your password.
            </p>
            <p style={{ fontSize: '13px', color: '#e65100', backgroundColor: '#fff3e0', padding: '10px', borderRadius: '5px', marginBottom: '20px' }}>
                Note: This is for participant accounts only. Organizers should use the{' '}
                <span 
                    onClick={() => navigate('/password-reset-request')} 
                    style={{ color: '#1976d2', cursor: 'pointer', textDecoration: 'underline' }}
                >
                    admin password reset request
                </span> process.
            </p>

            {message && (
                <div style={{
                    padding: '15px', backgroundColor: '#e8f5e9', border: '1px solid #4CAF50',
                    borderRadius: '5px', marginBottom: '20px', color: '#2e7d32'
                }}>
                    {message}
                </div>
            )}

            {error && (
                <div style={{
                    padding: '15px', backgroundColor: '#ffebee', border: '1px solid #f44336',
                    borderRadius: '5px', marginBottom: '20px', color: '#c62828'
                }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '20px' }}>
                    <label>Email Address:</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your login email"
                        required
                        style={{ width: '100%', padding: '10px', fontSize: '16px' }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%', padding: '12px', fontSize: '16px',
                        backgroundColor: '#1976d2', color: 'white',
                        border: 'none', borderRadius: '5px', cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
            </form>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <button
                    onClick={() => navigate('/login')}
                    style={{ padding: '8px 16px', cursor: 'pointer' }}
                >
                    Back to Login
                </button>
            </div>
        </div>
    );
}

export default ParticipantForgotPassword;
