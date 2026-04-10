// admin/admin.js - COMPLETE WORKING VERSION with Customer Details & Reset
const API_URL = 'https://kodak-logistics-api.onrender.com/api';
console.log('🚀 Admin JS loaded');
console.log('🔗 API URL:', API_URL);

let currentUser = null;
let sessionCheckInterval;

// ========== AUTHENTICATION ==========
async function checkAuth() {
  const token = localStorage.getItem('adminToken');
  
  if (!token) {
    if (!window.location.pathname.includes('index.html')) {
      window.location.href = 'index.html';
    }
    return false;
  }
  
  try {
    const response = await fetch(`${API_URL}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      currentUser = data.user;
      const adminNameEl = document.getElementById('adminName');
      if (adminNameEl) adminNameEl.textContent = currentUser.username;
      startSessionMonitor();
      return true;
    } else {
      logout();
      return false;
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    return false;
  }
}

// ========== LOGIN FORM ==========
document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const loginBtn = document.getElementById('loginBtn');
      const errorDiv = document.getElementById('loginError');
      
      loginBtn.disabled = true;
      loginBtn.textContent = 'Logging in...';
      errorDiv.style.display = 'none';

      try {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.token) {
          localStorage.setItem('adminToken', data.token);
          window.location.href = 'dashboard.html';
        } else {
          errorDiv.textContent = data.error || 'Invalid credentials';
          errorDiv.style.display = 'block';
        }
      } catch (error) {
        console.error('Login fetch error:', error);
        errorDiv.textContent = 'Connection error';
        errorDiv.style.display = 'block';
      } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login to Dashboard';
      }
    });
  }
  
  if (window.location.pathname.includes('dashboard.html')) {
    checkAuth().then(isAuthed => {
      if (isAuthed) {
        loadDashboardData();
        loadAllBookings();
        loadCustomers();
        loadSettings();
        setupEventListeners();
        setupNavigation();
      }
    });
  }
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      logout();
    });
  }
});

// ========== NAVIGATION SETUP ==========
function setupNavigation() {
  console.log('🔧 Setting up navigation...');
  document.querySelectorAll('.sidebar-nav a[data-section]').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const sectionId = this.dataset.section;
      console.log('📌 Navigation clicked:', sectionId);
      showSection(sectionId);
    });
  });
}

// ========== SESSION MANAGEMENT ==========
function startSessionMonitor() {
  if (sessionCheckInterval) clearInterval(sessionCheckInterval);
  sessionCheckInterval = setInterval(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiry = payload.exp * 1000;
        const timeLeft = expiry - Date.now();
        if (timeLeft < 5 * 60 * 1000) showSessionWarning();
        if (timeLeft <= 0) logout('Session expired');
      } catch (e) {}
    }
  }, 60000);
}

function showSessionWarning() {
  const warning = document.getElementById('sessionWarning');
  if (warning) warning.style.display = 'block';
}

async function extendSession() {
  document.getElementById('sessionWarning').style.display = 'none';
}

async function logout(reason = '') {
  clearInterval(sessionCheckInterval);
  localStorage.removeItem('adminToken');
  window.location.href = 'index.html' + (reason ? '?reason=' + reason : '');
}

// ========== API HELPER ==========
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('adminToken');
  console.log(`🔑 Token: ${token ? token.substring(0, 20) + '...' : 'NOT FOUND'}`);
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };
  
  try {
    console.log(`📡 API Call: ${options.method || 'GET'} ${endpoint}`);
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    console.log(`📡 Response Status: ${response.status}`);
    
    if (response.status === 401) {
      console.error('❌ Unauthorized! Token may be invalid or expired.');
      logout('Session expired');
      return null;
    }
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ API call failed:', error);
    throw error;
  }
}

// ========== DASHBOARD ==========
async function loadDashboardData() {
  try {
    console.log('📊 Loading dashboard data...');
    const stats = await apiCall('/bookings/stats');
    if (!stats) return;
    
    const revenue = typeof stats.revenue === 'number' ? stats.revenue : parseFloat(stats.revenue) || 0;
    
    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
      statsGrid.innerHTML = `
        <div class="stat-card"><i class="fas fa-calendar-alt stat-icon"></i><div class="stat-info"><h3>Today's Bookings</h3><p>${stats.today || 0}</p></div></div>
        <div class="stat-card"><i class="fas fa-clock stat-icon"></i><div class="stat-info"><h3>Pending</h3><p>${stats.pending || 0}</p></div></div>
        <div class="stat-card"><i class="fas fa-check-circle stat-icon"></i><div class="stat-info"><h3>Confirmed</h3><p>${stats.confirmed || 0}</p></div></div>
        <div class="stat-card"><i class="fas fa-money-bill-wave stat-icon"></i><div class="stat-info"><h3>Revenue (₵)</h3><p>${revenue.toFixed(2)}</p></div></div>
      `;
    }
    await loadRecentBookings();
  } catch (error) {
    console.error('❌ Dashboard load failed:', error);
  }
}

async function loadRecentBookings() {
  try {
    console.log("📚 Fetching recent bookings...");
    const data = await apiCall('/bookings?limit=5');
    const bookings = data && data.bookings ? data.bookings : [];
    displayRecentBookings(bookings);
  } catch (error) {
    console.error('❌ Failed to load recent bookings:', error);
    displayRecentBookings([]);
  }
}

function displayRecentBookings(bookings) {
  const tbody = document.getElementById('recentBookingsBody');
  if (!tbody) return;
  if (!bookings || bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6">No recent bookings</td></tr>';
    return;
  }
  tbody.innerHTML = bookings.map(booking => {
    const date = booking.booking_date || booking.date || '';
    const name = booking.customer_name || booking.name || '';
    const items = booking.items_summary || booking.items || '';
    const total = booking.total_amount || booking.total || '0';
    const status = booking.status || 'pending';
    const phone = booking.customer_phone || booking.phone || '';
    return `<tr>
      <td>${escapeHtml(date)}</td>
      <td>${escapeHtml(name)}</td>
      <td>${escapeHtml(items.substring(0, 30))}...</td>
      <td>₵${escapeHtml(total)}</td>
      <td><span class="status-badge status-${escapeHtml(status)}">${escapeHtml(status)}</span></td>
      <td><button class="action-btn btn-whatsapp" onclick="contactCustomer('${escapeHtml(phone)}')"><i class="fab fa-whatsapp"></i></button></td>
    </tr>`;
  }).join('');
}

// ========== BOOKINGS ==========
async function loadAllBookings() {
  try {
    console.log("📚 Loading all bookings...");
    const data = await apiCall('/bookings');
    const bookings = data && data.bookings ? data.bookings : [];
    displayAllBookings(bookings);
  } catch (error) {
    console.error('❌ Failed to load bookings:', error);
    displayAllBookings([]);
  }
}

function displayAllBookings(bookings) {
  const tbody = document.getElementById('allBookingsBody');
  if (!tbody) return;
  if (!bookings || bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10">No bookings found</td></tr>';
    return;
  }
  tbody.innerHTML = bookings.map(booking => {
    const ref = booking.booking_ref || '';
    const id = booking.id || '';
    const date = booking.booking_date || booking.date || '';
    const name = booking.customer_name || booking.name || '';
    const phone = booking.customer_phone || booking.phone || '';
    const hostel = booking.hostel_name || booking.hostel || '';
    const items = booking.items_summary || booking.items || '';
    const total = booking.total_amount || booking.total || '0';
    const status = booking.status || 'pending';
    return `<tr>
      <td>${escapeHtml(ref)}</td>
      <td>#${escapeHtml(id)}</td>
      <td>${escapeHtml(date)}</td>
      <td>${escapeHtml(name)}</td>
      <td>${escapeHtml(phone)}</td>
      <td>${escapeHtml(hostel)}</td>
      <td>${escapeHtml(items.substring(0, 20))}</td>
      <td>₵${escapeHtml(total)}</td>
      <td><select class="status-select" onchange="updateBookingStatus(${id}, this.value)">
        <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
        <option value="confirmed" ${status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
        <option value="completed" ${status === 'completed' ? 'selected' : ''}>Completed</option>
      </select></td>
      <td><button class="action-btn btn-whatsapp" onclick="contactCustomer('${escapeHtml(phone)}')"><i class="fab fa-whatsapp"></i></button></td>
    </tr>`;
  }).join('');
}

async function updateBookingStatus(bookingId, status) {
  if (!confirm('Update booking status?')) return;
  try {
    await apiCall(`/bookings/${bookingId}`, { method: 'PUT', body: JSON.stringify({ status }) });
    showNotification('Status updated', 'success');
    await loadAllBookings();
    await loadDashboardData();
  } catch (error) {
    showNotification('Update failed', 'error');
  }
}

// ========== CUSTOMERS (UPDATED with clickable names) ==========
async function loadCustomers() {
  try {
    const customers = await apiCall('/customers');
    displayCustomers(customers || []);
  } catch (error) {
    displayCustomers([]);
  }
}

function displayCustomers(customers) {
  const tbody = document.getElementById('customersBody');
  if (!tbody) return;
  if (!customers || customers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6">No customers found</td></tr>';
    return;
  }
  tbody.innerHTML = customers.map(customer => `
    <tr>
      <td><a href="#" onclick="viewCustomerDetails('${escapeHtml(customer.phone)}'); return false;" style="color: #ffb347; text-decoration: underline; cursor: pointer;">${escapeHtml(customer.name || '')}</a></td>
      <td>${escapeHtml(customer.phone || '')}</td>
      <td>${escapeHtml(customer.email || '')}</td>
      <td>${escapeHtml(customer.total_bookings || 0)}</td>
      <td>${escapeHtml(customer.last_booking || '')}</td>
      <td><button class="action-btn btn-whatsapp" onclick="contactCustomer('${escapeHtml(customer.phone)}')"><i class="fab fa-whatsapp"></i></button></td>
    </tr>
  `).join('');
}

// ========== CUSTOMER DETAILS MODAL ==========
window.viewCustomerDetails = async function(phone) {
  console.log('🔍 Fetching customer details for:', phone);
  
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_URL}/bookings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    const bookings = data.bookings || [];
    
    const customerBookings = bookings.filter(b => b.customer_phone === phone);
    
    if (customerBookings.length === 0) {
      alert('No bookings found for this customer');
      return;
    }
    
    const customer = customerBookings[0];
    const customerName = customer.customer_name;
    
    document.getElementById('modalCustomerName').textContent = customerName;
    document.getElementById('modalCustomerPhone').textContent = `📞 Phone: ${phone} | 📧 Email: ${customer.customer_email}`;
    
    const tableBody = document.getElementById('modalBookingsTableBody');
    tableBody.innerHTML = '';
    
    customerBookings.forEach(booking => {
      const row = tableBody.insertRow();
      row.innerHTML = `
        <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(booking.booking_ref || 'N/A')}<\/td>
        <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(booking.booking_date || 'N/A')}<\/td>
        <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(booking.items_summary || 'N/A')}<\/td>
        <td style="padding: 10px; border: 1px solid #ddd;">₵${escapeHtml(booking.total_amount || '0')}<\/td>
        <td style="padding: 10px; border: 1px solid #ddd;">
          <span class="status-badge status-${escapeHtml(booking.status)}">${escapeHtml(booking.status)}<\/span>
        <\/td>
      `;
    });
    
    document.getElementById('customerModal').style.display = 'flex';
    
  } catch (error) {
    console.error('Error fetching customer details:', error);
    alert('Failed to load customer details');
  }
};

window.closeCustomerModal = function() {
  document.getElementById('customerModal').style.display = 'none';
};

// ========== RESET ALL BOOKINGS ==========
window.resetAllBookings = async function() {
  const confirm1 = confirm('⚠️ WARNING: This will delete ALL bookings permanently!\n\nAre you absolutely sure?');
  if (!confirm1) return;
  
  const confirm2 = confirm('⚠️ LAST WARNING: This action CANNOT be undone!\n\nAll customer booking data will be lost forever.\n\nClick OK to proceed.');
  if (!confirm2) return;
  
  const userInput = prompt('Type "RESET" to confirm deletion of all bookings:');
  if (userInput !== 'RESET') {
    alert('Reset cancelled. Bookings were not deleted.');
    return;
  }
  
  const confirm3 = confirm('One last confirmation: Delete ALL bookings?');
  if (!confirm3) return;
  
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_URL}/bookings/reset`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('✅ All bookings have been deleted successfully!\n\nYou can start fresh with new bookings.');
      location.reload();
    } else {
      alert('❌ Failed to delete bookings: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Reset error:', error);
    alert('❌ Failed to reset bookings. Please try again.');
  }
};

