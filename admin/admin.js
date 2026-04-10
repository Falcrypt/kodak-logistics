// admin/admin.js - FINAL WORKING VERSION
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
    loadAllSettings();
    setupSidebarNavigation();
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
      tbody.innerHTML = '<tr><td colspan="10">No bookings found缓解</td>';
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
          <select onchange="updateBookingStatus(${b.id}, this.value)">
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

// ========== LOAD ALL SETTINGS (PRICING + SETTINGS) ==========
async function loadAllSettings() {
  console.log('Loading settings and pricing...');
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_URL}/settings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const settings = await response.json();
    console.log('Settings data:', settings);
    
    // Pricing section inputs
    const priceSmall = document.getElementById('priceSmall');
    const priceMedium = document.getElementById('priceMedium');
    const priceBig = document.getElementById('priceBig');
    const priceFridge = document.getElementById('priceFridge');
    const priceGas = document.getElementById('priceGas');
    
    if (priceSmall) priceSmall.value = settings.price_small || 40;
    if (priceMedium) priceMedium.value = settings.price_medium || 50;
    if (priceBig) priceBig.value = settings.price_big || 60;
    if (priceFridge) priceFridge.value = settings.price_fridge || 70;
    if (priceGas) priceGas.value = settings.price_gas || 60;
    
    // Settings section inputs
    const whatsapp = document.getElementById('whatsappNumber');
    const email = document.getElementById('businessEmail');
    
    if (whatsapp) whatsapp.value = settings.whatsapp_number || '';
    if (email) email.value = settings.business_email || '';
    
    console.log('Pricing and settings loaded successfully');
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
  
  console.log('Saving prices:', prices);
  
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
      alert('✅ Pricing saved successfully!');
      loadAllSettings();
    } else {
      alert('❌ Save failed: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Save error:', error);
    alert('❌ Save failed. Please try again.');
  }
};

// ========== SAVE SETTINGS ==========
window.saveSettings = async function() {
  const settings = {
    whatsapp_number: document.getElementById('whatsappNumber')?.value || '',
    business_email: document.getElementById('businessEmail')?.value || ''
  };
  
  const newPassword = document.getElementById('newPassword')?.value;
  const currentPassword = document.getElementById('currentPassword')?.value;
  const confirmPassword = document.getElementById('confirmPassword')?.value;
  
  if (newPassword) {
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters!');
      return;
    }
    settings.current_password = currentPassword;
    settings.new_password = newPassword;
  }
  
  console.log('Saving settings:', settings);
  
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
      alert('✅ Settings saved successfully!');
      if (newPassword) {
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
      }
      loadAllSettings();
    } else {
      alert('❌ Save failed: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Save error:', error);
    alert('❌ Save failed. Please try again.');
  }
};

// ========== UPDATE BOOKING STATUS ==========
window.updateBookingStatus = async function(id, status) {
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
    alert('✅ Status updated!');
    loadBookings();
    loadStats();
  } catch (error) {
    alert('❌ Update failed');
  }
};

// ========== CONTACT CUSTOMER ==========
window.contactCustomer = function(phone) {
  if (phone) {
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank');
  }
};

// ========== RESET ALL BOOKINGS ==========
window.resetAllBookings = async function() {
  if (!confirm('⚠️ WARNING: This will delete ALL bookings permanently!\n\nAre you absolutely sure?')) return;
  if (!confirm('⚠️ LAST WARNING: This action CANNOT be undone!\n\nAll customer booking data will be lost forever.')) return;
  
  const userInput = prompt('Type "RESET" to confirm deletion of all bookings:');
  if (userInput !== 'RESET') {
    alert('Reset cancelled. Bookings were not deleted.');
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

// ========== CUSTOMER DETAILS MODAL ==========
window.viewCustomerDetails = async function(phone) {
  alert('Customer details coming soon! Phone: ' + phone);
};

window.closeCustomerModal = function() {
  const modal = document.getElementById('customerModal');
  if (modal) modal.style.display = 'none';
};

// ========== SIDEBAR NAVIGATION ==========
function setupSidebarNavigation() {
  const navLinks = document.querySelectorAll('.sidebar-nav a[data-section]');
  
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const sectionId = this.dataset.section;
      console.log('Navigating to:', sectionId);
      
      // Hide all sections
      document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active-section');
      });
      
      // Show selected section
      const targetSection = document.getElementById(sectionId + '-section');
      if (targetSection) {
        targetSection.classList.add('active-section');
      }
      
      // Update active link
      navLinks.forEach(l => l.classList.remove('active'));
      this.classList.add('active');
      
      // Update page title
      const pageTitle = document.getElementById('pageTitle');
      if (pageTitle) {
        pageTitle.textContent = sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
      }
      
      // Load data when switching to certain tabs
      if (sectionId === 'bookings') loadBookings();
      if (sectionId === 'customers') loadCustomers();
      if (sectionId === 'pricing') loadAllSettings();
      if (sectionId === 'settings') loadAllSettings();
    });
  });
}

// Make functions globally available
window.showSection = function(sectionId) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active-section'));
  const target = document.getElementById(sectionId + '-section');
  if (target) target.classList.add('active-section');
  document.getElementById('pageTitle').textContent = sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
  if (sectionId === 'bookings') loadBookings();
  if (sectionId === 'customers') loadCustomers();
  if (sectionId === 'pricing') loadAllSettings();
  if (sectionId === 'settings') loadAllSettings();
};

window.extendSession = function() {};
window.loadAllBookings = loadBookings;