import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const INTEREST_OPTIONS = [
    'Technology', 'AI/ML', 'Web Development', 'Mobile Development', 
    'Cybersecurity', 'Data Science', 'Gaming', 'Robotics',
    'Music', 'Dance', 'Drama', 'Art', 'Photography', 'Film',
    'Sports', 'Fitness', 'Chess', 'E-Sports',
    'Entrepreneurship', 'Finance', 'Marketing', 'Social Work',
    'Science', 'Mathematics', 'Literature', 'Languages',
    'Astronomy', 'Environment', 'Health', 'Food'
];

function Onboarding() {
    const [selectedInterests, setSelectedInterests] = useState([]);
    const [selectedClubs, setSelectedClubs] = useState([]);
    const [organizers, setOrganizers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchOrganizers = async () => {
            try {
                const res = await axios.get('http://localhost:3001/all-organizers', {
                    headers: { 'auth-token': token }
                });
                setOrganizers(res.data);
                setLoading(false);
            } catch (err) {
                setError('Failed to load clubs.');
                setLoading(false);
            }
        };
        fetchOrganizers();
    }, [navigate, token]);

    const toggleInterest = (interest) => {
        setSelectedInterests(prev => 
            prev.includes(interest) 
                ? prev.filter(i => i !== interest)
                : [...prev, interest]
        );
    };

    const toggleClub = (clubId) => {
        setSelectedClubs(prev => 
            prev.includes(clubId) 
                ? prev.filter(id => id !== clubId)
                : [...prev, clubId]
        );
    };

    const handleSaveAndContinue = async () => {
        setSaving(true);
        setError('');
        try {
            await axios.post('http://localhost:3001/onboarding', {
                areasOfInterest: selectedInterests,
                followingClubs: selectedClubs
            }, {
                headers: { 'auth-token': token }
            });
            navigate('/dashboard');
        } catch (err) {
            setError('Failed to save preferences. Please try again.');
            setSaving(false);
        }
    };

    const handleSkip = async () => {
        try {
            await axios.post('http://localhost:3001/onboarding', {
                areasOfInterest: [],
                followingClubs: [],
                skip: true
            }, {
                headers: { 'auth-token': token }
            });
            navigate('/dashboard');
        } catch (err) {
            navigate('/dashboard');
        }
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
    }

    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>Welcome! Let's personalize your experience</h1>
            <p style={{ color: '#666', marginBottom: '30px' }}>
                Select your interests and follow clubs to get personalized event recommendations.
                You can always change these later in your Profile.
            </p>

            {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

            {/* Areas of Interest */}
            <div style={{ marginBottom: '40px' }}>
                <h2>Areas of Interest</h2>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                    Select topics you're interested in (multiple allowed)
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {INTEREST_OPTIONS.map(interest => (
                        <button
                            key={interest}
                            type="button"
                            onClick={() => toggleInterest(interest)}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '20px',
                                border: selectedInterests.includes(interest) ? '2px solid #1976d2' : '1px solid #ddd',
                                backgroundColor: selectedInterests.includes(interest) ? '#e3f2fd' : 'white',
                                color: selectedInterests.includes(interest) ? '#1976d2' : '#333',
                                cursor: 'pointer',
                                fontWeight: selectedInterests.includes(interest) ? 'bold' : 'normal',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {interest}
                        </button>
                    ))}
                </div>
                {selectedInterests.length > 0 && (
                    <p style={{ marginTop: '10px', color: '#1976d2', fontSize: '14px' }}>
                        Selected: {selectedInterests.join(', ')}
                    </p>
                )}
            </div>

            {/* Clubs to Follow */}
            <div style={{ marginBottom: '40px' }}>
                <h2>Clubs / Organizers to Follow</h2>
                <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
                    Follow clubs to see their events first in your feed
                </p>
                {organizers.length === 0 ? (
                    <p style={{ color: 'gray' }}>No clubs available yet.</p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                        {organizers.map(org => (
                            <div
                                key={org._id}
                                onClick={() => toggleClub(org._id)}
                                style={{
                                    padding: '15px',
                                    borderRadius: '10px',
                                    border: selectedClubs.includes(org._id) ? '2px solid #4CAF50' : '1px solid #ddd',
                                    backgroundColor: selectedClubs.includes(org._id) ? '#e8f5e9' : 'white',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong>{org.orgName || `${org.firstName} ${org.lastName}`}</strong>
                                    {selectedClubs.includes(org._id) && (
                                        <span style={{ color: '#4CAF50', fontSize: '18px' }}>✓</span>
                                    )}
                                </div>
                                {org.category && (
                                    <span style={{
                                        display: 'inline-block', marginTop: '5px',
                                        fontSize: '11px', padding: '3px 8px',
                                        borderRadius: '10px', backgroundColor: '#f5f5f5', color: '#666'
                                    }}>
                                        {org.category}
                                    </span>
                                )}
                                {org.description && (
                                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#666' }}>
                                        {org.description.substring(0, 80)}...
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '10px',
                marginTop: '30px'
            }}>
                <button
                    onClick={handleSkip}
                    style={{
                        padding: '12px 30px', fontSize: '16px',
                        backgroundColor: 'transparent', color: '#666',
                        border: '1px solid #ddd', borderRadius: '5px', cursor: 'pointer'
                    }}
                >
                    Skip for Now
                </button>
                <div>
                    <span style={{ marginRight: '15px', color: '#666', fontSize: '14px' }}>
                        {selectedInterests.length} interests, {selectedClubs.length} clubs selected
                    </span>
                    <button
                        onClick={handleSaveAndContinue}
                        disabled={saving}
                        style={{
                            padding: '12px 30px', fontSize: '16px',
                            backgroundColor: '#4CAF50', color: 'white',
                            border: 'none', borderRadius: '5px', cursor: 'pointer'
                        }}
                    >
                        {saving ? 'Saving...' : 'Save & Continue'}
                    </button>
                </div>
            </div>

            <p style={{ marginTop: '20px', fontSize: '13px', color: 'gray', textAlign: 'center' }}>
                You can update your preferences anytime from your Profile page.
            </p>
        </div>
    );
}

export default Onboarding;
