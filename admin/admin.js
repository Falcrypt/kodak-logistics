// admin/admin.js - UPGRADED VERSION with DELETE BOOKING & PAYMENT VERIFICATION
const API_URL = 'https://kodak-logistics-api.onrender.com/api';
console.log('🚀 Admin JS loaded - Upgraded Version with Payment Verification');

let currentUser = null;
let sessionCheckInterval = null;

// ========== SEARCH & FILTER VARIABLES ==========
let currentSearchTerm = '';
let currentStatusFilter = 'all';
let searchTimeout = null;

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
      if (adminNameEl) adminNameEl.textContent = currentUser.username || 'Admin';
      startSessionMonitor();
      return true;
    } else {
      logout();
      return false;
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    logout();
    return false;
  }
}

// ========== LOGIN FORM ==========
document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      const loginBtn = document.getElementById('loginBtn');
      const errorDiv = document.getElementById('loginError');
      
      loginBtn.disabled = true;
      loginBtn.textContent = 'Logging in...';
      if (errorDiv) errorDiv.style.display = 'none';

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
          if (errorDiv) {
            errorDiv.textContent = data.error || 'Invalid credentials';
            errorDiv.style.display = 'block';
          }
        }
      } catch (error) {
        console.error('Login error:', error);
        if (errorDiv) {
          errorDiv.textContent = 'Connection error';
          errorDiv.style.display = 'block';
        }
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
        loadAllSettings();
        setupNavigation();
        setupEventListeners();
        setupMobileMenu();
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

// ========== MOBILE MENU FUNCTIONALITY ==========
function setupMobileMenu() {
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (!mobileToggle || !sidebar) return;
    
    let overlay = document.querySelector('.menu-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'menu-overlay';
        document.body.appendChild(overlay);
    }
    
    function toggleMenu() {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
        document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
    }
    
    function closeMenu() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    window.toggleMobileMenu = toggleMenu;
    
    mobileToggle.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', closeMenu);
    
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                closeMenu();
            }
        });
    });
    
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768 && sidebar.classList.contains('open')) {
            closeMenu();
        }
    });
}

