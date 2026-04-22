// script.js - UPGRADED VERSION with PAYMENT SYSTEM (WORKING)
const API_URL = 'https://kodak-logistics-api.onrender.com/api';

// Global prices object - ALL SPECIFIC ITEMS
let prices = {
  // BAGS
  duffle_small: 29.99,
  duffle_big: 49.99,
  jute_small: 39.99,
  jute_medium: 59.99,
  jute_big: 79.99,
  travel_small: 29.99,
  travel_medium: 49.99,
  travel_big: 69.99,
  
  // APPLIANCES
  microwave: 30,
  fridge_tabletop: 59.99,
  fridge_doubledoor: 79.99,
  fridge_small: 39.99,
  
  // GAS CYLINDERS
  gas_small: 29.99,
  gas_medium: 34.99,
  gas_big: 39.99,
  
  // CONTAINERS
  container_small: 29.99,
  container_big: 49.99,
  
  // FREE ITEMS
  buckets: 0
};

// Hide loader
window.addEventListener('load', function() {
  const loader = document.getElementById('loading');
  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => {
      if (loader.parentNode) loader.remove();
    }, 500);
  }
});

setTimeout(function() {
  const loader = document.getElementById('loading');
  if (loader) loader.classList.add('hidden');
}, 2000);

// ===== LOAD BUSINESS SETTINGS =====
async function loadBusinessSettings() {
    try {
        const timestamp = Date.now();
        const response = await fetch(`${API_URL}/settings/contact?t=${timestamp}`);
        
        if (response.ok) {
            const contactInfo = await response.json();
            console.log('Business settings loaded:', contactInfo);
            
            const whatsappNumber = contactInfo.whatsapp_number || '233545025296';
            const cleanNumber = whatsappNumber.replace(/\D/g, '');
            
            const whatsappBtn = document.querySelector('.whatsapp-btn');
            if (whatsappBtn) {
                whatsappBtn.href = `https://wa.me/${cleanNumber}?text=Hi%20Kodak%20Logistics%2C%20I%20want%20to%20book%20storage...`;
            }
            
            const footerWhatsapp = document.querySelector('.footer-whatsapp');
            if (footerWhatsapp) {
                footerWhatsapp.href = `https://wa.me/${cleanNumber}`;
                const displayNumber = cleanNumber.slice(-9);
                footerWhatsapp.innerHTML = `<i class="fab fa-whatsapp"></i> +233 ${displayNumber}`;
            }
            
            const footerEmail = document.querySelector('.footer-email a');
            if (footerEmail && contactInfo.business_email) {
                footerEmail.href = `mailto:${contactInfo.business_email}`;
                footerEmail.textContent = contactInfo.business_email;
            }
        } else {
            console.log('Failed to fetch contact settings, status:', response.status);
        }
    } catch (error) {
        console.log('Using default contact info');
    }
}

