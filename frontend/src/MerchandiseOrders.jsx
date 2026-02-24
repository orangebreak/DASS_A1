import { useState, useEffect } from 'react';
import api from './api';
import { useParams, useNavigate } from 'react-router-dom';

function MerchandiseOrders() {
    const { id } = useParams();
    const [orders, setOrders] = useState([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all'); // all, Pending, Registered, Rejected

    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const fetchOrders = async () => {
        try {
            const res = await api.get(`/events/${id}/merchandise-orders`, {
                headers: { 'auth-token': token }
            });
            setOrders(res.data);
        } catch (err) {
            setError('Failed to load merchandise orders.');
        }
    };

    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        fetchOrders();
    }, [id, navigate, token]);

    const handleReview = async (ticketId, action) => {
        setMessage(''); setError('');
        try {
            const res = await api.put(`/orders/${ticketId}/review`, { action }, {
                headers: { 'auth-token': token }
            });
            setMessage(res.data.message);
            fetchOrders();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to review order.');
        }
    };

    const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Pending': return { color: '#ff9800', fontWeight: 'bold' };
            case 'Registered': return { color: '#4CAF50', fontWeight: 'bold' };
            case 'Rejected': return { color: '#f44336', fontWeight: 'bold' };
            case 'Cancelled': return { color: '#f44336', fontWeight: 'bold' };
            default: return { fontWeight: 'bold' };
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
            <h1>Merchandise Orders</h1>
            <button onClick={() => navigate(-1)}>← Back</button>
            <hr />

            {message && <p style={{ color: 'green', fontWeight: 'bold' }}>{message}</p>}
            {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                {['all', 'Pending', 'Registered', 'Rejected'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                            padding: '8px 16px', cursor: 'pointer',
                            backgroundColor: filter === f ? '#333' : '#f0f0f0',
                            color: filter === f ? 'white' : 'black',
                            border: 'none', borderRadius: '5px'
                        }}
                    >
                        {f === 'all' ? `All (${orders.length})` : `${f} (${orders.filter(o => o.status === f).length})`}
                    </button>
                ))}
            </div>

            {filteredOrders.length === 0 ? (
                <p>No orders found.</p>
            ) : (
                filteredOrders.map(order => (
                    <div key={order._id} style={{
                        border: '1px solid #ddd', padding: '15px', marginBottom: '15px', borderRadius: '8px',
                        backgroundColor: order.status === 'Pending' ? '#fff8e1' : 'white'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ margin: '0 0 5px 0' }}>
                                    {order.userId?.firstName} {order.userId?.lastName}
                                    <span style={{ fontSize: '13px', color: 'gray', marginLeft: '10px' }}>
                                        ({order.userId?.email})
                                    </span>
                                </h3>
                                <p style={{ margin: '3px 0' }}>
                                    <strong>Item:</strong> {order.itemName} — ₹{order.itemPrice}
                                </p>
                                <p style={{ margin: '3px 0' }}>
                                    <strong>Variant:</strong> {order.purchaseDetails?.variant || 'N/A'} &nbsp;|&nbsp;
                                    <strong>Qty:</strong> {order.purchaseDetails?.quantity || 1}
                                </p>
                                <p style={{ margin: '3px 0', fontSize: '13px', color: 'gray' }}>
                                    Ticket: {order.ticketId} &nbsp;|&nbsp;
                                    Ordered: {new Date(order.registrationDate).toLocaleDateString()}
                                </p>
                            </div>
                            <span style={getStatusStyle(order.status)}>{order.status}</span>
                        </div>

                        {/* Payment Proof */}
                        {order.paymentProof && (
                            <div style={{ marginTop: '10px' }}>
                                <strong>Payment Proof:</strong>
                                <div style={{ marginTop: '5px' }}>
                                    {order.paymentProof.startsWith('data:image') ? (
                                        <img
                                            src={order.paymentProof}
                                            alt="Payment Proof"
                                            style={{ maxWidth: '300px', maxHeight: '200px', border: '1px solid #ddd', borderRadius: '5px' }}
                                        />
                                    ) : (
                                        <a href={order.paymentProof} target="_blank" rel="noreferrer"
                                            style={{ color: '#1976d2' }}>
                                            View Payment Proof ↗
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {order.status === 'Pending' && (
                            <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => handleReview(order.ticketId, 'approve')}
                                    style={{ backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '8px 20px', cursor: 'pointer', borderRadius: '5px' }}
                                >
                                    Approve Payment
                                </button>
                                <button
                                    onClick={() => handleReview(order.ticketId, 'reject')}
                                    style={{ backgroundColor: '#f44336', color: 'white', border: 'none', padding: '8px 20px', cursor: 'pointer', borderRadius: '5px' }}
                                >
                                    Reject Payment
                                </button>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}

export default MerchandiseOrders;
