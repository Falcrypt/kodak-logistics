// admin/admin.js - UPGRADED VERSION with DELETE BOOKING & PAYMENT VERIFICATION
const API_URL = 'https://kodak-logistics-api.onrender.com/api';
console.log('Admin JS loaded - Upgraded Version with Payment Verification');

let currentUser = null;
let sessionCheckInterval = null;

// ========== AVATAR DISPLAY ==========
// Reflects currentUser.avatar_url into both the top-bar trigger icon and the
// dropdown header avatar, falling back to initials when there's no picture.
function renderAvatar(url) {
  const triggerBtn = document.getElementById('adminUserTrigger');
  const avatarInitialsEl = document.getElementById('adminAvatarInitials');
  const removeBtn = document.getElementById('removeAvatarBtn');
  const nameEl = document.getElementById('adminName');
  const name = (nameEl?.textContent || currentUser?.username || 'Admin').trim();
  const initials = name.substring(0, 2).toUpperCase();

  if (url) {
    if (triggerBtn) triggerBtn.innerHTML = `<img src="${url}" alt="">`;
    if (avatarInitialsEl) avatarInitialsEl.innerHTML = `<img src="${url}" alt="">`;
    if (removeBtn) removeBtn.style.display = 'flex';
  } else {
    if (triggerBtn) triggerBtn.innerHTML = `<i class="fas fa-user-circle"></i>`;
    if (avatarInitialsEl) avatarInitialsEl.textContent = initials;
    if (removeBtn) removeBtn.style.display = 'none';
  }
}

// Reads an image file, downsizes/crops it to a square JPEG so the upload
// stays small regardless of the source photo's resolution.
function resizeImageFile(file, maxSize = 256, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('This photo format isn\'t supported by this browser (common with iPhone HEIC photos). Please use a JPEG or PNG — try sharing the photo via WhatsApp/email first, which usually converts it, or take a screenshot of it.'));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, side, side, 0, 0, maxSize, maxSize);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ========== ITEM IMAGE LOOKUP ==========
const ITEM_IMAGES = {
  duffle_small: '../images/duffle-small.jpg',
  duffle_big: '../images/duffle-big.jpg',
  jute_small: '../images/jute-small.jpg',
  jute_medium: '../images/jute-medium.jpg',
  jute_big: '../images/jute-big.jpg',
  travel_small: '../images/travel-small.jpg',
  travel_medium: '../images/travel-medium.jpg',
  travel_big: '../images/travel-big.jpg',
  microwave: '../images/microwave.jpg',
  fridge_tabletop: '../images/fridge-tabletop.jpg',
  fridge_doubledoor: '../images/fridge-doubledoor.jpg',
  fridge_small: '../images/fridge-small.jpg',
  gas_small: '../images/gas-small.jpg',
  gas_medium: '../images/gas-medium.jpg',
  gas_big: '../images/gas-big.jpg',
  container_small: '../images/container-small.jpg',
  container_big: '../images/container-big.jpg',
  tv_small: '../images/smallscreen.jpg',
  tv_medium: '../images/mediumscreen.jpg',
  tv_large: '../images/largescreen.jpg',
  tv_xlarge: '../images/tv.jpg',
  buckets: '../images/buckets.jpg'
};

// Turns an items summary like "2x jute_big, 1x travel_medium" into thumbnail
// images (max 3) plus the original text, for use in booking/return tables.
function renderItemThumbs(itemsSummary, maxThumbs = 3) {
  const text = itemsSummary || '';
  const keys = Array.from(text.matchAll(/\d+x\s*([a-z_]+)/gi)).map(m => m[1]);
  const images = keys.map(k => ITEM_IMAGES[k]).filter(Boolean);

  if (images.length === 0) {
    return `<span class="item-text">${escapeHtml(text.substring(0, 30))}</span>`;
  }

  const shown = images.slice(0, maxThumbs)
    .map(src => `<img class="item-thumb" src="${src}" alt="" onerror="this.style.display='none'">`)
    .join('');
  const extra = images.length > maxThumbs
    ? `<span class="item-thumb-more">+${images.length - maxThumbs}</span>`
    : '';

  return `<div class="item-thumb-row">${shown}${extra}</div>
    <span class="item-text">${escapeHtml(text.substring(0, 40))}</span>`;
}

// ========== SEARCH & FILTER VARIABLES ==========
let currentSearchTerm = '';
let currentStatusFilter = 'all';
let currentBookingsView = 'active'; // 'active' | 'past' | 'all' — keeps old semesters' bookings out of the way by default
let currentSubmittedFilter = ''; // '' | 'today' | 'week' | 'month' — when the booking was made, not the pickup date
let currentPaymentStatusFilter = ''; // '' | 'pending_verification' | 'verified' | 'rejected' | 'unpaid'
let searchTimeout = null;