// ===== UPDATE PRICE DISPLAYS =====
function updatePriceDisplay() {
  // BAGS
  const duffleSmallDisplay = document.getElementById('priceDuffleSmallDisplay');
  const duffleBigDisplay = document.getElementById('priceDuffleBigDisplay');
  const juteSmallDisplay = document.getElementById('priceJuteSmallDisplay');
  const juteMediumDisplay = document.getElementById('priceJuteMediumDisplay');
  const juteBigDisplay = document.getElementById('priceJuteBigDisplay');
  const travelSmallDisplay = document.getElementById('priceTravelSmallDisplay');
  const travelMediumDisplay = document.getElementById('priceTravelMediumDisplay');
  const travelBigDisplay = document.getElementById('priceTravelBigDisplay');
  
  if (duffleSmallDisplay) duffleSmallDisplay.textContent = prices.duffle_small;
  if (duffleBigDisplay) duffleBigDisplay.textContent = prices.duffle_big;
  if (juteSmallDisplay) juteSmallDisplay.textContent = prices.jute_small;
  if (juteMediumDisplay) juteMediumDisplay.textContent = prices.jute_medium;
  if (juteBigDisplay) juteBigDisplay.textContent = prices.jute_big;
  if (travelSmallDisplay) travelSmallDisplay.textContent = prices.travel_small;
  if (travelMediumDisplay) travelMediumDisplay.textContent = prices.travel_medium;
  if (travelBigDisplay) travelBigDisplay.textContent = prices.travel_big;
  
  // APPLIANCES
  const microwaveDisplay = document.getElementById('priceMicrowaveDisplay');
  const fridgeTabletopDisplay = document.getElementById('priceFridgeTabletopDisplay');
  const fridgeDoubledoorDisplay = document.getElementById('priceFridgeDoubledoorDisplay');
  const fridgeSmallDisplay = document.getElementById('priceFridgeSmallDisplay');
  
  if (microwaveDisplay) microwaveDisplay.textContent = prices.microwave;
  if (fridgeTabletopDisplay) fridgeTabletopDisplay.textContent = prices.fridge_tabletop;
  if (fridgeDoubledoorDisplay) fridgeDoubledoorDisplay.textContent = prices.fridge_doubledoor;
  if (fridgeSmallDisplay) fridgeSmallDisplay.textContent = prices.fridge_small;
  
  // GAS CYLINDERS
  const gasSmallDisplay = document.getElementById('priceGasSmallDisplay');
  const gasMediumDisplay = document.getElementById('priceGasMediumDisplay');
  const gasBigDisplay = document.getElementById('priceGasBigDisplay');
  
  if (gasSmallDisplay) gasSmallDisplay.textContent = prices.gas_small;
  if (gasMediumDisplay) gasMediumDisplay.textContent = prices.gas_medium;
  if (gasBigDisplay) gasBigDisplay.textContent = prices.gas_big;
  
  // CONTAINERS
  const containerSmallDisplay = document.getElementById('priceContainerSmallDisplay');
  const containerBigDisplay = document.getElementById('priceContainerBigDisplay');
  
  if (containerSmallDisplay) containerSmallDisplay.textContent = prices.container_small;
  if (containerBigDisplay) containerBigDisplay.textContent = prices.container_big;
  
  // FREE ITEMS
  const bucketsDisplay = document.getElementById('priceBucketsDisplay');
  if (bucketsDisplay) bucketsDisplay.textContent = prices.buckets;
  
  updateSelectOptions();
}

// ===== UPDATE SELECT OPTIONS =====
function updateSelectOptions() {
  const selects = document.querySelectorAll('.itemSelect');
  const optionsHtml = `
    <option value="">Select item</option>
    <!-- BAGS -->
    <option value="duffle_small">🎽 Duffle Bag (Small) – ₵${prices.duffle_small}</option>
    <option value="duffle_big">🎒 Duffle Bag (Big) – ₵${prices.duffle_big}</option>
    <option value="jute_small">🌾 Jute Bag (Small) – ₵${prices.jute_small}</option>
    <option value="jute_medium">🌾 Jute Bag (Medium) – ₵${prices.jute_medium}</option>
    <option value="jute_big">🌾 Jute Bag (Big) – ₵${prices.jute_big}</option>
    <option value="travel_small">✈️ Traveling Bag (Small) – ₵${prices.travel_small}</option>
    <option value="travel_medium">✈️ Traveling Bag (Medium) – ₵${prices.travel_medium}</option>
    <option value="travel_big">✈️ Traveling Bag (Big) – ₵${prices.travel_big}</option>
    
    <!-- APPLIANCES -->
    <option value="microwave">🍿 Microwave – ₵${prices.microwave}</option>
    <option value="fridge_tabletop">❄️ Fridge (Table Top) – ₵${prices.fridge_tabletop}</option>
    <option value="fridge_doubledoor">❄️❄️ Fridge (Double Door) – ₵${prices.fridge_doubledoor}</option>
    <option value="fridge_small">🧊 Fridge (Small) – ₵${prices.fridge_small}</option>
    
    <!-- GAS CYLINDERS -->
    <option value="gas_small">🔥 Gas Cylinder (Small) – ₵${prices.gas_small}</option>
    <option value="gas_medium">🔥 Gas Cylinder (Medium) – ₵${prices.gas_medium}</option>
    <option value="gas_big">🔥 Gas Cylinder (Big) – ₵${prices.gas_big}</option>
    
    <!-- CONTAINERS -->
    <option value="container_small">📦 Other Container (Small) – ₵${prices.container_small}</option>
    <option value="container_big">📦 Other Container (Big) – ₵${prices.container_big}</option>
    
    <!-- FREE ITEMS -->
    <option value="buckets">🪣 Buckets – Free</option>
  `;
  
  selects.forEach(select => {
    const currentValue = select.value;
    select.innerHTML = optionsHtml;
    if (currentValue) select.value = currentValue;
  });
}

// ===== LOAD PRICES FROM SERVER =====
async function loadPrices() {
  try {
    const response = await fetch(`${API_URL}/settings/public?t=${Date.now()}`);
    if (response.ok) {
      const serverPrices = await response.json();
      prices = { ...prices, ...serverPrices };
      console.log('Prices loaded from server:', prices);
      updatePriceDisplay();
    } else {
      console.log('Using default prices');
    }
  } catch (error) {
    console.log('Network error - using default prices');
  }
}