// ========== LOAD ALL SETTINGS ==========
async function loadAllSettings() {
  console.log('⚙️ Loading settings and pricing...');
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_URL}/settings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Failed to fetch settings');
    
    const settings = await response.json();
    console.log('Settings received:', settings);

    // Contact settings
    const ws = document.getElementById('whatsappNumber');
    const em = document.getElementById('businessEmail');
    if (ws) ws.value = settings.whatsapp_number || '';
    if (em) em.value = settings.business_email || '';

    // ===== BAGS =====
    const pDuffleSmall = document.getElementById('priceDuffleSmall');
    const pDuffleBig = document.getElementById('priceDuffleBig');
    if (pDuffleSmall) pDuffleSmall.value = settings.price_duffle_small || 29.99;
    if (pDuffleBig) pDuffleBig.value = settings.price_duffle_big || 49.99;
    
    const pJuteSmall = document.getElementById('priceJuteSmall');
    const pJuteMedium = document.getElementById('priceJuteMedium');
    const pJuteBig = document.getElementById('priceJuteBig');
    if (pJuteSmall) pJuteSmall.value = settings.price_jute_small || 39.99;
    if (pJuteMedium) pJuteMedium.value = settings.price_jute_medium || 59.99;
    if (pJuteBig) pJuteBig.value = settings.price_jute_big || 79.99;
    
    const pTravelSmall = document.getElementById('priceTravelSmall');
    const pTravelMedium = document.getElementById('priceTravelMedium');
    const pTravelBig = document.getElementById('priceTravelBig');
    if (pTravelSmall) pTravelSmall.value = settings.price_travel_small || 29.99;
    if (pTravelMedium) pTravelMedium.value = settings.price_travel_medium || 49.99;
    if (pTravelBig) pTravelBig.value = settings.price_travel_big || 69.99;
    
    // ===== APPLIANCES =====
    const pMicrowave = document.getElementById('priceMicrowave');
    if (pMicrowave) pMicrowave.value = settings.price_microwave || 30;
    
    const pFridgeTabletop = document.getElementById('priceFridgeTabletop');
    const pFridgeDoubledoor = document.getElementById('priceFridgeDoubledoor');
    const pFridgeSmall = document.getElementById('priceFridgeSmall');
    if (pFridgeTabletop) pFridgeTabletop.value = settings.price_fridge_tabletop || 59.99;
    if (pFridgeDoubledoor) pFridgeDoubledoor.value = settings.price_fridge_doubledoor || 79.99;
    if (pFridgeSmall) pFridgeSmall.value = settings.price_fridge_small || 39.99;
    
    // ===== GAS CYLINDERS =====
    const pGasSmall = document.getElementById('priceGasSmall');
    const pGasMedium = document.getElementById('priceGasMedium');
    const pGasBig = document.getElementById('priceGasBig');
    if (pGasSmall) pGasSmall.value = settings.price_gas_small || 29.99;
    if (pGasMedium) pGasMedium.value = settings.price_gas_medium || 34.99;
    if (pGasBig) pGasBig.value = settings.price_gas_big || 39.99;
    
    // ===== CONTAINERS =====
    const pContainerSmall = document.getElementById('priceContainerSmall');
    const pContainerBig = document.getElementById('priceContainerBig');
    if (pContainerSmall) pContainerSmall.value = settings.price_container_small || 29.99;
    if (pContainerBig) pContainerBig.value = settings.price_container_big || 49.99;
    
    // ===== FREE ITEMS =====
    const pBuckets = document.getElementById('priceBuckets');
    if (pBuckets) pBuckets.value = settings.price_buckets || 0;

    console.log('✅ Settings and pricing loaded successfully');
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// ========== NAVIGATION SETUP ==========
function setupNavigation() {
  console.log('🔧 Setting up navigation...');
  
  const navLinks = document.querySelectorAll('.sidebar-nav a[data-section]');
  
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const sectionId = this.dataset.section;
      console.log('📌 Navigation clicked:', sectionId);
      
      document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active-section');
      });
      
      const targetSection = document.getElementById(sectionId + '-section');
      if (targetSection) {
        targetSection.classList.add('active-section');
        console.log('✅ Section activated:', sectionId + '-section');
      }
      
      navLinks.forEach(link => link.classList.remove('active'));
      this.classList.add('active');
      
      const titleEl = document.getElementById('pageTitle');
      if (titleEl) {
        titleEl.textContent = sectionId === 'dashboard' ? 'Dashboard' : sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
      }
      
      // Load data based on section
      if (sectionId === 'bookings') {
        loadAllBookings();
      } else if (sectionId === 'customers') {
        loadCustomers();
      } else if (sectionId === 'pricing' || sectionId === 'settings') {
        loadAllSettings();
      } else if (sectionId === 'returns') {
        loadReturnRequests();
        loadReturnStats();
        // Setup return listeners after loading the section
        setTimeout(() => setupReturnListeners(), 100);
      }
    });
  });
}

// ========== SESSION MANAGEMENT ==========
function startSessionMonitor() {
  if (sessionCheckInterval) clearInterval(sessionCheckInterval);
  
  sessionCheckInterval = setInterval(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000;
      const timeLeft = expiry - Date.now();
      
      if (timeLeft < 5 * 60 * 1000) showSessionWarning();
      if (timeLeft <= 0) logout('Session expired');
    } catch (e) {}
  }, 60000);
}

function showSessionWarning() {
  const warning = document.getElementById('sessionWarning');
  if (warning) warning.style.display = 'block';
}

function extendSession() {
  const warning = document.getElementById('sessionWarning');
  if (warning) warning.style.display = 'none';
}

function logout(reason = '') {
  if (sessionCheckInterval) clearInterval(sessionCheckInterval);
  localStorage.removeItem('adminToken');
  window.location.href = 'index.html' + (reason ? '?reason=' + encodeURIComponent(reason) : '');
}

// ========== API HELPER ==========
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    logout();
    return null;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };

  try {
    console.log(`📡 API Call: ${options.method || 'GET'} ${endpoint}`);
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    
    if (response.status === 401) {
      logout('Session expired');
      return null;
    }
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (error) {
    console.error('❌ API call failed:', error);
    throw error;
  }
}

