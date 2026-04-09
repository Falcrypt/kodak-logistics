// script.js - COMPLETELY FIXED VERSION with Booking Reference & Gas Cylinder
const API_URL = 'https://kodak-logistics-api.onrender.com/api';

// Make prices and functions available globally
let prices = {
  small: 40,
  medium: 50,
  big: 60,
  fridge: 70,
  gas: 60,
  free: 0
};

// Hide loader immediately when page loads
window.addEventListener('load', function() {
  const loader = document.getElementById('loading');
  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => {
      if (loader.parentNode) loader.remove();
    }, 500);
  }
});

// Also hide loader after 2 seconds just in case
setTimeout(function() {
  const loader = document.getElementById('loading');
  if (loader) {
    loader.classList.add('hidden');
  }
}, 2000);

// ===== UPDATE PRICE DISPLAYS (GLOBAL) =====
window.updatePriceDisplay = function() {
  const smallDisplay = document.getElementById('priceSmallDisplay');
  const mediumDisplay = document.getElementById('priceMediumDisplay');
  const bigDisplay = document.getElementById('priceBigDisplay');
  const fridgeDisplay = document.getElementById('priceFridgeDisplay');
  const gasDisplay = document.getElementById('priceGasDisplay');
  
  if (smallDisplay) smallDisplay.textContent = `₵${prices.small}`;
  if (mediumDisplay) mediumDisplay.textContent = `₵${prices.medium}`;
  if (bigDisplay) bigDisplay.textContent = `₵${prices.big}`;
  if (fridgeDisplay) fridgeDisplay.textContent = `₵${prices.fridge}`;
  if (gasDisplay) gasDisplay.textContent = `₵${prices.gas}`;
  
  window.updateSelectOptions();
  console.log('💰 Price display updated - Gas is now:', prices.gas);
};

// ===== UPDATE SELECT DROPDOWN OPTIONS (GLOBAL) =====
window.updateSelectOptions = function() {
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
};

// ===== LOAD PRICES FROM SERVER =====
async function loadPrices() {
  try {
    const timestamp = Date.now();
    const random = Math.random();
    const response = await fetch(`${API_URL}/settings/public?t=${timestamp}&r=${random}`);
    if (response.ok) {
      const serverPrices = await response.json();
      prices = { ...prices, ...serverPrices };
      console.log('💰 Prices loaded from server:', prices);
      window.updatePriceDisplay();
    } else {
      console.log('⚠️ Using default prices');
    }
  } catch (error) {
    console.log('⚠️ Network error, using default prices');
  }
}

// ===== CALCULATE TOTAL =====
function calculateTotal() {
  let total = 0;
  document.querySelectorAll(".item-row").forEach(row => {
    const select = row.querySelector(".itemSelect");
    const qtyInput = row.querySelector(".quantity");
    
    if (select && qtyInput && select.value) {
      const qty = parseInt(qtyInput.value) || 0;
      total += (prices[select.value] || 0) * qty;
    }
  });
  
  const totalPriceEl = document.getElementById("totalPrice");
  if (totalPriceEl) {
    totalPriceEl.textContent = total.toFixed(2);
  }
  return total;
}

// ===== ADD NEW ITEM ROW =====
function setupAddItemButton() {
  const addItemBtn = document.getElementById("addItem");
  const itemsContainer = document.getElementById("itemsContainer");
  
  if (addItemBtn && itemsContainer) {
    addItemBtn.addEventListener("click", function() {
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
      
      itemsContainer.appendChild(newRow);
      
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
}

// ===== ATTACH LISTENERS TO EXISTING ROWS =====
function attachExistingRowListeners() {
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

// ===== FORM SUBMISSION =====
function setupFormSubmission() {
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
        alert(`✅ Booking sent successfully!\n\nYour booking reference is: ${result.bookingRef}\nPlease keep this reference for pickup.\nWe'll contact you soon.`);
        
        form.reset();
        
        const allRows = document.querySelectorAll(".item-row");
        for (let i = 1; i < allRows.length; i++) {
          allRows[i].remove();
        }
        
        const firstRow = document.querySelector(".item-row");
        if (firstRow) {
          firstRow.querySelector(".itemSelect").value = "";
          firstRow.querySelector(".quantity").value = "1";
        }
        
        calculateTotal();

        if (confirm("Open WhatsApp to chat with us directly?")) {
          const message = encodeURIComponent(
            `Hi Kodak Logistics!\n\nBooking confirmed online.\nReference: ${result.bookingRef}\nName: ${formData.name}\nDate: ${formData.date}\nTotal: ₵${formData.total}\n\nPlease confirm.`
          );
          window.open(`https://wa.me/233545025296?text=${message}`, "_blank");
        }
      } else {
        alert("❌ Failed to send booking. " + (result.error || "Please try again."));
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Network error. Please use WhatsApp to book.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirm Booking";
    }
  });
}

// ===== INITIALIZE EVERYTHING =====
document.addEventListener("DOMContentLoaded", function() {
  console.log("Page loaded");
  
  // Set min date
  const dateInput = document.getElementById("date");
  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.min = today;
  }
  
  // Mobile menu
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }
  
  // Setup all features
  setupAddItemButton();
  attachExistingRowListeners();
  setupFormSubmission();
  
  // Load prices and update display
  loadPrices().then(() => {
    calculateTotal();
    console.log("✅ Script initialized with fresh prices");
  });
});