import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';
import BrowseEvents from './browseEvents';
import CreateEvent from './createEvent';
import EditEvent from './EditEvent';
import Register from './Register';
import Profile from './Profile';
import OrganizerEventDetail from './organizerEventDetail';
import Ticket from './Ticket';
import ScanTicket from './ScanTicket';
import Forum from './Forum';
import SubmitFeedback from './SubmitFeedback';
import Navbar from './Navbar';
import AdminManageClubs from './AdminManageClubs';
import AdminPasswordResets from './AdminPasswordResets';
import ClubsListing from './ClubsListing';
import OrganizerProfile from './OrganizerProfile';
import MerchandiseOrders from './MerchandiseOrders';
import PasswordResetRequest from './PasswordResetRequest';
import OngoingEvents from './OngoingEvents';
import ParticipantEventDetail from './ParticipantEventDetail';
import ParticipantPasswordReset from './ParticipantPasswordReset';
import ParticipantForgotPassword from './ParticipantForgotPassword';
import Onboarding from './Onboarding';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/browse" element={<BrowseEvents />} />
        <Route path="/create-event" element={<CreateEvent />} />
        <Route path="/edit-event/:id" element={<EditEvent />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/ticket/:ticketId" element={<Ticket />} />
        <Route path="/organizer/event/:id" element={<OrganizerEventDetail />} />
        <Route path="/scan" element={<ScanTicket />} />
        <Route path="/forum/:eventId" element={<Forum />} />
        <Route path="/feedback/:eventId" element={<SubmitFeedback />} />

        {/* New Routes */}
        <Route path="/admin/manage-clubs" element={<AdminManageClubs />} />
        <Route path="/admin/password-resets" element={<AdminPasswordResets />} />
        <Route path="/clubs" element={<ClubsListing />} />
        <Route path="/organizer/:id" element={<OrganizerProfile />} />
        <Route path="/merchandise-orders/:id" element={<MerchandiseOrders />} />
        <Route path="/password-reset-request" element={<PasswordResetRequest />} />
        <Route path="/ongoing-events" element={<OngoingEvents />} />
        <Route path="/event/:id" element={<ParticipantEventDetail />} />
        <Route path="/reset-password/:token" element={<ParticipantPasswordReset />} />
        <Route path="/forgot-password" element={<ParticipantForgotPassword />} />
        <Route path="/onboarding" element={<Onboarding />} />
      </Routes>
    </Router>
  );
}

export default App;