// ========== DASHBOARD ==========
async function loadDashboardData() {
  try {
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
        <div class="stat-card"><i class="fas fa-spinner stat-icon"></i><div class="stat-info"><h3>Pending Payments</h3><p>${stats.pending_payments || 0}</p></div></div>
      `;
    }
    await loadRecentBookings();
    loadReturnStats();
  } catch (error) {
    console.error('❌ Dashboard load failed:', error);
  }
}

async function loadRecentBookings() {
  try {
    const data = await apiCall('/bookings?limit=5');
    displayRecentBookings(data?.bookings || []);
  } catch (error) {
    console.error('❌ Failed to load recent bookings:', error);
    displayRecentBookings([]);
  }
}

function displayRecentBookings(bookings) {
  const tbody = document.getElementById('recentBookingsBody');
  if (!tbody) return;
  if (!bookings || bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7">No recent bookings</td></tr>';
    return;
  }
  tbody.innerHTML = bookings.map(booking => {
    const date = booking.booking_date || booking.date || '';
    const name = booking.customer_name || booking.name || '';
    const items = (booking.items_summary || booking.items || '').substring(0, 30) + '...';
    const total = booking.total_amount || booking.total || '0';
    const status = booking.status || 'pending';
    const phone = booking.customer_phone || booking.phone || '';
    const id = booking.id || '';
    const ref = booking.booking_ref || '';
    const paymentStatus = booking.payment_status || 'unpaid';
    
    let paymentBadge = '';
    if (paymentStatus === 'pending_verification') {
      paymentBadge = '<span class="payment-badge pending">🟡 Pending</span>';
    } else if (paymentStatus === 'verified') {
      paymentBadge = '<span class="payment-badge verified">🟢 Verified</span>';
    } else {
      paymentBadge = '<span class="payment-badge unpaid">⚪ Unpaid</span>';
    }
    
    return `<tr>
      <td>${escapeHtml(date)}</td>
      <td>${escapeHtml(name)}</td>
      <td>${escapeHtml(items)}</td>
      <td>₵${escapeHtml(total)}</td>
      <td>${paymentBadge}</td>
      <td><span class="status-badge status-${escapeHtml(status)}">${escapeHtml(status)}</span></td>
      <td>
        <button class="action-btn btn-whatsapp" onclick="contactCustomer('${escapeHtml(phone)}')"><i class="fab fa-whatsapp"></i></button>
        <button class="action-btn btn-delete" onclick="deleteSingleBooking(${id}, '${escapeHtml(ref)}')" style="background-color: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-left: 5px;"><i class="fas fa-trash"></i></button>
       </td>
     </tr>`;
  }).join('');
}

// ========== LOAD BOOKINGS WITH SEARCH & FILTER ==========
async function loadFilteredBookings() {
    try {
        console.log(`🔍 Searching: "${currentSearchTerm}", Filter: ${currentStatusFilter}`);
        
        const params = new URLSearchParams();
        
        if (currentSearchTerm) {
            params.append('search', currentSearchTerm);
        }
        if (currentStatusFilter !== 'all') {
            params.append('status', currentStatusFilter);
        }
        
        const url = `/bookings${params.toString() ? '?' + params.toString() : ''}`;
        const data = await apiCall(url);
        
        displayAllBookings(data?.bookings || []);
        
    } catch (error) {
        console.error('Failed to load filtered bookings:', error);
        displayAllBookings([]);
    }
}

async function loadAllBookings() {
    currentSearchTerm = '';
    currentStatusFilter = 'all';
    
    const searchInput = document.getElementById('searchBooking');
    const statusFilter = document.getElementById('statusFilter');
    
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = 'all';
    
    await loadFilteredBookings();
}

function getPaymentStatusBadge(paymentStatus) {
    switch(paymentStatus) {
        case 'pending_verification':
            return '<span class="payment-badge pending" style="background: #fff3e0; color: #e67e22; padding: 4px 8px; border-radius: 12px; font-size: 11px;">🟡 Pending Verification</span>';
        case 'verified':
            return '<span class="payment-badge verified" style="background: #d4edda; color: #28a745; padding: 4px 8px; border-radius: 12px; font-size: 11px;">🟢 Verified</span>';
        case 'rejected':
            return '<span class="payment-badge rejected" style="background: #f8d7da; color: #dc3545; padding: 4px 8px; border-radius: 12px; font-size: 11px;">🔴 Rejected</span>';
        default:
            return '<span class="payment-badge unpaid" style="background: #e9ecef; color: #6c757d; padding: 4px 8px; border-radius: 12px; font-size: 11px;">⚪ Unpaid</span>';
    }
}

function displayAllBookings(bookings) {
  const tbody = document.getElementById('allBookingsBody');
  if (!tbody) return;
  if (!bookings || bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11">No bookings found</td></tr>';
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
    const paymentMethod = booking.payment_method || 'pickup';
    const paymentStatus = booking.payment_status || 'unpaid';
    const transactionId = booking.transaction_id || '';
    
    const paymentMethodIcon = paymentMethod === 'momo' ? '📱' : '💵';
    const paymentMethodText = paymentMethod === 'momo' ? 'MoMo' : 'Pickup';
    
    const showVerifyButton = paymentMethod === 'momo' && paymentStatus === 'pending_verification';
    
    return `<tr>
      <td>${escapeHtml(id)}</td>
      <td>${escapeHtml(ref)}</td>
      <td>${escapeHtml(name)}</td>
      <td>${escapeHtml(phone)}</td>
      <td>${escapeHtml(date)}</td>
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
        <span title="${paymentMethodText}">${paymentMethodIcon}</span> ${getPaymentStatusBadge(paymentStatus)}
        ${transactionId ? `<br><small style="font-size: 10px;">TX: ${escapeHtml(transactionId)}</small>` : ''}
       </td>
      <td>
        ${showVerifyButton ? `<button class="action-btn btn-verify" onclick="verifyPayment(${id}, '${escapeHtml(booking.customer_email)}', '${escapeHtml(ref)}', ${total})" style="background-color: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;"><i class="fas fa-check-circle"></i> Verify</button>` : ''}
        <button class="action-btn btn-whatsapp" onclick="contactCustomer('${escapeHtml(phone)}')" style="margin-right: 5px;"><i class="fab fa-whatsapp"></i></button>
        <button class="action-btn btn-delete" onclick="deleteSingleBooking(${id}, '${escapeHtml(ref)}')" style="background-color: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;"><i class="fas fa-trash"></i> Delete</button>
       </td>
     </tr>`;
  }).join('');
}

// ========== VERIFY PAYMENT (NEW) ==========
window.verifyPayment = async function(bookingId, customerEmail, bookingRef, amount) {
  if (!confirm(`✅ Verify payment for booking ${bookingRef}?\n\nAmount: GH₵${amount}\nCustomer: ${customerEmail}\n\nMake sure you have confirmed the money in your mobile money statement before verifying.`)) {
    return;
  }
  
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_URL}/bookings/${bookingId}/verify-payment`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        payment_status: 'verified',
        verified_by: currentUser?.username || 'admin'
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to verify payment');
    }
    
    const result = await response.json();
    showNotification(`✅ Payment verified for ${bookingRef}! Email sent to customer.`, 'success');
    
    // Refresh the current view
    await loadFilteredBookings();
    loadDashboardData();
    
  } catch (error) {
    console.error('Error verifying payment:', error);
    showNotification(`❌ Failed to verify payment: ${error.message}`, 'error');
  }
};

