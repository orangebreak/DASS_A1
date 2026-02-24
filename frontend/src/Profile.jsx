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

function Profile() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [collegeName, setCollegeName] = useState('');
    const [areasOfInterest, setAreasOfInterest] = useState([]);

    const [email, setEmail] = useState('');
    const [participantType, setParticipantType] = useState('');
    const [role, setRole] = useState('');
    const [orgName, setOrgName] = useState('');
    const [followedClubs, setFollowedClubs] = useState([]);
    const [allOrganizers, setAllOrganizers] = useState([]);

    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) { navigate('/login'); return; }

        const fetchProfileData = async () => {
            try {
                const response = await axios.get('http://localhost:3001/dashboard', {
                    headers: { 'auth-token': token }
                });
                const userData = response.data.user;

                setFirstName(userData.firstName || '');
                setLastName(userData.lastName || '');
                setContactNumber(userData.contactNumber || '');
                setEmail(userData.email || '');
                setParticipantType(userData.participantType || 'N/A');
                setRole(userData.role || '');
                setOrgName(userData.orgName || '');
                setDescription(userData.description || '');
                setCategory(userData.category || '');
                setDiscordWebhookUrl(userData.discordWebhookUrl || '');
                setContactEmail(userData.contactEmail || '');
                setCollegeName(userData.collegeName || '');
                setFollowedClubs(userData.following || []);
                setAreasOfInterest(userData.areasOfInterest || []);

                // Fetch all organizers if participant
                if (userData.role === 'participant') {
                    const orgRes = await axios.get('http://localhost:3001/all-organizers', {
                        headers: { 'auth-token': token }
                    });
                    setAllOrganizers(orgRes.data);
                }
            } catch (err) {
                setError('Failed to load profile data.');
            }
        };
        fetchProfileData();
    }, [navigate, token]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setMessage(''); setError('');

        try {
            const updatePayload = {
                firstName, lastName, contactNumber
            };

            // Add participant-specific fields
            if (role === 'participant') {
                updatePayload.collegeName = collegeName;
                updatePayload.areasOfInterest = areasOfInterest;
            }

            // Add organizer-specific fields
            if (role === 'organizer') {
                updatePayload.description = description;
                updatePayload.discordWebhookUrl = discordWebhookUrl;
                updatePayload.category = category;
                updatePayload.contactEmail = contactEmail;
            }

            await axios.put('http://localhost:3001/profile', updatePayload, {
                headers: { 'auth-token': token }
            });
            setMessage('Profile updated successfully!');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update profile.');
        }
    };

    const handleFollowToggle = async (organizerId) => {
        try {
            const res = await axios.post(`http://localhost:3001/follow/${organizerId}`, {}, {
                headers: { 'auth-token': token }
            });
            setFollowedClubs(res.data.following);
            setMessage(res.data.message);
        } catch (err) {
            setError('Failed to update follow status.');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>
            <h1>My Profile</h1>
            <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
            <hr />

            {error && <p style={{ color: 'red' }}>{error}</p>}
            {message && <p style={{ color: 'green', fontWeight: 'bold' }}>{message}</p>}

            <form onSubmit={handleUpdate}>
                {/* Non-editable Fields */}
                <div style={{ marginBottom: '15px', color: 'gray' }}>
                    <label>Login Email (Locked): </label>
                    <input type="email" value={email} readOnly style={{ backgroundColor: '#f0f0f0', width: '100%' }} />
                </div>
                <div style={{ marginBottom: '15px', color: 'gray' }}>
                    <label>Role (Locked): </label>
                    <input type="text" value={role} readOnly style={{ backgroundColor: '#f0f0f0', width: '100%' }} />
                </div>
                {role === 'participant' && (
                    <div style={{ marginBottom: '15px', color: 'gray' }}>
                        <label>Participant Type (Locked): </label>
                        <input type="text" value={participantType} readOnly style={{ backgroundColor: '#f0f0f0', width: '100%' }} />
                    </div>
                )}
                {role === 'organizer' && orgName && (
                    <div style={{ marginBottom: '15px', color: 'gray' }}>
                        <label>Organization Name (Locked): </label>
                        <input type="text" value={orgName} readOnly style={{ backgroundColor: '#f0f0f0', width: '100%' }} />
                    </div>
                )}

                <hr style={{ margin: '20px 0' }} />

                {/* Editable Fields */}
                <div style={{ marginBottom: '10px' }}>
                    <label>First Name: </label>
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={{ width: '100%' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>Last Name: </label>
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required style={{ width: '100%' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>Contact Number: </label>
                    <input type="text" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} style={{ width: '100%' }} />
                </div>


                {/* Participant-specific Fields */}
                {role === 'participant' && (
                    <>
                        <div style={{ marginBottom: '10px' }}>
                            <label>College/Organization Name: </label>
                            <input type="text" value={collegeName} onChange={(e) => setCollegeName(e.target.value)}
                                placeholder="e.g. IIIT Hyderabad" style={{ width: '100%' }} />
                        </div>
                        
                        <div style={{ marginBottom: '20px', marginTop: '20px' }}>
                            <label><strong>Areas of Interest:</strong></label>
                            <p style={{ fontSize: '12px', color: 'gray', margin: '5px 0 10px 0' }}>
                                Select topics you're interested in - these help personalize event recommendations.
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {INTEREST_OPTIONS.map(interest => (
                                    <button
                                        key={interest}
                                        type="button"
                                        onClick={() => {
                                            setAreasOfInterest(prev =>
                                                prev.includes(interest)
                                                    ? prev.filter(i => i !== interest)
                                                    : [...prev, interest]
                                            );
                                        }}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '15px',
                                            border: areasOfInterest.includes(interest) ? '2px solid #1976d2' : '1px solid #ddd',
                                            backgroundColor: areasOfInterest.includes(interest) ? '#e3f2fd' : 'white',
                                            color: areasOfInterest.includes(interest) ? '#1976d2' : '#333',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: areasOfInterest.includes(interest) ? 'bold' : 'normal'
                                        }}
                                    >
                                        {interest}
                                    </button>
                                ))}
                            </div>
                            {areasOfInterest.length > 0 && (
                                <p style={{ marginTop: '8px', color: '#1976d2', fontSize: '12px' }}>
                                    Selected: {areasOfInterest.join(', ')}
                                </p>
                            )}
                        </div>
                    </>
                )}

                {/* Organizer-specific Fields */}
                {role === 'organizer' && (
                    <>
                        <hr style={{ margin: '20px 0' }} />
                        <h3>Organization Settings</h3>

                        <div style={{ marginBottom: '10px' }}>
                            <label>Contact Email (Public): </label>
                            <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                                placeholder="public-contact@example.com" style={{ width: '100%' }} />
                            <p style={{ fontSize: '12px', color: 'gray', margin: '3px 0 0 0' }}>
                                This is the contact email visible to participants. Your login email remains private.
                            </p>
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label><strong>Category:</strong></label>
                            <p style={{ fontSize: '12px', color: 'gray', margin: '5px 0 10px 0' }}>
                                Select the category that best describes your organization.
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {INTEREST_OPTIONS.map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setCategory(opt)}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '15px',
                                            border: category === opt ? '2px solid #1976d2' : '1px solid #ddd',
                                            backgroundColor: category === opt ? '#e3f2fd' : 'white',
                                            color: category === opt ? '#1976d2' : '#333',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: category === opt ? 'bold' : 'normal'
                                        }}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                            {category && (
                                <p style={{ marginTop: '8px', color: '#1976d2', fontSize: '12px' }}>
                                    Selected: {category}
                                </p>
                            )}
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                            <label>Description: </label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)}
                                rows="3" placeholder="Describe your club/organization..."
                                style={{ width: '100%' }} />
                        </div>
                        <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#e8eaf6', borderRadius: '8px' }}>
                            <label>Discord Webhook URL: </label>
                            <input type="url" value={discordWebhookUrl} onChange={e => setDiscordWebhookUrl(e.target.value)}
                                placeholder="https://discord.com/api/webhooks/..." style={{ width: '100%' }} />
                            <p style={{ fontSize: '12px', color: 'gray', margin: '5px 0 0 0' }}>
                                When set, new events you create or publish will automatically send a notification to your Discord channel.
                            </p>
                        </div>
                    </>
                )}

                <br />
                <button type="submit" style={{
                    padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white',
                    border: 'none', cursor: 'pointer', borderRadius: '5px', fontSize: '16px'
                }}>
                    Save Changes
                </button>
            </form>

            {/* Followed Clubs Section for Participants */}
            {role === 'participant' && (
                <>
                    <hr style={{ margin: '30px 0' }} />
                    <h2>Followed Clubs</h2>
                    <p style={{ fontSize: '14px', color: 'gray' }}>
                        Clubs you follow. Events from followed clubs will be prioritized in your feed.
                        <button 
                            type="button" 
                            onClick={() => navigate('/clubs')} 
                            style={{ marginLeft: '10px', padding: '5px 10px', cursor: 'pointer', fontSize: '13px' }}
                        >
                            Browse All Clubs
                        </button>
                    </p>
                    
                    {followedClubs.length === 0 ? (
                        <p style={{ color: 'gray' }}>You are not following any clubs yet. <span onClick={() => navigate('/clubs')} style={{ color: '#1976d2', cursor: 'pointer', textDecoration: 'underline' }}>Browse clubs</span> to find ones you like!</p>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '15px' }}>
                            {allOrganizers.filter(org => followedClubs.includes(org._id)).map(org => {
                                return (
                                    <div key={org._id} style={{
                                        padding: '12px 15px', border: '1px solid #ddd', borderRadius: '8px',
                                        backgroundColor: '#e3f2fd',
                                        minWidth: '200px', flex: '1 1 calc(50% - 10px)'
                                    }}>
                                        <strong>{org.orgName || `${org.firstName} ${org.lastName}`}</strong>
                                        {org.category && (
                                            <span style={{
                                                marginLeft: '8px', fontSize: '11px', padding: '2px 6px',
                                                borderRadius: '8px', backgroundColor: '#f5f5f5', color: '#666'
                                            }}>
                                                {org.category}
                                            </span>
                                        )}
                                        <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>
                                            {org.description?.substring(0, 60) || 'No description'}...
                                        </p>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleFollowToggle(org._id)}
                                                style={{
                                                    padding: '5px 12px', cursor: 'pointer', fontSize: '13px',
                                                    backgroundColor: '#f44336',
                                                    color: 'white', border: 'none', borderRadius: '4px'
                                                }}
                                            >
                                                Unfollow
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/organizer/${org._id}`)}
                                                style={{
                                                    padding: '5px 12px', cursor: 'pointer', fontSize: '13px',
                                                    backgroundColor: '#1976d2',
                                                    color: 'white', border: 'none', borderRadius: '4px'
                                                }}
                                            >
                                                View
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default Profile;