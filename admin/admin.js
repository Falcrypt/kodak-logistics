// admin/admin.js - COMPLETE REWRITE FOR SECURITY (with booking reference)
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
      headers: { 'Authorization': `Bearer ${token}` }
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

      console.log('🔍 Attempting to fetch from:', `${API_URL}/auth/login`);
      
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
  const navLinks = document.querySelectorAll('.sidebar-nav a[data-section]');
  
  navLinks.forEach(link => {
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
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };
  
  try {
    console.log(`📡 API Call: ${options.method || 'GET'} ${endpoint}`);
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });
    
    if (response.status === 401) {
      logout('Session expired');
      return null;
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    
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
    
    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
      statsGrid.innerHTML = `
        <div class="stat-card">
          <i class="fas fa-calendar-alt stat-icon"></i>
          <div class="stat-info">
            <h3>Today's Bookings</h3>
            <p>${stats.today || 0}</p>
          </div>
        </div>
        <div class="stat-card">
          <i class="fas fa-clock stat-icon"></i>
          <div class="stat-info">
            <h3>Pending</h3>
            <p>${stats.pending || 0}</p>
          </div>
        </div>
        <div class="stat-card">
          <i class="fas fa-check-circle stat-icon"></i>
          <div class="stat-info">
            <h3>Confirmed</h3>
            <p>${stats.confirmed || 0}</p>
          </div>
        </div>
        <div class="stat-card">
          <i class="fas fa-money-bill-wave stat-icon"></i>
          <div class="stat-info">
            <h3>Revenue (₵)</h3>
            <p>${(stats.revenue || 0).toFixed(2)}</p>
          </div>
        </div>
      `;
    }
    
    await loadRecentBookings();
    
  } catch (error) {
    console.error('❌ Dashboard load failed:', error);
    loadRecentBookings().catch(e => console.error(e));
  }
}

async function loadRecentBookings() {
  try {
    console.log("📚 Fetching recent bookings...");
    const data = await apiCall('/bookings?limit=5');
    let bookings = data && data.bookings ? data.bookings : (Array.isArray(data) ? data : []);
    console.log("📚 Recent bookings received:", bookings);
    displayRecentBookings(bookings);
  } catch (error) {
    console.error('❌ Failed to load recent bookings:', error);
    displayRecentBookings([]);
  }
}

function displayRecentBookings(bookings) {
  const tbody = document.getElementById('recentBookingsBody');
  if (!tbody) {
    console.error("❌ Could not find recentBookingsBody element");
    return;
  }
  
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
      <td>
        <button class="action-btn btn-whatsapp" onclick="contactCustomer('${escapeHtml(phone)}')">
          <i class="fab fa-whatsapp"></i>
        </button>
      </td>
    </tr>`;
  }).join('');
}

// ========== BOOKINGS ==========
let currentPage = 1;
let totalPages = 1;
let currentFilters = { search: '', status: 'all' };

async function loadAllBookings(page = 1, filters = {}) {
  try {
    currentPage = page;
    currentFilters = { ...currentFilters, ...filters };
    
    const queryParams = new URLSearchParams({
      page: currentPage,
      limit: 20,
      search: currentFilters.search,
      status: currentFilters.status
    });
    
    const data = await apiCall(`/bookings?${queryParams}`);
    if (!data) return;
    
    displayAllBookings(data.bookings || []);
    totalPages = data.pages || 1;
    updatePagination();
  } catch (error) {
    console.error('Failed to load bookings:', error);
    displayAllBookings([]);
  }
}

function displayAllBookings(bookings) {
  const tbody = document.getElementById('allBookingsBody');
  if (!tbody) {
    console.error("❌ Could not find allBookingsBody element");
    return;
  }
  
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
      <td>
        <select class="status-select" onchange="updateBookingStatus(${id}, this.value)">
          <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="confirmed" ${status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
          <option value="completed" ${status === 'completed' ? 'selected' : ''}>Completed</option>
        </select>
      </td>
      <td>
        <button class="action-btn btn-whatsapp" onclick="contactCustomer('${escapeHtml(phone)}')">
          <i class="fab fa-whatsapp"></i>
        </button>
      </td>
    </tr>`;
  }).join('');
}

function updatePagination() {
  const pagination = document.getElementById('pagination');
  if (!pagination) return;
  
  let html = '';
  if (currentPage > 1) {
    html += `<button onclick="loadAllBookings(${currentPage - 1})">Previous</button>`;
  }
  
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      html += `<button class="active">${i}</button>`;
    } else if (Math.abs(i - currentPage) < 3 || i === 1 || i === totalPages) {
      html += `<button onclick="loadAllBookings(${i})">${i}</button>`;
    } else if (Math.abs(i - currentPage) === 3) {
      html += `<button disabled>...</button>`;
    }
  }
  
  if (currentPage < totalPages) {
    html += `<button onclick="loadAllBookings(${currentPage + 1})">Next</button>`;
  }
  pagination.innerHTML = html;
}