// ========== DELETE SINGLE BOOKING ==========
window.deleteSingleBooking = async function(bookingId, bookingRef) {
  if (!confirm(`⚠️ Are you sure you want to delete booking ${bookingRef}?\n\nThis action CANNOT be undone!`)) {
    return;
  }
  
  if (!confirm(`🔴 FINAL WARNING: Are you ABSOLUTELY sure you want to delete ${bookingRef}?\n\nThis will permanently remove this booking from the database.`)) {
    return;
  }
  
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete booking');
    }
    
    const result = await response.json();
    
    showNotification(`✅ Booking ${result.booking_ref} has been deleted successfully!`, 'success');
    await loadFilteredBookings();
    loadDashboardData();
    
    if (document.getElementById('customers-section')?.classList.contains('active-section')) {
      loadCustomers();
    }
    
  } catch (error) {
    console.error('Error deleting booking:', error);
    showNotification(`❌ Failed to delete booking: ${error.message}`, 'error');
  }
};

async function updateBookingStatus(bookingId, status) {
  if (!confirm('Update booking status?')) return;
  try {
    await apiCall(`/bookings/${bookingId}`, { method: 'PUT', body: JSON.stringify({ status }) });
    showNotification('Status updated successfully', 'success');
    loadAllBookings();
    loadDashboardData();
  } catch (error) {
    showNotification('Failed to update status', 'error');
  }
}