// ===== CALCULATE TOTAL (UPDATED to update MoMo display) =====
function calculateTotal() {
  let total = 0;
  document.querySelectorAll(".item-row").forEach(row => {
    const select = row.querySelector(".itemSelect");
    const qty = row.querySelector(".quantity");
    if (select && select.value && qty) {
      const price = prices[select.value] || 0;
      const quantity = parseInt(qty.value) || 0;
      total += price * quantity;
    }
  });
  const totalEl = document.getElementById("totalPrice");
  if (totalEl) totalEl.textContent = total.toFixed(2);
  
  // Update MoMo amount display
  updateMomoAmountDisplay();
  
  return total;
}

// ===== SETUP ADD ITEM BUTTON (FIXED - removed ghana_must_go) =====
function setupAddItem() {
  const addBtn = document.getElementById("addItem");
  const container = document.getElementById("itemsContainer");
  if (!addBtn || !container) return;
  
  addBtn.addEventListener("click", function() {
    const newRow = document.createElement("div");
    newRow.className = "item-row";
    newRow.innerHTML = `
      <select class="itemSelect" required>
        <option value="">Select item</option>
        <option value="duffle_small">🎽 Duffle Bag (Small) – ₵${prices.duffle_small}</option>
        <option value="duffle_big">🎒 Duffle Bag (Big) – ₵${prices.duffle_big}</option>
        <option value="jute_small">🌾 Jute Bag (Small) – ₵${prices.jute_small}</option>
        <option value="jute_medium">🌾 Jute Bag (Medium) – ₵${prices.jute_medium}</option>
        <option value="jute_big">🌾 Jute Bag (Big) – ₵${prices.jute_big}</option>
        <option value="travel_small">✈️ Travel Bag (Small) – ₵${prices.travel_small}</option>
        <option value="travel_medium">✈️ Travel Bag (Medium) – ₵${prices.travel_medium}</option>
        <option value="travel_big">✈️ Travel Bag (Big) – ₵${prices.travel_big}</option>
        <option value="microwave">🍿 Microwave – ₵${prices.microwave}</option>
        <option value="fridge_tabletop">❄️ Fridge (Table Top) – ₵${prices.fridge_tabletop}</option>
        <option value="fridge_doubledoor">❄️❄️ Fridge (Double Door) – ₵${prices.fridge_doubledoor}</option>
        <option value="fridge_small">🧊 Fridge (Small) – ₵${prices.fridge_small}</option>
        <option value="gas_small">🔥 Gas Cylinder (Small) – ₵${prices.gas_small}</option>
        <option value="gas_medium">🔥 Gas Cylinder (Medium) – ₵${prices.gas_medium}</option>
        <option value="gas_big">🔥 Gas Cylinder (Big) – ₵${prices.gas_big}</option>
        <option value="container_small">📦 Container (Small) – ₵${prices.container_small}</option>
        <option value="container_big">📦 Container (Big) – ₵${prices.container_big}</option>
        <option value="buckets">🪣 Buckets – Free</option>
      </select>
      <input type="number" class="quantity" min="1" value="1" required>
      <button type="button" class="remove-btn">✕ Remove</button>
    `;
    container.appendChild(newRow);
    
    newRow.querySelector(".remove-btn").addEventListener("click", function() {
      if (document.querySelectorAll(".item-row").length > 1) {
        newRow.remove();
        calculateTotal();
      }
    });
    newRow.querySelectorAll(".itemSelect, .quantity").forEach(input => {
      input.addEventListener("input", calculateTotal);
    });
    calculateTotal();
  });
}

// ===== SETUP EXISTING ROWS =====
function setupExistingRows() {
  document.querySelectorAll(".item-row").forEach(row => {
    const removeBtn = row.querySelector(".remove-btn");
    if (removeBtn) {
      removeBtn.addEventListener("click", function() {
        if (document.querySelectorAll(".item-row").length > 1) {
          row.remove();
          calculateTotal();
        }
      });
    }
    row.querySelectorAll(".itemSelect, .quantity").forEach(input => {
      input.addEventListener("input", calculateTotal);
    });
  });
}

// ========== PAYMENT SYSTEM FUNCTIONS ==========

