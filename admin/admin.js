// admin/admin.js - SIMPLIFIED WORKING VERSION
const API_URL = 'https://kodak-logistics-api.onrender.com/api';
console.log('🚀 Admin JS loaded');

// ========== LOGIN FORM ==========
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, looking for login form...');
  
  const loginForm = document.getElementById('loginForm');
  console.log('Login form found:', !!loginForm);
  
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      console.log('Login form submitted');
      
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const loginBtn = document.getElementById('loginBtn');
      const errorDiv = document.getElementById('loginError');
      
      loginBtn.disabled = true;
      loginBtn.textContent = 'Logging in...';
      errorDiv.style.display = 'none';

      console.log('Attempting login for:', username);
      
      try {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        console.log('Login response:', data);
        
        if (response.ok && data.token) {
          localStorage.setItem('adminToken', data.token);
          console.log('Login successful, redirecting...');
          window.location.href = 'dashboard.html';
        } else {
          errorDiv.textContent = data.error || 'Invalid credentials';
          errorDiv.style.display = 'block';
        }
      } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = 'Connection error';
        errorDiv.style.display = 'block';
      } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login to Dashboard';
      }
    });
  }
  
  // If we're on dashboard page, load data
  if (window.location.pathname.includes('dashboard.html')) {
    console.log('On dashboard page, checking auth...');
    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.location.href = 'index.html';
      return;
    }
    
    // Load all sections
    loadDashboardStats();
    loadBookingsList();
    loadCustomersList();
    loadSettingsData();
    setupSidebarNavigation();
    
    // Set admin name
    document.getElementById('adminName').textContent = 'Admin';
  }
  
  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      localStorage.removeItem('adminToken');
      window.location.href = 'index.html';
    });
  }
});

// ========== DASHBOARD STATS ==========
async function loadDashboardStats() {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_URL}/bookings/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const stats = await response.json();
    
    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
      statsGrid.innerHTML = `
        <div class="stat-card"><i class="fas fa-calendar-alt stat-icon"></i><div class="stat-info"><h3>Today's Bookings</h3><p>${stats.today || 0}</p></div></div>
        <div class="stat-card"><i class="fas fa-clock stat-icon"></i><div class="stat-info"><h3>Pending</h3><p>${stats.pending || 0}</p></div></div>
        <div class="stat-card"><i class="fas fa-check-circle stat-icon"></i><div class="stat-info"><h3>Confirmed</h3><p>${stats.confirmed || 0}</p></div></div>
        <div class="stat-card"><i class="fas fa-money-bill-wave stat-icon"></i><div class="stat-info"><h3>Revenue (₵)</h3><p>${(parseFloat(stats.revenue) || 0).toFixed(2)}</p></div></div>
      `;
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// ========== BOOKINGS LIST ==========
async function loadBookingsList() {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_URL}/bookings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    const bookings = data.bookings || [];
    
    const tbody = document.getElementById('allBookingsBody');
    if (!tbody) return;
    
    if (bookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10">No bookings found</td></tr>';
      return;
    }
    
    tbody.innerHTML = bookings.map(b => `
      <tr>
        <td>${escapeHtml(b.booking_ref || '')}</td>
        <td>#${b.id}</td>
        <td>${escapeHtml(b.booking_date || '')}</td>
        <td>${escapeHtml(b.customer_name || '')}</td>
        <td>${escapeHtml(b.customer_phone || '')}</td>
        <td>${escapeHtml(b.hostel_name || '')}</td>
        <td>${escapeHtml((b.items_summary || '').substring(0, 20))}</td>
        <td>₵${b.total_amount || '0'}</td>
        <td>
          <select onchange="updateStatus(${b.id}, this.value)">
            <option value="pending" ${b.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="confirmed" ${b.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="completed" ${b.status === 'completed' ? 'selected' : ''}>Completed</option>
          </select>
        </td>
        <td><button class="action-btn btn-whatsapp" onclick="contactCustomer('${escapeHtml(b.customer_phone)}')"><i class="fab fa-whatsapp"></i></button></td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Failed to load bookings:', error);
  }
}

// ========== CUSTOMERS LIST ==========
async function loadCustomersList() {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_URL}/customers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const customers = await response.json();
    
    const tbody = document.getElementById('customersBody');
    if (!tbody) return;
    
    if (!customers || customers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">No customers found</td></tr>';
      return;
    }
    
    tbody.innerHTML = customers.map(c => `
      <tr>
        <td>${escapeHtml(c.name || '')}</td>
        <td>${escapeHtml(c.phone || '')}</td>
        <td>${escapeHtml(c.email || '')}</td>
        <td>${c.total_bookings || 0}</td>
        <td>${escapeHtml(c.last_booking || '')}</td>
        <td><button class="action-btn btn-whatsapp" onclick="contactCustomer('${escapeHtml(c.phone)}')"><i class="fab fa-whatsapp"></i></button></td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Failed to load customers:', error);
  }
}