// ========== CUSTOMERS ==========
async function loadCustomers() {
  try {
    const data = await apiCall('/customers');
    displayCustomers(data || []);
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

    document.getElementById('modalCustomerName').textContent = customerBookings[0].customer_name || 'Customer';
    document.getElementById('modalCustomerPhone').textContent = `📞 ${phone} | 📧 ${customerBookings[0].customer_email || ''}`;

    const tableBody = document.getElementById('modalBookingsTableBody');
    tableBody.innerHTML = '';

    customerBookings.forEach(booking => {
      const row = tableBody.insertRow();
      row.innerHTML = `
        <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(booking.booking_ref || 'N/A')}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(booking.booking_date || 'N/A')}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(booking.items_summary || 'N/A')}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">₵${escapeHtml(booking.total_amount || '0')}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">
          <span class="status-badge status-${escapeHtml(booking.status)}">${escapeHtml(booking.status)}</span>
        </td>
      `;
    });

    document.getElementById('customerModal').style.display = 'flex';
  } catch (error) {
    console.error('Error loading customer details:', error);
    alert('Failed to load customer details');
  }
};

window.closeCustomerModal = function() {
  document.getElementById('customerModal').style.display = 'none';
};

// ========== RESET ALL BOOKINGS ==========
window.resetAllBookings = async function() {
  if (!confirm('⚠️ WARNING: This will delete ALL bookings permanently!')) return;
  if (!confirm('⚠️ LAST WARNING: This action CANNOT be undone!')) return;
  
  const userInput = prompt('Type "RESET" to confirm:');
  if (userInput !== 'RESET') {
    alert('Reset cancelled.');
    return;
  }

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
      alert('✅ All bookings deleted successfully!');
      location.reload();
    } else {
      alert('❌ Failed: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Reset error:', error);
    alert('❌ Failed to reset bookings');
  }
};

// ========== SAVE PRICING ==========
window.savePricing = async function() {
  const getVal = (id, defaultVal) => {
    const el = document.getElementById(id);
    return el ? parseFloat(el.value) : defaultVal;
  };
  
  const prices = {
    price_duffle_small: getVal('priceDuffleSmall', 29.99),
    price_duffle_big: getVal('priceDuffleBig', 49.99),
    price_jute_small: getVal('priceJuteSmall', 39.99),
    price_jute_medium: getVal('priceJuteMedium', 59.99),
    price_jute_big: getVal('priceJuteBig', 79.99),
    price_travel_small: getVal('priceTravelSmall', 29.99),
    price_travel_medium: getVal('priceTravelMedium', 49.99),
    price_travel_big: getVal('priceTravelBig', 69.99),
    price_microwave: getVal('priceMicrowave', 30),
    price_fridge_tabletop: getVal('priceFridgeTabletop', 59.99),
    price_fridge_doubledoor: getVal('priceFridgeDoubledoor', 79.99),
    price_fridge_small: getVal('priceFridgeSmall', 39.99),
    price_gas_small: getVal('priceGasSmall', 29.99),
    price_gas_medium: getVal('priceGasMedium', 34.99),
    price_gas_big: getVal('priceGasBig', 39.99),
    price_container_small: getVal('priceContainerSmall', 29.99),
    price_container_big: getVal('priceContainerBig', 49.99),
    price_buckets: getVal('priceBuckets', 0)
  };

  console.log('📤 Saving prices:', prices);

  const saveButton = document.querySelector('#pricing-section .btn-save-modern');
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  }

  try {
    const result = await apiCall('/settings', { method: 'PUT', body: JSON.stringify(prices) });
    if (result?.success) {
      showMessage('pricingMessage', '✅ All prices saved successfully!', 'success');
      await loadAllSettings();
    } else {
      throw new Error(result?.error || 'Save failed');
    }
  } catch (error) {
    console.error('Save error:', error);
    showMessage('pricingMessage', `❌ Error: ${error.message}`, 'error');
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.innerHTML = '<i class="fas fa-save"></i> Save All Changes';
    }
  }
};