// Toggle MoMo fields visibility
function toggleMomoFields() {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    const momoFields = document.getElementById('momoFields');
    const transactionIdInput = document.getElementById('transactionId');
    
    if (paymentMethod === 'momo') {
        if (momoFields) momoFields.style.display = 'block';
        if (transactionIdInput) transactionIdInput.required = true;
    } else {
        if (momoFields) momoFields.style.display = 'none';
        if (transactionIdInput) {
            transactionIdInput.required = false;
            transactionIdInput.value = '';
        }
    }
}

// Copy MoMo number to clipboard
async function copyMomoNumber() {
    const momoNumber = '0544705397';
    
    try {
        await navigator.clipboard.writeText(momoNumber);
        
        const copyBtn = document.getElementById('copyMomoBtn');
        if (copyBtn) {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '✅ Copied!';
            copyBtn.style.background = '#2ecc71';
            
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.style.background = '#25D366';
            }, 2000);
        }
        
        showToastMessage('📱 MoMo number copied!', 'success');
        
    } catch (err) {
        const textarea = document.createElement('textarea');
        textarea.value = momoNumber;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToastMessage('📱 Number copied!', 'success');
    }
}

// Show toast notification
function showToastMessage(message, type = 'info') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#2ecc71' : '#e74c3c'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
        font-weight: bold;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Update amount display in MoMo section
function updateMomoAmountDisplay() {
    const totalElement = document.getElementById('totalPrice');
    const displayAmountElement = document.getElementById('displayAmount');
    
    if (totalElement && displayAmountElement) {
        const total = totalElement.textContent;
        displayAmountElement.textContent = `GH₵${total}`;
    }
}

// ========== AUTO-SAVE FORM DATA ==========
const STORAGE_KEY = 'kodak_booking_form';

function autoSaveFormData() {
    const formData = {
        name: document.getElementById('name')?.value || '',
        email: document.getElementById('email')?.value || '',
        phone: document.getElementById('phone')?.value || '',
        hostel: document.getElementById('hostel')?.value || '',
        date: document.getElementById('date')?.value || '',
        time: document.getElementById('time')?.value || '',
        description: document.getElementById('description')?.value || '',
        paymentMethod: document.querySelector('input[name="paymentMethod"]:checked')?.value || 'pickup',
        transactionId: document.getElementById('transactionId')?.value || ''
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    
    const notice = document.getElementById('autoSaveNotice');
    if (notice) {
        notice.style.display = 'block';
        setTimeout(() => {
            notice.style.opacity = '0';
            setTimeout(() => {
                notice.style.display = 'none';
                notice.style.opacity = '1';
            }, 2000);
        }, 2000);
    }
}

function restoreSavedFormData() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (!savedData) return false;
    
    try {
        const data = JSON.parse(savedData);
        
        if (data.name || data.email || data.phone) {
            if (confirm('🔄 We found a partially filled booking form. Would you like to restore it?')) {
                if (document.getElementById('name')) document.getElementById('name').value = data.name || '';
                if (document.getElementById('email')) document.getElementById('email').value = data.email || '';
                if (document.getElementById('phone')) document.getElementById('phone').value = data.phone || '';
                if (document.getElementById('hostel')) document.getElementById('hostel').value = data.hostel || '';
                if (document.getElementById('date')) document.getElementById('date').value = data.date || '';
                if (document.getElementById('time')) document.getElementById('time').value = data.time || '';
                if (document.getElementById('description')) document.getElementById('description').value = data.description || '';
                if (document.getElementById('transactionId')) document.getElementById('transactionId').value = data.transactionId || '';
                
                const paymentRadio = document.querySelector(`input[name="paymentMethod"][value="${data.paymentMethod}"]`);
                if (paymentRadio) {
                    paymentRadio.checked = true;
                    toggleMomoFields();
                }
                
                calculateTotal();
                return true;
            }
        }
    } catch (error) {
        console.error('Error restoring saved data:', error);
    }
    return false;
}

function clearSavedFormData() {
    localStorage.removeItem(STORAGE_KEY);
}

function setupAutoSave() {
    const formInputs = ['name', 'email', 'phone', 'hostel', 'date', 'time', 'description', 'transactionId'];
    
    formInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', () => autoSaveFormData());
            element.addEventListener('change', () => autoSaveFormData());
        }
    });
    
    const paymentRadios = document.querySelectorAll('input[name="paymentMethod"]');
    paymentRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            autoSaveFormData();
            toggleMomoFields();
        });
    });
}

