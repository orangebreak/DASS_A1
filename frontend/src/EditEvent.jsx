import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

function EditEvent() {
    const { id } = useParams();
    const [eventName, setEventName] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [eventType, setEventType] = useState('normal');
    const [eligibility, setEligibility] = useState('');
    const [regDeadline, setRegDeadline] = useState('');
    const [eventStart, setEventStart] = useState('');
    const [eventEnd, setEventEnd] = useState('');
    const [regLimit, setRegLimit] = useState('');
    const [regFee, setRegFee] = useState('');
    const [eventTags, setEventTags] = useState('');
    const [status, setStatus] = useState('');
    const [hasRegistrations, setHasRegistrations] = useState(false);

    // Merchandise items
    const [merchandiseItems, setMerchandiseItems] = useState([]);

    // Custom form fields
    const [customFields, setCustomFields] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        
        const fetchEvent = async () => {
            try {
                const res = await axios.get(`http://localhost:3001/events/${id}/analytics`, {
                    headers: { 'auth-token': token }
                });
                const event = res.data;
                
                setEventName(event.eventName || '');
                setEventDescription(event.eventDescription || '');
                setEventType(event.eventType || 'normal');
                setEligibility(event.eligibility || '');
                setRegDeadline(event.regDeadline ? new Date(event.regDeadline).toISOString().slice(0, 16) : '');
                setEventStart(event.eventStart ? new Date(event.eventStart).toISOString().slice(0, 16) : '');
                setEventEnd(event.eventEnd ? new Date(event.eventEnd).toISOString().slice(0, 16) : '');
                setRegLimit(event.regLimit || '');
                setRegFee(event.regFee || 0);
                setEventTags(event.eventTags ? event.eventTags.join(', ') : '');
                setStatus(event.status || 'Draft');
                setHasRegistrations(event.totalRegistrations > 0);
                
                // Process merchandise items
                if (event.merchandiseItems) {
                    setMerchandiseItems(event.merchandiseItems.map(item => ({
                        itemName: item.itemName,
                        price: item.price,
                        variants: item.variants?.join(', ') || '',
                        stock: item.stock
                    })));
                }
                
                // Process custom fields
                if (event.customFields) {
                    setCustomFields(event.customFields.map(field => ({
                        fieldName: field.fieldName,
                        fieldType: field.fieldType,
                        required: field.required,
                        options: field.options?.join(', ') || '',
                        placeholder: field.placeholder || ''
                    })));
                }
                
                setLoading(false);
            } catch (err) {
                setError('Failed to load event details.');
                setLoading(false);
            }
        };
        
        fetchEvent();
    }, [id, navigate, token]);

    // Determine what can be edited based on status
    const isDraft = status === 'Draft';
    const isPublished = status === 'Published';
    const isOngoingOrCompleted = status === 'Ongoing' || status === 'Completed';

    // Merchandise item handlers
    const addMerchItem = () => {
        setMerchandiseItems([...merchandiseItems, { itemName: '', price: 0, variants: '', stock: 0 }]);
    };
    const updateMerchItem = (index, field, value) => {
        const updated = [...merchandiseItems];
        updated[index][field] = value;
        setMerchandiseItems(updated);
    };
    const removeMerchItem = (index) => {
        setMerchandiseItems(merchandiseItems.filter((_, i) => i !== index));
    };

    // Custom field handlers (only for drafts without registrations)
    const addCustomField = () => {
        setCustomFields([...customFields, {
            fieldName: '', fieldType: 'text', required: false, options: '', placeholder: ''
        }]);
    };
    const updateCustomField = (index, field, value) => {
        const updated = [...customFields];
        updated[index][field] = value;
        setCustomFields(updated);
    };
    const removeCustomField = (index) => {
        setCustomFields(customFields.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        
        try {
            const tagsArray = eventTags.split(',').map(t => t.trim()).filter(t => t);
            
            // Build update payload based on what's allowed
            const updatePayload = {};
            
            if (isDraft) {
                // Draft - can edit everything
                updatePayload.eventName = eventName;
                updatePayload.eventDescription = eventDescription;
                updatePayload.eventType = eventType;
                updatePayload.eligibility = eligibility;
                updatePayload.regDeadline = new Date(regDeadline);
                updatePayload.eventStart = new Date(eventStart);
                updatePayload.eventEnd = new Date(eventEnd);
                updatePayload.regLimit = Number(regLimit);
                updatePayload.regFee = Number(regFee);
                updatePayload.eventTags = tagsArray;
                
                // Process merchandise items
                if (eventType === 'merchandise') {
                    updatePayload.merchandiseItems = merchandiseItems.map(item => ({
                        itemName: item.itemName,
                        price: Number(item.price),
                        variants: item.variants.split(',').map(v => v.trim()).filter(v => v),
                        stock: Number(item.stock)
                    }));
                }
                
                // Process custom fields (only if no registrations)
                if (!hasRegistrations) {
                    updatePayload.customFields = customFields.map(field => ({
                        fieldName: field.fieldName,
                        fieldType: field.fieldType,
                        required: field.required,
                        options: field.fieldType === 'dropdown' ? field.options.split(',').map(o => o.trim()).filter(o => o) : [],
                        placeholder: field.placeholder
                    }));
                }
            } else if (isPublished) {
                // Published - limited edits: description, extend deadline, increase limit
                updatePayload.eventDescription = eventDescription;
                
                // Can only extend deadline (new date must be after current)
                const newDeadline = new Date(regDeadline);
                updatePayload.regDeadline = newDeadline;
                
                // Can only increase limit
                const newLimit = Number(regLimit);
                updatePayload.regLimit = newLimit;
            }
            // Ongoing/Completed - no content edits allowed (only status changes via controls)
            
            await axios.put(`http://localhost:3001/events/${id}`, updatePayload, {
                headers: { 'auth-token': token }
            });
            
            setMessage('Event updated successfully!');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update event.');
        }
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading event...</div>;

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>Edit Event</h1>
            <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
            <hr />

            {/* Status Info Box */}
            <div style={{ 
                padding: '15px', marginBottom: '20px', borderRadius: '8px',
                backgroundColor: isDraft ? '#e8f5e9' : isPublished ? '#fff3e0' : '#ffebee',
                border: `1px solid ${isDraft ? '#81c784' : isPublished ? '#ffb74d' : '#ef5350'}`
            }}>
                <strong>Event Status: {status}</strong>
                <div style={{ marginTop: '8px', fontSize: '14px', color: '#555' }}>
                    {isDraft && 'Draft events can be fully edited. Changes will be saved when you submit.'}
                    {isPublished && 'Published events have limited editing. You can update description, extend deadline, and increase registration limit.'}
                    {isOngoingOrCompleted && 'Ongoing/Completed events cannot be edited. You can only change the status from the event dashboard.'}
                </div>
            </div>

            {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}
            {message && <p style={{ color: 'green', fontWeight: 'bold' }}>{message}</p>}

            {isOngoingOrCompleted ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ color: '#666' }}>This event cannot be edited as it is {status.toLowerCase()}.</p>
                    <button 
                        onClick={() => navigate(`/organizer/event/${id}`)}
                        style={{ padding: '10px 20px', cursor: 'pointer', marginTop: '10px' }}
                    >
                        Go to Event Dashboard
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    {/* Basic Fields */}
                    <div style={{ marginBottom: '15px' }}>
                        <label>Event Name: </label>
                        <input 
                            type="text" 
                            value={eventName} 
                            onChange={(e) => setEventName(e.target.value)} 
                            required 
                            disabled={!isDraft}
                            style={{ width: '100%', padding: '8px', backgroundColor: !isDraft ? '#f5f5f5' : 'white' }} 
                        />
                    </div>
                    
                    <div style={{ marginBottom: '15px' }}>
                        <label>Description: </label>
                        <textarea 
                            value={eventDescription} 
                            onChange={(e) => setEventDescription(e.target.value)} 
                            required 
                            style={{ width: '100%', padding: '8px' }} 
                            rows="4" 
                        />
                        {isPublished && <p style={{ fontSize: '12px', color: 'gray' }}>Description can be updated for published events.</p>}
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <label>Event Type: </label>
                            <select 
                                value={eventType} 
                                onChange={(e) => setEventType(e.target.value)} 
                                disabled={!isDraft}
                                style={{ width: '100%', padding: '8px', backgroundColor: !isDraft ? '#f5f5f5' : 'white' }}
                            >
                                <option value="normal">Normal</option>
                                <option value="merchandise">Merchandise</option>
                            </select>
                        </div>
                        <div>
                            <label>Eligibility: </label>
                            <input 
                                type="text" 
                                value={eligibility} 
                                onChange={e => setEligibility(e.target.value)} 
                                placeholder="e.g. IIIT Students Only"
                                disabled={!isDraft}
                                style={{ width: '100%', padding: '8px', backgroundColor: !isDraft ? '#f5f5f5' : 'white' }} 
                            />
                        </div>
                        <div>
                            <label>Registration Deadline: </label>
                            <input 
                                type="datetime-local" 
                                value={regDeadline} 
                                onChange={(e) => setRegDeadline(e.target.value)} 
                                required 
                                style={{ width: '100%', padding: '8px' }} 
                            />
                            {isPublished && <p style={{ fontSize: '12px', color: 'gray' }}>Can extend deadline only.</p>}
                        </div>
                        <div>
                            <label>Event Start: </label>
                            <input 
                                type="datetime-local" 
                                value={eventStart} 
                                onChange={(e) => setEventStart(e.target.value)} 
                                required 
                                disabled={!isDraft}
                                style={{ width: '100%', padding: '8px', backgroundColor: !isDraft ? '#f5f5f5' : 'white' }} 
                            />
                        </div>
                        <div>
                            <label>Event End: </label>
                            <input 
                                type="datetime-local" 
                                value={eventEnd} 
                                onChange={(e) => setEventEnd(e.target.value)} 
                                required 
                                disabled={!isDraft}
                                style={{ width: '100%', padding: '8px', backgroundColor: !isDraft ? '#f5f5f5' : 'white' }} 
                            />
                        </div>
                        <div>
                            <label>Registration Limit: </label>
                            <input 
                                type="number" 
                                value={regLimit} 
                                onChange={(e) => setRegLimit(e.target.value)} 
                                min="0" 
                                style={{ width: '100%', padding: '8px' }} 
                            />
                            {isPublished && <p style={{ fontSize: '12px', color: 'gray' }}>Can increase limit only.</p>}
                        </div>
                        <div>
                            <label>Registration Fee: </label>
                            <input 
                                type="number" 
                                value={regFee} 
                                onChange={(e) => setRegFee(e.target.value)} 
                                min="0" 
                                disabled={!isDraft}
                                style={{ width: '100%', padding: '8px', backgroundColor: !isDraft ? '#f5f5f5' : 'white' }} 
                            />
                        </div>
                        <div>
                            <label>Tags (comma separated): </label>
                            <input 
                                type="text" 
                                value={eventTags} 
                                onChange={e => setEventTags(e.target.value)} 
                                placeholder="e.g. AI, Workshop, Tech"
                                disabled={!isDraft}
                                style={{ width: '100%', padding: '8px', backgroundColor: !isDraft ? '#f5f5f5' : 'white' }} 
                            />
                        </div>
                    </div>

                    {/* Merchandise Items Section - Draft Only */}
                    {eventType === 'merchandise' && isDraft && (
                        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f9f0ff', border: '1px solid #ce93d8', borderRadius: '8px' }}>
                            <h3>Merchandise Items</h3>
                            {merchandiseItems.map((item, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr auto', gap: '8px', marginBottom: '10px', alignItems: 'end' }}>
                                    <div>
                                        <label style={{ fontSize: '12px' }}>Item Name</label>
                                        <input type="text" value={item.itemName} onChange={e => updateMerchItem(idx, 'itemName', e.target.value)} style={{ width: '100%' }} required />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px' }}>Price</label>
                                        <input type="number" value={item.price} onChange={e => updateMerchItem(idx, 'price', e.target.value)} min="0" style={{ width: '100%' }} required />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px' }}>Variants</label>
                                        <input type="text" value={item.variants} onChange={e => updateMerchItem(idx, 'variants', e.target.value)} placeholder="S, M, L, XL" style={{ width: '100%' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px' }}>Stock</label>
                                        <input type="number" value={item.stock} onChange={e => updateMerchItem(idx, 'stock', e.target.value)} min="0" style={{ width: '100%' }} required />
                                    </div>
                                    <button type="button" onClick={() => removeMerchItem(idx)} style={{ color: 'red', cursor: 'pointer', padding: '5px 10px' }}>X</button>
                                </div>
                            ))}
                            <button type="button" onClick={addMerchItem} style={{ cursor: 'pointer', padding: '8px 16px' }}>+ Add Item</button>
                        </div>
                    )}

                    {/* Custom Form Fields Section - Draft Only and No Registrations */}
                    {isDraft && !hasRegistrations && (
                        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f5e9', border: '1px solid #81c784', borderRadius: '8px' }}>
                            <h3>Custom Registration Form Fields</h3>
                            <p style={{ fontSize: '13px', color: 'gray' }}>Add extra fields for participant registration.</p>

                            {customFields.map((field, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '8px', marginBottom: '10px', alignItems: 'end' }}>
                                    <div>
                                        <label style={{ fontSize: '12px' }}>Field Name</label>
                                        <input type="text" value={field.fieldName} onChange={e => updateCustomField(idx, 'fieldName', e.target.value)} placeholder="e.g. T-Shirt Size" style={{ width: '100%' }} required />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px' }}>Type</label>
                                        <select value={field.fieldType} onChange={e => updateCustomField(idx, 'fieldType', e.target.value)} style={{ width: '100%' }}>
                                            <option value="text">Text</option>
                                            <option value="textarea">Text Area</option>
                                            <option value="number">Number</option>
                                            <option value="email">Email</option>
                                            <option value="date">Date</option>
                                            <option value="dropdown">Dropdown</option>
                                            <option value="checkbox">Checkbox</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px' }}>Required?</label>
                                        <select value={field.required ? 'yes' : 'no'} onChange={e => updateCustomField(idx, 'required', e.target.value === 'yes')} style={{ width: '100%' }}>
                                            <option value="no">No</option>
                                            <option value="yes">Yes</option>
                                        </select>
                                    </div>
                                    {field.fieldType === 'dropdown' ? (
                                        <div>
                                            <label style={{ fontSize: '12px' }}>Options</label>
                                            <input type="text" value={field.options} onChange={e => updateCustomField(idx, 'options', e.target.value)} placeholder="Opt1, Opt2" style={{ width: '100%' }} />
                                        </div>
                                    ) : (
                                        <div>
                                            <label style={{ fontSize: '12px' }}>Placeholder</label>
                                            <input type="text" value={field.placeholder} onChange={e => updateCustomField(idx, 'placeholder', e.target.value)} style={{ width: '100%' }} />
                                        </div>
                                    )}
                                    <button type="button" onClick={() => removeCustomField(idx)} style={{ color: 'red', cursor: 'pointer', padding: '5px 10px' }}>X</button>
                                </div>
                            ))}
                            <button type="button" onClick={addCustomField} style={{ cursor: 'pointer', padding: '8px 16px' }}>+ Add Field</button>
                        </div>
                    )}

                    {hasRegistrations && isDraft && (
                        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fff3e0', borderRadius: '5px' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#e65100' }}>
                                Note: Custom form fields cannot be edited because this event already has registrations.
                            </p>
                        </div>
                    )}

                    <div style={{ marginTop: '25px' }}>
                        <button 
                            type="submit" 
                            style={{ 
                                padding: '12px 30px', fontSize: '16px', 
                                backgroundColor: '#4CAF50', color: 'white', 
                                border: 'none', cursor: 'pointer', borderRadius: '5px' 
                            }}
                        >
                            Save Changes
                        </button>
                        <button 
                            type="button"
                            onClick={() => navigate(`/organizer/event/${id}`)}
                            style={{ 
                                padding: '12px 30px', fontSize: '16px', marginLeft: '10px',
                                backgroundColor: '#666', color: 'white', 
                                border: 'none', cursor: 'pointer', borderRadius: '5px' 
                            }}
                        >
                            View Event Dashboard
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

export default EditEvent;
