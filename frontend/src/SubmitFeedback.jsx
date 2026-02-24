import { useState, useEffect } from 'react';
import api from './api';
import { useParams, useNavigate } from 'react-router-dom';

function SubmitFeedback() {
    const { eventId } = useParams();
    const [rating, setRating] = useState(5); // Default to 5 stars
    const [comments, setComments] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
        }
    }, [navigate, token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        try {
            const response = await api.post(`/events/${eventId}/feedback`, {
                rating: Number(rating),
                comments: comments
            }, {
                headers: { 'auth-token': token }
            });

            setMessage(response.data.message);
            setComments(''); // Clear the form
        } catch (err) {
            // This will catch the error if they try to leave feedback without attending!
            setError(err.response?.data?.error || 'Failed to submit feedback.');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '500px' }}>
            <h1>Leave Anonymous Feedback</h1>
            <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
            <hr />

            <p style={{ color: 'gray' }}>Your name and email will not be shared with the organizer.</p>

            {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}
            {message && <p style={{ color: 'green', fontWeight: 'bold' }}>{message}</p>}

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                    <label>Rating (1-5 Stars): </label>
                    <select value={rating} onChange={(e) => setRating(e.target.value)}>
                        <option value="5">5 - Excellent</option>
                        <option value="4">4 - Good</option>
                        <option value="3">3 - Average</option>
                        <option value="2">2 - Poor</option>
                        <option value="1">1 - Terrible</option>
                    </select>
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                    <label>Comments (Optional): </label><br />
                    <textarea 
                        value={comments} 
                        onChange={(e) => setComments(e.target.value)} 
                        rows="4" 
                        style={{ width: '100%', padding: '10px' }}
                        placeholder="What did you think of the event?"
                    />
                </div>

                <button type="submit" style={{ padding: '10px 20px', backgroundColor: 'purple', color: 'white' }}>
                    Submit Feedback
                </button>
            </form>
        </div>
    );
}

export default SubmitFeedback;