import { useState, useEffect } from 'react';
import api from './api';
import { useNavigate, useParams } from 'react-router-dom';

function ParticipantPasswordReset() {
    const { token } = useParams();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);

    useEffect(() => {
        // Verify token on mount
        const verifyToken = async () => {
            try {
                const res = await api.get(`/participant/verify-reset-token/${token}`);
                if (res.data.valid) {
                    setTokenValid(true);
                    setEmail(res.data.email);
                }
            } catch (err) {
                setError(err.response?.data?.error || 'Invalid or expired reset link.');
            }
            setLoading(false);
        };

        verifyToken();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!email) {
            setError('Please enter your email address.');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        try {
            const res = await api.post('/participant/reset-password', {
                token,
                email,
                newPassword
            });

            setMessage(res.data.message);
            
            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password. Please try again.');
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '20px', maxWidth: '450px', margin: '50px auto', textAlign: 'center' }}>
                <h2>Verifying Reset Link...</h2>
                <p>Please wait...</p>
            </div>
        );
    }

    if (!tokenValid && error) {
        return (
            <div style={{ padding: '20px', maxWidth: '450px', margin: '50px auto', textAlign: 'center' }}>
                <h2 style={{ color: '#f44336' }}>Invalid Reset Link</h2>
                <p>{error}</p>
                <p style={{ marginTop: '20px' }}>
                    The password reset link may have expired or is invalid.
                </p>
                <button
                    onClick={() => navigate('/login')}
                    style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}
                >
                    Back to Login
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '450px', margin: '50px auto' }}>
            <h1>Reset Your Password</h1>
            <p style={{ color: '#666', marginBottom: '20px' }}>
                Enter your email and new password below.
            </p>

            {message && (
                <div style={{
                    padding: '15px', backgroundColor: '#e8f5e9', border: '1px solid #4CAF50',
                    borderRadius: '5px', marginBottom: '20px', color: '#2e7d32'
                }}>
                    {message}
                    <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
                        Redirecting to login page...
                    </p>
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

            {!message && (
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '15px' }}>
                        <label>Email Address:</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{ width: '100%', padding: '10px', fontSize: '16px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label>New Password:</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                            style={{ width: '100%', padding: '10px', fontSize: '16px' }}
                        />
                        <p style={{ fontSize: '12px', color: '#666', margin: '5px 0 0 0' }}>
                            Minimum 6 characters
                        </p>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label>Confirm New Password:</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            style={{ width: '100%', padding: '10px', fontSize: '16px' }}
                        />
                    </div>

                    <button
                        type="submit"
                        style={{
                            width: '100%', padding: '12px', fontSize: '16px',
                            backgroundColor: '#1976d2', color: 'white',
                            border: 'none', borderRadius: '5px', cursor: 'pointer'
                        }}
                    >
                        Reset Password
                    </button>
                </form>
            )}

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

export default ParticipantPasswordReset;