// ========== SAVE SETTINGS ==========
window.saveSettings = async function() {
  const settings = {
    whatsapp_number: document.getElementById('whatsappNumber')?.value.trim() || '',
    business_email: document.getElementById('businessEmail')?.value.trim() || ''
  };

  const np = document.getElementById('newPassword')?.value;
  const cp = document.getElementById('currentPassword')?.value;
  const cf = document.getElementById('confirmPassword')?.value;

  if (np) {
    if (np !== cf) return showMessage('settingsMessage', 'Passwords do not match', 'error');
    if (np.length < 8) return showMessage('settingsMessage', 'Password must be at least 8 characters', 'error');
    settings.current_password = cp;
    settings.new_password = np;
  }

  try {
    await apiCall('/settings', { method: 'PUT', body: JSON.stringify(settings) });
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    showMessage('settingsMessage', 'Settings saved successfully!', 'success');
  } catch (error) {
    showMessage('settingsMessage', error.message || 'Save failed', 'error');
  }
};

// ========== SETUP SEARCH LISTENERS ==========
function setupSearchListeners() {
    const searchInput = document.getElementById('searchBooking');
    const statusFilter = document.getElementById('statusFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentSearchTerm = this.value;
                loadFilteredBookings();
            }, 500);
        });
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            currentStatusFilter = this.value;
            loadFilteredBookings();
        });
    }
}

// ========== UTILITIES ==========
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showMessage(elementId, message, type) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.className = `form-message ${type}`;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 4000);
}

function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

function contactCustomer(phone) {
  if (!phone) return;
  
  // Remove all non-digit characters
  let cleanPhone = phone.replace(/\D/g, '');
  
  // Ensure it starts with 233 (Ghana code)
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '233' + cleanPhone.substring(1);
  }
  if (!cleanPhone.startsWith('233')) {
    cleanPhone = '233' + cleanPhone;
  }
  
  // Remove any leading 00 or +
  cleanPhone = cleanPhone.replace(/^00/, '').replace(/^\+/, '');
  
  // Open WhatsApp chat
  window.open(`https://wa.me/${cleanPhone}`, '_blank', 'noopener,noreferrer');
}

