import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CrudPage from './pages/CrudPage';
import AIPage from './pages/AIPage';
import Navbar from './components/Navbar';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));

  const handleLogin = (userData, tokenData) => {
    setToken(tokenData);
    setUser(userData);
    localStorage.setItem('token', tokenData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="app">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard token={token} />} />
            <Route path="/events" element={<CrudPage token={token} endpoint="events" title="Events" fields={eventFields} />} />
            <Route path="/venues" element={<CrudPage token={token} endpoint="venues" title="Venues" fields={venueFields} />} />
            <Route path="/guests" element={<CrudPage token={token} endpoint="guests" title="Guests" fields={guestFields} />} />
            <Route path="/catering" element={<CrudPage token={token} endpoint="catering" title="Catering Menus" fields={cateringFields} />} />
            <Route path="/vendors" element={<CrudPage token={token} endpoint="vendors" title="Vendors" fields={vendorFields} />} />
            <Route path="/budgets" element={<CrudPage token={token} endpoint="budgets" title="Budgets" fields={budgetFields} />} />
            <Route path="/tasks" element={<CrudPage token={token} endpoint="tasks" title="Tasks" fields={taskFields} />} />
            <Route path="/invitations" element={<CrudPage token={token} endpoint="invitations" title="Invitations" fields={invitationFields} />} />
            <Route path="/seating" element={<CrudPage token={token} endpoint="seating" title="Seating" fields={seatingFields} />} />
            <Route path="/entertainment" element={<CrudPage token={token} endpoint="entertainment" title="Entertainment" fields={entertainmentFields} />} />
            <Route path="/ai/event-suggestions" element={<AIPage token={token} endpoint="ai/event-suggestions" title="AI Event Suggestions" fields={aiEventFields} />} />
            <Route path="/ai/menu-generator" element={<AIPage token={token} endpoint="ai/menu-generator" title="AI Menu Generator" fields={aiMenuFields} />} />
            <Route path="/ai/budget-optimizer" element={<AIPage token={token} endpoint="ai/budget-optimizer" title="AI Budget Optimizer" fields={aiBudgetFields} />} />
            <Route path="/ai/schedule-optimizer" element={<AIPage token={token} endpoint="ai/schedule-optimizer" title="AI Schedule Optimizer" fields={aiScheduleFields} />} />
            <Route path="/ai/vendor-matcher" element={<AIPage token={token} endpoint="ai/vendor-matcher" title="AI Vendor Matcher" fields={aiVendorFields} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

const eventFields = [
  { name: 'name', label: 'Event Name', type: 'text', required: true },
  { name: 'event_type', label: 'Type', type: 'select', options: ['Conference', 'Wedding', 'Gala', 'Networking', 'Festival', 'Launch', 'Fundraiser', 'Corporate', 'Exhibition', 'Party', 'Retreat', 'Awards', 'Personal'] },
  { name: 'date', label: 'Date', type: 'date' },
  { name: 'time', label: 'Time', type: 'text' },
  { name: 'location', label: 'Location', type: 'text' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'max_guests', label: 'Max Guests', type: 'number' },
  { name: 'budget', label: 'Budget ($)', type: 'number' },
  { name: 'status', label: 'Status', type: 'select', options: ['Planning', 'Confirmed', 'Draft', 'Cancelled', 'Completed'] },
];

const venueFields = [
  { name: 'name', label: 'Venue Name', type: 'text', required: true },
  { name: 'address', label: 'Address', type: 'text' },
  { name: 'capacity', label: 'Capacity', type: 'number' },
  { name: 'venue_type', label: 'Type', type: 'select', options: ['Hotel Ballroom', 'Garden Estate', 'Conference Center', 'Outdoor Amphitheater', 'Arts Center', 'Waterfront Venue', 'Resort', 'Gallery', 'Convention Center', 'Restaurant', 'Event Center', 'Spa Resort', 'Nightclub', 'Rooftop', 'Historic Mansion'] },
  { name: 'hourly_rate', label: 'Hourly Rate ($)', type: 'number' },
  { name: 'amenities', label: 'Amenities', type: 'textarea' },
  { name: 'contact_phone', label: 'Phone', type: 'text' },
  { name: 'contact_email', label: 'Email', type: 'text' },
  { name: 'rating', label: 'Rating', type: 'number' },
];

const guestFields = [
  { name: 'name', label: 'Guest Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'text' },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'event_id', label: 'Event ID', type: 'number' },
  { name: 'rsvp_status', label: 'RSVP Status', type: 'select', options: ['Pending', 'Confirmed', 'Declined', 'Maybe'] },
  { name: 'dietary_restrictions', label: 'Dietary Restrictions', type: 'text' },
  { name: 'plus_ones', label: 'Plus Ones', type: 'number' },
  { name: 'table_number', label: 'Table Number', type: 'number' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

const cateringFields = [
  { name: 'name', label: 'Menu Name', type: 'text', required: true },
  { name: 'cuisine_type', label: 'Cuisine', type: 'select', options: ['French', 'Mediterranean', 'Asian Fusion', 'BBQ', 'Italian', 'Organic', 'Indian', 'Seafood', 'Mexican', 'International', 'Vegan', 'Brunch', 'Japanese', 'Southern', 'Dessert'] },
  { name: 'price_per_person', label: 'Price/Person ($)', type: 'number' },
  { name: 'min_guests', label: 'Min Guests', type: 'number' },
  { name: 'max_guests', label: 'Max Guests', type: 'number' },
  { name: 'menu_items', label: 'Menu Items', type: 'textarea' },
  { name: 'dietary_options', label: 'Dietary Options', type: 'text' },
  { name: 'vendor_name', label: 'Vendor', type: 'text' },
  { name: 'rating', label: 'Rating', type: 'number' },
];

const vendorFields = [
  { name: 'name', label: 'Vendor Name', type: 'text', required: true },
  { name: 'service_type', label: 'Service', type: 'select', options: ['Photography', 'Live Music', 'DJ Services', 'Floral Design', 'Videography', 'Decoration', 'Bakery', 'AV Equipment', 'Valet Parking', 'Security', 'Stationery', 'Cleaning', 'Transportation', 'Photo Booth', 'Catering'] },
  { name: 'contact_email', label: 'Email', type: 'text' },
  { name: 'contact_phone', label: 'Phone', type: 'text' },
  { name: 'hourly_rate', label: 'Hourly Rate ($)', type: 'number' },
  { name: 'rating', label: 'Rating', type: 'number' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'availability', label: 'Availability', type: 'select', options: ['Available', 'Booked', 'Unavailable'] },
  { name: 'portfolio_url', label: 'Portfolio URL', type: 'text' },
];

const budgetFields = [
  { name: 'event_id', label: 'Event ID', type: 'number' },
  { name: 'category', label: 'Category', type: 'select', options: ['Venue Rental', 'Catering', 'Photography', 'Videography', 'Florals', 'Entertainment', 'AV Equipment', 'Decoration', 'Transportation', 'Security', 'Stationery', 'Cleaning', 'Staff', 'Marketing', 'Miscellaneous'] },
  { name: 'estimated_cost', label: 'Estimated Cost ($)', type: 'number', required: true },
  { name: 'actual_cost', label: 'Actual Cost ($)', type: 'number' },
  { name: 'vendor_name', label: 'Vendor', type: 'text' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
  { name: 'status', label: 'Status', type: 'select', options: ['Pending', 'Deposit Paid', 'Paid', 'Overdue', 'Cancelled'] },
];

const taskFields = [
  { name: 'event_id', label: 'Event ID', type: 'number' },
  { name: 'title', label: 'Title', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'assigned_to', label: 'Assigned To', type: 'text' },
  { name: 'due_date', label: 'Due Date', type: 'date' },
  { name: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Urgent'] },
  { name: 'status', label: 'Status', type: 'select', options: ['Pending', 'In Progress', 'Completed', 'Cancelled'] },
];

const invitationFields = [
  { name: 'event_id', label: 'Event ID', type: 'number' },
  { name: 'guest_name', label: 'Guest Name', type: 'text', required: true },
  { name: 'guest_email', label: 'Guest Email', type: 'text' },
  { name: 'invitation_type', label: 'Type', type: 'select', options: ['Email', 'Physical', 'Digital', 'Phone'] },
  { name: 'sent_date', label: 'Sent Date', type: 'date' },
  { name: 'rsvp_status', label: 'RSVP Status', type: 'select', options: ['Pending', 'Accepted', 'Declined', 'Maybe'] },
  { name: 'message', label: 'Message', type: 'textarea' },
];

const seatingFields = [
  { name: 'event_id', label: 'Event ID', type: 'number' },
  { name: 'table_number', label: 'Table Number', type: 'number', required: true },
  { name: 'table_name', label: 'Table Name', type: 'text' },
  { name: 'capacity', label: 'Capacity', type: 'number' },
  { name: 'guests_assigned', label: 'Guests Assigned', type: 'textarea' },
  { name: 'arrangement_type', label: 'Arrangement', type: 'select', options: ['Round', 'Long', 'U-Shape', 'Classroom', 'Theater', 'Cocktail'] },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

const entertainmentFields = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'entertainment_type', label: 'Type', type: 'select', options: ['Live Band', 'DJ', 'Acrobatics', 'Stand-up Comedy', 'Magician', 'Dance Performance', 'Classical Music', 'Caricature Artist', 'Fire Performance', 'Interactive Games', 'Face Painting', 'Technology', 'Balloon Art', 'Photo Booth'] },
  { name: 'duration_hours', label: 'Duration (hrs)', type: 'number' },
  { name: 'cost', label: 'Cost ($)', type: 'number' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'requirements', label: 'Requirements', type: 'textarea' },
  { name: 'contact_info', label: 'Contact', type: 'text' },
  { name: 'rating', label: 'Rating', type: 'number' },
];

const aiEventFields = [
  { name: 'event_type', label: 'Event Type', type: 'text', placeholder: 'e.g., Corporate dinner, Wedding, Birthday' },
  { name: 'guest_count', label: 'Guest Count', type: 'number', placeholder: '100' },
  { name: 'budget', label: 'Budget ($)', type: 'number', placeholder: '15000' },
  { name: 'season', label: 'Season/Time', type: 'text', placeholder: 'e.g., Summer, Evening, December' },
  { name: 'preferences', label: 'Preferences', type: 'textarea', placeholder: 'Any specific themes, requirements, or preferences...' },
];

const aiMenuFields = [
  { name: 'cuisine', label: 'Cuisine Type', type: 'text', placeholder: 'e.g., Italian, Asian Fusion, French' },
  { name: 'guest_count', label: 'Guest Count', type: 'number', placeholder: '50' },
  { name: 'budget_per_person', label: 'Budget/Person ($)', type: 'number', placeholder: '50' },
  { name: 'dietary_needs', label: 'Dietary Needs', type: 'text', placeholder: 'e.g., Vegetarian options, nut-free, halal' },
  { name: 'course_count', label: 'Number of Courses', type: 'number', placeholder: '3' },
  { name: 'event_type', label: 'Event Type', type: 'text', placeholder: 'e.g., Formal dinner, Casual buffet' },
];

const aiBudgetFields = [
  { name: 'total_budget', label: 'Total Budget ($)', type: 'number', placeholder: '25000' },
  { name: 'guest_count', label: 'Guest Count', type: 'number', placeholder: '100' },
  { name: 'event_type', label: 'Event Type', type: 'text', placeholder: 'e.g., Wedding, Conference' },
  { name: 'priorities', label: 'Priorities', type: 'textarea', placeholder: 'What matters most? e.g., Great food, amazing venue, entertainment' },
  { name: 'current_allocations', label: 'Current Allocations', type: 'textarea', placeholder: 'Any existing budget allocations...' },
];

const aiScheduleFields = [
  { name: 'event_type', label: 'Event Type', type: 'text', placeholder: 'e.g., Conference, Wedding, Gala' },
  { name: 'duration_hours', label: 'Duration (hours)', type: 'number', placeholder: '8' },
  { name: 'activities', label: 'Activities', type: 'textarea', placeholder: 'e.g., Keynotes, networking, meals, workshops' },
  { name: 'guest_count', label: 'Guest Count', type: 'number', placeholder: '200' },
  { name: 'start_time', label: 'Start Time', type: 'text', placeholder: '9:00 AM' },
];

const aiVendorFields = [
  { name: 'event_type', label: 'Event Type', type: 'text', placeholder: 'e.g., Wedding, Corporate gala' },
  { name: 'services_needed', label: 'Services Needed', type: 'textarea', placeholder: 'e.g., Catering, Photography, Music, Flowers' },
  { name: 'budget', label: 'Budget Range ($)', type: 'text', placeholder: '5000-15000' },
  { name: 'location', label: 'Location', type: 'text', placeholder: 'e.g., San Francisco Bay Area' },
  { name: 'quality_preference', label: 'Quality Preference', type: 'select', options: ['Budget-friendly', 'Mid-range', 'High quality', 'Luxury/Premium'] },
];

export default App;
