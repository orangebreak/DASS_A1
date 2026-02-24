import { useState, useEffect } from 'react';
import api from './api';
import { useNavigate } from 'react-router-dom';

function CreateEvent() {
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

    // Merchandise items
    const [merchandiseItems, setMerchandiseItems] = useState([]);

    // Custom form fields
    const [customFields, setCustomFields] = useState([]);

    const [error, setError] = useState('');
    const [createdEventId, setCreatedEventId] = useState(null);
    const [showPostCreateDialog, setShowPostCreateDialog] = useState(false);
    
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) navigate('/login');
    }, [navigate, token]);

    // Merchandise item handlers
    const addMerchItem = () => {
        setMerchandiseItems([...merchandiseItems, { itemName: '', price: 0, variants: '', colors: '', stock: 0, purchaseLimit: 1 }]);
    };
    const updateMerchItem = (index, field, value) => {
        const updated = [...merchandiseItems];
        updated[index][field] = value;
        setMerchandiseItems(updated);
    };
    const removeMerchItem = (index) => {
        setMerchandiseItems(merchandiseItems.filter((_, i) => i !== index));
    };

    // Custom field handlers
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
        try {
            const tagsArray = eventTags.split(',').map(t => t.trim()).filter(t => t);

            // Process merchandise items
            const processedMerch = merchandiseItems.map(item => ({
                itemName: item.itemName,
                price: Number(item.price),
                variants: item.variants.split(',').map(v => v.trim()).filter(v => v),
                colors: item.colors.split(',').map(c => c.trim()).filter(c => c),
                stock: Number(item.stock),
                purchaseLimit: Number(item.purchaseLimit) || 1
            }));

            // Process custom fields
            const processedFields = customFields.map(field => ({
                fieldName: field.fieldName,
                fieldType: field.fieldType,
                required: field.required,
                options: field.fieldType === 'dropdown' ? field.options.split(',').map(o => o.trim()).filter(o => o) : [],
                placeholder: field.placeholder
            }));

            const response = await api.post('/events', {
                eventName, eventDescription, eventType, eligibility,
                regDeadline: new Date(regDeadline),
                eventStart: new Date(eventStart),
                eventEnd: new Date(eventEnd),
                regLimit: Number(regLimit),
                regFee: Number(regFee),
                eventTags: tagsArray,
                merchandiseItems: eventType === 'merchandise' ? processedMerch : [],
                customFields: processedFields
            }, {
                headers: { 'auth-token': token }
            });

            // Show post-create dialog instead of navigating immediately
            setCreatedEventId(response.data._id);
            setShowPostCreateDialog(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create event. Check your inputs.');
        }
    };

    const handlePublishNow = async () => {
        try {
            await api.put(`/events/${createdEventId}`, { status: 'Published' }, {
                headers: { 'auth-token': token }
            });
            navigate('/dashboard');
        } catch (err) {
            setError('Failed to publish event. You can publish it later from the dashboard.');
            setShowPostCreateDialog(false);
        }
    };

    const handleGoToDashboard = () => {
        navigate('/dashboard');
    };

    // Post-Create Dialog
    if (showPostCreateDialog) {
        return (
            <div style={{ padding: '20px', maxWidth: '500px', margin: '100px auto', textAlign: 'center' }}>
                <div style={{ padding: '30px', backgroundColor: '#f5f5f5', borderRadius: '10px', border: '2px solid #4CAF50' }}>
                    <h2>Event Created Successfully!</h2>
                    <p style={{ margin: '20px 0', color: '#555' }}>
                        Your event "<strong>{eventName}</strong>" has been created as a <strong>Draft</strong>.
                    </p>
                    <p style={{ margin: '20px 0', color: '#666' }}>
                        Would you like to publish it now so participants can see and register for it?
                    </p>
                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '25px' }}>
                        <button
                            onClick={handlePublishNow}
                            style={{
                                padding: '12px 30px', fontSize: '16px',
                                backgroundColor: '#4CAF50', color: 'white',
                                border: 'none', borderRadius: '5px', cursor: 'pointer'
                            }}
                        >
                            Publish Now
                        </button>
                        <button
                            onClick={handleGoToDashboard}
                            style={{
                                padding: '12px 30px', fontSize: '16px',
                                backgroundColor: '#666', color: 'white',
                                border: 'none', borderRadius: '5px', cursor: 'pointer'
                            }}
                        >
                            Go to Dashboard
                        </button>
                    </div>
                    <p style={{ marginTop: '20px', fontSize: '13px', color: 'gray' }}>
                        You can edit draft events freely and publish them later from your dashboard.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>Create New Event</h1>
            <button onClick={() => navigate('/dashboard')}>Cancel</button>
            <hr />

            {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

            <form onSubmit={handleSubmit}>
                {/* Basic Fields */}
                <div>
                    <label>Event Name: </label>
                    <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} required style={{ width: '100%' }} />
                </div>
                <br />
                <div>
                    <label>Description: </label>
                    <textarea value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} required style={{ width: '100%' }} rows="3" />
                </div>
                <br />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                        <label>Event Type: </label>
                        <select value={eventType} onChange={(e) => setEventType(e.target.value)} style={{ width: '100%' }}>
                            <option value="normal">Normal</option>
                            <option value="merchandise">Merchandise</option>
                        </select>
                    </div>
                    <div>
                        <label>Eligibility: </label>
                        <input type="text" value={eligibility} onChange={e => setEligibility(e.target.value)} placeholder="e.g. IIIT Students Only" style={{ width: '100%' }} />
                    </div>
                    <div>
                        <label>Registration Deadline: </label>
                        <input type="datetime-local" value={regDeadline} onChange={(e) => setRegDeadline(e.target.value)} required style={{ width: '100%' }} />
                    </div>
                    <div>
                        <label>Event Start: </label>
                        <input type="datetime-local" value={eventStart} onChange={(e) => setEventStart(e.target.value)} required style={{ width: '100%' }} />
                    </div>
                    <div>
                        <label>Event End: </label>
                        <input type="datetime-local" value={eventEnd} onChange={(e) => setEventEnd(e.target.value)} required style={{ width: '100%' }} />
                    </div>
                    <div>
                        <label>Registration Limit: </label>
                        <input type="number" value={regLimit} onChange={(e) => setRegLimit(e.target.value)} min="0" style={{ width: '100%' }} />
                    </div>
                    <div>
                        <label>Registration Fee (₹): </label>
                        <input type="number" value={regFee} onChange={(e) => setRegFee(e.target.value)} min="0" style={{ width: '100%' }} />
                    </div>
                    <div>
                        <label>Tags (comma separated): </label>
                        <input type="text" value={eventTags} onChange={e => setEventTags(e.target.value)} placeholder="e.g. AI, Workshop, Tech" style={{ width: '100%' }} />
                    </div>
                </div>

                {/* Merchandise Items Section */}
                {eventType === 'merchandise' && (
                    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f9f0ff', border: '1px solid #ce93d8', borderRadius: '8px' }}>
                        <h3>Merchandise Items</h3>
                        {merchandiseItems.map((item, idx) => (
                            <div key={idx} style={{ padding: '15px', backgroundColor: 'white', borderRadius: '8px', marginBottom: '15px', border: '1px solid #e1bee7' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <strong>Item {idx + 1}</strong>
                                    <button type="button" onClick={() => removeMerchItem(idx)} style={{ color: 'red', cursor: 'pointer', border: 'none', background: 'none', fontSize: '18px' }}>✕</button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px' }}>Item Name</label>
                                        <input type="text" value={item.itemName} onChange={e => updateMerchItem(idx, 'itemName', e.target.value)} style={{ width: '100%' }} required />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px' }}>Price (₹)</label>
                                        <input type="number" value={item.price} onChange={e => updateMerchItem(idx, 'price', e.target.value)} min="0" style={{ width: '100%' }} required />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px' }}>Sizes/Variants (comma sep.)</label>
                                        <input type="text" value={item.variants} onChange={e => updateMerchItem(idx, 'variants', e.target.value)} placeholder="S, M, L, XL" style={{ width: '100%' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px' }}>Colors (comma sep.)</label>
                                        <input type="text" value={item.colors} onChange={e => updateMerchItem(idx, 'colors', e.target.value)} placeholder="Red, Blue, Black" style={{ width: '100%' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px' }}>Stock Quantity</label>
                                        <input type="number" value={item.stock} onChange={e => updateMerchItem(idx, 'stock', e.target.value)} min="0" style={{ width: '100%' }} required />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px' }}>Purchase Limit per Participant</label>
                                        <input type="number" value={item.purchaseLimit} onChange={e => updateMerchItem(idx, 'purchaseLimit', e.target.value)} min="1" style={{ width: '100%' }} />
                                        <p style={{ fontSize: '10px', color: 'gray', margin: '2px 0 0 0' }}>Max quantity one person can order</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={addMerchItem} style={{ cursor: 'pointer' }}>+ Add Merchandise Item</button>
                    </div>
                )}

                {/* Custom Form Builder Section */}
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e8f5e9', border: '1px solid #81c784', borderRadius: '8px' }}>
                    <h3>Custom Registration Form Fields</h3>
                    <p style={{ fontSize: '13px', color: 'gray' }}>Add extra fields that participants must fill out when registering.</p>
                    <p style={{ fontSize: '12px', color: '#e65100', backgroundColor: '#fff3e0', padding: '8px', borderRadius: '4px', margin: '10px 0' }}>
                        <strong>Note:</strong> Custom form fields cannot be modified after the first registration. Plan your form carefully!
                    </p>

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
                                    <option value="file">File Upload</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '12px' }}>Required?</label>
                                <select value={field.required ? 'yes' : 'no'} onChange={e => updateCustomField(idx, 'required', e.target.value === 'yes')} style={{ width: '100%' }}>
                                    <option value="no">No</option>
                                    <option value="yes">Yes</option>
                                </select>
                            </div>
                            {field.fieldType === 'dropdown' && (
                                <div>
                                    <label style={{ fontSize: '12px' }}>Options (comma sep.)</label>
                                    <input type="text" value={field.options} onChange={e => updateCustomField(idx, 'options', e.target.value)} placeholder="Opt1, Opt2" style={{ width: '100%' }} />
                                </div>
                            )}
                            {field.fieldType !== 'dropdown' && (
                                <div>
                                    <label style={{ fontSize: '12px' }}>Placeholder</label>
                                    <input type="text" value={field.placeholder} onChange={e => updateCustomField(idx, 'placeholder', e.target.value)} style={{ width: '100%' }} />
                                </div>
                            )}
                            <button type="button" onClick={() => removeCustomField(idx)} style={{ color: 'red', cursor: 'pointer' }}>✕</button>
                        </div>
                    ))}
                    <button type="button" onClick={addCustomField} style={{ cursor: 'pointer' }}>+ Add Custom Field</button>
                </div>

                <br />
                <button type="submit" style={{ padding: '12px 25px', fontSize: '16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '5px' }}>
                    Create Event
                </button>
            </form>
        </div>
    );
}

export default CreateEvent;