// ========== DATE FILTER VARIABLES ==========
let currentBookingDateFilter = '';
let currentReturnDateFilter = '';

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
      renderAvatar(currentUser.avatar_url);
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

                    // Clear session when browser/tab is closed (optional)
          window.addEventListener('beforeunload', function() {
              // Commented out - session will expire naturally
              // localStorage.removeItem('adminToken');
          });
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
        setupCustomerSearch();
        loadAllSettings();
        setupNavigation();
        setupAccountMenu();
        setupEventListeners();
        setupMobileMenu();
      } else {
        // Redirect to login page if not authenticated
        window.location.href = 'index.html';
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
  console.log('Loading settings and pricing...');
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
    
    // ===== ELECTRONICS =====
    const pTvSmall = document.getElementById('priceTvSmall');
    const pTvMedium = document.getElementById('priceTvMedium');
    const pTvLarge = document.getElementById('priceTvLarge');
    const pTvXlarge = document.getElementById('priceTvXlarge');
    if (pTvSmall) pTvSmall.value = settings.price_tv_small || 39.99;
    if (pTvMedium) pTvMedium.value = settings.price_tv_medium || 54.99;
    if (pTvLarge) pTvLarge.value = settings.price_tv_large || 69.99;
    if (pTvXlarge) pTvXlarge.value = settings.price_tv_xlarge || 89.99;

    // ===== FREE ITEMS =====
    const pBuckets = document.getElementById('priceBuckets');
    if (pBuckets) pBuckets.value = settings.price_buckets || 0;

    console.log('Settings and pricing loaded successfully');
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// ========== NAVIGATION SETUP ==========
function navigateToSection(sectionId, skipDefaultLoad) {
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active-section');
  });

  const targetSection = document.getElementById(sectionId + '-section');
  if (targetSection) {
    targetSection.classList.add('active-section');
  }

  document.querySelectorAll('.sidebar-nav a[data-section]').forEach(link => {
    link.classList.toggle('active', link.dataset.section === sectionId);
  });

  const titleEl = document.getElementById('pageTitle');
  if (titleEl) {
    titleEl.textContent = sectionId === 'dashboard' ? 'Overview' : sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
  }

  // skipDefaultLoad lets a caller (e.g. a clicked dashboard stat tile) apply
  // its own filters instead of having them immediately reset.
  if (skipDefaultLoad) return;

  // Load data based on section
  if (sectionId === 'bookings') {
    loadAllBookings();
  } else if (sectionId === 'customers') {
    loadCustomers();
    setupCustomerSearch();
  } else if (sectionId === 'pricing' || sectionId === 'settings') {
    loadAllSettings();
  } else if (sectionId === 'returns') {
    loadReturnRequests();
    loadReturnStats();
    setTimeout(() => setupReturnListeners(), 100);
  } else if (sectionId === 'reviews') {
    loadReviewsSection();
    setTimeout(() => setupReviewListeners(), 100);
  }
}

function setupNavigation() {
  const navLinks = document.querySelectorAll('.sidebar-nav a[data-section]');

  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      navigateToSection(this.dataset.section);
    });
  });
}

// ========== ACCOUNT MENU (top-bar avatar) ==========
function setupAccountMenu() {
  const trigger = document.getElementById('adminUserTrigger');
  const dropdown = document.getElementById('adminUserDropdown');
  if (!trigger || !dropdown) return;

  const nameEl = document.getElementById('adminName');
  const dropdownName = document.getElementById('adminDropdownName');

  function syncIdentity() {
    const name = (nameEl?.textContent || currentUser?.username || 'Admin').trim();
    if (dropdownName) dropdownName.textContent = name;
    renderAvatar(currentUser?.avatar_url);
  }
  syncIdentity();
  setTimeout(syncIdentity, 500); // adminName is filled in slightly after checkAuth resolves

  // ---- Profile picture upload / remove ----
  const avatarBtn = document.getElementById('adminAvatarBtn');
  const avatarFileInput = document.getElementById('avatarFileInput');
  const removeAvatarBtn = document.getElementById('removeAvatarBtn');

  if (avatarBtn && avatarFileInput) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      avatarFileInput.click();
    });

    avatarFileInput.addEventListener('change', async () => {
      const file = avatarFileInput.files[0];
      avatarFileInput.value = '';
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showNotification('Please choose an image file', 'error');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        showNotification('Image is too large (max 8MB)', 'error');
        return;
      }

      avatarBtn.classList.add('uploading');
      try {
        const dataUrl = await resizeImageFile(file);
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/auth/avatar`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ avatar: dataUrl })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Upload failed');

        currentUser.avatar_url = result.avatar_url;
        renderAvatar(result.avatar_url);
        showNotification('Profile picture updated', 'success');
      } catch (error) {
        showNotification('Failed to update profile picture: ' + error.message, 'error');
      } finally {
        avatarBtn.classList.remove('uploading');
      }
    });
  }

  if (removeAvatarBtn) {
    removeAvatarBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/auth/avatar`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Request failed');

        currentUser.avatar_url = null;
        renderAvatar(null);
        dropdown.classList.remove('open');
        showNotification('Profile picture removed', 'success');
      } catch (error) {
        showNotification('Failed to remove profile picture: ' + error.message, 'error');
      }
    });
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  document.addEventListener('click', () => dropdown.classList.remove('open'));

  dropdown.querySelectorAll('a[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      dropdown.classList.remove('open');
      navigateToSection(link.dataset.section);
      if (link.dataset.focus) {
        setTimeout(() => document.getElementById(link.dataset.focus)?.focus(), 150);
      }
    });
  });

  const dropdownLogout = document.getElementById('dropdownLogoutBtn');
  if (dropdownLogout) {
    dropdownLogout.addEventListener('click', () => logout());
  }
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
    console.log(`API Call: ${options.method || 'GET'} ${endpoint}`);
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    
    if (response.status === 401) {
      logout('Session expired');
      return null;
    }
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// ========== DASHBOARD ==========
async function loadDashboardData() {
  try {
    const stats = await apiCall('/bookings/stats');
    if (!stats) return;
    
    const revenue = typeof stats.revenue === 'number' ? stats.revenue : parseFloat(stats.revenue) || 0;
    const todayStr = new Date().toISOString().split('T')[0];

    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
      statsGrid.innerHTML = `
        <div class="stat-card" onclick="goToFilteredBookings({view:'all'})"><i class="fas fa-boxes-stacked stat-icon"></i><div class="stat-info"><h3>Total Bookings</h3><p>${stats.total || 0}</p></div></div>
        <div class="stat-card" onclick="goToFilteredBookings({date:'${todayStr}', view:'all'})"><i class="fas fa-calendar-alt stat-icon"></i><div class="stat-info"><h3>Today's Bookings</h3><p>${stats.today || 0}</p></div></div>
        <div class="stat-card" onclick="goToFilteredBookings({status:'pending', view:'all'})"><i class="fas fa-clock stat-icon"></i><div class="stat-info"><h3>Pending</h3><p>${stats.pending || 0}</p></div></div>
        <div class="stat-card" onclick="goToFilteredBookings({status:'confirmed', view:'all'})"><i class="fas fa-check-circle stat-icon"></i><div class="stat-info"><h3>Confirmed</h3><p>${stats.confirmed || 0}</p></div></div>
        <div class="stat-card" onclick="goToFilteredBookings({view:'all'})"><i class="fas fa-money-bill-wave stat-icon"></i><div class="stat-info"><h3>Revenue (₵)</h3><p>${revenue.toFixed(2)}</p></div></div>
        <div class="stat-card" onclick="goToFilteredBookings({paymentStatus:'pending_verification', view:'all'})"><i class="fas fa-spinner stat-icon"></i><div class="stat-info"><h3>Pending Payments</h3><p>${stats.pending_payments || 0}</p></div></div>
      `;
    }
    await loadRecentBookings();
    loadReturnStats();
    loadSmartStats(stats);
    loadRevenueTrend();
    loadPopularItems();
  } catch (error) {
    console.error('Dashboard load failed:', error);
  }
}