// ========== SETTINGS ==========
async function loadSettings() {
  try {
    const settings = await apiCall('/settings');
    if (!settings) return;
    const ws = document.getElementById('whatsappNumber');
    const em = document.getElementById('businessEmail');
    const ps = document.getElementById('priceSmall');
    const pm = document.getElementById('priceMedium');
    const pb = document.getElementById('priceBig');
    const pf = document.getElementById('priceFridge');
    const pg = document.getElementById('priceGas');
    if (ws) ws.value = settings.whatsapp_number || '';
    if (em) em.value = settings.business_email || '';
    if (ps) ps.value = settings.price_small || 40;
    if (pm) pm.value = settings.price_medium || 50;
    if (pb) pb.value = settings.price_big || 60;
    if (pf) pf.value = settings.price_fridge || 70;
    if (pg) pg.value = settings.price_gas || 60;
    console.log('📦 Loaded gas price:', settings.price_gas);
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// ========== SAVE PRICING ==========
async function savePricing() {
  const gasElement = document.getElementById('priceGas');
  const gasValue = gasElement ? gasElement.value : 'not found';
  console.log('🔍 Gas input found:', !!gasElement);
  console.log('🔍 Gas value:', gasValue);
  
  const prices = {
    price_small: document.getElementById('priceSmall')?.value || 40,
    price_medium: document.getElementById('priceMedium')?.value || 50,
    price_big: document.getElementById('priceBig')?.value || 60,
    price_fridge: document.getElementById('priceFridge')?.value || 70,
    price_gas: gasValue || 60
  };
  
  console.log('📦 Saving prices:', prices);
  
  const saveButton = document.querySelector('#pricing-section .btn-save');
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
  }

  try {
    const result = await apiCall('/settings', { method: 'PUT', body: JSON.stringify(prices) });
    
    if (result && result.success) {
      showMessage('pricingMessage', 'Pricing saved!', 'success');
      await loadSettings();
    } else {
      throw new Error(result?.error || 'Unknown error from server');
    }
  } catch (error) {
    console.error('❌ Save error:', error);
    showMessage('pricingMessage', `Save failed: ${error.message}`, 'error');
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = 'Save Pricing';
    }
  }
}

