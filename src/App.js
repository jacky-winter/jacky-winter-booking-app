import React, { useState, useEffect } from 'react';
import { Calendar, Plus, List, Clock, Phone, Mail, Send, Zap, Settings, X } from 'lucide-react';

const App = () => {
  const [currentView, setCurrentView] = useState('calendar');
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [propertyFilter, setPropertyFilter] = useState('all');

  useEffect(() => {
    // Initialize with sample data
    const initialBookings = [
      {
        id: '1',
        firstName: 'Mae',
        lastName: 'Mactier',
        property: 'Jacky Winter Gardens',
        checkIn: '2025-06-07',
        checkOut: '2025-06-09',
        phone: '+61 412 345 678',
        email: 'mae@example.com',
        source: 'riparide',
        notes: '',
        cleaner: '',
        cleaningDate: '',
        cleaningTime: ''
      }
    ];
    setBookings(initialBookings);
  }, []);

  const getCurrentMonth = () => {
    return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    let startingDayOfWeek = firstDay.getDay();
    
    startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
  };

  const addBooking = (bookingData) => {
    const newBooking = {
      ...bookingData,
      id: (bookings.length + 1).toString(),
      source: 'manual',
      cleaner: '',
      cleaningDate: '',
      cleaningTime: ''
    };
    setBookings([...bookings, newBooking]);
    setShowAddBooking(false);
  };

  const updateBooking = (updatedBooking) => {
    const updatedBookings = bookings.map(booking => 
      booking.id === updatedBooking.id ? updatedBooking : booking
    );
    setBookings(updatedBookings);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <Navigation />
        
        {currentView === 'calendar' && (
          <>
            <div className="mb-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-sm text-gray-600">Jacky Winter Gardens</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-sm text-gray-600">Jacky Winter Waters</span>
                </div>
              </div>
              <button
                onClick={() => setShowAddBooking(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                <Plus size={18} />
                Add Booking
              </button>
            </div>
            <CalendarView />
          </>
        )}
        
        {currentView === 'list' && (
          <>
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setShowAddBooking(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                <Plus size={18} />
                Add Booking
              </button>
            </div>
            <ListView />
          </>
        )}
        
        {showAddBooking && (
          <AddBookingForm
            onSave={addBooking}
            onCancel={() => setShowAddBooking(false)}
          />
        )}
        
        {showIntegrations && (
          <IntegrationsModal
            onClose={() => setShowIntegrations(false)}
          />
        )}
        
        {selectedBooking && (
          <BookingDetailModal
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
            onUpdate={updateBooking}
          />
        )}
      </div>
    </div>
  );

  function CalendarView() {
    const days = getDaysInMonth(selectedDate);
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">{getCurrentMonth()}</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => navigateMonth(-1)}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                ←
              </button>
              <button 
                onClick={() => navigateMonth(1)}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                →
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-7 gap-1 mb-4">
            {weekdays.map(day => (
              <div key={day} className="p-2 text-center font-semibold text-gray-700 bg-gray-100">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1" style={{ minHeight: '400px' }}>
            {days.map((day, index) => (
              <div 
                key={index} 
                className={`min-h-24 p-1 border border-gray-200 ${day ? 'bg-white hover:bg-gray-50' : 'bg-gray-100'}`}
              >
                {day && (
                  <div className="text-sm font-medium text-gray-700">
                    {day.getDate()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function ListView() {
    const futureBookings = bookings
      .filter(booking => new Date(booking.checkIn) >= new Date())
      .filter(booking => propertyFilter === 'all' || booking.property === propertyFilter)
      .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

    return (
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Upcoming Bookings</h2>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-600">Filter by Property:</label>
              <select
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="all">All Properties</option>
                <option value="Jacky Winter Gardens">Jacky Winter Gardens</option>
                <option value="Jacky Winter Waters">Jacky Winter Waters</option>
              </select>
            </div>
          </div>
        </div>
        <div className="p-6">
          {futureBookings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No upcoming bookings</p>
          ) : (
            <div className="space-y-4">
              {futureBookings.map(booking => (
                <div 
                  key={booking.id}
                  onClick={() => setSelectedBooking(booking)}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {booking.firstName && booking.lastName ? 
                          booking.firstName + ' ' + booking.lastName : 
                          'Unnamed Guest'
                        }
                      </h3>
                      <div className={booking.property === 'Jacky Winter Gardens' ? 
                        'inline-block px-2 py-1 rounded text-sm text-white bg-green-500' : 
                        'inline-block px-2 py-1 rounded text-sm text-white bg-blue-500'}>
                        {booking.property}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Phone size={14} />
                      {booking.phone || 'Not provided'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail size={14} />
                      {booking.email || 'Not provided'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function AddBookingForm({ onSave, onCancel }) {
    const [formData, setFormData] = useState({
      firstName: '',
      lastName: '',
      property: 'Jacky Winter Gardens',
      checkIn: '',
      checkOut: '',
      phone: '',
      email: '',
      notes: ''
    });

    const handleSave = () => {
      if (!formData.checkIn || !formData.checkOut) {
        alert('Please select both check-in and check-out dates');
        return;
      }
      
      if (new Date(formData.checkOut) <= new Date(formData.checkIn)) {
        alert('Check-out date must be after check-in date');
        return;
      }
      
      onSave(formData);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4">Add New Booking</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="First Name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2"
              />
              <input
                type="text"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <select
              value={formData.property}
              onChange={(e) => setFormData({ ...formData, property: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="Jacky Winter Gardens">Jacky Winter Gardens</option>
              <option value="Jacky Winter Waters">Jacky Winter Waters</option>
            </select>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="date"
                value={formData.checkIn}
                onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2"
                required
              />
              <input
                type="date"
                value={formData.checkOut}
                onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                className="border border-gray-300 rounded px-3 py-2"
                required
              />
            </div>
            <input
              type="tel"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
              >
                Save Booking
              </button>
              <button
                onClick={onCancel}
                className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function BookingDetailModal({ booking, onClose, onUpdate }) {
    const [bookingData, setBookingData] = useState({
      ...booking,
      firstName: booking.firstName || '',
      lastName: booking.lastName || '',
      phone: booking.phone || '',
      email: booking.email || '',
      notes: booking.notes || ''
    });

    const handleSave = () => {
      onUpdate(bookingData);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center" style={{ zIndex: 9999 }} onClick={onClose}>
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-semibold">Edit Booking</h3>
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                bookingData.property === 'Jacky Winter Gardens' 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}>
                📍 {bookingData.property}
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 text-gray-600 hover:text-red-600 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3">Guest Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">First Name</label>
                  <input
                    type="text"
                    value={bookingData.firstName}
                    onChange={(e) => setBookingData({ ...bookingData, firstName: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={bookingData.lastName}
                    onChange={(e) => setBookingData({ ...bookingData, lastName: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={bookingData.phone}
                    onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={bookingData.email}
                    onChange={(e) => setBookingData({ ...bookingData, email: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
              >
                Save Changes
              </button>
              <button
                onClick={onClose}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function IntegrationsModal({ onClose }) {
    const [settings, setSettings] = useState({
      zapierWebhookUrl: '',
      twilioAccountSid: '',
      twilioAuthToken: '',
      twilioPhoneNumber: '',
      smsNotificationsEnabled: false,
      zapierEnabled: false
    });

    const handleSave = () => {
      Object.keys(settings).forEach(key => {
        localStorage.setItem(key, settings[key].toString());
      });
      alert('Settings saved successfully!');
    };

    const testZapier = () => {
      if (!settings.zapierWebhookUrl) {
        alert('Please enter a Zapier webhook URL first');
        return;
      }
      alert('Test webhook would be sent to Zapier');
    };

    const testSMS = () => {
      if (!settings.twilioPhoneNumber) {
        alert('Please enter your Twilio phone number first');
        return;
      }
      alert(`Test SMS would be sent from ${settings.twilioPhoneNumber}`);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">Integration Settings</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-orange-50 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="text-orange-600" size={20} />
                <h4 className="font-semibold text-orange-800">Zapier Integration</h4>
                <label className="ml-auto flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.zapierEnabled}
                    onChange={(e) => setSettings({...settings, zapierEnabled: e.target.checked})}
                    className="mr-2"
                  />
                  Enabled
                </label>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Webhook URL</label>
                  <input
                    type="url"
                    value={settings.zapierWebhookUrl}
                    onChange={(e) => setSettings({...settings, zapierWebhookUrl: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                  />
                </div>
                <button
                  onClick={testZapier}
                  className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
                >
                  Test Zapier Connection
                </button>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-4">
                <Send className="text-blue-600" size={20} />
                <h4 className="font-semibold text-blue-800">Twilio SMS</h4>
                <label className="ml-auto flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.smsNotificationsEnabled}
                    onChange={(e) => setSettings({...settings, smsNotificationsEnabled: e.target.checked})}
                    className="mr-2"
                  />
                  Enabled
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Account SID</label>
                  <input
                    type="text"
                    value={settings.twilioAccountSid}
                    onChange={(e) => setSettings({...settings, twilioAccountSid: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Auth Token</label>
                  <input
                    type="password"
                    value={settings.twilioAuthToken}
                    onChange={(e) => setSettings({...settings, twilioAuthToken: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Your auth token"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">Twilio Phone Number</label>
                  <input
                    type="tel"
                    value={settings.twilioPhoneNumber}
                    onChange={(e) => setSettings({...settings, twilioPhoneNumber: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="+1234567890"
                  />
                </div>
              </div>
              <button
                onClick={testSMS}
                className="mt-3 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Test SMS
              </button>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="text-indigo-600" size={20} />
                <h4 className="font-semibold text-indigo-800">iCal Feed Sync</h4>
              </div>
              <div className="text-sm text-indigo-700">
                <p>🔄 Automatically import bookings from Airbnb and Riparide calendars</p>
                <p className="mt-2">📅 Support for multiple properties and platforms</p>
                <p className="mt-2">⚠️ Full iCal sync available in production deployment</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={handleSave}
              className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600"
            >
              Save Settings
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  function Navigation() {
    const navItems = [
      { id: 'calendar', label: 'Calendar', icon: Calendar },
      { id: 'list', label: 'List View', icon: List }
    ];

    return (
      <nav className="bg-white shadow-lg rounded-lg mb-6 relative">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Jacky Winter Properties</h1>
          <div className="flex space-x-1">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentView === item.id 
                      ? 'bg-blue-500 text-white' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
        
        <button
          onClick={() => setShowIntegrations(true)}
          className="absolute bottom-3 right-3 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          title="Integration Settings"
        >
          <Settings size={18} />
        </button>
      </nav>
    );
  }
};

export default App;
