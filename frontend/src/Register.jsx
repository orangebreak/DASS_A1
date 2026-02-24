import { useState, useRef } from 'react';
import api from './api';
import { useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';

// Get site key from environment or use test key
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

function Register() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [participantType, setParticipantType] = useState('IIIT'); // Default to IIIT
    const [captchaToken, setCaptchaToken] = useState(null);
    const captchaRef = useRef(null);
    
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!captchaToken) {
            setError('Please complete the CAPTCHA verification');
            return;
        }

        try {
            // Send request to our dynamic route: /register/IIIT or /register/Non-IIIT
            await api.post(`/register/${participantType}`, {
                firstName,
                lastName,
                email,
                password,
                role: 'participant', // Hardcoded to participant to pass our security checks!
                captchaToken
            });

            // If it succeeds, show a message and automatically redirect to login after 2 seconds
            setMessage('Registration successful! Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
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
        <div style={{ padding: '20px', maxWidth: '450px', margin: '50px auto' }}>
            <h1>Register as Participant</h1>
            
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {message && <p style={{ color: 'green' }}>{message}</p>}
            
            <form onSubmit={handleRegister}>
                <div style={{ marginBottom: '10px' }}>
                    <label>First Name: </label>
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>Last Name: </label>
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>Participant Type: </label>
                    <select value={participantType} onChange={(e) => setParticipantType(e.target.value)} style={{ width: '100%', padding: '8px' }}>
                        <option value="IIIT">IIIT Student (email containing .iiit.ac.in)</option>
                        <option value="Non-IIIT">Non-IIIT Student</option>
                    </select>
                </div>
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
                
                <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer' }}>Register</button>
            </form>

            <br />
            {/* Link back to login page */}
            <button onClick={() => navigate('/login')} style={{ padding: '10px 20px', cursor: 'pointer' }}>
                Already have an account? Login
            </button>
        </div>
    );
}

export default Register;