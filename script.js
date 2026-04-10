// script.js - COMPLETELY FIXED VERSION
const API_URL = 'https://kodak-logistics-api.onrender.com/api';

// Global prices object
let prices = {
  small: 40,
  medium: 50,
  big: 60,
  fridge: 70,
  gas: 60,
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
        // Using the public contact endpoint (no authentication required)
        const timestamp = Date.now();
        const response = await fetch(`${API_URL}/settings/contact?t=${timestamp}`);
        
        if (response.ok) {
            const contactInfo = await response.json();
            console.log('Business settings loaded:', contactInfo);
            
            // Update WhatsApp links
            const whatsappNumber = contactInfo.whatsapp_number || '233545025296';
            const cleanNumber = whatsappNumber.replace(/\D/g, '');
            
            // Update floating WhatsApp button
            const whatsappBtn = document.querySelector('.whatsapp-btn');
            if (whatsappBtn) {
                whatsappBtn.href = `https://wa.me/${cleanNumber}?text=Hi%20Kodak%20Logistics%2C%20I%20want%20to%20book%20storage...`;
            }
            
            // Update footer WhatsApp link
            const footerWhatsapp = document.querySelector('.footer-whatsapp');
            if (footerWhatsapp) {
                footerWhatsapp.href = `https://wa.me/${cleanNumber}`;
                // Update the displayed text
                const displayNumber = cleanNumber.slice(-9);
                footerWhatsapp.innerHTML = `<span class="icon">💬</span> +233 ${displayNumber}`;
            }
            
            // Update footer email
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
  
  updateSelectOptions();
}

// ===== UPDATE SELECT OPTIONS =====
function updateSelectOptions() {
  const selects = document.querySelectorAll('.itemSelect');
  const optionsHtml = `
    <option value="">Select item</option>
    <option value="small">Small Bag – ₵${prices.small}</option>
    <option value="medium">Medium Bag – ₵${prices.medium}</option>
    <option value="big">Big Bag – ₵${prices.big}</option>
    <option value="fridge">Fridge – ₵${prices.fridge}</option>
    <option value="gas">Gas Cylinder – ₵${prices.gas}</option>
    <option value="free">Buckets / Free – ₵0</option>
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
      console.log('Prices loaded:', prices);
      updatePriceDisplay();
    }
  } catch (error) {
    console.log('Using default prices');
  }
}

// ===== CALCULATE TOTAL =====
function calculateTotal() {
  let total = 0;
  document.querySelectorAll(".item-row").forEach(row => {
    const select = row.querySelector(".itemSelect");
    const qty = row.querySelector(".quantity");
    if (select && select.value && qty) {
      total += (prices[select.value] || 0) * (parseInt(qty.value) || 0);
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
        <option value="small">Small Bag – ₵${prices.small}</option>
        <option value="medium">Medium Bag – ₵${prices.medium}</option>
        <option value="big">Big Bag – ₵${prices.big}</option>
        <option value="fridge">Fridge – ₵${prices.fridge}</option>
        <option value="gas">Gas Cylinder – ₵${prices.gas}</option>
        <option value="free">Buckets – Free</option>
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

// ===== SETUP FORM =====
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
        
        // Get the latest WhatsApp number from the public contact endpoint
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
      alert("Network error. Please use WhatsApp.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirm Booking";
    }
  });
}

// ===== INITIALIZE =====
document.addEventListener("DOMContentLoaded", function() {
  console.log("Page loaded");
  
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
  
  // Load prices and business settings
  loadPrices().then(() => {
    calculateTotal();
    console.log("✅ Script initialized");
  });
  
  loadBusinessSettings();
});

// Make available in console for testing
window.prices = prices;
window.refreshPrices = loadPrices;
window.updateDisplay = updatePriceDisplay;
window.refreshBusinessSettings = loadBusinessSettings;