import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function BrowseEvents() {
    const [events, setEvents] = useState([]);
    const [trendingEvents, setTrendingEvents] = useState([]);
    const [message, setMessage] = useState('');

    // Filter states
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [eligibilityFilter, setEligibilityFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [followedOnly, setFollowedOnly] = useState(false);

    // Merchandise registration modal
    const [merchModal, setMerchModal] = useState(null); // event object when open
    const [selectedItem, setSelectedItem] = useState('');
    const [selectedVariant, setSelectedVariant] = useState('');
    const [paymentProof, setPaymentProof] = useState('');
    const [merchLoading, setMerchLoading] = useState(false);

    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    // Fetch trending events
    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        const fetchTrending = async () => {
            try {
                const res = await axios.get('http://localhost:3001/events-trending', {
                    headers: { 'auth-token': token }
                });
                setTrendingEvents(res.data);
            } catch (err) {
                console.error('Trending fetch error:', err);
            }
        };
        fetchTrending();
    }, [navigate, token]);

    // Fetch events with filters
    const fetchEvents = async () => {
        try {
            const params = {};
            if (search) params.search = search;
            if (typeFilter) params.type = typeFilter;
            if (eligibilityFilter) params.eligibility = eligibilityFilter;
            if (dateFrom) params.dateFrom = dateFrom;
            if (dateTo) params.dateTo = dateTo;
            if (followedOnly) params.followedOnly = 'true';

            const response = await axios.get('http://localhost:3001/events', {
                headers: { 'auth-token': token },
                params
            });

            // only keep events that are 'Published' or 'Ongoing'
            const publicEvents = response.data.filter(event =>
                event.status === 'Published' || event.status === 'Ongoing'
            );

            setEvents(publicEvents);
        } catch (err) {
            setMessage('Failed to load events.');
        }
    };

    useEffect(() => {
        if (!token) return;
        fetchEvents();
    }, [navigate, token]);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchEvents();
    };

    const handleRegister = async (eventId, eventType, eventData = null) => {
        // For merchandise events, open modal
        if (eventType === 'merchandise' && eventData) {
            setMerchModal(eventData);
            setSelectedItem('');
            setSelectedVariant('');
            setPaymentProof('');
            return;
        }
        
        try {
            const response = await axios.post(`http://localhost:3001/register-event/${eventId}`, {}, {
                headers: { 'auth-token': token }
            });
            setMessage(response.data.message);
        } catch (err) {
            setMessage(err.response?.data?.error || 'Registration failed');
        }
    };

    const handlePaymentProofUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPaymentProof(reader.result); // Base64 string
            };
            reader.readAsDataURL(file);
        }
    };

    const handleMerchSubmit = async () => {
        if (!selectedItem || !paymentProof) {
            setMessage('Please select an item and upload payment proof.');
            return;
        }

        setMerchLoading(true);
        try {
            const response = await axios.post(`http://localhost:3001/register-event/${merchModal._id}`, {
                merchandiseSelection: {
                    itemId: selectedItem,
                    variant: selectedVariant,
                    quantity: 1
                },
                paymentProof: paymentProof
            }, {
                headers: { 'auth-token': token }
            });
            setMessage(response.data.message);
            setMerchModal(null);
        } catch (err) {
            setMessage(err.response?.data?.error || 'Registration failed');
        }
        setMerchLoading(false);
    };

    const clearFilters = () => {
        setSearch(''); setTypeFilter(''); setEligibilityFilter('');
        setDateFrom(''); setDateTo(''); setFollowedOnly(false);
        setTimeout(() => fetchEvents(), 0);
    };

    return (
        <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
            <h1>Browse Events</h1>
            <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
            <hr />

            {/* Search Bar */}
            <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search events (supports partial & fuzzy matching)..."
                        style={{ flexGrow: 1, padding: '10px', fontSize: '16px', borderRadius: '5px', border: '1px solid #ddd' }}
                    />
                    <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#1976d2', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                        Search
                    </button>
                </div>
            </form>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                <div>
                    <label style={{ fontSize: '13px' }}>Event Type:</label><br />
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '5px' }}>
                        <option value="">All Types</option>
                        <option value="normal">Normal</option>
                        <option value="merchandise">Merchandise</option>
                    </select>
                </div>
                <div>
                    <label style={{ fontSize: '13px' }}>Eligibility:</label><br />
                    <input type="text" value={eligibilityFilter} onChange={e => setEligibilityFilter(e.target.value)}
                        placeholder="e.g. IIIT" style={{ padding: '5px', width: '120px' }} />
                </div>
                <div>
                    <label style={{ fontSize: '13px' }}>From Date:</label><br />
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: '5px' }} />
                </div>
                <div>
                    <label style={{ fontSize: '13px' }}>To Date:</label><br />
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: '5px' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={followedOnly} onChange={e => setFollowedOnly(e.target.checked)} />
                        Followed Clubs Only
                    </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px' }}>
                    <button onClick={handleSearch} style={{ padding: '5px 15px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '3px' }}>
                        Apply Filters
                    </button>
                    <button onClick={clearFilters} style={{ padding: '5px 15px', cursor: 'pointer' }}>
                        Clear
                    </button>
                </div>
            </div>

            {message && <p style={{ color: 'blue', fontWeight: 'bold' }}>{message}</p>}

            {/* Trending Section */}
            {trendingEvents.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                    <h2>Trending Events</h2>
                    <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
                        {trendingEvents.map(event => (
                            <div key={event._id} style={{
                                minWidth: '250px', border: '2px solid #ff9800', borderRadius: '10px',
                                padding: '15px', backgroundColor: '#fff8e1'
                            }}>
                                <h4 style={{ margin: '0 0 5px 0' }}>{event.eventName}</h4>
                                <p style={{ margin: '2px 0', fontSize: '13px', color: '#555' }}>
                                    {event.eventDescription?.substring(0, 80)}...
                                </p>
                                <p style={{ margin: '2px 0', fontSize: '12px', color: 'gray' }}>
                                    {event.orgId?.orgName} | {event.recentRegCount} recent registrations
                                </p>
                                <button
                                    onClick={() => handleRegister(event._id, event.eventType, event)}
                                    style={{ marginTop: '5px', padding: '5px 10px', cursor: 'pointer' }}
                                >
                                    {event.eventType === 'merchandise' ? 'Order' : 'Register'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* All Events */}
            <h2>All Events ({events.length})</h2>
            {events.map(event => (
                <div key={event._id} style={{ 
                    border: event._preferenceScore > 0 ? '2px solid #4CAF50' : '1px solid #ddd', 
                    margin: '10px 0', padding: '15px', borderRadius: '8px',
                    backgroundColor: event._preferenceScore > 0 ? '#f1f8e9' : 'white'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h3 style={{ margin: '0 0 5px 0' }}>
                                {event.eventName}
                                <span style={{
                                    marginLeft: '10px', fontSize: '12px', padding: '2px 8px',
                                    borderRadius: '10px', color: 'white',
                                    backgroundColor: event.eventType === 'normal' ? '#2196F3' : '#9C27B0'
                                }}>
                                    {event.eventType}
                                </span>
                                {event._preferenceScore >= 20 && (
                                    <span style={{
                                        marginLeft: '5px', fontSize: '11px', padding: '2px 8px',
                                        borderRadius: '10px', backgroundColor: '#4CAF50', color: 'white', fontWeight: 'bold'
                                    }}>
                                        Following
                                    </span>
                                )}
                                {event._preferenceScore > 0 && event._preferenceScore < 20 && (
                                    <span style={{
                                        marginLeft: '5px', fontSize: '11px', padding: '2px 8px',
                                        borderRadius: '10px', backgroundColor: '#ff9800', color: 'white', fontWeight: 'bold'
                                    }}>
                                        Recommended
                                    </span>
                                )}
                            </h3>
                            <p style={{ margin: '3px 0', color: '#555' }}>{event.eventDescription}</p>
                            <p style={{ margin: '3px 0', fontSize: '13px', color: 'gray' }}>
                                {new Date(event.eventStart).toLocaleDateString()} — {new Date(event.eventEnd).toLocaleDateString()}
                                &nbsp;&nbsp;|&nbsp;&nbsp;₹{event.regFee}
                                &nbsp;&nbsp;|&nbsp;&nbsp;{event.orgId?.orgName || event.orgId?.firstName}
                            </p>
                            {event.eligibility && (
                                <p style={{ margin: '3px 0', fontSize: '12px' }}>
                                    <strong>Eligibility:</strong> {event.eligibility}
                                </p>
                            )}
                            {event.eventTags && event.eventTags.length > 0 && (
                                <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                    {event.eventTags.map((tag, idx) => (
                                        <span key={idx} style={{
                                            backgroundColor: '#e3f2fd', color: '#1976d2',
                                            padding: '2px 8px', borderRadius: '10px', fontSize: '11px'
                                        }}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {event._preferenceScore > 0 && (
                                <span style={{ fontSize: '11px', color: '#ff9800' }}>
                                    Recommended for you
                                </span>
                            )}
                        </div>
                    </div>
                    {(event.status === 'Published' || event.status === 'Ongoing') && (
                        <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                            <button onClick={() => navigate(`/event/${event._id}`)} style={{ padding: '8px 16px', cursor: 'pointer' }}>
                                View Details
                            </button>
                            <button onClick={() => handleRegister(event._id, event.eventType, event)} style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}>
                                {event.eventType === 'merchandise' ? 'Order Merchandise' : 'Register'}
                            </button>
                        </div>
                    )}
                </div>
            ))}

            {events.length === 0 && <p>No events found matching your criteria.</p>}

            {/* Merchandise Registration Modal */}
            {merchModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white', padding: '30px', borderRadius: '10px',
                        maxWidth: '500px', width: '90%', maxHeight: '80vh', overflowY: 'auto'
                    }}>
                        <h2>Order Merchandise</h2>
                        <h3 style={{ color: '#9C27B0' }}>{merchModal.eventName}</h3>
                        
                        {/* Item Selection */}
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                                Select Item: *
                            </label>
                            <select
                                value={selectedItem}
                                onChange={e => {
                                    setSelectedItem(e.target.value);
                                    setSelectedVariant('');
                                }}
                                style={{ width: '100%', padding: '10px', fontSize: '14px' }}
                            >
                                <option value="">-- Select an item --</option>
                                {merchModal.merchandiseItems?.map(item => (
                                    <option key={item._id} value={item._id}>
                                        {item.itemName} — ₹{item.price} ({item.stock} in stock)
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Variant Selection */}
                        {selectedItem && (() => {
                            const item = merchModal.merchandiseItems.find(m => m._id === selectedItem);
                            if (item && item.variants && item.variants.length > 0) {
                                return (
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                                            Select Variant/Size:
                                        </label>
                                        <select
                                            value={selectedVariant}
                                            onChange={e => setSelectedVariant(e.target.value)}
                                            style={{ width: '100%', padding: '10px', fontSize: '14px' }}
                                        >
                                            <option value="">-- Select variant --</option>
                                            {item.variants.map((v, idx) => (
                                                <option key={idx} value={v}>{v}</option>
                                            ))}
                                        </select>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* Payment Proof Upload */}
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                                Upload Payment Proof: *
                            </label>
                            <p style={{ fontSize: '12px', color: 'gray', marginBottom: '5px' }}>
                                Please upload a screenshot/photo of your payment transaction.
                            </p>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePaymentProofUpload}
                                style={{ width: '100%', padding: '5px' }}
                            />
                            {paymentProof && (
                                <div style={{ marginTop: '10px' }}>
                                    <img
                                        src={paymentProof}
                                        alt="Payment proof preview"
                                        style={{ maxWidth: '200px', maxHeight: '150px', border: '1px solid #ddd', borderRadius: '5px' }}
                                    />
                                </div>
                            )}
                        </div>

                        <p style={{ fontSize: '12px', color: '#e65100', backgroundColor: '#fff3e0', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
                            Note: Your order will be <strong>pending</strong> until the organizer verifies your payment.
                            You'll receive your ticket/QR code once approved.
                        </p>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setMerchModal(null)}
                                style={{ padding: '10px 20px', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleMerchSubmit}
                                disabled={merchLoading || !selectedItem || !paymentProof}
                                style={{
                                    padding: '10px 20px', cursor: 'pointer',
                                    backgroundColor: (!selectedItem || !paymentProof) ? '#ccc' : '#9C27B0',
                                    color: 'white', border: 'none', borderRadius: '5px'
                                }}
                            >
                                {merchLoading ? 'Submitting...' : 'Submit Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BrowseEvents;