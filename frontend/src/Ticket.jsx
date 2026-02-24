import { useState, useEffect } from 'react';
import api from './api';
import { useParams, useNavigate } from 'react-router-dom';

function Ticket() {
    // Grab the ticketId from the URL (e.g., /ticket/abc-123-xyz)
    const { ticketId } = useParams();
    const [ticketData, setTicketData] = useState(null);
    const [error, setError] = useState('');
    
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchTicket = async () => {
            try {
                // Call the GET /tickets/:ticketId route from our backend
                const response = await api.get(`/tickets/${ticketId}`, {
                    headers: { 'auth-token': token }
                });
                setTicketData(response.data);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load ticket.');
            }
        };

        fetchTicket();
    }, [ticketId, navigate, token]);

    if (error) return <div style={{ padding: '20px', color: 'red', fontWeight: 'bold' }}>{error}</div>;
    if (!ticketData) return <div style={{ padding: '20px' }}>Loading ticket details...</div>;

    const details = ticketData.ticketDetails;
    const isApproved = details.status === 'Registered' || details.status === 'Attended';

    return (
        <div style={{ padding: '20px' }}>
            <h1>Your Event Ticket</h1>
            <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
            <hr />

            {/* A simple CSS box to make it look like a physical ticket */}
            <div style={{ 
                border: '2px dashed black', 
                padding: '20px', 
                width: '350px', 
                textAlign: 'center', 
                backgroundColor: '#f9f9f9',
                marginTop: '20px'
            }}>
                <h2>{details.eventId.eventName}</h2>
                <p><strong>Attendee:</strong> {details.userId.firstName} {details.userId.lastName}</p>
                <p><strong>Status:</strong> <span style={{ 
                    color: details.status === 'Attended' ? 'green' : 
                           details.status === 'Registered' ? '#1976d2' : 
                           details.status === 'Pending' ? '#ff9800' : 'red' 
                }}>{details.status}</span></p>
                
                <hr style={{ margin: '15px 0' }} />

                {/* Only show QR code when status is Registered or Attended */}
                {isApproved ? (
                    <>
                        <img src={ticketData.qrCode} alt="Ticket QR Code" style={{ width: '200px', height: '200px' }} />
                        <p style={{ fontSize: '12px', color: 'gray', marginTop: '10px' }}>
                            Ticket ID: <br/> {details.ticketId}
                        </p>
                    </>
                ) : (
                    <div style={{ padding: '30px', backgroundColor: '#fff3e0', borderRadius: '8px' }}>
                        <p style={{ color: '#e65100', fontWeight: 'bold', margin: '0 0 10px 0' }}>
                            Waiting for Approval
                        </p>
                        <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
                            Your registration is pending approval from the organizer. 
                            The QR code will be available once your registration is approved.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Ticket;