// ========== SMART INSIGHTS ==========
async function loadSmartStats(bookingStats) {
  try {
    const [growth, reviewStats] = await Promise.all([
      apiCall('/insights/customer-growth'),
      apiCall('/reviews/stats/summary')
    ]);

    const grid = document.getElementById('smartStatsGrid');
    if (!grid) return;

    const avgRating = reviewStats?.average_rating ? reviewStats.average_rating.toFixed(1) : '–';

    grid.innerHTML = `
      <div class="stat-card" onclick="goToCustomers()"><i class="fas fa-users stat-icon"></i><div class="stat-info"><h3>Total Customers</h3><p>${growth?.total_customers ?? 0}</p><small>${growth?.new_last_30_days ?? 0} new in last 30 days</small></div></div>
      <div class="stat-card" onclick="goToCustomers()"><i class="fas fa-repeat stat-icon"></i><div class="stat-info"><h3>Repeat Customers</h3><p>${growth?.repeat_customers ?? 0}</p><small>Booked more than once</small></div></div>
      <div class="stat-card" onclick="goToReviews()"><i class="fas fa-star stat-icon"></i><div class="stat-info"><h3>Average Rating</h3><p>${avgRating}</p><small>${reviewStats?.total ?? 0} review${reviewStats?.total === 1 ? '' : 's'}</small></div></div>
      <div class="stat-card" onclick="goToFilteredBookings({submitted:'today', view:'all'})"><i class="fas fa-user-clock stat-icon"></i><div class="stat-info"><h3>Booked Today</h3><p>${bookingStats?.customers_today ?? 0}</p><small>Distinct customers</small></div></div>
      <div class="stat-card" onclick="goToFilteredBookings({submitted:'week', view:'all'})"><i class="fas fa-calendar-week stat-icon"></i><div class="stat-info"><h3>Booked This Week</h3><p>${bookingStats?.customers_this_week ?? 0}</p><small>Distinct customers</small></div></div>
      <div class="stat-card" onclick="goToFilteredBookings({submitted:'month', view:'all'})"><i class="fas fa-calendar-days stat-icon"></i><div class="stat-info"><h3>Booked This Month</h3><p>${bookingStats?.customers_this_month ?? 0}</p><small>Distinct customers</small></div></div>
    `;
  } catch (error) {
    console.error('Failed to load smart stats:', error);
  }
}

