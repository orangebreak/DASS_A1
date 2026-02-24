import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';

// Get site key from environment or use test key
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [captchaToken, setCaptchaToken] = useState(null);
    const captchaRef = useRef(null);

    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        
        if (!captchaToken) {
            setError('Please complete the CAPTCHA verification');
            return;
        }
        
        try {
            const res = await axios.post('http://localhost:3001/login', { 
                email, 
                password,
                captchaToken
            });
            localStorage.setItem('token', res.data.token);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid Credentials');
            // Reset CAPTCHA on error
            captchaRef.current?.reset();
            setCaptchaToken(null);
        }
    };

    const handleCaptchaChange = (token) => {
        setCaptchaToken(token);
        if (token) setError('');
    };

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto' }}>
            <h1>Felicity Login</h1>

            {error && <p style={{ color: 'red' }}>{error}</p>}

            <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '10px' }}>
                    <label>Email: </label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>Password: </label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
                </div>
                
                {/* reCAPTCHA */}
                <div style={{ marginBottom: '15px' }}>
                    <ReCAPTCHA
                        ref={captchaRef}
                        sitekey={RECAPTCHA_SITE_KEY}
                        onChange={handleCaptchaChange}
                        onExpired={() => setCaptchaToken(null)}
                    />
                </div>
                
                <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer', marginRight: '10px' }}>Login</button>
                <button type="button" onClick={() => navigate('/register')} style={{ padding: '10px 20px', cursor: 'pointer' }}>
                    Don't have an account? Register
                </button>
            </form>

            {/* Participant Forgot Password */}
            <div style={{ marginTop: '15px' }}>
                <span 
                    onClick={() => navigate('/forgot-password')} 
                    style={{ color: '#1976d2', cursor: 'pointer', textDecoration: 'underline', fontSize: '14px' }}
                >
                    Forgot your password?
                </span>
            </div>

            <hr style={{ margin: '20px 0' }} />
            <p style={{ fontSize: '14px', color: 'gray' }}>
                Are you an organizer who forgot your password?{' '}
                <span onClick={() => navigate('/password-reset-request')}
                    style={{ color: '#1976d2', cursor: 'pointer', textDecoration: 'underline' }}>
                    Request a Password Reset
                </span>
            </p>
        </div>
    );
}

export default Login;
