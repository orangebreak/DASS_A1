import { useState, useEffect } from 'react';
import api from './api';
import { useParams, useNavigate } from 'react-router-dom';

function Forum() {
    const { eventId } = useParams();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [error, setError] = useState('');
    
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    
    // We decode the token payload simply to check the user's role and ID for UI purposes
    // (This is a quick hack for the frontend; true security is still handled by your backend!)
    let currentUserRole = '';
    let currentUserId = '';
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUserRole = payload.role;
            currentUserId = payload.userId;
        } catch (e) {
            console.error("Token parsing error", e);
        }
    }

    // Fetch all messages for this event
    const fetchMessages = async () => {
        try {
            const response = await api.get(`/events/${eventId}/forum`, {
                headers: { 'auth-token': token }
            });
            setMessages(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load forum.');
        }
    };

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchMessages();
        
        // Optional basic "Real-time" polling: Fetch new messages every 5 seconds
        const interval = setInterval(() => {
            fetchMessages();
        }, 5000);
        
        return () => clearInterval(interval); // Cleanup when leaving the page
    }, [eventId, navigate, token]);

    // Send a new message
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await api.post(`/events/${eventId}/forum`, {
                message: newMessage,
                isAnnouncement: false
            }, {
                headers: { 'auth-token': token }
            });
            
            setNewMessage(''); // Clear the input box
            fetchMessages(); // Immediately fetch the updated chat list
        } catch (err) {
            setError('Failed to send message.');
        }
    };

    // Organizer pins a message
    const handlePin = async (messageId, currentPinStatus) => {
        try {
            const action = currentPinStatus ? 'unpin' : 'pin';
            await api.put(`/forum/${messageId}/moderate`, { action }, {
                headers: { 'auth-token': token }
            });
            fetchMessages(); // Refresh the list to show the pin
        } catch (err) {
            setError('Failed to pin/unpin message.');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>Event Discussion Forum</h1>
            <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
            <hr />

            {error && <p style={{ color: 'red' }}>{error}</p>}

            {/* Chat Box Container */}
            <div style={{ 
                border: '1px solid #ccc', 
                height: '400px', 
                overflowY: 'scroll', 
                padding: '10px',
                backgroundColor: '#fafafa',
                marginBottom: '10px'
            }}>
                {messages.length === 0 ? (
                    <p style={{ color: 'gray', textAlign: 'center' }}>No messages yet. Be the first to say hi!</p>
                ) : (
                    messages.map((msg) => (
                        <div key={msg._id} style={{ 
                            marginBottom: '15px', 
                            padding: '10px', 
                            backgroundColor: msg.isPinned ? '#fff3cd' : 'white', // Yellow background if pinned
                            border: msg.isPinned ? '2px solid #ffecb5' : '1px solid #eee',
                            borderRadius: '5px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <strong>
                                    {msg.senderId?.firstName} {msg.senderId?.lastName} 
                                    <span style={{ color: 'gray', fontSize: '12px', marginLeft: '5px' }}>
                                        ({msg.senderId?.role})
                                    </span>
                                </strong>
                                
                                {/* Organizer Pin Button */}
                                {(currentUserRole === 'organizer' || currentUserRole === 'admin') && (
                                    <button 
                                        onClick={() => handlePin(msg._id, msg.isPinned)}
                                        style={{ fontSize: '12px', cursor: 'pointer' }}
                                    >
                                        {msg.isPinned ? '📍 Unpin' : '📌 Pin'}
                                    </button>
                                )}
                            </div>
                            
                            <p style={{ margin: 0 }}>{msg.message}</p>
                            <span style={{ fontSize: '10px', color: 'gray' }}>
                                {new Date(msg.createdAt).toLocaleString()}
                            </span>
                        </div>
                    ))
                )}
            </div>

            {/* Message Input Box */}
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
                <input 
                    type="text" 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)} 
                    placeholder="Type your message here..." 
                    style={{ flexGrow: 1, padding: '10px' }}
                    required 
                />
                <button type="submit" style={{ padding: '10px 20px' }}>Send</button>
            </form>
        </div>
    );
}

export default Forum;