async function updateBookingStatus(bookingId, status) {
  if (!confirm('Update booking status?')) return;
  
  try {
    await apiCall(`/bookings/${bookingId}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
    
    showNotification('Status updated', 'success');
    await loadAllBookings(currentPage, currentFilters);
    await loadDashboardData();
  } catch (error) {
    showNotification('Update failed', 'error');
  }
}

// ========== CUSTOMERS ==========
async function loadCustomers() {
  try {
    console.log("👥 Loading customers...");
    const customers = await apiCall('/customers');
    displayCustomers(customers || []);
  } catch (error) {
    console.error('Failed to load customers:', error);
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
      <td>${escapeHtml(customer.name || '')}</td>
      <td>${escapeHtml(customer.phone || '')}</td>
      <td>${escapeHtml(customer.email || '')}</td>
      <td>${escapeHtml(customer.total_bookings || 0)}</td>
      <td>${escapeHtml(customer.last_booking || '')}</td>
      <td>
        <button class="action-btn btn-whatsapp" onclick="contactCustomer('${escapeHtml(customer.phone)}')">
          <i class="fab fa-whatsapp"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// ========== SETTINGS ==========
async function loadSettings() {
  try {
    console.log("⚙️ Loading settings...");
    const settings = await apiCall('/settings');
    if (!settings) return;
    
    const whatsappInput = document.getElementById('whatsappNumber');
    const emailInput = document.getElementById('businessEmail');
    const priceSmall = document.getElementById('priceSmall');
    const priceMedium = document.getElementById('priceMedium');
    const priceBig = document.getElementById('priceBig');
    const priceFridge = document.getElementById('priceFridge');
    
    if (whatsappInput) whatsappInput.value = settings.whatsapp_number || '';
    if (emailInput) emailInput.value = settings.business_email || '';
    if (priceSmall) priceSmall.value = settings.price_small || 40;
    if (priceMedium) priceMedium.value = settings.price_medium || 50;
    if (priceBig) priceBig.value = settings.price_big || 60;
    if (priceFridge) priceFridge.value = settings.price_fridge || 70;
    
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

async function savePricing() {
  const prices = {
    price_small: document.getElementById('priceSmall')?.value || 40,
    price_medium: document.getElementById('priceMedium')?.value || 50,
    price_big: document.getElementById('priceBig')?.value || 60,
    price_fridge: document.getElementById('priceFridge')?.value || 70
  };
  
  try {
    await apiCall('/settings', {
      method: 'PUT',
      body: JSON.stringify(prices)
    });
    
    showMessage('pricingMessage', 'Pricing saved!', 'success');
    
  } catch (error) {
    showMessage('pricingMessage', 'Save failed', 'error');
  }
}

async function saveSettings() {
  const settings = {
    whatsapp_number: document.getElementById('whatsappNumber')?.value || '',
    business_email: document.getElementById('businessEmail')?.value || ''
  };
  
  const newPassword = document.getElementById('newPassword')?.value;
  const currentPassword = document.getElementById('currentPassword')?.value;
  const confirmPassword = document.getElementById('confirmPassword')?.value;
  
  if (newPassword) {
    if (newPassword !== confirmPassword) {
      showMessage('settingsMessage', 'Passwords do not match', 'error');
      return;
    }
    
    if (newPassword.length < 8) {
      showMessage('settingsMessage', 'Password must be at least 8 characters', 'error');
      return;
    }
    
    settings.current_password = currentPassword;
    settings.new_password = newPassword;
  }
  
  try {
    await apiCall('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
    
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
  return unsafe
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
  
  document.querySelectorAll('.content-section').forEach(s => {
    s.classList.remove('active-section');
  });
  
  const targetSection = document.getElementById(sectionId + '-section');
  if (targetSection) {
    targetSection.classList.add('active-section');
  } else {
    console.error("❌ Section not found:", sectionId + '-section');
    return;
  }
  
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.classList.remove('active');
  });
  
  const activeLink = document.querySelector(`.sidebar-nav a[data-section="${sectionId}"]`);
  if (activeLink) activeLink.classList.add('active');
  
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) pageTitle.textContent = sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
  
  if (sectionId === 'bookings') loadAllBookings();
  if (sectionId === 'customers') loadCustomers();
  if (sectionId === 'settings') loadSettings();
  if (sectionId === 'pricing') loadSettings();
}

function setupEventListeners() {
  let searchTimeout;
  const searchInput = document.getElementById('searchBooking');
  const statusFilter = document.getElementById('statusFilter');
  
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadAllBookings(1, { 
          search: this.value, 
          status: statusFilter ? statusFilter.value : 'all' 
        });
      }, 300);
    });
  }
  
  if (statusFilter) {
    statusFilter.addEventListener('change', function() {
      loadAllBookings(1, { 
        search: searchInput ? searchInput.value : '', 
        status: this.value 
      });
    });
  }
  
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportBookings);
  }
}

async function exportBookings() {
  try {
    const data = await apiCall('/bookings/export');
    if (!data) return;
    
    const headers = ['Reference', 'Date', 'Name', 'Phone', 'Hostel', 'Items', 'Total', 'Status'];
    const rows = data.map(b => [
      b.booking_ref || '',
      b.booking_date || b.date || '',
      b.customer_name || b.name || '',
      b.customer_phone || b.phone || '',
      b.hostel_name || b.hostel || '',
      b.items_summary || b.items || '',
      b.total_amount || b.total || '0',
      b.status || 'pending'
    ]);
    
    const csv = [headers, ...rows].map(row => 
      row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
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