async function loadRevenueTrend() {
  try {
    const data = await apiCall('/insights/revenue-trend?days=30');
    const wrap = document.getElementById('revenueChart');
    if (!wrap || !data || data.length === 0) return;

    const svg = wrap.querySelector('svg');
    const w = 600, h = 160, pad = 8;
    const max = Math.max(1, ...data.map(d => d.revenue));
    const stepX = (w - pad * 2) / (data.length - 1);

    const points = data.map((d, i) => {
      const x = pad + i * stepX;
      const y = h - pad - (d.revenue / max) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const areaPoints = `${pad},${h - pad} ${points} ${w - pad},${h - pad}`;

    svg.innerHTML = `
      <defs>
        <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#cda36a" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#cda36a" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <polygon points="${areaPoints}" fill="url(#revFill)"></polygon>
      <polyline points="${points}" fill="none" stroke="#cda36a" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></polyline>
    `;
  } catch (error) {
    console.error('Failed to load revenue trend:', error);
  }
}

async function loadPopularItems() {
  try {
    const items = await apiCall('/insights/popular-items');
    const list = document.getElementById('popularItemsList');
    if (!list) return;

    if (!items || items.length === 0) {
      list.innerHTML = '<span class="item-text">No booking data yet</span>';
      return;
    }

    const max = Math.max(...items.map(i => i.count));

    list.innerHTML = items.map(item => {
      const img = ITEM_IMAGES[item.key];
      const pct = Math.round((item.count / max) * 100);
      return `
        <div class="popular-item-row">
          ${img ? `<img class="popular-item-thumb" src="${img}" alt="">` : ''}
          <div class="popular-item-info">
            <div class="popular-item-label"><span>${escapeHtml(item.label)}</span><span>${item.count}</span></div>
            <div class="popular-item-bar-track"><div class="popular-item-bar-fill" style="width:${pct}%"></div></div>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Failed to load popular items:', error);
  }
}

async function loadRecentBookings() {
  try {
    const data = await apiCall('/bookings?limit=5');
    displayRecentBookings(data?.bookings || []);
  } catch (error) {
    console.error('Failed to load recent bookings:', error);
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
    const items = booking.items_summary || booking.items || '';
    const total = booking.total_amount || booking.total || '0';
    const status = booking.status || 'pending';
    const phone = booking.customer_phone || booking.phone || '';
    const id = booking.id || '';
    const ref = booking.booking_ref || '';
    const paymentStatus = booking.payment_status || 'unpaid';

    let paymentBadge = '';
    if (paymentStatus === 'pending_verification') {
      paymentBadge = '<span class="payment-badge pending">Pending</span>';
    } else if (paymentStatus === 'verified') {
      paymentBadge = '<span class="payment-badge verified">Verified</span>';
    } else {
      paymentBadge = '<span class="payment-badge unpaid">Unpaid</span>';
    }

    return `<tr>
      <td>${escapeHtml(date)}</td>
      <td>${escapeHtml(name)}</td>
      <td>${renderItemThumbs(items)}</td>
      <td>₵${escapeHtml(total)}</td>
      <td>${paymentBadge}</td>
      <td><span class="status-badge status-${escapeHtml(status)}">${escapeHtml(status)}</span></td>
      <td>
        <button class="action-btn btn-whatsapp" onclick="contactCustomer('${escapeHtml(phone)}')"><i class="fab fa-whatsapp"></i></button>
        <button class="action-btn btn-delete" onclick="deleteSingleBooking(${id}, '${escapeHtml(ref)}')"><i class="fas fa-trash"></i></button>
       </td>
     </tr>`;
  }).join('');
}

// ========== LOAD BOOKINGS WITH SEARCH & FILTER ==========
async function loadFilteredBookings() {
    try {
        console.log(`Searching: "${currentSearchTerm}", Filter: ${currentStatusFilter}, Date: ${currentBookingDateFilter}`);
        
        const params = new URLSearchParams();
        
        if (currentSearchTerm) {
            params.append('search', currentSearchTerm);
        }
        if (currentStatusFilter !== 'all') {
            params.append('status', currentStatusFilter);
        }
        if (currentBookingDateFilter) {
            params.append('date', currentBookingDateFilter);
        }
        if (currentBookingsView !== 'all') {
            params.append('view', currentBookingsView);
        }
        if (currentSubmittedFilter) {
            params.append('submitted', currentSubmittedFilter);
        }
        if (currentPaymentStatusFilter) {
            params.append('payment_status', currentPaymentStatusFilter);
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
    currentSubmittedFilter = '';
    currentPaymentStatusFilter = '';

    const searchInput = document.getElementById('searchBooking');
    const statusFilter = document.getElementById('statusFilter');

    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = 'all';

    await loadFilteredBookings();
}

// ========== DASHBOARD TILE → FILTERED VIEW (clickable stat cards) ==========
// Jumps to the Bookings section with a specific filter combination already
// applied, and keeps the visible controls (status dropdown, view tabs, date
// box) in sync so the UI doesn't look out of step with what's shown.
function goToFilteredBookings({ status = 'all', date = '', submitted = '', paymentStatus = '', view = 'all' } = {}) {
  navigateToSection('bookings', true);

  currentSearchTerm = '';
  currentStatusFilter = status;
  currentBookingDateFilter = date;
  currentSubmittedFilter = submitted;
  currentPaymentStatusFilter = paymentStatus;
  currentBookingsView = view;

  const searchInput = document.getElementById('searchBooking');
  const statusFilterEl = document.getElementById('statusFilter');
  const customDateInput = document.getElementById('customDateFilter');
  if (searchInput) searchInput.value = '';
  if (statusFilterEl) statusFilterEl.value = status;
  if (customDateInput) customDateInput.value = date;

  document.querySelectorAll('#bookingsViewTabs .view-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.view === view);
  });

  loadFilteredBookings();
}

function goToCustomers() {
  navigateToSection('customers');
}

function goToReviews() {
  navigateToSection('reviews');
}

function getPaymentStatusBadge(paymentStatus) {
    switch(paymentStatus) {
        case 'pending_verification':
            return '<span class="payment-badge pending">Pending Verification</span>';
        case 'verified':
            return '<span class="payment-badge verified">Verified</span>';
        case 'rejected':
            return '<span class="payment-badge rejected">Rejected</span>';
        default:
            return '<span class="payment-badge unpaid">Unpaid</span>';
    }
}

// A friendlier, context-aware empty state instead of a flat "No bookings
// found" regardless of which filter combination led there.
function emptyBookingsMessage() {
  if (currentSearchTerm) return `No bookings match "${escapeHtml(currentSearchTerm)}"`;
  if (currentPaymentStatusFilter === 'pending_verification') return 'Nothing awaiting payment verification right now 🎉';
  if (currentSubmittedFilter === 'today') return 'No bookings submitted today yet';
  if (currentSubmittedFilter === 'week') return 'No bookings submitted this week yet';
  if (currentSubmittedFilter === 'month') return 'No bookings submitted this month yet';
  if (currentStatusFilter === 'pending') return 'Nothing pending right now';
  if (currentStatusFilter === 'confirmed') return 'No confirmed bookings match this view';
  if (currentBookingDateFilter) return `No bookings scheduled for ${currentBookingDateFilter}`;
  if (currentBookingsView === 'active') return 'No active bookings — everything current is picked up. Check the "Past" tab for history.';
  if (currentBookingsView === 'past') return 'No past bookings yet';
  return 'No bookings found';
}

function displayAllBookings(bookings) {
  const tbody = document.getElementById('allBookingsBody');
  if (!tbody) return;
  if (!bookings || bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11">${emptyBookingsMessage()}</td></tr>`;
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
    
    const paymentMethodText = paymentMethod === 'paystack' ? 'Paystack' : paymentMethod === 'momo' ? 'MoMo' : 'Pickup';
    const paymentMethodIcon = paymentMethod === 'paystack' ? 'fa-shield-halved' : paymentMethod === 'momo' ? 'fa-mobile-screen-button' : 'fa-money-bill-wave';

    const showVerifyButton = paymentMethod === 'momo' && paymentStatus === 'pending_verification';

    return `<tr>
      <td>${escapeHtml(id)}</td>
      <td>${escapeHtml(ref)}</td>
      <td>${escapeHtml(name)}</td>
      <td>${escapeHtml(phone)}</td>
      <td>${escapeHtml(date)}</td>
      <td>${renderItemThumbs(items)}</td>
      <td>₵${escapeHtml(total)}</td>
      <td>
        <select class="status-select" onchange="updateBookingStatus(${id}, this.value)">
          <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="confirmed" ${status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
          <option value="completed" ${status === 'completed' ? 'selected' : ''}>Completed</option>
        </select>
       </td>
      <td>
        <span class="item-text"><i class="fas ${paymentMethodIcon}"></i> ${paymentMethodText}</span> ${getPaymentStatusBadge(paymentStatus)}
        ${transactionId ? `<br><small style="font-size: 10px;">Ref: ${escapeHtml(transactionId)}</small>` : ''}
       </td>
      <td>
        ${showVerifyButton ? `<button class="action-btn btn-verify" onclick="verifyPayment(${id}, '${escapeHtml(booking.customer_email)}', '${escapeHtml(ref)}', ${total})"><i class="fas fa-check-circle"></i> Verify</button>` : ''}
        <button class="action-btn btn-whatsapp" onclick="contactCustomer('${escapeHtml(phone)}')" style="margin-right: 5px;"><i class="fab fa-whatsapp"></i></button>
        <button class="action-btn btn-delete" onclick="deleteSingleBooking(${id}, '${escapeHtml(ref)}')"><i class="fas fa-trash"></i> Delete</button>
       </td>
     </tr>`;
  }).join('');
}

// ========== VERIFY PAYMENT (NEW) ==========
window.verifyPayment = async function(bookingId, customerEmail, bookingRef, amount) {
  if (!confirm(`Verify payment for booking ${bookingRef}?\n\nAmount: GH₵${amount}\nCustomer: ${customerEmail}\n\nMake sure you have confirmed the money in your mobile money statement before verifying.`)) {
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
    showNotification(`Payment verified for ${bookingRef}! Email sent to customer.`, 'success');
    
    // Refresh the current view
    await loadFilteredBookings();
    loadDashboardData();
    
  } catch (error) {
    console.error('Error verifying payment:', error);
    showNotification(`Failed to verify payment: ${error.message}`, 'error');
  }
};

// ========== DELETE SINGLE BOOKING ==========
window.deleteSingleBooking = async function(bookingId, bookingRef) {
  if (!confirm(`Are you sure you want to delete booking ${bookingRef}?\n\nThis action CANNOT be undone!`)) {
    return;
  }
  
  if (!confirm(`FINAL WARNING: Are you ABSOLUTELY sure you want to delete ${bookingRef}?\n\nThis will permanently remove this booking from the database.`)) {
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
    
    showNotification(`Booking ${result.booking_ref} has been deleted successfully!`, 'success');
    await loadFilteredBookings();
    loadDashboardData();
    
    if (document.getElementById('customers-section')?.classList.contains('active-section')) {
      loadCustomers();
    }
    
  } catch (error) {
    console.error('Error deleting booking:', error);
    showNotification(`Failed to delete booking: ${error.message}`, 'error');
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
let allCustomers = [];

async function loadCustomers() {
  try {
    const data = await apiCall('/customers');
    allCustomers = data || [];
    displayCustomers(allCustomers);
  } catch (error) {
    console.error('Failed to load customers:', error);
    displayCustomers([]);
  }
}

function customerInitials(name) {
  const parts = (name || '?').trim().split(/\s+/);
  const initials = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].substring(0, 2);
  return initials.toUpperCase();
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
      <td>
        <div class="customer-cell">
          <div class="customer-avatar">${customerInitials(customer.name)}</div>
          <a href="#" class="customer-name-link" onclick="viewCustomerDetails('${escapeHtml(customer.phone)}'); return false;">${escapeHtml(customer.name || 'Unknown')}</a>
        </div>
      </td>
      <td>${escapeHtml(customer.phone || '')}</td>
      <td>${escapeHtml(customer.email || '')}</td>
      <td>${escapeHtml(customer.total_bookings || 0)}</td>
      <td>${escapeHtml(customer.last_booking || '')}</td>
      <td>
        <button class="action-btn btn-whatsapp" onclick="contactCustomer('${escapeHtml(customer.phone)}')" title="Message on WhatsApp"><i class="fab fa-whatsapp"></i></button>
        <button class="action-btn" style="background: var(--info-soft); color: var(--info);" onclick="viewCustomerDetails('${escapeHtml(customer.phone)}')" title="View booking history"><i class="fas fa-eye"></i></button>
        <button class="action-btn btn-delete" onclick="deleteCustomer('${escapeHtml(customer.phone)}', '${escapeHtml((customer.name || 'this customer').replace(/'/g, "\\'"))}')" title="Delete customer and all their data"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function setupCustomerSearch() {
  const searchInput = document.getElementById('customerSearch');
  if (!searchInput || searchInput.dataset.bound) return;
  searchInput.dataset.bound = 'true';
  searchInput.addEventListener('input', function() {
    const term = this.value.trim().toLowerCase();
    if (!term) {
      displayCustomers(allCustomers);
      return;
    }
    const filtered = allCustomers.filter(c =>
      (c.name || '').toLowerCase().includes(term) ||
      (c.phone || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term)
    );
    displayCustomers(filtered);
  });
}

window.deleteCustomer = async function(phone, name) {
  if (!confirm(`Delete ${name} permanently?\n\nThis removes ALL their bookings, return requests, and reviews. This cannot be undone.`)) {
    return;
  }
  if (!confirm(`FINAL WARNING: Are you absolutely sure you want to permanently delete ${name} and every record tied to them?`)) {
    return;
  }

  try {
    const result = await apiCall(`/customers/${encodeURIComponent(phone)}`, { method: 'DELETE' });
    if (result?.success) {
      showNotification(`${name} and all associated data have been deleted.`, 'success');
      loadCustomers();
    }
  } catch (error) {
    showNotification('Failed to delete customer: ' + error.message, 'error');
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

    document.getElementById('modalCustomerName').textContent = customerBookings[0].customer_name || 'Customer';
    document.getElementById('modalCustomerPhone').textContent = `Phone: ${phone}  |  Email: ${customerBookings[0].customer_email || ''}`;

    const tableBody = document.getElementById('modalBookingsTableBody');
    tableBody.innerHTML = '';

    customerBookings.forEach(booking => {
      const row = tableBody.insertRow();
      row.innerHTML = `
        <td style="padding: 10px; border-bottom: 1px solid var(--glass-border);">${escapeHtml(booking.booking_ref || 'N/A')}</td>
        <td style="padding: 10px; border-bottom: 1px solid var(--glass-border);">${escapeHtml(booking.booking_date || 'N/A')}</td>
        <td style="padding: 10px; border-bottom: 1px solid var(--glass-border);">${escapeHtml(booking.items_summary || 'N/A')}</td>
        <td style="padding: 10px; border-bottom: 1px solid var(--glass-border);">₵${escapeHtml(booking.total_amount || '0')}</td>
        <td style="padding: 10px; border-bottom: 1px solid var(--glass-border);">
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
  if (!confirm('WARNING: This will delete ALL bookings permanently!')) return;
  if (!confirm('LAST WARNING: This action CANNOT be undone!')) return;
  
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
      alert('All bookings deleted successfully!');
      location.reload();
    } else {
      alert('Failed: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Reset error:', error);
    alert('Failed to reset bookings');
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
    price_tv_small: getVal('priceTvSmall', 39.99),
    price_tv_medium: getVal('priceTvMedium', 54.99),
    price_tv_large: getVal('priceTvLarge', 69.99),
    price_tv_xlarge: getVal('priceTvXlarge', 89.99),
    price_buckets: getVal('priceBuckets', 0)
  };

  console.log('Saving prices:', prices);

  const saveButton = document.querySelector('#pricing-section .btn-save-modern');
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  }

  try {
    const result = await apiCall('/settings', { method: 'PUT', body: JSON.stringify(prices) });
    if (result?.success) {
      showMessage('pricingMessage', 'All prices saved successfully!', 'success');
      await loadAllSettings();
    } else {
      throw new Error(result?.error || 'Save failed');
    }
  } catch (error) {
    console.error('Save error:', error);
    showMessage('pricingMessage', `Error: ${error.message}`, 'error');
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

// ========== BOOKINGS VIEW TABS (Active / Past / All) ==========
function setupBookingsViewTabs() {
  const tabs = document.querySelectorAll('#bookingsViewTabs .view-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentBookingsView = tab.dataset.view;
      loadFilteredBookings();
    });
  });
}

// ========== DATE FILTER FUNCTIONS ==========
function setupDateFilters() {
    // Bookings Date Filters
    const todayBtn = document.getElementById('filterToday');
    const tomorrowBtn = document.getElementById('filterTomorrow');
    const applyDateBtn = document.getElementById('applyDateFilter');
    const clearDateBtn = document.getElementById('clearDateFilter');
    const customDateInput = document.getElementById('customDateFilter');
    
    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            const today = new Date().toISOString().split('T')[0];
            currentBookingDateFilter = today;
            if (customDateInput) customDateInput.value = today;
            loadFilteredBookings();
            showNotification(`Showing bookings for: ${today}`, 'info');
        });
    }
    
    if (tomorrowBtn) {
        tomorrowBtn.addEventListener('click', () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            currentBookingDateFilter = tomorrowStr;
            if (customDateInput) customDateInput.value = tomorrowStr;
            loadFilteredBookings();
            showNotification(`Showing bookings for: ${tomorrowStr}`, 'info');
        });
    }
    
    if (applyDateBtn && customDateInput) {
        applyDateBtn.addEventListener('click', () => {
            const selectedDate = customDateInput.value;
            if (selectedDate) {
                currentBookingDateFilter = selectedDate;
                loadFilteredBookings();
                showNotification(`Showing bookings for: ${selectedDate}`, 'info');
            } else {
                showNotification('Please select a date first', 'error');
            }
        });
    }
    
    if (clearDateBtn) {
        clearDateBtn.addEventListener('click', () => {
            currentBookingDateFilter = '';
            if (customDateInput) customDateInput.value = '';
            loadFilteredBookings();
            showNotification('Date filter cleared. Showing all bookings.', 'info');
        });
    }
    
    // Returns Date Filters
    const returnTodayBtn = document.getElementById('returnFilterToday');
    const returnTomorrowBtn = document.getElementById('returnFilterTomorrow');
    const applyReturnDateBtn = document.getElementById('applyReturnDateFilter');
    const clearReturnDateBtn = document.getElementById('clearReturnDateFilter');
    const returnCustomDateInput = document.getElementById('returnCustomDateFilter');
    
    if (returnTodayBtn) {
        returnTodayBtn.addEventListener('click', () => {
            const today = new Date().toISOString().split('T')[0];
            currentReturnDateFilter = today;
            if (returnCustomDateInput) returnCustomDateInput.value = today;
            loadReturnRequests();
            showNotification(`Showing returns for: ${today}`, 'info');
        });
    }
    
    if (returnTomorrowBtn) {
        returnTomorrowBtn.addEventListener('click', () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            currentReturnDateFilter = tomorrowStr;
            if (returnCustomDateInput) returnCustomDateInput.value = tomorrowStr;
            loadReturnRequests();
            showNotification(`Showing returns for: ${tomorrowStr}`, 'info');
        });
    }
    
    if (applyReturnDateBtn && returnCustomDateInput) {
        applyReturnDateBtn.addEventListener('click', () => {
            const selectedDate = returnCustomDateInput.value;
            if (selectedDate) {
                currentReturnDateFilter = selectedDate;
                loadReturnRequests();
                showNotification(`Showing returns for: ${selectedDate}`, 'info');
            } else {
                showNotification('Please select a date first', 'error');
            }
        });
    }
    
    if (clearReturnDateBtn) {
        clearReturnDateBtn.addEventListener('click', () => {
            currentReturnDateFilter = '';
            if (returnCustomDateInput) returnCustomDateInput.value = '';
            loadReturnRequests();
            showNotification('Date filter cleared. Showing all returns.', 'info');
        });
    }
}

// ========== REVIEWS MANAGEMENT ==========
let currentReviewSearch = '';
let currentReviewStatusFilter = 'all';
let reviewSearchTimeout = null;

function starsHtml(rating) {
  const full = Math.round(rating);
  let out = '';
  for (let i = 1; i <= 5; i++) {
    out += i <= full ? '★' : '<span class="dim">★</span>';
  }
  return out;
}

async function loadReviewsSection() {
  loadReviewsSummary();
  loadReviewsList();
}

async function loadReviewsSummary() {
  try {
    const stats = await apiCall('/reviews/stats/summary');
    if (!stats) return;

    document.getElementById('reviewsAvgNumber').textContent = stats.total > 0 ? stats.average_rating.toFixed(1) : '–';
    document.getElementById('reviewsAvgStars').innerHTML = starsHtml(stats.average_rating || 0);
    document.getElementById('reviewsTotalCount').textContent = stats.total > 0
      ? `${stats.total} review${stats.total === 1 ? '' : 's'} · ${stats.published} published`
      : 'No reviews yet';

    const breakdown = document.getElementById('reviewsBreakdown');
    if (breakdown) {
      breakdown.innerHTML = [5, 4, 3, 2, 1].map(n => {
        const count = stats.breakdown[n] || 0;
        const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
        return `
          <div class="rating-bar-row">
            <span>${n} star</span>
            <div class="rating-bar-track"><div class="rating-bar-fill" style="width:${pct}%"></div></div>
            <span>${count}</span>
          </div>
        `;
      }).join('');
    }
  } catch (error) {
    console.error('Failed to load review summary:', error);
  }
}

async function loadReviewsList() {
  try {
    const params = new URLSearchParams();
    if (currentReviewStatusFilter !== 'all') params.append('status', currentReviewStatusFilter);
    if (currentReviewSearch) params.append('search', currentReviewSearch);

    const url = `/reviews${params.toString() ? '?' + params.toString() : ''}`;
    const reviews = await apiCall(url);
    displayReviews(reviews || []);
  } catch (error) {
    console.error('Failed to load reviews:', error);
    displayReviews([]);
  }
}

function displayReviews(reviews) {
  const list = document.getElementById('reviewsList');
  if (!list) return;

  if (!reviews || reviews.length === 0) {
    list.innerHTML = '<div class="insight-panel"><p class="item-text">No reviews found.</p></div>';
    return;
  }

  list.innerHTML = reviews.map(review => {
    const date = new Date(review.created_at).toLocaleDateString();
    const isPublished = review.status === 'published';
    return `
      <div class="review-card">
        <div class="review-card-top">
          <div>
            <div class="review-card-name">${escapeHtml(review.customer_name)}</div>
            <div class="review-card-meta">${escapeHtml(review.booking_ref)} &middot; ${date}</div>
          </div>
          <span class="stars">${starsHtml(review.rating)}</span>
        </div>
        ${review.comment ? `<div class="review-card-comment">${escapeHtml(review.comment)}</div>` : ''}
        <div class="review-card-actions">
          <span class="status-badge ${isPublished ? 'status-confirmed' : 'status-pending'}">${isPublished ? 'Published' : 'Hidden'}</span>
          <button class="action-btn" style="background: var(--info-soft); color: var(--info);" onclick="toggleReviewStatus(${review.id}, '${isPublished ? 'hidden' : 'published'}')">
            <i class="fas fa-eye${isPublished ? '-slash' : ''}"></i> ${isPublished ? 'Hide' : 'Publish'}
          </button>
          <button class="action-btn btn-delete" onclick="deleteReview(${review.id})"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

window.toggleReviewStatus = async function(id, status) {
  try {
    await apiCall(`/reviews/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
    showNotification(`Review ${status}`, 'success');
    loadReviewsList();
    loadReviewsSummary();
  } catch (error) {
    showNotification('Failed to update review: ' + error.message, 'error');
  }
};

window.deleteReview = async function(id) {
  if (!confirm('Delete this review permanently?')) return;
  try {
    await apiCall(`/reviews/${id}`, { method: 'DELETE' });
    showNotification('Review deleted', 'success');
    loadReviewsList();
    loadReviewsSummary();
  } catch (error) {
    showNotification('Failed to delete review: ' + error.message, 'error');
  }
};

function setupReviewListeners() {
  const searchInput = document.getElementById('reviewSearch');
  const statusFilter = document.getElementById('reviewStatusFilter');

  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = 'true';
    searchInput.addEventListener('input', function() {
      clearTimeout(reviewSearchTimeout);
      reviewSearchTimeout = setTimeout(() => {
        currentReviewSearch = this.value;
        loadReviewsList();
      }, 400);
    });
  }

  if (statusFilter && !statusFilter.dataset.bound) {
    statusFilter.dataset.bound = 'true';
    statusFilter.addEventListener('change', function() {
      currentReviewStatusFilter = this.value;
      loadReviewsList();
    });
  }
}

// ========== GLOBAL EXPORTS ==========

// ========== RETURN REQUESTS MANAGEMENT ==========

// Load all return requests
async function loadReturnRequests() {
    try {
        const status = document.getElementById('returnStatusFilter')?.value || 'all';
        const search = document.getElementById('returnSearch')?.value || '';
        
        let url = `/returns?`;
        if (status !== 'all') url += `status=${status}&`;
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (currentReturnDateFilter) url += `date=${currentReturnDateFilter}&`;
        
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
        const paymentMethod = request.payment_method === 'momo' ? 'MoMo' : 'On Delivery';
        
        let actionButtons = '';
        
        if (request.status === 'pending') {
            actionButtons = `
                <button class="action-btn btn-confirm" onclick="updateReturnStatus(${request.id}, 'confirmed')" style="background:var(--success-soft); color:var(--success);">
                    <i class="fas fa-check"></i> Confirm
                </button>
                <button class="action-btn btn-cancel" onclick="updateReturnStatus(${request.id}, 'cancelled')" style="background:var(--danger-soft); color:var(--danger);">
                    <i class="fas fa-times"></i> Cancel
                </button>
            `;
        } else if (request.status === 'confirmed') {
            actionButtons = `
                <button class="action-btn btn-complete" onclick="updateReturnStatus(${request.id}, 'completed')" style="background:var(--info-soft); color:var(--info);">
                    <i class="fas fa-check-double"></i> Complete
                </button>
                <button class="action-btn btn-whatsapp" onclick="contactCustomer('${request.customer_phone}')">
                    <i class="fab fa-whatsapp"></i>
                </button>
            `;
        } else {
            actionButtons = `
                <button class="action-btn btn-view" onclick="viewReturnDetails(${request.id})" style="background:var(--gold-soft); color:var(--gold-dark);">
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
                <td>${renderItemThumbs(request.items_summary || '')}</td>
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

// Get status text
function getReturnStatusText(status) {
    switch(status) {
        case 'pending': return 'Pending';
        case 'confirmed': return 'Confirmed';
        case 'completed': return 'Completed';
        case 'cancelled': return 'Cancelled';
        default: return 'Pending';
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
RETURN REQUEST DETAILS

Request Ref: ${request.request_ref}
Booking Ref: ${request.booking_ref}
Customer: ${request.customer_name}
Phone: ${request.customer_phone}
Email: ${request.customer_email}

Return Details:
Date: ${returnDate}
Time: ${request.return_time}
Location: ${request.original_hostel}

Items: ${request.items_summary}

Payment: ${request.payment_method === 'momo' ? 'Mobile Money' : 'Pay on Delivery'}
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
    
    // Initialize date filters (safe to call even if elements don't exist yet)
    setupDateFilters();
    setupBookingsViewTabs();
    
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