async function saveSettings() {
  const settings = {
    whatsapp_number: document.getElementById('whatsappNumber')?.value || '',
    business_email: document.getElementById('businessEmail')?.value || ''
  };
  const np = document.getElementById('newPassword')?.value;
  const cp = document.getElementById('currentPassword')?.value;
  const cf = document.getElementById('confirmPassword')?.value;
  if (np) {
    if (np !== cf) { showMessage('settingsMessage', 'Passwords do not match', 'error'); return; }
    if (np.length < 8) { showMessage('settingsMessage', 'Password must be at least 8 characters', 'error'); return; }
    settings.current_password = cp;
    settings.new_password = np;
  }
  try {
    await apiCall('/settings', { method: 'PUT', body: JSON.stringify(settings) });
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    showMessage('settingsMessage', 'Settings saved!', 'success');
  } catch (error) {
    showMessage('settingsMessage', error.message || 'Save failed', 'error');
  }
}

// ========== UTILITIES ==========
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe.toString().replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  }).replace(/[\"\']/g, function(m) {
    if (m === '"') return '&quot;';
    if (m === "'") return '&#039;';
    return m;
  });
}

function showMessage(elementId, message, type) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.className = `form-message ${type}`;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
  }
}

function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

function contactCustomer(phone) {
  if (phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank', 'noopener,noreferrer');
  }
}

