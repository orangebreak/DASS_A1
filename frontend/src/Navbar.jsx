import { Link, useNavigate, useLocation } from 'react-router-dom';

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const token = localStorage.getItem('token');

    // Hide navbar on Login, Register, and password reset pages if not logged in
    if (location.pathname === '/login' || location.pathname === '/register') {
        return null;
    }
    if (location.pathname === '/password-reset-request' && !token) {
        return null;
    }
    if (!token) return null;

    let role = '';
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        role = payload.role;
    } catch (e) {
        console.error("Token parsing error");
    }

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const navStyle = {
        display: 'flex',
        gap: '20px',
        padding: '15px 20px',
        backgroundColor: '#333',
        color: 'white',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap'
    };
    const linkStyle = { color: 'white', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' };

    return (
        <div style={navStyle}>
            <h2 style={{ margin: 0, marginRight: 'auto' }}>Felicity System</h2>

            <Link to="/dashboard" style={linkStyle}>Dashboard</Link>

            {/* Participant Navbar */}
            {role === 'participant' && (
                <>
                    <Link to="/browse" style={linkStyle}>Browse Events</Link>
                    <Link to="/clubs" style={linkStyle}>Clubs/Organizers</Link>
                    <Link to="/profile" style={linkStyle}>Profile</Link>
                </>
            )}

            {/* Organizer Navbar */}
            {role === 'organizer' && (
                <>
                    <Link to="/create-event" style={linkStyle}>Create Event</Link>
                    <Link to="/ongoing-events" style={linkStyle}>Ongoing Events</Link>
                    <Link to="/scan" style={linkStyle}>Scan Tickets</Link>
                    <Link to="/profile" style={linkStyle}>Profile</Link>
                    <Link to="/password-reset-request" style={linkStyle}>Reset Password</Link>
                </>
            )}

            {/* Admin Navbar */}
            {role === 'admin' && (
                <>
                    <Link to="/admin/manage-clubs" style={linkStyle}>Manage Clubs</Link>
                    <Link to="/admin/password-resets" style={linkStyle}>Password Resets</Link>
                </>
            )}

            <button onClick={handleLogout} style={{ marginLeft: '20px', padding: '5px 10px', cursor: 'pointer' }}>
                Logout
            </button>
        </div>
    );
}

export default Navbar;