async function exportBookings() {
  try {
    const data = await apiCall('/bookings/export');
    if (!data) return;
    
    const headers = ['Reference', 'Date', 'Name', 'Phone', 'Hostel', 'Items', 'Total', 'Status', 'Payment Method', 'Payment Status', 'Transaction ID'];
    const rows = data.map(b => [
      b.booking_ref || '', b.booking_date || '', b.customer_name || '',
      b.customer_phone || '', b.hostel_name || '',
      b.items_summary || '', b.total_amount || '0', b.status || '',
      b.payment_method || 'pickup', b.payment_status || 'unpaid', b.transaction_id || ''
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

function setupEventListeners() {
  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportBookings);
  setupSearchListeners();
}

// ========== GLOBAL EXPORTS ==========
window.showSection = function(sectionId) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active-section'));
  const target = document.getElementById(sectionId + '-section');
  if (target) target.classList.add('active-section');
  document.getElementById('pageTitle').textContent = sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
  if (sectionId === 'bookings') loadAllBookings();
  if (sectionId === 'customers') loadCustomers();
  if (sectionId === 'pricing' || sectionId === 'settings') loadAllSettings();
};

// ========== RETURN REQUESTS MANAGEMENT ==========

// Load all return requests
async function loadReturnRequests() {
    try {
        const status = document.getElementById('returnStatusFilter')?.value || 'all';
        const search = document.getElementById('returnSearch')?.value || '';
        
        let url = `/returns?`;
        if (status !== 'all') url += `status=${status}&`;
        if (search) url += `search=${encodeURIComponent(search)}&`;
        
        const requests = await apiCall(url);
        displayReturnRequests(requests || []);
        
    } catch (error) {
        console.error('Failed to load return requests:', error);
        displayReturnRequests([]);
    }
}

// Display return requests in table
function displayReturnRequests(requests) {
    const tbody = document.getElementById('returnRequestsBody');
    if (!tbody) return;
    
    if (!requests || requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9">No return requests found</td></tr>';
        return;
    }
    
    tbody.innerHTML = requests.map(request => {
        const statusClass = getReturnStatusClass(request.status);
        const statusText = getReturnStatusText(request.status);
        const returnDate = new Date(request.return_date).toLocaleDateString();
        const paymentMethod = request.payment_method === 'momo' ? '📱 MoMo' : '💵 On Delivery';
        
        let actionButtons = '';
        
        if (request.status === 'pending') {
            actionButtons = `
                <button class="action-btn btn-confirm" onclick="updateReturnStatus(${request.id}, 'confirmed')" style="background:#28a745; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-right:5px;">
                    <i class="fas fa-check"></i> Confirm
                </button>
                <button class="action-btn btn-cancel" onclick="updateReturnStatus(${request.id}, 'cancelled')" style="background:#dc3545; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">
                    <i class="fas fa-times"></i> Cancel
                </button>
            `;
        } else if (request.status === 'confirmed') {
            actionButtons = `
                <button class="action-btn btn-complete" onclick="updateReturnStatus(${request.id}, 'completed')" style="background:#17a2b8; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">
                    <i class="fas fa-check-double"></i> Complete
                </button>
                <button class="action-btn btn-whatsapp" onclick="contactCustomer('${request.customer_phone}')" style="background:#25D366; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-left:5px;">
                    <i class="fab fa-whatsapp"></i>
                </button>
            `;
        } else {
            actionButtons = `
                <button class="action-btn btn-view" onclick="viewReturnDetails(${request.id})" style="background:#ffb347; color:#8b0000; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">
                    <i class="fas fa-eye"></i> View
                </button>
            `;
        }
        
        return `
            <tr>
                <td>${escapeHtml(request.request_ref || 'N/A')}</td>
                <td>${escapeHtml(request.booking_ref || 'N/A')}</td>
                <td>${escapeHtml(request.customer_name || 'N/A')}</td>
                <td>${escapeHtml(request.customer_phone || 'N/A')}</td>
                <td>${returnDate}</td>
                <td>${escapeHtml(request.items_summary?.substring(0, 30) || 'N/A')}${request.items_summary?.length > 30 ? '...' : ''}</td>
                <td>₵${parseFloat(request.delivery_fee).toFixed(2)}</td>
                <td>${paymentMethod}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${actionButtons}</td>
            </tr>
        `;
    }).join('');
}

// Get status class for styling
function getReturnStatusClass(status) {
    switch(status) {
        case 'pending': return 'status-pending';
        case 'confirmed': return 'status-confirmed';
        case 'completed': return 'status-completed';
        case 'cancelled': return 'status-cancelled';
        default: return 'status-pending';
    }
}

// Get status text with emoji
function getReturnStatusText(status) {
    switch(status) {
        case 'pending': return '🟡 Pending';
        case 'confirmed': return '🟢 Confirmed';
        case 'completed': return '✅ Completed';
        case 'cancelled': return '❌ Cancelled';
        default: return '🟡 Pending';
    }
}

// Update return request status
window.updateReturnStatus = async function(requestId, newStatus) {
    let confirmMessage = '';
    if (newStatus === 'confirmed') confirmMessage = 'Confirm this return request?';
    else if (newStatus === 'completed') confirmMessage = 'Mark as completed?';
    else if (newStatus === 'cancelled') confirmMessage = 'Cancel this return request?';
    
    if (!confirm(confirmMessage)) return;
    
    try {
        const result = await apiCall(`/returns/${requestId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus, confirmed_by: currentUser?.username || 'admin' })
        });
        
        if (result?.success) {
            showNotification(`Return request ${newStatus} successfully!`, 'success');
            loadReturnRequests();
            loadReturnStats();
        }
    } catch (error) {
        showNotification('Failed to update status: ' + error.message, 'error');
    }
};

// Load return statistics for dashboard
async function loadReturnStats() {
    try {
        const stats = await apiCall('/returns/stats/summary');
        if (!stats) return;
        
        // Update return stats in dashboard (if element exists)
        const returnStatsDiv = document.getElementById('returnStats');
        if (returnStatsDiv) {
            returnStatsDiv.innerHTML = `
                <div class="stat-card"><i class="fas fa-clock stat-icon"></i><div class="stat-info"><h3>Pending Returns</h3><p>${stats.pending || 0}</p></div></div>
                <div class="stat-card"><i class="fas fa-check-circle stat-icon"></i><div class="stat-info"><h3>Confirmed Returns</h3><p>${stats.confirmed || 0}</p></div></div>
                <div class="stat-card"><i class="fas fa-truck stat-icon"></i><div class="stat-info"><h3>Today's Returns</h3><p>${stats.today_requests || 0}/${stats.today_limit || 40}</p></div></div>
                <div class="stat-card"><i class="fas fa-check-double stat-icon"></i><div class="stat-info"><h3>Completed Returns</h3><p>${stats.completed || 0}</p></div></div>
            `;
        }
    } catch (error) {
        console.error('Failed to load return stats:', error);
    }
}

// View return request details
window.viewReturnDetails = async function(requestId) {
    try {
        const requests = await apiCall('/returns');
        const request = requests?.find(r => r.id === requestId);
        
        if (!request) {
            alert('Request not found');
            return;
        }
        
        const returnDate = new Date(request.return_date).toLocaleDateString();
        
        alert(`
📋 RETURN REQUEST DETAILS

Request Ref: ${request.request_ref}
Booking Ref: ${request.booking_ref}
Customer: ${request.customer_name}
Phone: ${request.customer_phone}
Email: ${request.customer_email}

📍 Return Details:
Date: ${returnDate}
Time: ${request.return_time}
Location: ${request.original_hostel}

📦 Items: ${request.items_summary}

💰 Payment: ${request.payment_method === 'momo' ? 'Mobile Money' : 'Pay on Delivery'}
Fee: ₵${request.delivery_fee}

Status: ${request.status}
        `);
    } catch (error) {
        console.error('Error viewing return details:', error);
        showNotification('Failed to load details', 'error');
    }
};

// Setup return section event listeners
function setupReturnListeners() {
    const searchInput = document.getElementById('returnSearch');
    const statusFilter = document.getElementById('returnStatusFilter');
    const refreshBtn = document.getElementById('refreshReturns');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => loadReturnRequests(), 500));
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', () => loadReturnRequests());
    }
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadReturnRequests());
    }
}

// Debounce helper for search
function debounce(func, delay) {
    let timeout;
    return function() {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, arguments), delay);
    };
}

window.updateBookingStatus = updateBookingStatus;
window.contactCustomer = contactCustomer;
window.savePricing = savePricing;
window.saveSettings = saveSettings;
window.extendSession = extendSession;
window.resetAllBookings = resetAllBookings;
window.loadAllBookings = loadAllBookings;
window.closeCustomerModal = closeCustomerModal;
window.viewCustomerDetails = viewCustomerDetails;
window.deleteSingleBooking = deleteSingleBooking;
window.verifyPayment = verifyPayment;
window.loadReturnRequests = loadReturnRequests;
window.loadReturnStats = loadReturnStats;
window.setupReturnListeners = setupReturnListeners;

// ========== MOBILE MENU TOGGLE ==========
window.toggleMobileMenu = function() {
    console.log('toggleMobileMenu called');
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
        console.log('Sidebar classes:', sidebar.className);
    } else {
        console.log('Sidebar not found');
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const menuBtn = document.getElementById('mobileMenuToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuBtn && sidebar) {
        function checkWidth() {
            if (window.innerWidth <= 768) {
                menuBtn.style.display = 'flex';
            } else {
                menuBtn.style.display = 'none';
                sidebar.classList.remove('open');
            }
        }
        
        checkWidth();
        window.addEventListener('resize', checkWidth);
        
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                }
            });
        });
        
        document.addEventListener('click', function(event) {
            if (window.innerWidth <= 768) {
                const isClickInside = sidebar.contains(event.target) || menuBtn.contains(event.target);
                if (!isClickInside && sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                }
            }
        });
    }
});