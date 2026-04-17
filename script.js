// script.js - UPDATED WITH ALL NEW ITEMS (Microwave, Duffle, Jute, Travel, Containers, Gas Sizes)
const API_URL = 'https://kodak-logistics-api.onrender.com/api';

// Global prices object - UPDATED WITH NEW ITEMS
let prices = {
  // Original items
  small: 40,
  medium: 50,
  big: 60,
  fridge: 70,
  gas: 60,
  
  // NEW: Microwave
  microwave: 30,
  
  // NEW: Duffle Bags
  duffle_small: 29.99,
  duffle_big: 49.99,
  
  // NEW: Jute Bags
  jute_small: 39.99,
  jute_medium: 59.99,
  jute_big: 79.99,
  
  // NEW: Traveling Bags
  travel_small: 29.99,
  travel_medium: 49.99,
  travel_big: 69.99,
  
  // NEW: Other Containers
  container_small: 29.99,
  container_big: 49.99,
  
  // NEW: Gas Cylinder Sizes
  gas_small: 29.99,
  gas_medium: 34.99,
  gas_big: 39.99,
  
  // Free item
  free: 0
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

// ===== LOAD BUSINESS SETTINGS (WhatsApp, Email) from PUBLIC endpoint =====
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

// ===== UPDATE PRICE DISPLAYS - UPDATED WITH ALL NEW ITEMS =====
function updatePriceDisplay() {
  // Original items
  const smallDisplay = document.getElementById('priceSmallDisplay');
  const mediumDisplay = document.getElementById('priceMediumDisplay');
  const bigDisplay = document.getElementById('priceBigDisplay');
  const fridgeDisplay = document.getElementById('priceFridgeDisplay');
  const gasDisplay = document.getElementById('priceGasDisplay');
  
  if (smallDisplay) smallDisplay.textContent = prices.small;
  if (mediumDisplay) mediumDisplay.textContent = prices.medium;
  if (bigDisplay) bigDisplay.textContent = prices.big;
  if (fridgeDisplay) fridgeDisplay.textContent = prices.fridge;
  if (gasDisplay) gasDisplay.textContent = prices.gas;
  
  // NEW: Microwave
  const microwaveDisplay = document.getElementById('priceMicrowaveDisplay');
  if (microwaveDisplay) microwaveDisplay.textContent = prices.microwave;
  
  // NEW: Duffle Bags
  const duffleSmallDisplay = document.getElementById('priceDuffleSmallDisplay');
  const duffleBigDisplay = document.getElementById('priceDuffleBigDisplay');
  if (duffleSmallDisplay) duffleSmallDisplay.textContent = prices.duffle_small;
  if (duffleBigDisplay) duffleBigDisplay.textContent = prices.duffle_big;
  
  // NEW: Jute Bags
  const juteSmallDisplay = document.getElementById('priceJuteSmallDisplay');
  const juteMediumDisplay = document.getElementById('priceJuteMediumDisplay');
  const juteBigDisplay = document.getElementById('priceJuteBigDisplay');
  if (juteSmallDisplay) juteSmallDisplay.textContent = prices.jute_small;
  if (juteMediumDisplay) juteMediumDisplay.textContent = prices.jute_medium;
  if (juteBigDisplay) juteBigDisplay.textContent = prices.jute_big;
  
  // NEW: Traveling Bags
  const travelSmallDisplay = document.getElementById('priceTravelSmallDisplay');
  const travelMediumDisplay = document.getElementById('priceTravelMediumDisplay');
  const travelBigDisplay = document.getElementById('priceTravelBigDisplay');
  if (travelSmallDisplay) travelSmallDisplay.textContent = prices.travel_small;
  if (travelMediumDisplay) travelMediumDisplay.textContent = prices.travel_medium;
  if (travelBigDisplay) travelBigDisplay.textContent = prices.travel_big;
  
  // NEW: Other Containers
  const containerSmallDisplay = document.getElementById('priceContainerSmallDisplay');
  const containerBigDisplay = document.getElementById('priceContainerBigDisplay');
  if (containerSmallDisplay) containerSmallDisplay.textContent = prices.container_small;
  if (containerBigDisplay) containerBigDisplay.textContent = prices.container_big;
  
  // NEW: Gas Cylinder Sizes
  const gasSmallDisplay = document.getElementById('priceGasSmallDisplay');
  const gasMediumDisplay = document.getElementById('priceGasMediumDisplay');
  const gasBigDisplay = document.getElementById('priceGasBigDisplay');
  if (gasSmallDisplay) gasSmallDisplay.textContent = prices.gas_small;
  if (gasMediumDisplay) gasMediumDisplay.textContent = prices.gas_medium;
  if (gasBigDisplay) gasBigDisplay.textContent = prices.gas_big;
  
  updateSelectOptions();
}

// ===== UPDATE SELECT OPTIONS - UPDATED WITH NEW ITEMS =====
function updateSelectOptions() {
  const selects = document.querySelectorAll('.itemSelect');
  const optionsHtml = `
    <option value="">Select item</option>
    <!-- ORIGINAL ITEMS -->
    <option value="small">👜 Small Bag – ₵${prices.small}</option>
    <option value="medium">🎒 Medium Bag – ₵${prices.medium}</option>
    <option value="big">🧳 Big Bag – ₵${prices.big}</option>
    <option value="fridge">❄️ Fridge – ₵${prices.fridge}</option>
    <option value="gas">🔥 Gas Cylinder (Standard) – ₵${prices.gas}</option>
    
    <!-- NEW: MICROWAVE -->
    <option value="microwave">🍿 Microwave – ₵${prices.microwave}</option>
    
    <!-- NEW: DUFFLE BAGS -->
    <option value="duffle_small">🎽 Duffle Bag (Small) – ₵${prices.duffle_small}</option>
    <option value="duffle_big">🎒 Duffle Bag (Big) – ₵${prices.duffle_big}</option>
    
    <!-- NEW: JUTE BAGS -->
    <option value="jute_small">🌾 Jute Bag (Small) – ₵${prices.jute_small}</option>
    <option value="jute_medium">🌾 Jute Bag (Medium) – ₵${prices.jute_medium}</option>
    <option value="jute_big">🌾 Jute Bag (Big) – ₵${prices.jute_big}</option>
    
    <!-- NEW: TRAVELING BAGS -->
    <option value="travel_small">✈️ Traveling Bag (Small) – ₵${prices.travel_small}</option>
    <option value="travel_medium">✈️ Traveling Bag (Medium) – ₵${prices.travel_medium}</option>
    <option value="travel_big">✈️ Traveling Bag (Big) – ₵${prices.travel_big}</option>
    
    <!-- NEW: OTHER CONTAINERS -->
    <option value="container_small">📦 Other Container (Small) – ₵${prices.container_small}</option>
    <option value="container_big">📦 Other Container (Big) – ₵${prices.container_big}</option>
    
    <!-- NEW: GAS CYLINDER SIZES -->
    <option value="gas_small">🔥 Gas Cylinder (Small) – ₵${prices.gas_small}</option>
    <option value="gas_medium">🔥 Gas Cylinder (Medium) – ₵${prices.gas_medium}</option>
    <option value="gas_big">🔥 Gas Cylinder (Big) – ₵${prices.gas_big}</option>
    
    <!-- FREE ITEM -->
    <option value="free">📦 Buckets / Small Items – Free</option>
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

// ===== CALCULATE TOTAL =====
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
  return total;
}

// ===== SETUP ADD ITEM BUTTON =====
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
        <option value="small">👜 Small Bag – ₵${prices.small}</option>
        <option value="medium">🎒 Medium Bag – ₵${prices.medium}</option>
        <option value="big">🧳 Big Bag – ₵${prices.big}</option>
        <option value="fridge">❄️ Fridge – ₵${prices.fridge}</option>
        <option value="gas">🔥 Gas Cylinder (Std) – ₵${prices.gas}</option>
        <option value="microwave">🍿 Microwave – ₵${prices.microwave}</option>
        <option value="duffle_small">🎽 Duffle Bag (Small) – ₵${prices.duffle_small}</option>
        <option value="duffle_big">🎒 Duffle Bag (Big) – ₵${prices.duffle_big}</option>
        <option value="jute_small">🌾 Jute Bag (Small) – ₵${prices.jute_small}</option>
        <option value="jute_medium">🌾 Jute Bag (Medium) – ₵${prices.jute_medium}</option>
        <option value="jute_big">🌾 Jute Bag (Big) – ₵${prices.jute_big}</option>
        <option value="travel_small">✈️ Travel Bag (Small) – ₵${prices.travel_small}</option>
        <option value="travel_medium">✈️ Travel Bag (Medium) – ₵${prices.travel_medium}</option>
        <option value="travel_big">✈️ Travel Bag (Big) – ₵${prices.travel_big}</option>
        <option value="container_small">📦 Container (Small) – ₵${prices.container_small}</option>
        <option value="container_big">📦 Container (Big) – ₵${prices.container_big}</option>
        <option value="gas_small">🔥 Gas (Small) – ₵${prices.gas_small}</option>
        <option value="gas_medium">🔥 Gas (Medium) – ₵${prices.gas_medium}</option>
        <option value="gas_big">🔥 Gas (Big) – ₵${prices.gas_big}</option>
        <option value="free">📦 Buckets – Free</option>
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

// ===== SETUP FORM SUBMISSION =====
function setupForm() {
  const form = document.getElementById("bookingForm");
  if (!form) return;
  
  form.addEventListener("submit", async function(e) {
    e.preventDefault();
    const submitBtn = document.getElementById("submitBtn");
    if (!submitBtn) return;
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    const items = [];
    document.querySelectorAll(".item-row").forEach(row => {
      const select = row.querySelector(".itemSelect");
      const qty = row.querySelector(".quantity");
      if (select && select.value && qty && qty.value) {
        items.push({
          type: select.value,
          quantity: parseInt(qty.value),
          price: prices[select.value] || 0
        });
      }
    });

    if (items.length === 0) {
      alert("Please select at least one item");
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirm Booking";
      return;
    }

    const formData = {
      name: document.getElementById("name")?.value || "",
      email: document.getElementById("email")?.value || "",
      phone: document.getElementById("phone")?.value || "",
      hostel: document.getElementById("hostel")?.value || "",
      date: document.getElementById("date")?.value || "",
      time: document.getElementById("time")?.value || "",
      description: document.getElementById("description")?.value || "",
      items: items,
      total: parseFloat(document.getElementById("totalPrice")?.textContent) || 0
    };

    try {
      const response = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const result = await response.json();

      if (response.ok) {
        alert(`✅ Booking sent!\n\nReference: ${result.bookingRef}\nKeep this for pickup.`);
        form.reset();
        const allRows = document.querySelectorAll(".item-row");
        for (let i = 1; i < allRows.length; i++) allRows[i].remove();
        const firstRow = document.querySelector(".item-row");
        if (firstRow) {
          firstRow.querySelector(".itemSelect").value = "";
          firstRow.querySelector(".quantity").value = "1";
        }
        calculateTotal();
        
        const contactResponse = await fetch(`${API_URL}/settings/contact?t=${Date.now()}`);
        if (contactResponse.ok) {
          const contactInfo = await contactResponse.json();
          const whatsappNumber = contactInfo.whatsapp_number || '233545025296';
          const cleanNumber = whatsappNumber.replace(/\D/g, '');
          if (confirm("Open WhatsApp?")) {
            const msg = encodeURIComponent(`Hi Kodak Logistics!\n\nBooking confirmed.\nReference: ${result.bookingRef}\nName: ${formData.name}\nDate: ${formData.date}\nTotal: ₵${formData.total}`);
            window.open(`https://wa.me/${cleanNumber}?text=${msg}`, "_blank");
          }
        } else {
          if (confirm("Open WhatsApp?")) {
            const msg = encodeURIComponent(`Hi Kodak Logistics!\n\nBooking confirmed.\nReference: ${result.bookingRef}\nName: ${formData.name}\nDate: ${formData.date}\nTotal: ₵${formData.total}`);
            window.open(`https://wa.me/233545025296?text=${msg}`, "_blank");
          }
        }
      } else {
        alert("❌ Failed to send booking.");
      }
    } catch (error) {
      console.error("Booking error:", error);
      alert("Network error. Please use WhatsApp.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirm Booking";
    }
  });
}

// ===== INITIALIZE EVERYTHING =====
document.addEventListener("DOMContentLoaded", function() {
  console.log("🚀 Kodak Logistics - Page loaded");
  
  const dateInput = document.getElementById("date");
  if (dateInput) {
    dateInput.min = new Date().toISOString().split("T")[0];
  }
  
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => navLinks.classList.toggle('active'));
  }
  
  setupAddItem();
  setupExistingRows();
  setupForm();
  
  loadPrices().then(() => {
    calculateTotal();
    console.log("✅ Prices loaded and ready");
  });
  
  loadBusinessSettings();
});

// Make functions available in console for testing
window.prices = prices;
window.refreshPrices = loadPrices;
window.updateDisplay = updatePriceDisplay;
window.refreshBusinessSettings = loadBusinessSettings;
window.calculateTotal = calculateTotal;