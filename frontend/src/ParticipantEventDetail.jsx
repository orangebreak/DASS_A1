import { useState, useEffect } from 'react';
import api from './api';
import { useNavigate, useParams } from 'react-router-dom';

function ParticipantEventDetail() {
    const { id } = useParams();
    const [event, setEvent] = useState(null);
    const [registration, setRegistration] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Merchandise selection
    const [selectedItem, setSelectedItem] = useState('');
    const [selectedVariant, setSelectedVariant] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [paymentProof, setPaymentProof] = useState('');
    const [customFieldResponses, setCustomFieldResponses] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchEventDetails = async () => {
            try {
                // Fetch event details
                const eventRes = await api.get(`/events/${id}/details`, {
                    headers: { 'auth-token': token }
                });
                setEvent(eventRes.data);

                // Check if user is already registered
                try {
                    const regRes = await api.get(`/my-registration/${id}`, {
                        headers: { 'auth-token': token }
                    });
                    setRegistration(regRes.data);
                } catch (err) {
                    // Not registered - that's okay
                    setRegistration(null);
                }

                setLoading(false);
            } catch (err) {
                setError('Failed to load event details.');
                setLoading(false);
            }
        };

        fetchEventDetails();
    }, [id, navigate, token]);

    const isDeadlinePassed = () => {
        if (!event?.regDeadline) return false;
        return new Date() > new Date(event.regDeadline);
    };

    const isEventFull = () => {
        if (!event?.regLimit) return false;
        return (event.registrationCount || 0) >= event.regLimit;
    };

    const isMerchandiseOutOfStock = () => {
        if (event?.eventType !== 'merchandise') return false;
        if (!event.merchandiseItems || event.merchandiseItems.length === 0) return true;
        return event.merchandiseItems.every(item => item.stock <= 0);
    };

    const canRegister = () => {
        if (registration) return false;
        if (isDeadlinePassed()) return false;
        if (event?.eventType === 'normal' && isEventFull()) return false;
        if (event?.eventType === 'merchandise' && isMerchandiseOutOfStock()) return false;
        return true;
    };

    const handlePaymentProofUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPaymentProof(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCustomFieldChange = (fieldName, value) => {
        setCustomFieldResponses(prev => ({ ...prev, [fieldName]: value }));
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setSubmitting(true);

        try {
            const payload = { customFieldResponses };

            if (event.eventType === 'merchandise') {
                if (!selectedItem) {
                    setError('Please select an item.');
                    setSubmitting(false);
                    return;
                }
                if (!paymentProof) {
                    setError('Please upload payment proof.');
                    setSubmitting(false);
                    return;
                }
                payload.merchandiseSelection = {
                    itemId: selectedItem,
                    variant: selectedVariant,
                    color: selectedColor,
                    quantity: quantity
                };
                payload.paymentProof = paymentProof;
            }

            const res = await api.post(`/register-event/${id}`, payload, {
                headers: { 'auth-token': token }
            });

            setMessage(res.data.message);
            setRegistration(res.data.registration);
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed.');
        }
        setSubmitting(false);
    };

    if (loading) {
        return <div style={{ padding: '20px' }}>Loading event details...</div>;
    }

    if (!event) {
        return (
            <div style={{ padding: '20px' }}>
                <h2>Event Not Found</h2>
                <button onClick={() => navigate('/browse')}>Back to Events</button>
            </div>
        );
    }

    const selectedItemData = event.merchandiseItems?.find(item => item._id === selectedItem);

    return (
        <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
            <button onClick={() => navigate('/browse')} style={{ marginBottom: '15px' }}>Back to Events</button>

            {/* Event Header */}
            <div style={{ marginBottom: '25px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                    <h1 style={{ margin: 0 }}>{event.eventName}</h1>
                    <span style={{
                        padding: '5px 15px', borderRadius: '15px', fontSize: '14px', fontWeight: 'bold',
                        backgroundColor: event.eventType === 'merchandise' ? '#f3e5f5' : '#e3f2fd',
                        color: event.eventType === 'merchandise' ? '#9C27B0' : '#1976d2'
                    }}>
                        {event.eventType === 'merchandise' ? 'Merchandise' : 'Normal Event'}
                    </span>
                    <span style={{
                        padding: '5px 15px', borderRadius: '15px', fontSize: '14px',
                        backgroundColor: event.status === 'Published' ? '#e8f5e9' : event.status === 'Ongoing' ? '#fff3e0' : '#f5f5f5',
                        color: event.status === 'Published' ? '#2e7d32' : event.status === 'Ongoing' ? '#e65100' : '#666'
                    }}>
                        {event.status}
                    </span>
                </div>
            </div>

            {message && <p style={{ color: 'green', fontWeight: 'bold', padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '5px' }}>{message}</p>}
            {error && <p style={{ color: 'red', fontWeight: 'bold', padding: '10px', backgroundColor: '#ffebee', borderRadius: '5px' }}>{error}</p>}

            {/* Already Registered Notice */}
            {registration && (
                <div style={{
                    padding: '15px', backgroundColor: '#e8f5e9', border: '2px solid #4CAF50',
                    borderRadius: '8px', marginBottom: '20px'
                }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>You are registered for this event!</h3>
                    <p style={{ margin: '5px 0' }}>Status: <strong>{registration.status}</strong></p>
                    <p style={{ margin: '5px 0' }}>Ticket ID: <code>{registration.ticketId}</code></p>
                    <button
                        onClick={() => navigate(`/ticket/${registration.ticketId}`)}
                        style={{ marginTop: '10px', padding: '8px 20px', cursor: 'pointer' }}
                    >
                        View Ticket
                    </button>
                </div>
            )}

            {/* Event Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                    <h3>Event Information</h3>
                    <p><strong>Description:</strong></p>
                    <p style={{ color: '#555' }}>{event.eventDescription}</p>
                    
                    {event.eligibility && (
                        <p><strong>Eligibility:</strong> {event.eligibility}</p>
                    )}
                    
                    {event.eventTags && event.eventTags.length > 0 && (
                        <div style={{ marginTop: '10px' }}>
                            <strong>Tags:</strong>
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '5px' }}>
                                {event.eventTags.map((tag, idx) => (
                                    <span key={idx} style={{
                                        padding: '3px 10px', backgroundColor: '#e3f2fd',
                                        color: '#1976d2', borderRadius: '10px', fontSize: '12px'
                                    }}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                    <h3>Schedule & Details</h3>
                    <p><strong>Start:</strong> {new Date(event.eventStart).toLocaleString()}</p>
                    <p><strong>End:</strong> {new Date(event.eventEnd).toLocaleString()}</p>
                    <p><strong>Registration Deadline:</strong> {new Date(event.regDeadline).toLocaleString()}</p>
                    
                    {event.eventType === 'normal' && (
                        <>
                            <p><strong>Fee:</strong> ₹{event.regFee || 0}</p>
                            {event.regLimit && (
                                <p><strong>Capacity:</strong> {event.registrationCount || 0} / {event.regLimit}</p>
                            )}
                        </>
                    )}

                    {event.orgId && (
                        <p style={{ marginTop: '15px' }}>
                            <strong>Organizer:</strong>{' '}
                            <span
                                onClick={() => navigate(`/organizer/${event.orgId._id || event.orgId}`)}
                                style={{ color: '#1976d2', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                {event.orgId.orgName || event.orgId.firstName || 'View Profile'}
                            </span>
                        </p>
                    )}
                </div>
            </div>

            {/* Blocking Messages */}
            {isDeadlinePassed() && !registration && (
                <div style={{
                    padding: '15px', backgroundColor: '#ffebee', border: '2px solid #f44336',
                    borderRadius: '8px', marginBottom: '20px', textAlign: 'center'
                }}>
                    <strong style={{ color: '#c62828' }}>Registration Closed</strong>
                    <p style={{ margin: '5px 0', color: '#555' }}>The registration deadline has passed.</p>
                </div>
            )}

            {!isDeadlinePassed() && isEventFull() && event.eventType === 'normal' && !registration && (
                <div style={{
                    padding: '15px', backgroundColor: '#fff3e0', border: '2px solid #ff9800',
                    borderRadius: '8px', marginBottom: '20px', textAlign: 'center'
                }}>
                    <strong style={{ color: '#e65100' }}>Event Full</strong>
                    <p style={{ margin: '5px 0', color: '#555' }}>This event has reached its registration limit.</p>
                </div>
            )}

            {!isDeadlinePassed() && isMerchandiseOutOfStock() && event.eventType === 'merchandise' && !registration && (
                <div style={{
                    padding: '15px', backgroundColor: '#fff3e0', border: '2px solid #ff9800',
                    borderRadius: '8px', marginBottom: '20px', textAlign: 'center'
                }}>
                    <strong style={{ color: '#e65100' }}>Out of Stock</strong>
                    <p style={{ margin: '5px 0', color: '#555' }}>All merchandise items are currently out of stock.</p>
                </div>
            )}

            {/* Registration Form */}
            {canRegister() && (
                <div style={{
                    padding: '25px', backgroundColor: '#fafafa', border: '1px solid #ddd',
                    borderRadius: '8px'
                }}>
                    <h2>{event.eventType === 'merchandise' ? 'Purchase Merchandise' : 'Register for Event'}</h2>

                    <form onSubmit={handleRegister}>
                        {/* Merchandise Item Selection */}
                        {event.eventType === 'merchandise' && event.merchandiseItems && (
                            <div style={{ marginBottom: '20px' }}>
                                <h4>Select Item:</h4>
                                <div style={{ display: 'grid', gap: '10px' }}>
                                    {event.merchandiseItems.map(item => (
                                        <label
                                            key={item._id}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '10px',
                                                padding: '12px', border: selectedItem === item._id ? '2px solid #9C27B0' : '1px solid #ddd',
                                                borderRadius: '8px', cursor: item.stock > 0 ? 'pointer' : 'not-allowed',
                                                backgroundColor: item.stock > 0 ? 'white' : '#f5f5f5',
                                                opacity: item.stock > 0 ? 1 : 0.6
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name="merchandise"
                                                value={item._id}
                                                checked={selectedItem === item._id}
                                                onChange={() => { setSelectedItem(item._id); setSelectedVariant(''); setSelectedColor(''); setQuantity(1); }}
                                                disabled={item.stock <= 0}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <strong>{item.itemName}</strong>
                                                <span style={{ marginLeft: '10px', color: '#9C27B0', fontWeight: 'bold' }}>
                                                    ₹{item.price}
                                                </span>
                                                <span style={{
                                                    marginLeft: '10px', fontSize: '12px',
                                                    color: item.stock > 5 ? 'green' : item.stock > 0 ? '#ff9800' : 'red'
                                                }}>
                                                    {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                                                </span>
                                                {item.purchaseLimit && item.purchaseLimit > 1 && (
                                                    <span style={{ marginLeft: '10px', fontSize: '11px', color: '#666' }}>
                                                        (max {item.purchaseLimit} per person)
                                                    </span>
                                                )}
                                            </div>
                                        </label>
                                    ))}
                                </div>

                                {/* Variant/Size Selection */}
                                {selectedItemData && selectedItemData.variants && selectedItemData.variants.length > 0 && (
                                    <div style={{ marginTop: '15px' }}>
                                        <label><strong>Select Size/Variant:</strong></label>
                                        <select
                                            value={selectedVariant}
                                            onChange={(e) => setSelectedVariant(e.target.value)}
                                            style={{ marginLeft: '10px', padding: '8px' }}
                                        >
                                            <option value="">Select...</option>
                                            {selectedItemData.variants.map((v, idx) => (
                                                <option key={idx} value={v}>{v}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Color Selection */}
                                {selectedItemData && selectedItemData.colors && selectedItemData.colors.length > 0 && (
                                    <div style={{ marginTop: '15px' }}>
                                        <label><strong>Select Color:</strong></label>
                                        <select
                                            value={selectedColor}
                                            onChange={(e) => setSelectedColor(e.target.value)}
                                            style={{ marginLeft: '10px', padding: '8px' }}
                                        >
                                            <option value="">Select...</option>
                                            {selectedItemData.colors.map((c, idx) => (
                                                <option key={idx} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Quantity Selection */}
                                {selectedItemData && (
                                    <div style={{ marginTop: '15px' }}>
                                        <label><strong>Quantity:</strong></label>
                                        <select
                                            value={quantity}
                                            onChange={(e) => setQuantity(Number(e.target.value))}
                                            style={{ marginLeft: '10px', padding: '8px' }}
                                        >
                                            {[...Array(Math.min(selectedItemData.purchaseLimit || 1, selectedItemData.stock))].map((_, idx) => (
                                                <option key={idx + 1} value={idx + 1}>{idx + 1}</option>
                                            ))}
                                        </select>
                                        <span style={{ marginLeft: '15px', fontWeight: 'bold', color: '#9C27B0' }}>
                                            Total: ₹{(selectedItemData.price * quantity).toLocaleString()}
                                        </span>
                                    </div>
                                )}

                                {/* Payment Proof Upload */}
                                <div style={{ marginTop: '20px' }}>
                                    <label><strong>Upload Payment Proof:</strong></label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePaymentProofUpload}
                                        style={{ display: 'block', marginTop: '8px' }}
                                    />
                                    {paymentProof && (
                                        <img
                                            src={paymentProof}
                                            alt="Payment proof"
                                            style={{ maxWidth: '200px', marginTop: '10px', border: '1px solid #ddd', borderRadius: '5px' }}
                                        />
                                    )}
                                    <p style={{ fontSize: '12px', color: '#e65100', marginTop: '5px' }}>
                                        Note: Your order will be pending until the organizer verifies your payment.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Custom Fields */}
                        {event.customFields && event.customFields.length > 0 && (
                            <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                                <h4 style={{ marginTop: 0 }}>Additional Information:</h4>
                                {event.customFields.map((field, idx) => (
                                    <div key={idx} style={{ marginBottom: '15px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px' }}>
                                            <strong>{field.fieldName}</strong>
                                            {field.required && <span style={{ color: 'red' }}> *</span>}
                                            {!field.required && <span style={{ color: '#666', fontSize: '12px' }}> (optional)</span>}
                                        </label>
                                        
                                        {field.fieldType === 'textarea' ? (
                                            <textarea
                                                value={customFieldResponses[field.fieldName] || ''}
                                                onChange={(e) => handleCustomFieldChange(field.fieldName, e.target.value)}
                                                required={field.required}
                                                placeholder={field.placeholder}
                                                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                                                rows={3}
                                            />
                                        ) : field.fieldType === 'dropdown' && field.options ? (
                                            <select
                                                value={customFieldResponses[field.fieldName] || ''}
                                                onChange={(e) => handleCustomFieldChange(field.fieldName, e.target.value)}
                                                required={field.required}
                                                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                                            >
                                                <option value="">Select...</option>
                                                {field.options.map((opt, i) => (
                                                    <option key={i} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        ) : field.fieldType === 'checkbox' ? (
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={customFieldResponses[field.fieldName] === 'true'}
                                                    onChange={(e) => handleCustomFieldChange(field.fieldName, e.target.checked ? 'true' : 'false')}
                                                    required={field.required && customFieldResponses[field.fieldName] !== 'true'}
                                                    style={{ width: '18px', height: '18px' }}
                                                />
                                                <span style={{ color: '#555' }}>{field.placeholder || 'Yes'}</span>
                                            </label>
                                        ) : field.fieldType === 'file' ? (
                                            <input
                                                type="file"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            handleCustomFieldChange(field.fieldName, reader.result);
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                                required={field.required}
                                                style={{ width: '100%', padding: '8px' }}
                                            />
                                        ) : field.fieldType === 'date' ? (
                                            <input
                                                type="date"
                                                value={customFieldResponses[field.fieldName] || ''}
                                                onChange={(e) => handleCustomFieldChange(field.fieldName, e.target.value)}
                                                required={field.required}
                                                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                                            />
                                        ) : field.fieldType === 'email' ? (
                                            <input
                                                type="email"
                                                value={customFieldResponses[field.fieldName] || ''}
                                                onChange={(e) => handleCustomFieldChange(field.fieldName, e.target.value)}
                                                required={field.required}
                                                placeholder={field.placeholder || 'email@example.com'}
                                                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                                            />
                                        ) : field.fieldType === 'number' ? (
                                            <input
                                                type="number"
                                                value={customFieldResponses[field.fieldName] || ''}
                                                onChange={(e) => handleCustomFieldChange(field.fieldName, e.target.value)}
                                                required={field.required}
                                                placeholder={field.placeholder}
                                                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={customFieldResponses[field.fieldName] || ''}
                                                onChange={(e) => handleCustomFieldChange(field.fieldName, e.target.value)}
                                                required={field.required}
                                                placeholder={field.placeholder}
                                                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                padding: '12px 30px', fontSize: '16px', cursor: 'pointer',
                                backgroundColor: event.eventType === 'merchandise' ? '#9C27B0' : '#4CAF50',
                                color: 'white', border: 'none', borderRadius: '5px'
                            }}
                        >
                            {submitting ? 'Processing...' : event.eventType === 'merchandise' ? 'Place Order' : 'Register Now'}
                        </button>
                    </form>
                </div>
            )}

            {/* Forum Link */}
            {(registration || event.status === 'Ongoing') && (
                <div style={{ marginTop: '20px' }}>
                    <button
                        onClick={() => navigate(`/forum/${event._id}`)}
                        style={{ padding: '10px 20px', cursor: 'pointer' }}
                    >
                        View Event Forum
                    </button>
                </div>
            )}
        </div>
    );
}

export default ParticipantEventDetail;
