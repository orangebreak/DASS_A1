import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CATEGORY_OPTIONS = [
    'Technology', 'AI/ML', 'Web Development', 'Mobile Development', 
    'Cybersecurity', 'Data Science', 'Gaming', 'Robotics',
    'Music', 'Dance', 'Drama', 'Art', 'Photography', 'Film',
    'Sports', 'Fitness', 'Chess', 'E-Sports',
    'Entrepreneurship', 'Finance', 'Marketing', 'Social Work',
    'Science', 'Mathematics', 'Literature', 'Languages',
    'Astronomy', 'Environment', 'Health', 'Food'
];

function AdminManageClubs() {
    const [organizers, setOrganizers] = useState([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [viewCredentials, setViewCredentials] = useState(null);
    const [deleteOptions, setDeleteOptions] = useState(null);

    // Form fields for creating new organizer
    const [newOrg, setNewOrg] = useState({
        firstName: '', lastName: '', email: '', password: '',
        orgName: '', category: '', description: '', contactNumber: ''
    });

    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const fetchOrganizers = async () => {
        try {
            const res = await axios.get('http://localhost:3001/admin/organizers', {
                headers: { 'auth-token': token }
            });
            setOrganizers(res.data);
        } catch (err) {
            setError('Failed to fetch organizers.');
        }
    };

    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        fetchOrganizers();
    }, [navigate, token]);

    const handleCreateOrganizer = async (e) => {
        e.preventDefault();
        setMessage(''); setError('');
        try {
            await axios.post('http://localhost:3001/admin/create-organizer', newOrg, {
                headers: { 'auth-token': token }
            });
            setMessage('Organizer created successfully!');
            setShowCreateForm(false);
            setNewOrg({ firstName: '', lastName: '', email: '', password: '', orgName: '', category: '', description: '', contactNumber: '' });
            fetchOrganizers();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create organizer.');
        }
    };

    const handleViewCredentials = async (orgId) => {
        try {
            const res = await axios.get(`http://localhost:3001/admin/organizers/${orgId}/credentials`, {
                headers: { 'auth-token': token }
            });
            setViewCredentials(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch credentials.');
        }
    };

    const handleDelete = async (id, name, permanent = false) => {
        setMessage(''); setError('');
        try {
            await axios.delete(`http://localhost:3001/admin/organizers/${id}`, {
                headers: { 'auth-token': token },
                data: { permanent }
            });
            setMessage(permanent ? 'Organizer permanently deleted.' : 'Organizer archived successfully.');
            setDeleteOptions(null);
            fetchOrganizers();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to remove organizer.');
        }
    };

    const handleToggleDisable = async (id) => {
        setMessage(''); setError('');
        try {
            const res = await axios.put(`http://localhost:3001/admin/organizers/${id}/toggle-disable`, {}, {
                headers: { 'auth-token': token }
            });
            setMessage(res.data.message);
            fetchOrganizers();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update organizer status.');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
            <h1>Manage Clubs / Organizers</h1>
            <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
            <button onClick={() => setShowCreateForm(!showCreateForm)} style={{ marginLeft: '10px', backgroundColor: '#4CAF50', color: 'white', padding: '8px 16px', border: 'none', cursor: 'pointer' }}>
                {showCreateForm ? 'Cancel' : '+ Create New Organizer'}
            </button>
            <hr />

            {message && <p style={{ color: 'green', fontWeight: 'bold' }}>{message}</p>}
            {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>}

            {/* View Credentials Modal */}
            {viewCredentials && (
                <div style={{ 
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ 
                        backgroundColor: 'white', padding: '30px', borderRadius: '10px',
                        minWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                    }}>
                        <h3>Organizer Credentials</h3>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Login Email:</label>
                            <input 
                                type="text" 
                                value={viewCredentials.email} 
                                readOnly 
                                style={{ width: '100%', padding: '8px', backgroundColor: '#f5f5f5', border: '1px solid #ddd' }}
                            />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Password:</label>
                            <input 
                                type="text" 
                                value={viewCredentials.password} 
                                readOnly 
                                style={{ width: '100%', padding: '8px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', fontFamily: 'monospace' }}
                            />
                        </div>
                        <p style={{ fontSize: '12px', color: 'gray' }}>
                            These credentials are sensitive. Share securely with the organizer.
                        </p>
                        <button 
                            onClick={() => setViewCredentials(null)}
                            style={{ padding: '10px 20px', cursor: 'pointer' }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Options Modal */}
            {deleteOptions && (
                <div style={{ 
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{ 
                        backgroundColor: 'white', padding: '30px', borderRadius: '10px',
                        minWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        textAlign: 'center'
                    }}>
                        <h3>Delete Organizer</h3>
                        <p>How would you like to remove <strong>"{deleteOptions.name}"</strong>?</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                            <button 
                                onClick={() => handleDelete(deleteOptions.id, deleteOptions.name, false)}
                                style={{ 
                                    padding: '12px 20px', backgroundColor: '#ff9800', color: 'white',
                                    border: 'none', borderRadius: '5px', cursor: 'pointer'
                                }}
                            >
                                Archive (Can be restored later)
                            </button>
                            <button 
                                onClick={() => handleDelete(deleteOptions.id, deleteOptions.name, true)}
                                style={{ 
                                    padding: '12px 20px', backgroundColor: '#f44336', color: 'white',
                                    border: 'none', borderRadius: '5px', cursor: 'pointer'
                                }}
                            >
                                Permanently Delete
                            </button>
                            <button 
                                onClick={() => setDeleteOptions(null)}
                                style={{ padding: '10px 20px', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                        </div>
                        
                        <p style={{ fontSize: '12px', color: 'red', marginTop: '15px' }}>
                            Warning: Permanent deletion cannot be undone!
                        </p>
                    </div>
                </div>
            )}

            {/* Create Organizer Form */}
            {showCreateForm && (
                <div style={{ padding: '20px', backgroundColor: '#f9f9f9', border: '1px solid #ddd', marginBottom: '20px', borderRadius: '8px' }}>
                    <h3>Create New Organizer Account</h3>
                    <form onSubmit={handleCreateOrganizer}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <label>Club/Org Name: </label>
                                <input type="text" value={newOrg.orgName} onChange={e => setNewOrg({ ...newOrg, orgName: e.target.value })} required style={{ width: '100%' }} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label><strong>Category:</strong></label>
                                <p style={{ fontSize: '12px', color: 'gray', margin: '5px 0 8px 0' }}>Select the category that best describes this organization</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {CATEGORY_OPTIONS.map(opt => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => setNewOrg({ ...newOrg, category: opt })}
                                            style={{
                                                padding: '5px 12px',
                                                borderRadius: '15px',
                                                border: newOrg.category === opt ? '2px solid #1976d2' : '1px solid #ddd',
                                                backgroundColor: newOrg.category === opt ? '#e3f2fd' : 'white',
                                                color: newOrg.category === opt ? '#1976d2' : '#333',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: newOrg.category === opt ? 'bold' : 'normal'
                                            }}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label>First Name: </label>
                                <input type="text" value={newOrg.firstName} onChange={e => setNewOrg({ ...newOrg, firstName: e.target.value })} required style={{ width: '100%' }} />
                            </div>
                            <div>
                                <label>Last Name: </label>
                                <input type="text" value={newOrg.lastName} onChange={e => setNewOrg({ ...newOrg, lastName: e.target.value })} required style={{ width: '100%' }} />
                            </div>
                            <div>
                                <label>Email: </label>
                                <input type="email" value={newOrg.email} onChange={e => setNewOrg({ ...newOrg, email: e.target.value })} required style={{ width: '100%' }} />
                            </div>
                            <div>
                                <label>Password: </label>
                                <input type="password" value={newOrg.password} onChange={e => setNewOrg({ ...newOrg, password: e.target.value })} required style={{ width: '100%' }} />
                            </div>
                            <div>
                                <label>Contact Number: </label>
                                <input type="text" value={newOrg.contactNumber} onChange={e => setNewOrg({ ...newOrg, contactNumber: e.target.value })} style={{ width: '100%' }} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label>Description: </label>
                                <textarea value={newOrg.description} onChange={e => setNewOrg({ ...newOrg, description: e.target.value })} rows="2" style={{ width: '100%' }} />
                            </div>
                        </div>
                        <br />
                        <button type="submit" style={{ backgroundColor: '#4CAF50', color: 'white', padding: '10px 20px', border: 'none', cursor: 'pointer' }}>Create Organizer</button>
                    </form>
                </div>
            )}

            {/* Organizers Table */}
            <h2>All Organizers ({organizers.length})</h2>
            {organizers.length === 0 ? (
                <p>No organizers found.</p>
            ) : (
                <table border="1" cellPadding="10" style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f0f0f0' }}>
                            <th>Club Name</th>
                            <th>Contact Person</th>
                            <th>Email</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {organizers.map(org => (
                            <tr key={org._id} style={{ backgroundColor: org.isDisabled ? '#ffe6e6' : org.isArchived ? '#f5f5f5' : 'white' }}>
                                <td><strong>{org.orgName || 'N/A'}</strong></td>
                                <td>{org.firstName} {org.lastName}</td>
                                <td>{org.email}</td>
                                <td>{org.category || '-'}</td>
                                <td>
                                    <span style={{
                                        color: org.isArchived ? 'gray' : org.isDisabled ? 'red' : 'green',
                                        fontWeight: 'bold'
                                    }}>
                                        {org.isArchived ? 'Archived' : org.isDisabled ? 'Disabled' : 'Active'}
                                    </span>
                                </td>
                                <td style={{ minWidth: '200px' }}>
                                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                        <button
                                            onClick={() => handleViewCredentials(org._id)}
                                            style={{
                                                backgroundColor: '#1976d2', color: 'white',
                                                border: 'none', padding: '5px 10px', cursor: 'pointer', fontSize: '12px'
                                            }}
                                        >
                                            Credentials
                                        </button>
                                        <button
                                            onClick={() => handleToggleDisable(org._id)}
                                            style={{
                                                backgroundColor: org.isDisabled ? '#4CAF50' : '#ff9800',
                                                color: 'white',
                                                border: 'none', padding: '5px 10px', cursor: 'pointer', fontSize: '12px'
                                            }}
                                        >
                                            {org.isDisabled ? 'Enable' : 'Disable'}
                                        </button>
                                        <button
                                            onClick={() => setDeleteOptions({ id: org._id, name: org.orgName || org.firstName })}
                                            style={{ backgroundColor: '#f44336', color: 'white', border: 'none', padding: '5px 10px', cursor: 'pointer', fontSize: '12px' }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default AdminManageClubs;