// ========== UI FUNCTIONS ==========
function showSection(sectionId) {
  console.log("🔄 Switching to section:", sectionId);
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active-section'));
  const target = document.getElementById(sectionId + '-section');
  if (target) target.classList.add('active-section');
  else { console.error("❌ Section not found:", sectionId + '-section'); return; }
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  const active = document.querySelector(`.sidebar-nav a[data-section="${sectionId}"]`);
  if (active) active.classList.add('active');
  const title = document.getElementById('pageTitle');
  if (title) title.textContent = sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
  if (sectionId === 'bookings') loadAllBookings();
  if (sectionId === 'customers') loadCustomers();
  if (sectionId === 'settings') loadSettings();
  if (sectionId === 'pricing') loadSettings();
}

function setupEventListeners() {
  let timeout;
  const search = document.getElementById('searchBooking');
  const filter = document.getElementById('statusFilter');
  if (search) {
    search.addEventListener('input', function() {
      clearTimeout(timeout);
      timeout = setTimeout(() => console.log('Search:', this.value), 300);
    });
  }
  if (filter) {
    filter.addEventListener('change', function() { console.log('Status filter:', this.value); });
  }
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportBookings);
}

async function exportBookings() {
  try {
    const data = await apiCall('/bookings/export');
    if (!data) return;
    const headers = ['Reference', 'Date', 'Name', 'Phone', 'Hostel', 'Items', 'Total', 'Status'];
    const rows = data.map(b => [
      b.booking_ref || '', b.booking_date || b.date || '', b.customer_name || b.name || '',
      b.customer_phone || b.phone || '', b.hostel_name || b.hostel || '',
      b.items_summary || b.items || '', b.total_amount || b.total || '0', b.status || 'pending'
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    showNotification('Export failed', 'error');
  }
}

// Make functions globally available
window.showSection = showSection;
window.updateBookingStatus = updateBookingStatus;
window.contactCustomer = contactCustomer;
window.savePricing = savePricing;
window.saveSettings = saveSettings;
window.extendSession = extendSession;
window.loadAllBookings = loadAllBookings;