// admin/admin.js - UPGRADED VERSION (Specific items only)
const API_URL = 'https://kodak-logistics-api.onrender.com/api';
console.log('🚀 Admin JS loaded - Upgraded Version');

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

// ========== LOAD ALL SETTINGS (UPGRADED - Specific items only) ==========
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
  
    // Duffle Bags
    const pDuffleSmall = document.getElementById('priceDuffleSmall');
    const pDuffleBig = document.getElementById('priceDuffleBig');
    if (pDuffleSmall) pDuffleSmall.value = settings.price_duffle_small || 29.99;
    if (pDuffleBig) pDuffleBig.value = settings.price_duffle_big || 49.99;
    
    // Jute Bags
    const pJuteSmall = document.getElementById('priceJuteSmall');
    const pJuteMedium = document.getElementById('priceJuteMedium');
    const pJuteBig = document.getElementById('priceJuteBig');
    if (pJuteSmall) pJuteSmall.value = settings.price_jute_small || 39.99;
    if (pJuteMedium) pJuteMedium.value = settings.price_jute_medium || 59.99;
    if (pJuteBig) pJuteBig.value = settings.price_jute_big || 79.99;
    
    // Traveling Bags
    const pTravelSmall = document.getElementById('priceTravelSmall');
    const pTravelMedium = document.getElementById('priceTravelMedium');
    const pTravelBig = document.getElementById('priceTravelBig');
    if (pTravelSmall) pTravelSmall.value = settings.price_travel_small || 29.99;
    if (pTravelMedium) pTravelMedium.value = settings.price_travel_medium || 49.99;
    if (pTravelBig) pTravelBig.value = settings.price_travel_big || 69.99;
    
    // ===== APPLIANCES =====
    // Microwave
    const pMicrowave = document.getElementById('priceMicrowave');
    if (pMicrowave) pMicrowave.value = settings.price_microwave || 30;
    
    // Fridges
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
      
      if (sectionId === 'bookings') {
        loadAllBookings();
      } else if (sectionId === 'customers') {
        loadCustomers();
      } else if (sectionId === 'pricing' || sectionId === 'settings') {
        loadAllSettings();
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
      `;
    }
    await loadRecentBookings();
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
    tbody.innerHTML = '<tr><td colspan="6">No recent bookings</td></tr>';
    return;
  }
  tbody.innerHTML = bookings.map(booking => {
    const date = booking.booking_date || booking.date || '';
    const name = booking.customer_name || booking.name || '';
    const items = (booking.items_summary || booking.items || '').substring(0, 30) + '...';
    const total = booking.total_amount || booking.total || '0';
    const status = booking.status || 'pending';
    const phone = booking.customer_phone || booking.phone || '';
    return `<tr>
      <td>${escapeHtml(date)}</td>
      <td>${escapeHtml(name)}</td>
      <td>${escapeHtml(items)}</td>
      <td>₵${escapeHtml(total)}</td>
      <td><span class="status-badge status-${escapeHtml(status)}">${escapeHtml(status)}</span></td>
      <td><button class="action-btn btn-whatsapp" onclick="contactCustomer('${escapeHtml(phone)}')"><i class="fab fa-whatsapp"></i></button></td>
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
      <td>
        <select class="status-select" onchange="updateBookingStatus(${id}, this.value)">
          <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="confirmed" ${status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
          <option value="completed" ${status === 'completed' ? 'selected' : ''}>Completed</option>
        </select>
       </td>
      <td><button class="action-btn btn-whatsapp" onclick="contactCustomer('${escapeHtml(phone)}')"><i class="fab fa-whatsapp"></i></button></td>
    </tr>`;
  }).join('');
}

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

// ========== SAVE PRICING (UPGRADED - Specific items only) ==========
window.savePricing = async function() {
  const getVal = (id, defaultVal) => {
    const el = document.getElementById(id);
    return el ? parseFloat(el.value) : defaultVal;
  };
  
  const prices = {
    // BAGS
    price_duffle_small: getVal('priceDuffleSmall', 29.99),
    price_duffle_big: getVal('priceDuffleBig', 49.99),
    price_jute_small: getVal('priceJuteSmall', 39.99),
    price_jute_medium: getVal('priceJuteMedium', 59.99),
    price_jute_big: getVal('priceJuteBig', 79.99),
    price_travel_small: getVal('priceTravelSmall', 29.99),
    price_travel_medium: getVal('priceTravelMedium', 49.99),
    price_travel_big: getVal('priceTravelBig', 69.99),
    
    // APPLIANCES
    price_microwave: getVal('priceMicrowave', 30),
    price_fridge_tabletop: getVal('priceFridgeTabletop', 59.99),
    price_fridge_doubledoor: getVal('priceFridgeDoubledoor', 79.99),
    price_fridge_small: getVal('priceFridgeSmall', 39.99),
    
    // GAS CYLINDERS
    price_gas_small: getVal('priceGasSmall', 29.99),
    price_gas_medium: getVal('priceGasMedium', 34.99),
    price_gas_big: getVal('priceGasBig', 39.99),
    
    // CONTAINERS
    price_container_small: getVal('priceContainerSmall', 29.99),
    price_container_big: getVal('priceContainerBig', 49.99),
    
    // FREE ITEMS
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
  const cleanPhone = phone.replace(/\D/g, '');
  window.open(`https://wa.me/${cleanPhone}`, '_blank', 'noopener,noreferrer');
}

async function exportBookings() {
  try {
    const data = await apiCall('/bookings/export');
    if (!data) return;
    
    const headers = ['Reference', 'Date', 'Name', 'Phone', 'Hostel', 'Items', 'Total', 'Status'];
    const rows = data.map(b => [
      b.booking_ref || '', b.booking_date || '', b.customer_name || '',
      b.customer_phone || '', b.hostel_name || '',
      b.items_summary || '', b.total_amount || '0', b.status || ''
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

window.updateBookingStatus = updateBookingStatus;
window.contactCustomer = contactCustomer;
window.savePricing = savePricing;
window.saveSettings = saveSettings;
window.extendSession = extendSession;
window.resetAllBookings = resetAllBookings;
window.loadAllBookings = loadAllBookings;
window.closeCustomerModal = closeCustomerModal;
window.viewCustomerDetails = viewCustomerDetails;

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