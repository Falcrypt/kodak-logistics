// admin/admin.js - SIMPLIFIED WORKING VERSION
const API_URL = 'https://kodak-logistics-api.onrender.com/api';
console.log('🚀 Admin JS loaded');

// ========== LOGIN FORM ==========
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded');
  
  // Handle login page
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      console.log('Login submitted');
      
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
        errorDiv.textContent = 'Connection error';
        errorDiv.style.display = 'block';
      } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login to Dashboard';
      }
    });
  }
  
  // Handle dashboard page
  if (window.location.pathname.includes('dashboard.html')) {
    console.log('Dashboard page detected');
    const token = localStorage.getItem('adminToken');
    if (!token) {
      window.location.href = 'index.html';
      return;
    }
    
    // Set admin name
    const adminNameEl = document.getElementById('adminName');
    if (adminNameEl) adminNameEl.textContent = 'Admin';
    
    // Load all data
    loadStats();
    loadBookings();
    loadCustomers();
    loadSettingsData();
    setupSidebar();
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

// ========== LOAD STATS ==========
async function loadStats() {
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

// ========== LOAD BOOKINGS ==========
async function loadBookings() {
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
      tbody.innerHTML = '<tr><td colspan="10">No bookings found缓解</tr>';
      return;
    }
    
    tbody.innerHTML = bookings.map(b => `
      <tr>
        <td>${b.booking_ref || ''}</td>
        <td>#${b.id}</td>
        <td>${b.booking_date || ''}</td>
        <td>${b.customer_name || ''}</td>
        <td>${b.customer_phone || ''}</td>
        <td>${b.hostel_name || ''}</td>
        <td>${(b.items_summary || '').substring(0, 20)}</td>
        <td>₵${b.total_amount || '0'}</td>
        <td>
          <select onchange="updateStatus(${b.id}, this.value)">
            <option value="pending" ${b.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="confirmed" ${b.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="completed" ${b.status === 'completed' ? 'selected' : ''}>Completed</option>
          </select>
        </td>
        <td><button class="action-btn btn-whatsapp" onclick="contactCustomer('${b.customer_phone}')"><i class="fab fa-whatsapp"></i></button></td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Failed to load bookings:', error);
  }
}

// ========== LOAD CUSTOMERS ==========
async function loadCustomers() {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_URL}/customers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const customers = await response.json();
    
    const tbody = document.getElementById('customersBody');
    if (!tbody) return;
    
    if (!customers || customers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">No customers found缓解</tr>';
      return;
    }
    
    tbody.innerHTML = customers.map(c => `
      <tr>
        <td>${c.name || ''}</td>
        <td>${c.phone || ''}</td>
        <td>${c.email || ''}</td>
        <td>${c.total_bookings || 0}</td>
        <td>${c.last_booking || ''}</td>
        <td><button class="action-btn btn-whatsapp" onclick="contactCustomer('${c.phone}')"><i class="fab fa-whatsapp"></i></button></td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Failed to load customers:', error);
  }
}

// ========== LOAD SETTINGS & PRICING ==========
async function loadSettingsData() {
  console.log('Loading settings data...');
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_URL}/settings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const settings = await response.json();
    
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
    
    console.log('Settings and pricing loaded');
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// ========== SAVE PRICING ==========
window.savePricing = async function() {
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
      alert('Pricing saved!');
      loadSettingsData();
    } else {
      alert('Save failed');
    }
  } catch (error) {
    alert('Save failed');
  }
};

// ========== SAVE SETTINGS ==========
window.saveSettings = async function() {
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
      alert('Settings saved!');
    } else {
      alert('Save failed');
    }
  } catch (error) {
    alert('Save failed');
  }
};

// ========== UPDATE STATUS ==========
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
    loadBookings();
    loadStats();
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
  if (!confirm('⚠️ WARNING: This will delete ALL bookings permanently!')) return;
  if (!confirm('⚠️ LAST WARNING: This action CANNOT be undone!')) return;
  const input = prompt('Type "RESET" to confirm:');
  if (input !== 'RESET') return;
  if (!confirm('Final confirmation: Delete ALL bookings?')) return;
  
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_URL}/bookings/reset`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    if (result.success) {
      alert('All bookings deleted!');
      location.reload();
    }
  } catch (error) {
    alert('Reset failed');
  }
};

// ========== SIDEBAR NAVIGATION ==========
function setupSidebar() {
  const links = document.querySelectorAll('.sidebar-nav a[data-section]');
  links.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const sectionId = this.dataset.section;
      
      // Hide all sections
      document.querySelectorAll('.content-section').forEach(s => {
        s.classList.remove('active-section');
      });
      
      // Show selected section
      const target = document.getElementById(sectionId + '-section');
      if (target) target.classList.add('active-section');
      
      // Update active link
      links.forEach(l => l.classList.remove('active'));
      this.classList.add('active');
      
      // Update title
      const title = document.getElementById('pageTitle');
      if (title) title.textContent = sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
      
      // Load data if needed
      if (sectionId === 'bookings') loadBookings();
      if (sectionId === 'customers') loadCustomers();
      if (sectionId === 'pricing' || sectionId === 'settings') loadSettingsData();
    });
  });
}

// Make functions available globally
window.showSection = function(sectionId) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active-section'));
  const target = document.getElementById(sectionId + '-section');
  if (target) target.classList.add('active-section');
  document.getElementById('pageTitle').textContent = sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
  if (sectionId === 'bookings') loadBookings();
  if (sectionId === 'customers') loadCustomers();
  if (sectionId === 'pricing' || sectionId === 'settings') loadSettingsData();
};

window.viewCustomerDetails = function(phone) {
  alert('Customer details feature coming soon! Phone: ' + phone);
};

window.closeCustomerModal = function() {
  document.getElementById('customerModal').style.display = 'none';
};

window.extendSession = function() {};
window.loadAllBookings = loadBookings;