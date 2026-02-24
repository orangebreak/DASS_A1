import { useState, useEffect } from 'react';
import api from './api';
import { useParams, useNavigate } from 'react-router-dom';

function OrganizerEventDetail() {
    const { id } = useParams();
    const [analytics, setAnalytics] = useState(null);
    const [feedbackStats, setFeedbackStats] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    
    // Search and filter states for participants
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [participantTypeFilter, setParticipantTypeFilter] = useState('all');
    
    // Feedback filter
    const [ratingFilter, setRatingFilter] = useState('all');
    
    // Cancel event confirmation
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);

    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) { navigate('/login'); return; }

        const fetchAnalyticsAndFeedback = async () => {
            try {
                const resAnalytics = await api.get(`/events/${id}/analytics`, {
                    headers: { 'auth-token': token }
                });
                setAnalytics(resAnalytics.data);

                const resFeedback = await api.get(`/events/${id}/feedback`, {
                    headers: { 'auth-token': token }
                });
                setFeedbackStats(resFeedback.data);
            } catch (err) {
                setError('Failed to load event data.');
            }
        };
        fetchAnalyticsAndFeedback();
    }, [id, navigate, token]);

    const handleStatusChange = async (newStatus) => {
        setMessage(''); setError('');
        try {
            await api.put(`/events/${id}`, { status: newStatus }, {
                headers: { 'auth-token': token }
            });
            setAnalytics({ ...analytics, status: newStatus });
            setMessage(`Event successfully updated to ${newStatus}!`);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update event status.');
        }
    };

    const handleCancelEvent = async () => {
        setCancelLoading(true);
        setMessage(''); setError('');
        try {
            await api.delete(`/events/${id}`, {
                headers: { 'auth-token': token }
            });
            navigate('/dashboard', { state: { message: 'Event cancelled and deleted successfully.' } });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to cancel event.');
            setCancelLoading(false);
            setShowCancelConfirm(false);
        }
    };

    const handleExportCSV = async () => {
        try {
            const response = await api.get(`/events/${id}/analytics/csv`, {
                headers: { 'auth-token': token },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${analytics?.eventName || 'event'}_attendance.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            setMessage('CSV exported successfully!');
        } catch (err) {
            setError('Failed to export CSV.');
        }
    };

    // Filter participants
    const getFilteredParticipants = () => {
        if (!analytics?.participants) return [];
        
        return analytics.participants.filter(reg => {
            // Search filter
            const name = `${reg.userId?.firstName || ''} ${reg.userId?.lastName || ''}`.toLowerCase();
            const email = (reg.userId?.email || '').toLowerCase();
            const ticketId = (reg.ticketId || '').toLowerCase();
            const searchLower = searchTerm.toLowerCase();
            
            const matchesSearch = !searchTerm || 
                name.includes(searchLower) || 
                email.includes(searchLower) || 
                ticketId.includes(searchLower);
            
            // Status filter
            const matchesStatus = statusFilter === 'all' || reg.status === statusFilter;
            
            // Participant type filter
            const matchesType = participantTypeFilter === 'all' || 
                reg.userId?.participantType === participantTypeFilter;
            
            return matchesSearch && matchesStatus && matchesType;
        });
    };

    // Filter feedback by rating
    const getFilteredFeedback = () => {
        if (!feedbackStats?.rawFeedback) return [];
        if (ratingFilter === 'all') return feedbackStats.rawFeedback;
        return feedbackStats.rawFeedback.filter(fb => fb.rating === parseInt(ratingFilter));
    };

    if (error && !analytics) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;
    if (!analytics) return <div style={{ padding: '20px' }}>Loading analytics...</div>;

    const filteredParticipants = getFilteredParticipants();

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
            <h1>{analytics.eventName} - Dashboard</h1>
            <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
            {analytics.eventType === 'merchandise' && (
                <button onClick={() => navigate(`/merchandise-orders/${id}`)} style={{ marginLeft: '10px', backgroundColor: '#9C27B0', color: 'white', border: 'none', padding: '8px 16px', cursor: 'pointer', borderRadius: '5px' }}>
                    View Merchandise Orders
                </button>
            )}
            <hr />

            {message && <p style={{ color: 'green', fontWeight: 'bold' }}>{message}</p>}
            {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

            {/* Event Details Section */}
            <div style={{ padding: '15px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', marginBottom: '20px', borderRadius: '8px' }}>
                <h3>Event Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <div>
                        <label style={{ fontSize: '12px', color: 'gray' }}>Type</label>
                        <p style={{ margin: '3px 0', fontWeight: 'bold' }}>
                            <span style={{
                                padding: '3px 10px', borderRadius: '10px',
                                backgroundColor: analytics.eventType === 'normal' ? '#e3f2fd' : '#f3e5f5',
                                color: analytics.eventType === 'normal' ? '#1976d2' : '#9C27B0'
                            }}>
                                {analytics.eventType}
                            </span>
                        </p>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', color: 'gray' }}>Event Start</label>
                        <p style={{ margin: '3px 0' }}>{new Date(analytics.eventStart).toLocaleString()}</p>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', color: 'gray' }}>Event End</label>
                        <p style={{ margin: '3px 0' }}>{new Date(analytics.eventEnd).toLocaleString()}</p>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', color: 'gray' }}>Registration Deadline</label>
                        <p style={{ margin: '3px 0' }}>{new Date(analytics.regDeadline).toLocaleString()}</p>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', color: 'gray' }}>Eligibility</label>
                        <p style={{ margin: '3px 0' }}>{analytics.eligibility || 'Open to all'}</p>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', color: 'gray' }}>Registration Fee</label>
                        <p style={{ margin: '3px 0', fontWeight: 'bold', color: 'green' }}>
                            {analytics.regFee > 0 ? `₹${analytics.regFee}` : 'Free'}
                        </p>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', color: 'gray' }}>Registration Limit</label>
                        <p style={{ margin: '3px 0' }}>{analytics.regLimit || 'Unlimited'}</p>
                    </div>
                </div>
            </div>

            {/* Event Controls */}
            <div style={{ padding: '15px', backgroundColor: '#f9f9f9', border: '1px solid #ddd', marginBottom: '20px', borderRadius: '8px' }}>
                <h3>Event Controls</h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {analytics.status === 'Draft' && (
                        <button onClick={() => handleStatusChange('Published')} style={{ backgroundColor: 'green', color: 'white', padding: '10px', border: 'none', cursor: 'pointer', borderRadius: '5px' }}>
                            Publish Event
                        </button>
                    )}
                    {analytics.status === 'Published' && (
                        <>
                            <button onClick={() => handleStatusChange('Ongoing')} style={{ backgroundColor: 'blue', color: 'white', padding: '10px', border: 'none', cursor: 'pointer', borderRadius: '5px' }}>
                                Mark as Ongoing
                            </button>
                            <button onClick={() => handleStatusChange('Closed')} style={{ backgroundColor: '#ff9800', color: 'white', padding: '10px', border: 'none', cursor: 'pointer', borderRadius: '5px' }}>
                                Close Registrations
                            </button>
                        </>
                    )}
                    {(analytics.status === 'Published' || analytics.status === 'Ongoing') && (
                        <button onClick={() => handleStatusChange('Completed')} style={{ backgroundColor: 'gray', color: 'white', padding: '10px', border: 'none', cursor: 'pointer', borderRadius: '5px' }}>
                            Mark as Completed
                        </button>
                    )}
                    
                    {/* Cancel Event Button */}
                    {analytics.status !== 'Completed' && (
                        <button 
                            onClick={() => setShowCancelConfirm(true)} 
                            style={{ backgroundColor: '#d32f2f', color: 'white', padding: '10px', border: 'none', cursor: 'pointer', borderRadius: '5px' }}
                        >
                            Cancel Event
                        </button>
                    )}
                </div>
                
                {/* Cancel Confirmation Modal */}
                {showCancelConfirm && (
                    <div style={{
                        marginTop: '20px', padding: '20px', backgroundColor: '#ffebee',
                        border: '2px solid #d32f2f', borderRadius: '8px'
                    }}>
                        <h4 style={{ color: '#c62828', margin: '0 0 15px 0' }}>
                            Are you sure you want to cancel this event?
                        </h4>
                        <p style={{ margin: '0 0 10px 0', color: '#555' }}>
                            <strong>Warning:</strong> This action is <strong>irreversible</strong>. The event and all associated registrations will be permanently deleted.
                        </p>
                        {analytics.totalRegistrations > 0 && (
                            <p style={{ margin: '0 0 15px 0', color: '#c62828', fontWeight: 'bold' }}>
                                This event has {analytics.totalRegistrations} registration(s). All participants will lose their registrations.
                            </p>
                        )}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                onClick={handleCancelEvent}
                                disabled={cancelLoading}
                                style={{ 
                                    backgroundColor: '#d32f2f', color: 'white', padding: '10px 20px', 
                                    border: 'none', cursor: cancelLoading ? 'not-allowed' : 'pointer', borderRadius: '5px'
                                }}
                            >
                                {cancelLoading ? 'Cancelling...' : 'Yes, Cancel Event'}
                            </button>
                            <button 
                                onClick={() => setShowCancelConfirm(false)}
                                disabled={cancelLoading}
                                style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '5px' }}
                            >
                                No, Keep Event
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Analytics Summary */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', minWidth: '150px' }}>
                    <h4 style={{ margin: '0 0 5px 0', color: 'gray' }}>Status</h4>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{analytics.status}</p>
                </div>
                <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', minWidth: '150px' }}>
                    <h4 style={{ margin: '0 0 5px 0', color: 'gray' }}>Total Registrations</h4>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{analytics.totalRegistrations}</p>
                </div>
                <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', minWidth: '150px' }}>
                    <h4 style={{ margin: '0 0 5px 0', color: 'gray' }}>Total Attendance</h4>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{analytics.attendedCount}</p>
                </div>
                <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', minWidth: '150px' }}>
                    <h4 style={{ margin: '0 0 5px 0', color: 'gray' }}>Total Revenue</h4>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'green', margin: 0 }}>₹{analytics.totalRevenue}</p>
                </div>
            </div>

            {/* Participant List with Search/Filter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h2>Participant List ({filteredParticipants.length})</h2>
                <button onClick={handleExportCSV} style={{
                    backgroundColor: '#1976d2', color: 'white', border: 'none',
                    padding: '8px 16px', cursor: 'pointer', borderRadius: '5px'
                }}>
                    Export as CSV
                </button>
            </div>

            {/* Search and Filter Controls */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
                <input
                    type="text"
                    placeholder="Search by name, email, or ticket ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ddd', minWidth: '250px', flex: 1 }}
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}
                >
                    <option value="all">All Status</option>
                    <option value="Registered">Registered</option>
                    <option value="Attended">Attended</option>
                    <option value="Pending">Pending</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Rejected">Rejected</option>
                </select>
                <select
                    value={participantTypeFilter}
                    onChange={(e) => setParticipantTypeFilter(e.target.value)}
                    style={{ padding: '8px', borderRadius: '5px', border: '1px solid #ddd' }}
                >
                    <option value="all">All Types</option>
                    <option value="IIIT">IIIT</option>
                    <option value="Non-IIIT">Non-IIIT</option>
                </select>
            </div>

            {filteredParticipants.length === 0 ? (
                <p>No participants found matching your criteria.</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table border="1" cellPadding="10" style={{ borderCollapse: 'collapse', width: '100%', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f0f0f0' }}>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Participant Type</th>
                                <th>Registration Date</th>
                                <th>Payment</th>
                                <th>Ticket ID</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredParticipants.map(reg => (
                                <tr key={reg._id}>
                                    <td>{reg.userId?.firstName} {reg.userId?.lastName}</td>
                                    <td>{reg.userId?.email}</td>
                                    <td>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '10px', fontSize: '12px',
                                            backgroundColor: reg.userId?.participantType === 'IIIT' ? '#e8f5e9' : '#fff3e0',
                                            color: reg.userId?.participantType === 'IIIT' ? '#2e7d32' : '#e65100'
                                        }}>
                                            {reg.userId?.participantType || 'N/A'}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '13px' }}>
                                        {reg.registrationDate ? new Date(reg.registrationDate).toLocaleString() : 'N/A'}
                                    </td>
                                    <td>
                                        {reg.paymentProof ? (
                                            <span style={{ color: '#4CAF50' }}>✓ Uploaded</span>
                                        ) : (
                                            analytics.regFee > 0 ? `₹${analytics.regFee}` : 'Free'
                                        )}
                                    </td>
                                    <td style={{ fontSize: '11px', fontFamily: 'monospace' }}>{reg.ticketId}</td>
                                    <td style={{ color: reg.status === 'Attended' ? 'green' : reg.status === 'Cancelled' || reg.status === 'Rejected' ? 'red' : reg.status === 'Pending' ? '#ff9800' : 'black' }}>
                                        <strong>{reg.status}</strong>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Feedback Section with Rating Filter */}
            {feedbackStats && (
                <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f4f4f9', border: '1px solid #ccc', borderRadius: '8px' }}>
                    <h2>Anonymous Feedback</h2>
                    <p><strong>Average Rating:</strong> {feedbackStats.averageRating} / 5.00</p>
                    <p><strong>Total Reviews:</strong> {feedbackStats.totalFeedbackCount}</p>

                    {/* Rating Filter */}
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ marginRight: '10px' }}>Filter by Rating:</label>
                        <select
                            value={ratingFilter}
                            onChange={(e) => setRatingFilter(e.target.value)}
                            style={{ padding: '5px', borderRadius: '5px' }}
                        >
                            <option value="all">All Ratings</option>
                            <option value="5">5 stars</option>
                            <option value="4">4 stars</option>
                            <option value="3">3 stars</option>
                            <option value="2">2 stars</option>
                            <option value="1">1 star</option>
                        </select>
                    </div>

                    <h4>Written Comments ({getFilteredFeedback().length}):</h4>
                    {getFilteredFeedback().length === 0 ? (
                        <p>No feedback matching the selected rating.</p>
                    ) : (
                        <ul>
                            {getFilteredFeedback().map(fb => (
                                <li key={fb._id} style={{ marginBottom: '10px' }}>
                                    <strong>{fb.rating} Stars:</strong> "{fb.comments}"
                                    <br /><span style={{ fontSize: '12px', color: 'gray' }}>{new Date(fb.createdAt).toLocaleDateString()}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

export default OrganizerEventDetail;