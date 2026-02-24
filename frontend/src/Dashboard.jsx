import { useState, useEffect } from 'react';
import api from './api';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
    const [dashboardData, setDashboardData] = useState(null);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // Participant tabs
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }

        const fetchDashboard = async () => {
            try {
                const response = await api.get('/dashboard', {
                    headers: { 'auth-token': token }
                });
                setDashboardData(response.data);
            } catch (err) {
                console.error("Dashboard fetch error", err);
                setError('Failed to load dashboard. Your session may have expired.');
                localStorage.removeItem('token');
                navigate('/login');
            }
        };
        fetchDashboard();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    if (!dashboardData) {
        return <div style={{ padding: '20px' }}>Loading...</div>;
    }

    const user = dashboardData.user;

    // Redirect participants to onboarding if not completed
    if (user.role === 'participant' && !user.onboardingCompleted) {
        navigate('/onboarding');
        return <div style={{ padding: '20px' }}>Redirecting to onboarding...</div>;
    }

    // Filter registrations by tab for participants
    const getFilteredRegistrations = () => {
        if (!dashboardData.eventsParticipated) return [];
        const regs = dashboardData.eventsParticipated;

        switch (activeTab) {
            case 'normal':
                return regs.filter(r => r.eventId?.eventType === 'normal' && r.status !== 'Cancelled' && r.status !== 'Rejected');
            case 'merchandise':
                return regs.filter(r => r.eventId?.eventType === 'merchandise' && r.status !== 'Cancelled' && r.status !== 'Rejected');
            case 'completed':
                return regs.filter(r => r.status === 'Attended');
            case 'cancelled':
                return regs.filter(r => r.status === 'Cancelled' || r.status === 'Rejected');
            default:
                return regs;
        }
    };

    const tabStyle = (tab) => ({
        padding: '8px 16px',
        cursor: 'pointer',
        backgroundColor: activeTab === tab ? '#333' : '#f0f0f0',
        color: activeTab === tab ? 'white' : 'black',
        border: 'none',
        borderRadius: '5px 5px 0 0',
        fontWeight: activeTab === tab ? 'bold' : 'normal'
    });

    return (
        <div style={{ padding: '20px' }}>
            <h1>Dashboard</h1>
            <p>Welcome, <strong>{user.firstName} {user.lastName}</strong>!</p>
            <p>Role: {user.role}</p>

            <button onClick={handleLogout}>Logout</button>
            <button onClick={() => navigate('/profile')} style={{ marginLeft: '10px' }}>My Profile</button>
            <button onClick={() => navigate('/browse')} style={{ marginLeft: '10px' }}>Browse All Events</button>

            <hr />

            {/* ====== ADMIN DASHBOARD ====== */}
            {user.role === 'admin' && (
                <div>
                    <h2>Admin Panel</h2>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                        <button onClick={() => navigate('/admin/manage-clubs')} style={{
                            padding: '15px 25px', fontSize: '16px', backgroundColor: '#1976d2',
                            color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer'
                        }}>
                            Manage Clubs/Organizers
                        </button>
                        <button onClick={() => navigate('/admin/password-resets')} style={{
                            padding: '15px 25px', fontSize: '16px', backgroundColor: '#ff9800',
                            color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer'
                        }}>
                            Password Reset Requests
                        </button>
                    </div>
                </div>
            )}

            {/* ====== ORGANIZER DASHBOARD ====== */}
            {user.role === 'organizer' && (
                <div>
                    {/* Overall Analytics Section */}
                    {(() => {
                        const completedEvents = (dashboardData.eventsOrganized || []).filter(e => e.status === 'Completed');
                        if (completedEvents.length === 0) return null;

                        const totalRegistrations = completedEvents.reduce((sum, e) => sum + (e.totalRegistrations || 0), 0);
                        const totalAttendance = completedEvents.reduce((sum, e) => sum + (e.attendedCount || 0), 0);
                        const totalRevenue = completedEvents.reduce((sum, e) => sum + (e.totalRevenue || 0), 0);
                        const avgAttendanceRate = totalRegistrations > 0 
                            ? Math.round((totalAttendance / totalRegistrations) * 100) 
                            : 0;

                        return (
                            <div style={{ 
                                marginBottom: '30px', padding: '20px', 
                                backgroundColor: '#f8f9fa', borderRadius: '10px',
                                border: '1px solid #e0e0e0'
                            }}>
                                <h2 style={{ marginTop: 0 }}>Overall Analytics</h2>
                                <p style={{ color: '#666', marginBottom: '20px' }}>
                                    Aggregate stats from {completedEvents.length} completed event{completedEvents.length > 1 ? 's' : ''}
                                </p>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                                    <div style={{ 
                                        padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '8px',
                                        textAlign: 'center'
                                    }}>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#1565c0' }}>Total Registrations</p>
                                        <p style={{ margin: '10px 0 0 0', fontSize: '32px', fontWeight: 'bold', color: '#1976d2' }}>
                                            {totalRegistrations}
                                        </p>
                                    </div>
                                    
                                    <div style={{ 
                                        padding: '20px', backgroundColor: '#f3e5f5', borderRadius: '8px',
                                        textAlign: 'center'
                                    }}>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#7b1fa2' }}>Total Attendance</p>
                                        <p style={{ margin: '10px 0 0 0', fontSize: '32px', fontWeight: 'bold', color: '#9c27b0' }}>
                                            {totalAttendance}
                                        </p>
                                    </div>
                                    
                                    <div style={{ 
                                        padding: '20px', backgroundColor: '#e8f5e9', borderRadius: '8px',
                                        textAlign: 'center'
                                    }}>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#2e7d32' }}>Total Revenue</p>
                                        <p style={{ margin: '10px 0 0 0', fontSize: '32px', fontWeight: 'bold', color: '#4caf50' }}>
                                            ₹{totalRevenue.toLocaleString()}
                                        </p>
                                    </div>
                                    
                                    <div style={{ 
                                        padding: '20px', backgroundColor: '#fff3e0', borderRadius: '8px',
                                        textAlign: 'center'
                                    }}>
                                        <p style={{ margin: 0, fontSize: '14px', color: '#e65100' }}>Avg. Attendance Rate</p>
                                        <p style={{ margin: '10px 0 0 0', fontSize: '32px', fontWeight: 'bold', color: '#ff9800' }}>
                                            {avgAttendanceRate}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    <h2>Events You Are Organizing:</h2>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                        <button onClick={() => navigate('/create-event')} style={{ backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '10px 20px', cursor: 'pointer', borderRadius: '5px' }}>
                            + Create New Event
                        </button>
                        <button onClick={() => navigate('/scan')} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '5px' }}>
                            Scan Tickets
                        </button>
                        <button onClick={() => navigate('/password-reset-request')} style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '5px' }}>
                            Request Password Reset
                        </button>
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {dashboardData.eventsOrganized.map((event) => (
                            <li key={event._id} style={{ marginBottom: '15px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: event.status === 'Completed' ? '#f5f5f5' : 'white' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <strong style={{ fontSize: '18px' }}>{event.eventName}</strong>
                                        <span style={{
                                            marginLeft: '10px', fontSize: '12px', padding: '2px 8px',
                                            borderRadius: '10px', color: 'white',
                                            backgroundColor: event.status === 'Published' ? '#4CAF50' : event.status === 'Ongoing' ? '#2196F3' : event.status === 'Completed' ? '#9e9e9e' : '#ff9800'
                                        }}>
                                            {event.status}
                                        </span>
                                        <span style={{
                                            marginLeft: '5px', fontSize: '12px', padding: '2px 8px',
                                            borderRadius: '10px', backgroundColor: '#e3f2fd', color: '#1976d2'
                                        }}>
                                            {event.eventType}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Show stats for completed events */}
                                {event.status === 'Completed' && (
                                    <div style={{ display: 'flex', gap: '15px', marginTop: '12px', flexWrap: 'wrap' }}>
                                        <div style={{ padding: '8px 15px', backgroundColor: '#e3f2fd', borderRadius: '5px' }}>
                                            <span style={{ fontSize: '12px', color: 'gray' }}>Registrations</span>
                                            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px' }}>{event.totalRegistrations || 0}</p>
                                        </div>
                                        <div style={{ padding: '8px 15px', backgroundColor: '#f3e5f5', borderRadius: '5px' }}>
                                            <span style={{ fontSize: '12px', color: 'gray' }}>Attendance</span>
                                            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px' }}>{event.attendedCount || 0}</p>
                                        </div>
                                        <div style={{ padding: '8px 15px', backgroundColor: '#e8f5e9', borderRadius: '5px' }}>
                                            <span style={{ fontSize: '12px', color: 'gray' }}>Revenue</span>
                                            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '16px', color: 'green' }}>₹{event.totalRevenue || 0}</p>
                                        </div>
                                    </div>
                                )}
                                
                                <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {event.status === 'Draft' && (
                                        <button onClick={() => navigate(`/edit-event/${event._id}`)} style={{ padding: '5px 12px', cursor: 'pointer', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '3px' }}>
                                            Edit Draft
                                        </button>
                                    )}
                                    {event.status === 'Published' && (
                                        <button onClick={() => navigate(`/edit-event/${event._id}`)} style={{ padding: '5px 12px', cursor: 'pointer', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '3px' }}>
                                            Edit Event
                                        </button>
                                    )}
                                    <button onClick={() => navigate(`/organizer/event/${event._id}`)} style={{ padding: '5px 12px', cursor: 'pointer' }}>
                                        Details & Analytics
                                    </button>
                                    <button onClick={() => navigate(`/forum/${event._id}`)} style={{ padding: '5px 12px', cursor: 'pointer' }}>
                                        Forum
                                    </button>
                                    {event.eventType === 'merchandise' && (
                                        <button onClick={() => navigate(`/merchandise-orders/${event._id}`)} style={{ padding: '5px 12px', cursor: 'pointer', backgroundColor: '#9C27B0', color: 'white', border: 'none', borderRadius: '3px' }}>
                                            Merchandise Orders
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                    {dashboardData.eventsOrganized.length === 0 && <p>You have not created any events yet.</p>}
                </div>
            )}

            {/* ====== PARTICIPANT DASHBOARD ====== */}
            {user.role === 'participant' && (
                <div>
                    {/* Upcoming Events Section */}
                    <h2>Upcoming Events</h2>
                    <p style={{ fontSize: '14px', color: 'gray', marginBottom: '15px' }}>
                        Events you have registered for that are coming up soon.
                    </p>
                    {(() => {
                        const now = new Date();
                        const upcomingRegs = (dashboardData.eventsParticipated || []).filter(reg => {
                            const eventStart = reg.eventId?.eventStart ? new Date(reg.eventId.eventStart) : null;
                            return eventStart && eventStart > now && 
                                   (reg.status === 'Registered' || reg.status === 'Pending');
                        }).sort((a, b) => new Date(a.eventId.eventStart) - new Date(b.eventId.eventStart));
                        
                        if (upcomingRegs.length === 0) {
                            return <p style={{ color: 'gray', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                                No upcoming events. <span onClick={() => navigate('/browse')} style={{ color: '#1976d2', cursor: 'pointer', textDecoration: 'underline' }}>Browse events</span> to find something interesting!
                            </p>;
                        }
                        
                        return (
                            <div style={{ display: 'grid', gap: '12px', marginBottom: '30px' }}>
                                {upcomingRegs.map(reg => (
                                    <div key={reg._id} style={{ 
                                        padding: '15px', border: '1px solid #ddd', borderRadius: '8px',
                                        borderLeft: '4px solid #4CAF50', backgroundColor: '#fafafa'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                                            <div>
                                                <strong style={{ fontSize: '16px' }}>{reg.eventId?.eventName}</strong>
                                                <span style={{
                                                    marginLeft: '10px', fontSize: '11px', padding: '2px 8px',
                                                    borderRadius: '10px', backgroundColor: '#e3f2fd', color: '#1976d2'
                                                }}>
                                                    {reg.eventId?.eventType}
                                                </span>
                                                <span style={{
                                                    marginLeft: '5px', fontSize: '11px', padding: '2px 8px',
                                                    borderRadius: '10px',
                                                    backgroundColor: reg.status === 'Registered' ? '#e8f5e9' : '#fff3e0',
                                                    color: reg.status === 'Registered' ? '#2e7d32' : '#e65100'
                                                }}>
                                                    {reg.status}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => navigate(`/ticket/${reg.ticketId}`)} 
                                                style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}
                                            >
                                                View Ticket
                                            </button>
                                        </div>
                                        <div style={{ marginTop: '8px', fontSize: '13px', color: '#555' }}>
                                            {reg.eventId?.orgId && (
                                                <span style={{ marginRight: '15px' }}>
                                                    <strong>Organizer:</strong> {reg.eventId.orgId.orgName || reg.eventId.orgId.firstName || 'N/A'}
                                                </span>
                                            )}
                                            <span>
                                                <strong>Date:</strong> {new Date(reg.eventId.eventStart).toLocaleDateString()} at {new Date(reg.eventId.eventStart).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}

                    <h2>Your Participation History</h2>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '5px', marginBottom: '0' }}>
                        <button style={tabStyle('all')} onClick={() => setActiveTab('all')}>
                            All ({dashboardData.eventsParticipated?.length || 0})
                        </button>
                        <button style={tabStyle('normal')} onClick={() => setActiveTab('normal')}>
                            Normal ({dashboardData.eventsParticipated?.filter(r => r.eventId?.eventType === 'normal' && r.status !== 'Cancelled' && r.status !== 'Rejected').length || 0})
                        </button>
                        <button style={tabStyle('merchandise')} onClick={() => setActiveTab('merchandise')}>
                            Merchandise ({dashboardData.eventsParticipated?.filter(r => r.eventId?.eventType === 'merchandise' && r.status !== 'Cancelled' && r.status !== 'Rejected').length || 0})
                        </button>
                        <button style={tabStyle('completed')} onClick={() => setActiveTab('completed')}>
                            Completed ({dashboardData.eventsParticipated?.filter(r => r.status === 'Attended').length || 0})
                        </button>
                        <button style={tabStyle('cancelled')} onClick={() => setActiveTab('cancelled')}>
                            Cancelled/Rejected ({dashboardData.eventsParticipated?.filter(r => r.status === 'Cancelled' || r.status === 'Rejected').length || 0})
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div style={{ border: '1px solid #ddd', borderTop: '2px solid #333', padding: '15px' }}>
                        {getFilteredRegistrations().length === 0 ? (
                            <p style={{ color: 'gray' }}>No events in this category.</p>
                        ) : (
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {getFilteredRegistrations().map((registration) => (
                                    <li key={registration._id} style={{ marginBottom: '15px', padding: '12px', border: '1px solid #eee', borderRadius: '8px' }}>
                                        <strong style={{ fontSize: '16px' }}>{registration.eventId?.eventName}</strong>
                                        <span style={{
                                            marginLeft: '10px', fontSize: '12px', padding: '2px 8px',
                                            borderRadius: '10px', color: 'white',
                                            backgroundColor: registration.status === 'Attended' ? '#4CAF50' :
                                                registration.status === 'Registered' ? '#2196F3' :
                                                    registration.status === 'Pending' ? '#ff9800' :
                                                        '#f44336'
                                        }}>
                                            {registration.status}
                                        </span>
                                        {registration.eventId?.eventType && (
                                            <span style={{
                                                marginLeft: '5px', fontSize: '11px', padding: '2px 6px',
                                                borderRadius: '8px', backgroundColor: '#f3e5f5', color: '#9C27B0'
                                            }}>
                                                {registration.eventId.eventType}
                                            </span>
                                        )}

                                        {/* Event Details */}
                                        <div style={{ marginTop: '8px', fontSize: '13px', color: '#555' }}>
                                            {registration.eventId?.orgId && (
                                                <p style={{ margin: '3px 0' }}>
                                                    <strong>Organizer:</strong> {registration.eventId.orgId.orgName || registration.eventId.orgId.firstName || 'N/A'}
                                                </p>
                                            )}
                                            <p style={{ margin: '3px 0' }}>
                                                <strong>Schedule:</strong> {registration.eventId?.eventStart ? new Date(registration.eventId.eventStart).toLocaleDateString() : 'N/A'} — {registration.eventId?.eventEnd ? new Date(registration.eventId.eventEnd).toLocaleDateString() : 'N/A'}
                                            </p>
                                            {registration.eventId?.regFee > 0 && (
                                                <p style={{ margin: '3px 0' }}>
                                                    <strong>Fee:</strong> ₹{registration.eventId.regFee}
                                                </p>
                                            )}
                                        </div>

                                        <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <button onClick={() => navigate(`/ticket/${registration.ticketId}`)} style={{ padding: '4px 10px', cursor: 'pointer', fontSize: '13px' }}>
                                                View Ticket
                                            </button>
                                            {registration.eventId?._id && (
                                                <button onClick={() => navigate(`/event/${registration.eventId._id}`)} style={{ padding: '4px 10px', cursor: 'pointer', fontSize: '13px' }}>
                                                    View Details
                                                </button>
                                            )}
                                            {registration.eventId?._id && (
                                                <button onClick={() => navigate(`/forum/${registration.eventId._id}`)} style={{ padding: '4px 10px', cursor: 'pointer', fontSize: '13px' }}>
                                                    Forum
                                                </button>
                                            )}
                                            {registration.status === 'Attended' && registration.eventId?._id && (
                                                <button onClick={() => navigate(`/feedback/${registration.eventId._id}`)} style={{
                                                    padding: '4px 10px', cursor: 'pointer', fontSize: '13px',
                                                    backgroundColor: '#9C27B0', color: 'white', border: 'none', borderRadius: '3px'
                                                }}>
                                                    Leave Feedback
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;