// ========== SETTINGS & PRICING DATA ==========
async function loadSettingsData() {
  console.log('🔄 Loading settings data...');
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_URL}/settings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const settings = await response.json();
    console.log('Settings loaded:', settings);
    
    // Settings section
    const ws = document.getElementById('whatsappNumber');
    const em = document.getElementById('businessEmail');
    if (ws) ws.value = settings.whatsapp_number || '';
    if (em) em.value = settings.business_email || '';
    
    // Pricing section
    const ps = document.getElementById('priceSmall');
    const pm = document.getElementById('priceMedium');
    const pb = document.getElementById('priceBig');
    const pf = document.getElementById('priceFridge');
    const pg = document.getElementById('priceGas');
    
    if (ps) ps.value = settings.price_small || 40;
    if (pm) pm.value = settings.price_medium || 50;
    if (pb) pb.value = settings.price_big || 60;
    if (pf) pf.value = settings.price_fridge || 70;
    if (pg) pg.value = settings.price_gas || 60;
    
    console.log('Pricing inputs populated');
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// ========== SAVE PRICING ==========
window.savePricing = async function() {
  console.log('💾 Saving pricing...');
  const prices = {
    price_small: document.getElementById('priceSmall')?.value || 40,
    price_medium: document.getElementById('priceMedium')?.value || 50,
    price_big: document.getElementById('priceBig')?.value || 60,
    price_fridge: document.getElementById('priceFridge')?.value || 70,
    price_gas: document.getElementById('priceGas')?.value || 60
  };
  
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_URL}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(prices)
    });
    const result = await response.json();
    if (result.success) {
      alert('Pricing saved successfully!');
      await loadSettingsData();
    } else {
      alert('Save failed: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Save error:', error);
    alert('Save failed');
  }
};

// ========== SAVE SETTINGS ==========
window.saveSettings = async function() {
  console.log('💾 Saving settings...');
  const settings = {
    whatsapp_number: document.getElementById('whatsappNumber')?.value || '',
    business_email: document.getElementById('businessEmail')?.value || ''
  };
  
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_URL}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(settings)
    });
    const result = await response.json();
    if (result.success) {
      alert('Settings saved successfully!');
      await loadSettingsData();
    } else {
      alert('Save failed');
    }
  } catch (error) {
    alert('Save failed');
  }
};

// ========== UPDATE BOOKING STATUS ==========
window.updateStatus = async function(id, status) {
  if (!confirm('Update booking status?')) return;
  try {
    const token = localStorage.getItem('adminToken');
    await fetch(`${API_URL}/bookings/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    alert('Status updated');
    loadBookingsList();
    loadDashboardStats();
  } catch (error) {
    alert('Update failed');
  }
};

// ========== CONTACT CUSTOMER ==========
window.contactCustomer = function(phone) {
  if (phone) {
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank');
  }
};

// ========== RESET BOOKINGS ==========
window.resetAllBookings = async function() {
  if (!confirm('⚠️ WARNING: This will delete ALL bookings permanently!\n\nAre you absolutely sure?')) return;
  if (!confirm('⚠️ LAST WARNING: This action CANNOT be undone!\n\nAll customer booking data will be lost forever.')) return;
  const userInput = prompt('Type "RESET" to confirm deletion of all bookings:');
  if (userInput !== 'RESET') {
    alert('Reset cancelled.');
    return;
  }
  if (!confirm('One last confirmation: Delete ALL bookings?')) return;
  
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
      alert('✅ All bookings deleted!');
      location.reload();
    } else {
      alert('Failed to delete bookings');
    }
  } catch (error) {
    alert('Failed to reset bookings');
  }
};

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
    
    const customer = customerBookings[0];
    document.getElementById('modalCustomerName').textContent = customer.customer_name;
    document.getElementById('modalCustomerPhone').textContent = `📞 Phone: ${phone} | 📧 Email: ${customer.customer_email}`;
    
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
    alert('Failed to load customer details');
  }
};

window.closeCustomerModal = function() {
  document.getElementById('customerModal').style.display = 'none';
};

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

// ========== SIDEBAR NAVIGATION ==========
function setupSidebarNavigation() {
  console.log('Setting up sidebar navigation...');
  
  document.querySelectorAll('.sidebar-nav a[data-section]').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const sectionId = this.dataset.section;
      console.log('Navigating to section:', sectionId);
      
      // Hide all sections
      document.querySelectorAll('.content-section').forEach(s => {
        s.classList.remove('active-section');
      });
      
      // Show selected section
      const target = document.getElementById(sectionId + '-section');
      if (target) {
        target.classList.add('active-section');
      }
      
      // Update active nav link
      document.querySelectorAll('.sidebar-nav a').forEach(a => {
        a.classList.remove('active');
      });
      this.classList.add('active');
      
      // Update page title
      const title = document.getElementById('pageTitle');
      if (title) {
        title.textContent = sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
      }
      
      // Load section data
      if (sectionId === 'bookings') loadBookingsList();
      if (sectionId === 'customers') loadCustomersList();
      if (sectionId === 'settings' || sectionId === 'pricing') {
        console.log('Loading settings/pricing data...');
        loadSettingsData();
      }
    });
  });
}

// Make functions globally available
window.showSection = function(sectionId) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active-section'));
  const target = document.getElementById(sectionId + '-section');
  if (target) target.classList.add('active-section');
  document.getElementById('pageTitle').textContent = sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
  if (sectionId === 'bookings') loadBookingsList();
  if (sectionId === 'customers') loadCustomersList();
  if (sectionId === 'settings' || sectionId === 'pricing') loadSettingsData();
};

window.extendSession = function() {};
window.loadAllBookings = loadBookingsList;