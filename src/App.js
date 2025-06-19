import React, { useState, useEffect } from 'react';
import { Calendar, Plus, List, Users, MapPin, Clock, Phone, Mail, User, Save, X, Send, Zap, Settings } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState('calendar');
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [integrationSettings, setIntegrationSettings] = useState({
    zapierWebhookUrl: '',
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
    smsNotificationsEnabled: false,
    zapierEnabled: false
  });
  const [icalSettings, setIcalSettings] = useState({
    gardensAirbnbUrl: '',
    gardensRiparideUrl: '',
    watersAirbnbUrl: '',
    watersRiparideUrl: '',
    icalEnabled: false,
    lastSync: null,
    autoSyncInterval: '30'
  });

  useEffect(() => {
    const savedBookings = JSON.parse(localStorage.getItem('jackyWinterBookings') || 'null');
    
    if (savedBookings && savedBookings.length > 0) {
      setBookings(savedBookings);
    } else {
      const initialBookings = [
        {
          id: '4',
          firstName: 'Mae',
          lastName: 'Mactier',
          property: 'Jacky Winter Gardens',
          checkIn: '2025-06-07',
          checkOut: '2025-06-09',
          phone: '',
          email: 'mae@example.com',
          source: 'riparide',
          notes: '',
          cleaner: '',
          cleaningDate: '',
          cleaningTime: ''
        }
      ];
      setBookings(initialBookings);
      localStorage.setItem('jackyWinterBookings', JSON.stringify(initialBookings));
    }

    // Load integration settings
    const savedSettings = {
      zapierWebhookUrl: localStorage.getItem('zapierWebhookUrl') || '',
      twilioAccountSid: localStorage.getItem('twilioAccountSid') || '',
      twilioAuthToken: localStorage.getItem('twilioAuthToken') || '',
      twilioPhoneNumber: localStorage.getItem('twilioPhoneNumber') || '',
      smsNotificationsEnabled: localStorage.getItem('smsNotificationsEnabled') === 'true',
      zapierEnabled: localStorage.getItem('zapierEnabled') === 'true'
    };
    setIntegrationSettings(savedSettings);

    // Load iCal settings
    const savedIcalSettings = {
      gardensAirbnbUrl: localStorage.getItem('gardensAirbnbUrl') || '',
      gardensRiparideUrl: localStorage.getItem('gardensRiparideUrl') || '',
      watersAirbnbUrl: localStorage.getItem('watersAirbnbUrl') || '',
      watersRiparideUrl: localStorage.getItem('watersRiparideUrl') || '',
      icalEnabled: localStorage.getItem('icalEnabled') === 'true',
      lastSync: localStorage.getItem('lastSync') || null,
      autoSyncInterval: localStorage.getItem('autoSyncInterval') || '30'
    };
    setIcalSettings(savedIcalSettings);

    // Start auto-sync if enabled
    if (savedIcalSettings.icalEnabled && (
      savedIcalSettings.gardensAirbnbUrl || savedIcalSettings.gardensRiparideUrl || 
      savedIcalSettings.watersAirbnbUrl || savedIcalSettings.watersRiparideUrl
    )) {
      syncIcalFeeds();
      
      // Set up periodic sync
      const syncInterval = setInterval(() => {
        syncIcalFeeds();
      }, parseInt(savedIcalSettings.autoSyncInterval) * 60 * 1000);

      return () => clearInterval(syncInterval);
    }
  }, []);

  // iCal Feed Synchronization
  const parseIcalData = (icalText, property, source) => {
    const events = [];
    const lines = icalText.split('\n');
    let currentEvent = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === 'BEGIN:VEVENT') {
        currentEvent = {
          property: property,
          source: source, // 'airbnb' or 'riparide'
          firstName: '',
          lastName: '',
          phone: '',
          email: '',
          notes: '',
          cleaner: '',
          cleaningDate: '',
          cleaningTime: ''
        };
      } else if (line === 'END:VEVENT' && currentEvent) {
        if (currentEvent.checkIn && currentEvent.checkOut) {
          currentEvent.id = `ical-${source}-${property.replace(/\s+/g, '')}-${currentEvent.checkIn}-${currentEvent.checkOut}-${currentEvent.summary?.replace(/\s+/g, '') || 'booking'}`;
          events.push(currentEvent);
        }
        currentEvent = null;
      } else if (currentEvent) {
        if (line.startsWith('DTSTART')) {
          const dateMatch = line.match(/(\d{8})/);
          if (dateMatch) {
            const dateStr = dateMatch[1];
            currentEvent.checkIn = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
          }
        } else if (line.startsWith('DTEND')) {
          const dateMatch = line.match(/(\d{8})/);
          if (dateMatch) {
            const dateStr = dateMatch[1];
            currentEvent.checkOut = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
          }
        } else if (line.startsWith('SUMMARY:')) {
          const summary = line.replace('SUMMARY:', '');
          currentEvent.summary = summary;
          
          const nameMatch = summary.match(/^([A-Za-z]+)\s+([A-Za-z]+)/);
          if (nameMatch) {
            currentEvent.firstName = nameMatch[1];
            currentEvent.lastName = nameMatch[2];
          } else {
            const words = summary.split(' ');
            currentEvent.firstName = words[0] || 'Guest';
            currentEvent.lastName = words[1] || '';
          }
        } else if (line.startsWith('DESCRIPTION:')) {
          currentEvent.notes = line.replace('DESCRIPTION:', '').replace(/\\n/g, '\n');
        }
      }
    }
    
    return events;
  };

  const syncIcalFeeds = async (customSettings = null) => {
    const settingsToUse = customSettings || icalSettings;
    console.log('Starting iCal sync with settings:', settingsToUse);
    let newBookings = [];
    
    try {
      // Sync Gardens Airbnb
      if (settingsToUse.gardensAirbnbUrl) {
        console.log('Fetching Gardens Airbnb iCal...');
        const response = await fetch(settingsToUse.gardensAirbnbUrl);
        const data = await response.text();
        const bookings = parseIcalData(data, 'Jacky Winter Gardens', 'airbnb');
        newBookings = [...newBookings, ...bookings];
        console.log(`Gardens Airbnb: ${bookings.length} bookings found`);
      }

      // Sync Gardens Riparide
      if (settingsToUse.gardensRiparideUrl) {
        console.log('Fetching Gardens Riparide iCal...');
        const response = await fetch(settingsToUse.gardensRiparideUrl);
        const data = await response.text();
        const bookings = parseIcalData(data, 'Jacky Winter Gardens', 'riparide');
        newBookings = [...newBookings, ...bookings];
        console.log(`Gardens Riparide: ${bookings.length} bookings found`);
      }

      // Sync Waters Airbnb
      if (settingsToUse.watersAirbnbUrl) {
        console.log('Fetching Waters Airbnb iCal...');
        const response = await fetch(settingsToUse.watersAirbnbUrl);
        const data = await response.text();
        const bookings = parseIcalData(data, 'Jacky Winter Waters', 'airbnb');
        newBookings = [...newBookings, ...bookings];
        console.log(`Waters Airbnb: ${bookings.length} bookings found`);
      }

      // Sync Waters Riparide
      if (settingsToUse.watersRiparideUrl) {
        console.log('Fetching Waters Riparide iCal...');
        const response = await fetch(settingsToUse.watersRiparideUrl);
        const data = await response.text();
        const bookings = parseIcalData(data, 'Jacky Winter Waters', 'riparide');
        newBookings = [...newBookings, ...bookings];
        console.log(`Waters Riparide: ${bookings.length} bookings found`);
      }

      const existingManualBookings = bookings.filter(booking => booking.source === 'manual');
      const mergedBookings = [...existingManualBookings, ...newBookings];
      
      setBookings(mergedBookings);
      localStorage.setItem('jackyWinterBookings', JSON.stringify(mergedBookings));
      localStorage.setItem('lastSync', new Date().toISOString());
      
      console.log(`iCal sync complete: ${newBookings.length} total bookings imported`);
      return newBookings.length;
      
    } catch (error) {
      console.error('iCal sync failed:', error);
      throw error;
    }
  };

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

  const getBookingBars = (days) => {
    const bars = [];
    const processedBookings = new Set();
    const rowBookingCounts = {};
    
    bookings.forEach(booking => {
      if (processedBookings.has(booking.id)) return;
      
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      const currentMonth = selectedDate.getMonth();
      const currentYear = selectedDate.getFullYear();
      
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0);
      
      if (checkOut < monthStart || checkIn > monthEnd) return;
      
      let startIndex = -1;
      let endIndex = -1;
      
      days.forEach((day, index) => {
        if (!day) return;
        
        const dayDate = new Date(day.getFullYear(), day.getMonth(), day.getDate());
        const checkInDate = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
        const checkOutDate = new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate());
        
        if (dayDate.getTime() === checkInDate.getTime()) startIndex = index;
        if (dayDate.getTime() === checkOutDate.getTime()) endIndex = index;
      });
      
      if (checkIn < monthStart) {
        startIndex = days.findIndex(day => day !== null);
      }
      
      if (checkOut > monthEnd) {
        endIndex = days.length - 1;
      }
      
      if (startIndex !== -1) {
        if (endIndex === -1) {
          endIndex = days.length - 1;
        }
        
        const startRow = Math.floor(startIndex / 7);
        const endRow = Math.floor(endIndex / 7);
        
        for (let row = startRow; row <= endRow; row++) {
          const rowStartIndex = row * 7;
          const rowEndIndex = Math.min((row + 1) * 7 - 1, days.length - 1);
          
          const barStartIndex = Math.max(startIndex, rowStartIndex);
          const barEndIndex = Math.min(endIndex, rowEndIndex);
          
          if (barStartIndex <= barEndIndex) {
            const startCol = barStartIndex % 7;
            const endCol = barEndIndex % 7;
            const width = ((endCol - startCol + 1) * 100) / 7;
            const left = (startCol * 100) / 7;
            
            if (!rowBookingCounts[row]) {
              rowBookingCounts[row] = {};
            }
            
            let verticalPosition = 0;
            for (let col = startCol; col <= endCol; col++) {
              if (rowBookingCounts[row][col] !== undefined) {
                verticalPosition = Math.max(verticalPosition, rowBookingCounts[row][col] + 1);
              }
            }
            
            for (let col = startCol; col <= endCol; col++) {
              rowBookingCounts[row][col] = verticalPosition;
            }
            
            bars.push({
              id: `${booking.id}-${row}`,
              bookingId: booking.id,
              booking,
              row,
              left: `${left}%`,
              width: `${width}%`,
              startCol,
              endCol,
              verticalPosition
            });
          }
        }
        
        processedBookings.add(booking.id);
      }
    });
    
    return bars;
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
  };

  const sendToZapier = async (action, bookingData) => {
    if (!integrationSettings.zapierEnabled || !integrationSettings.zapierWebhookUrl) return;
    
    try {
      await fetch(integrationSettings.zapierWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: action,
          booking: bookingData,
          timestamp: new Date().toISOString(),
          property: bookingData.property
        })
      });
      console.log(`Zapier webhook sent for ${action} booking`);
    } catch (error) {
      console.error('Failed to send to Zapier:', error);
    }
  };

  const sendSMS = async (to, message) => {
    if (!integrationSettings.smsNotificationsEnabled || !integrationSettings.twilioAccountSid) return;
    
    try {
      alert(`SMS would be sent to ${to}: ${message}`);
    } catch (error) {
      console.error('Failed to send SMS:', error);
    }
  };

  const sendBookingConfirmation = (booking) => {
    if (booking.phone && booking.firstName) {
      const message = `Hi ${booking.firstName}! Your booking at ${booking.property} is confirmed for ${new Date(booking.checkIn).toLocaleDateString()} to ${new Date(booking.checkOut).toLocaleDateString()}. We look forward to hosting you!`;
      sendSMS(booking.phone, message);
    }
  };

  const sendCheckInReminder = (booking) => {
    if (booking.phone && booking.firstName) {
      const message = `Hi ${booking.firstName}! Just a reminder that your check-in at ${booking.property} is tomorrow. Check-in time is 3:00 PM. Looking forward to your stay!`;
      sendSMS(booking.phone, message);
    }
  };

  const handleWebhookData = (webhookData) => {
    console.log('Received webhook data:', webhookData);
    
    if (webhookData.action === 'email_booking_update') {
      const { emailSource, emailSubject, emailBody, extractedData } = webhookData;
      
      if (emailSource === 'riparide') {
        handleRiparideBooking(extractedData, emailBody);
      } else if (emailSource === 'airbnb') {
        handleAirbnbBooking(extractedData, emailBody);
      }
    }
  };

  const handleRiparideBooking = (extractedData, emailBody) => {
    console.log('Processing Riparide booking:', extractedData);
    
    const incompleteRiparide = bookings.find(booking => 
      booking.source === 'riparide' && 
      (!booking.phone || booking.phone === '') &&
      booking.firstName === extractedData.firstName &&
      booking.lastName === extractedData.lastName
    );
    
    if (incompleteRiparide) {
      const updatedBooking = {
        ...incompleteRiparide,
        phone: extractedData.phone
      };
      
      updateBooking(updatedBooking);
      console.log('Updated Riparide booking with phone:', extractedData.phone);
      
      if (extractedData.phone) {
        sendBookingConfirmation(updatedBooking);
      }
    }
  };

  const handleAirbnbBooking = (extractedData, emailBody) => {
    console.log('Processing Airbnb booking:', extractedData);
    
    const incompleteAirbnb = bookings.find(booking => 
      booking.source === 'airbnb' && 
      booking.firstName === extractedData.firstName &&
      booking.lastName === extractedData.lastName &&
      booking.checkIn === extractedData.checkIn
    );
    
    if (incompleteAirbnb) {
      const updatedBooking = {
        ...incompleteAirbnb,
        phone: extractedData.phone || incompleteAirbnb.phone,
        email: extractedData.email || incompleteAirbnb.email
      };
      
      updateBooking(updatedBooking);
      console.log('Updated Airbnb booking:', updatedBooking);
      
      if (updatedBooking.phone && updatedBooking.firstName) {
        sendBookingConfirmation(updatedBooking);
      }
    }
  };

  const simulateWebhookReceiver = () => {
    window.processBookingWebhook = handleWebhookData;
    console.log('Webhook receiver ready at window.processBookingWebhook()');
  };

  useEffect(() => {
    simulateWebhookReceiver();
  }, [bookings]);

  const addBooking = (bookingData) => {
    const newBooking = {
      ...bookingData,
      id: (bookings.length + 1).toString(),
      source: 'manual',
      cleaner: '',
      cleaningDate: '',
      cleaningTime: ''
    };
    const updatedBookings = [...bookings, newBooking];
    setBookings(updatedBookings);
    setShowAddBooking(false);
    localStorage.setItem('jackyWinterBookings', JSON.stringify(updatedBookings));
    
    sendToZapier('created', newBooking);
    sendBookingConfirmation(newBooking);
  };

  const updateBooking = (updatedBooking) => {
    const updatedBookings = bookings.map(booking => 
      booking.id === updatedBooking.id ? updatedBooking : booking
    );
    setBookings(updatedBookings);
    localStorage.setItem('jackyWinterBookings', JSON.stringify(updatedBookings));
    
    sendToZapier('updated', updatedBooking);
  };

  const CalendarView = () => {
    const days = getDaysInMonth(selectedDate);
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const bookingBars = getBookingBars(days);

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
          
          <div className="relative" style={{ minHeight: '400px' }}>
            <div className="grid grid-cols-7 gap-1">
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
            
            <div className="absolute inset-0 pointer-events-none">
              {bookingBars.map(bar => (
                <div
                  key={bar.id}
                  onClick={() => setSelectedBooking(bar.booking)}
                  className={`absolute h-6 flex items-center justify-center text-white text-xs font-medium rounded cursor-pointer pointer-events-auto ${
                    bar.booking.property === 'Jacky Winter Gardens' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                  style={{
                    left: bar.left,
                    width: bar.width,
                    top: `${bar.row * 100 + 32 + (bar.verticalPosition * 28)}px`,
                    zIndex: 10 + bar.verticalPosition
                  }}
                >
                  {bar.booking.firstName && bar.booking.lastName ? 
                    bar.booking.firstName + ' ' + bar.booking.lastName : 
                    'Guest'
                  }
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ListView = () => {
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
                  {(booking.cleaner || booking.cleaningDate || booking.cleaningTime) && (
                    <div className="mt-2 p-2 bg-green-50 rounded border-l-2 border-green-200">
                      <div className="text-xs text-green-800 font-medium mb-1">Cleaning Scheduled</div>
                      <div className="text-sm text-green-700">
                        {booking.cleaner && <span>Cleaner: {booking.cleaner}</span>}
                        {booking.cleaner && (booking.cleaningDate || booking.cleaningTime) && <span> • </span>}
                        {booking.cleaningDate && (
                          <span>
                            Date: {new Date(booking.cleaningDate).toLocaleDateString()}
                          </span>
                        )}
                        {booking.cleaningDate && booking.cleaningTime && <span> • </span>}
                        {booking.cleaningTime && (
                          <span>
                            Time: {booking.cleaningTime}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const AddBookingForm = ({ onSave, onCancel }) => {
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
  };

  const IntegrationsModal = ({ onClose }) => {
    const [settings, setSettings] = useState(integrationSettings);
    const [icalConfig, setIcalConfig] = useState(icalSettings);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState('');

    const handleSave = () => {
      setIntegrationSettings(settings);
      setIcalSettings(icalConfig);
      
      Object.keys(settings).forEach(key => {
        localStorage.setItem(key, settings[key].toString());
      });
      
      Object.keys(icalConfig).forEach(key => {
        localStorage.setItem(key, icalConfig[key].toString());
      });
      
      // Update the main state immediately
      const updatedIcalSettings = {
        gardensAirbnbUrl: icalConfig.gardensAirbnbUrl,
        gardensRiparideUrl: icalConfig.gardensRiparideUrl,
        watersAirbnbUrl: icalConfig.watersAirbnbUrl,
        watersRiparideUrl: icalConfig.watersRiparideUrl,
        icalEnabled: icalConfig.icalEnabled,
        lastSync: icalConfig.lastSync,
        autoSyncInterval: icalConfig.autoSyncInterval
      };
      setIcalSettings(updatedIcalSettings);
      
      setSyncStatus('Settings saved successfully!');
      setTimeout(() => setSyncStatus(''), 3000);
    };

    const testZapier = async () => {
      if (!settings.zapierWebhookUrl) {
        alert('Please enter a Zapier webhook URL first');
        return;
      }
      
      try {
        await fetch(settings.zapierWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'test',
            message: 'Test from Jacky Winter Properties',
            timestamp: new Date().toISOString()
          })
        });
        alert('Test webhook sent to Zapier successfully!');
      } catch (error) {
        alert('Failed to send test webhook: ' + error.message);
      }
    };

    const testSMS = () => {
      if (!settings.twilioPhoneNumber) {
        alert('Please enter your Twilio phone number first');
        return;
      }
      alert(`Test SMS would be sent from ${settings.twilioPhoneNumber}: "Test message from Jacky Winter Properties booking system"`);
    };

    const testWebhookReceiver = () => {
      const testRiparideData = {
        action: 'email_booking_update',
        emailSource: 'riparide',
        emailSubject: 'You\'ve accepted a booking request',
        emailBody: 'Customer: Mae Mactier\nPhone: +61 412 345 678\nProperty: Jacky Winter Gardens',
        extractedData: {
          firstName: 'Mae',
          lastName: 'Mactier',
          phone: '+61 412 345 678'
        }
      };
      
      window.processBookingWebhook(testRiparideData);
      alert('Test webhook sent! Check console for details and check if Mae Mactier\'s booking was updated with phone number.');
    };

    const testIcalSync = async () => {
      if (!icalConfig.gardensAirbnbUrl && !icalConfig.gardensRiparideUrl && 
          !icalConfig.watersAirbnbUrl && !icalConfig.watersRiparideUrl) {
        setSyncStatus('❌ Please enter at least one iCal URL first');
        setTimeout(() => setSyncStatus(''), 3000);
        return;
      }
      
      setIsSyncing(true);
      setSyncStatus('🔄 Starting iCal sync...');
      console.log('Manual sync started with config:', icalConfig);
      
      try {
        let feedCount = 0;
        
        // Count active feeds
        if (icalConfig.gardensAirbnbUrl) feedCount++;
        if (icalConfig.gardensRiparideUrl) feedCount++;
        if (icalConfig.watersAirbnbUrl) feedCount++;
        if (icalConfig.watersRiparideUrl) feedCount++;
        
        setSyncStatus(`📡 Fetching ${feedCount} calendar feeds...`);
        
        // Pass the current config directly to sync function
        const bookingCount = await syncIcalFeeds(icalConfig);
        
        setSyncStatus(`✅ Sync completed! Imported ${bookingCount} bookings from ${feedCount} feeds.`);
        
        // Update last sync time in the config
        const updatedConfig = { 
          ...icalConfig, 
          lastSync: new Date().toISOString() 
        };
        setIcalConfig(updatedConfig);
        localStorage.setItem('lastSync', new Date().toISOString());
        
      } catch (error) {
        setSyncStatus(`❌ Sync failed: ${error.message}`);
        console.error('iCal sync error:', error);
      } finally {
        setIsSyncing(false);
        setTimeout(() => setSyncStatus(''), 8000);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-screen overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">Integration Settings</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* iCal Sync Section */}
            <div className="bg-indigo-50 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="text-indigo-600" size={20} />
                <h4 className="font-semibold text-indigo-800">iCal Feed Sync</h4>
                <label className="ml-auto flex items-center">
                  <input
                    type="checkbox"
                    checked={icalConfig.icalEnabled}
                    onChange={(e) => setIcalConfig({...icalConfig, icalEnabled: e.target.checked})}
                    className="mr-2"
                  />
                  Enabled
                </label>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Gardens - Airbnb iCal URL</label>
                    <input
                      type="url"
                      value={icalConfig.gardensAirbnbUrl}
                      onChange={(e) => setIcalConfig({...icalConfig, gardensAirbnbUrl: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      placeholder="https://calendar.airbnb.com/calendar/ical/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Gardens - Riparide iCal URL</label>
                    <input
                      type="url"
                      value={icalConfig.gardensRiparideUrl}
                      onChange={(e) => setIcalConfig({...icalConfig, gardensRiparideUrl: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      placeholder="https://riparide.com/calendar/ical/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Waters - Airbnb iCal URL</label>
                    <input
                      type="url"
                      value={icalConfig.watersAirbnbUrl}
                      onChange={(e) => setIcalConfig({...icalConfig, watersAirbnbUrl: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      placeholder="https://calendar.airbnb.com/calendar/ical/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Waters - Riparide iCal URL</label>
                    <input
                      type="url"
                      value={icalConfig.watersRiparideUrl}
                      onChange={(e) => setIcalConfig({...icalConfig, watersRiparideUrl: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                      placeholder="https://riparide.com/calendar/ical/..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Auto-sync Interval (minutes)</label>
                    <select
                      value={icalConfig.autoSyncInterval}
                      onChange={(e) => setIcalConfig({...icalConfig, autoSyncInterval: e.target.value})}
                      className="w-full border border-gray-300 rounded px-3 py-2"
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="180">3 hours</option>
                      <option value="360">6 hours</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Last Sync</label>
                    <div className="text-sm text-gray-500 p-2 bg-gray-100 rounded">
                      {icalConfig.lastSync ? new Date(icalConfig.lastSync).toLocaleString() : 'Never'}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={testIcalSync}
                    disabled={isSyncing}
                    className={`px-4 py-2 rounded flex items-center gap-2 ${
                      isSyncing 
                        ? 'bg-gray-400 text-white cursor-not-allowed' 
                        : 'bg-indigo-500 text-white hover:bg-indigo-600'
                    }`}
                  >
                    {isSyncing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Syncing...
                      </>
                    ) : (
                      'Sync Now'
                    )}
                  </button>
                  <div className="text-xs text-indigo-600 flex items-center">
                    💡 Get iCal URLs from Airbnb, Booking.com settings
                  </div>
                </div>
                
                {syncStatus && (
                  <div className={`p-3 rounded text-sm ${
                    syncStatus.includes('✅') ? 'bg-green-100 text-green-800' :
                    syncStatus.includes('❌') ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {syncStatus}
                  </div>
                )}
              </div>
            </div>

            {/* Zapier Section */}
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
                <div className="flex gap-2">
                  <button
                    onClick={testZapier}
                    className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
                  >
                    Test Zapier Connection
                  </button>
                  <button
                    onClick={testWebhookReceiver}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Test Email Webhook
                  </button>
                </div>
                <div className="mt-2 p-2 bg-orange-100 rounded text-xs">
                  <strong>Email Webhook URL:</strong> window.processBookingWebhook()
                  <br />
                  <em>In production, this would be: https://yourdomain.com/webhook/booking-emails</em>
                </div>
              </div>
            </div>

            {/* Twilio Section */}
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

            {/* Email Automation Setup */}
            <div className="bg-green-50 p-4 rounded-lg border">
              <h5 className="font-medium text-green-800 mb-3">📧 Email Automation Setup</h5>
              <div className="text-sm text-green-700 space-y-2">
                <p><strong>Riparide Bookings:</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• Email from: notifications@riparide.com</li>
                  <li>• Subject contains: "you've accepted a booking request"</li>
                  <li>• Extract: Customer phone number (listed under customer name)</li>
                  <li>• Updates incomplete bookings with source 'riparide'</li>
                </ul>
                
                <p className="pt-2"><strong>Airbnb Bookings:</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>• Email from: automated@airbnb.com</li>
                  <li>• Subject contains: "New booking confirmed!"</li>
                  <li>• Format: "New booking confirmed! (name) arrives (date)"</li>
                  <li>• Extract: Guest name, arrival date, contact info</li>
                </ul>
                
                <p className="pt-2"><strong>Webhook Data Format:</strong></p>
                <div className="bg-white p-2 rounded text-xs font-mono">
{`{
  "action": "email_booking_update",
  "emailSource": "riparide|airbnb", 
  "extractedData": {
    "firstName": "John",
    "lastName": "Smith",
    "phone": "+1234567890",
    "checkIn": "2025-06-20"
  }
}`}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h5 className="font-medium mb-2">Integration Info</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• iCal feeds automatically import all bookings from platforms</li>
                <li>• Zapier webhooks trigger on booking create/update/delete</li>
                <li>• SMS notifications sent for booking confirmations</li>
                <li>• Manual SMS reminders available in booking details</li>
                <li>• All integrations respect guest privacy settings</li>
              </ul>
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
              {syncStatus ? 'Close' : 'Cancel'}
            </button>
          </div>
          
          {syncStatus && (
            <div className="mt-3 text-center text-sm text-gray-600">
              💡 Tip: Save settings first, then test sync for best results
            </div>
          )}
        </div>
      </div>
    );
  };

  const BookingDetailModal = ({ booking, onClose, onUpdate, bookings, setBookings }) => {
    const [bookingData, setBookingData] = useState({
      ...booking,
      firstName: booking.firstName || '',
      lastName: booking.lastName || '',
      phone: booking.phone || '',
      email: booking.email || '',
      notes: booking.notes || '',
      cleaner: booking.cleaner || '',
      cleaningDate: booking.cleaningDate || '',
      cleaningTime: booking.cleaningTime || ''
    });

    const handleSave = () => {
      onUpdate(bookingData);
      onClose();
    };

    const handleDelete = () => {
      const updatedBookings = bookings.filter(b => b.id !== booking.id);
      setBookings(updatedBookings);
      localStorage.setItem('jackyWinterBookings', JSON.stringify(updatedBookings));
      sendToZapier('deleted', booking);
      onClose();
    };

    const handleSendConfirmation = () => {
      sendBookingConfirmation(bookingData);
    };

    const handleSendReminder = () => {
      sendCheckInReminder(bookingData);
    };

    return (
      <div 
        className="fixed inset-0 flex items-center justify-center"
        style={{
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 9999,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto"
          style={{
            position: 'relative',
            zIndex: 10000
          }}
          onClick={(e) => e.stopPropagation()}
        >
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
              className="p-2 text-gray-600 hover:text-red-600"
              style={{ fontSize: '24px' }}
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

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3">Booking Information</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Property</label>
                  <select
                    value={bookingData.property}
                    onChange={(e) => setBookingData({ ...bookingData, property: e.target.value })}
                    className="w-full border-2 border-blue-500 rounded px-3 py-2 bg-white font-medium"
                  >
                    <option value="Jacky Winter Gardens">Jacky Winter Gardens</option>
                    <option value="Jacky Winter Waters">Jacky Winter Waters</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Check In Date</label>
                  <input
                    type="date"
                    value={bookingData.checkIn}
                    onChange={(e) => setBookingData({ ...bookingData, checkIn: e.target.value })}
                    className="w-full border-2 border-blue-500 rounded px-3 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Check Out Date</label>
                  <input
                    type="date"
                    value={bookingData.checkOut}
                    onChange={(e) => setBookingData({ ...bookingData, checkOut: e.target.value })}
                    className="w-full border-2 border-blue-500 rounded px-3 py-2 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3">Cleaning Schedule</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Cleaner Name</label>
                  <input
                    type="text"
                    value={bookingData.cleaner}
                    onChange={(e) => setBookingData({ ...bookingData, cleaner: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Enter cleaner name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Cleaning Date</label>
                  <input
                    type="date"
                    value={bookingData.cleaningDate}
                    onChange={(e) => setBookingData({ ...bookingData, cleaningDate: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Cleaning Time</label>
                  <input
                    type="text"
                    value={bookingData.cleaningTime}
                    onChange={(e) => setBookingData({ ...bookingData, cleaningTime: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="e.g. 10:00 AM"
                  />
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3">Notes</h4>
              <textarea
                value={bookingData.notes}
                onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 h-24 resize-vertical"
                placeholder="Add any special notes or requirements..."
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={handleSave}
                style={{
                  flex: 1,
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Save Changes
              </button>
              {booking.source === 'manual' && (
                <button
                  onClick={handleDelete}
                  style={{
                    backgroundColor: '#ef4444',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  Delete
                </button>
              )}
            </div>

            {integrationSettings.smsNotificationsEnabled && bookingData.phone && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border">
                <h5 className="font-medium text-blue-800 mb-3">SMS Actions</h5>
                <div className="flex gap-2">
                  <button
                    onClick={handleSendConfirmation}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2"
                  >
                    <Send size={16} />
                    Send Confirmation
                  </button>
                  <button
                    onClick={handleSendReminder}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center gap-2"
                  >
                    <Send size={16} />
                    Send Reminder
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const Navigation = () => {
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
  };

  const MissingDataAlert = () => {
    const incompleteBookings = bookings.filter(booking => 
      !booking.firstName || !booking.lastName || !booking.phone || !booking.email
    );

    if (incompleteBookings.length === 0) return null;

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={18} className="text-yellow-600" />
          <h3 className="font-semibold text-yellow-800">Incomplete Booking Information</h3>
        </div>
        <p className="text-yellow-700 text-sm mb-3">
          {incompleteBookings.length} booking(s) are missing guest details. Click on them to complete the information.
        </p>
        <div className="space-y-2">
          {incompleteBookings.map(booking => (
            <div 
              key={booking.id}
              onClick={() => setSelectedBooking(booking)}
              className="flex items-center justify-between bg-white p-2 rounded border cursor-pointer hover:bg-gray-50"
            >
              <span className="text-sm">
                {booking.firstName || 'Unknown'} {booking.lastName || 'Guest'} - {booking.property}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(booking.checkIn).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <Navigation />
        <MissingDataAlert />
        
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
            bookings={bookings}
            setBookings={setBookings}
          />
        )}
      </div>
    </div>
  );
}

export default App;