// ========== MAIN SUBMIT FUNCTION (WITH PAYMENT) ==========
async function submitBooking(event) {
    if (event) event.preventDefault();
    
    // ✅ NEW: Check if payment method is selected
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    
    if (!paymentMethod) {
        showToastMessage('Please select a payment method (Pay on Pickup or Mobile Money)', 'error');
        return;
    }
    
    const transactionId = document.getElementById('transactionId')?.value;
    
    if (paymentMethod === 'momo' && !transactionId) {
        showToastMessage('Please enter your transaction ID after sending the payment', 'error');
        return;
    }
    
    const items = [];
    document.querySelectorAll('.item-row').forEach(row => {
        const select = row.querySelector('.itemSelect');
        const quantity = row.querySelector('.quantity')?.value;
        if (select && select.value && quantity > 0) {
            items.push({
                type: select.value,
                quantity: parseInt(quantity)
            });
        }
    });
    
    if (items.length === 0) {
        showToastMessage('Please add at least one item to store', 'error');
        return;
    }
    
    const bookingData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        hostel: document.getElementById('hostel').value,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        description: document.getElementById('description').value,
        items: items,
        total: parseFloat(document.getElementById('totalPrice').textContent) || 0,
        payment_method: paymentMethod,
        transaction_id: paymentMethod === 'momo' ? transactionId : null
    };
    
    if (!bookingData.name || !bookingData.email || !bookingData.phone || !bookingData.hostel || !bookingData.date || !bookingData.time) {
        showToastMessage('Please fill in all required fields', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    
    try {
        const response = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            clearSavedFormData();
            
            let successMessage = `✅ Booking confirmed!\nReference: ${result.bookingRef}\n\n`;
            if (paymentMethod === 'momo') {
                successMessage += `We've received your payment information. You will receive an email once we verify your payment.\n\n`;
            } else {
                successMessage += `You will pay when we pick up your items.\n\n`;
            }
            successMessage += `Check your email for confirmation.`;
            
            alert(successMessage);
            
            document.getElementById('bookingForm').reset();
            document.querySelectorAll('.item-row').forEach((row, index) => {
                if (index > 0) row.remove();
            });
            
            const firstRow = document.querySelector('.item-row');
            if (firstRow) {
                const firstSelect = firstRow.querySelector('.itemSelect');
                const firstQuantity = firstRow.querySelector('.quantity');
                if (firstSelect) firstSelect.value = '';
                if (firstQuantity) firstQuantity.value = '1';
            }
            
            const pickupRadio = document.querySelector('input[name="paymentMethod"][value="pickup"]');
            if (pickupRadio) pickupRadio.checked = true;
            toggleMomoFields();
            
            calculateTotal();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            showToastMessage(result.error || 'Booking failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Booking error:', error);
        showToastMessage('Network error. Please check your connection.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '✅ Confirm Booking';
    }
}

// ========== INITIALIZE PAYMENT SYSTEM ==========
function initPaymentSystem() {
    const copyBtn = document.getElementById('copyMomoBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', copyMomoNumber);
    }
    
    const paymentRadios = document.querySelectorAll('input[name="paymentMethod"]');
    paymentRadios.forEach(radio => {
        radio.addEventListener('change', toggleMomoFields);
    });
    
    toggleMomoFields();
    setupAutoSave();
    restoreSavedFormData();
}

// Add CSS animation for toast
const toastStyle = document.createElement('style');
toastStyle.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(toastStyle);

// ===== SINGLE DOMContentLoaded EVENT (MERGED) =====
document.addEventListener("DOMContentLoaded", function() {
  console.log("🚀 Kodak Logistics - Page loaded");
  
  const dateInput = document.getElementById("date");
  if (dateInput) {
    dateInput.min = new Date().toISOString().split("T")[0];
  }
  
  // Mobile menu toggle
  const menuToggle = document.getElementById('mobileMenuToggle');
  const navLinks = document.getElementById('navLinks');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', function() {
      navLinks.classList.toggle('active');
    });
    
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', function() {
        navLinks.classList.remove('active');
      });
    });
  }
  
  setupAddItem();
  setupExistingRows();
  
  loadPrices().then(() => {
    calculateTotal();
    console.log("✅ Prices loaded and ready");
  });
  
  loadBusinessSettings();
  
  // Initialize payment system
  initPaymentSystem();
  
  // Set up form submission (ONE handler only)
  const form = document.getElementById("bookingForm");
  if (form) {
    form.addEventListener("submit", submitBooking);
  }
});

// Make functions available in console for testing
window.prices = prices;
window.refreshPrices = loadPrices;
window.updateDisplay = updatePriceDisplay;
window.refreshBusinessSettings = loadBusinessSettings;
window.calculateTotal = calculateTotal;