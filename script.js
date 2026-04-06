// script.js - COMPLETELY FIXED VERSION with Booking Reference
const API_URL = 'https://kodak-logistics-api.onrender.com/api';

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

document.addEventListener("DOMContentLoaded", function() {
  console.log("Page loaded");

  // Get elements
  const form = document.getElementById("bookingForm");
  const totalPriceEl = document.getElementById("totalPrice");
  const itemsContainer = document.getElementById("itemsContainer");
  const addItemBtn = document.getElementById("addItem");
  const dateInput = document.getElementById("date");
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  
  // Prices
  let prices = {
    small: 40,
    medium: 50,
    big: 60,
    fridge: 70,
    gas: 60,
    free: 0
  };

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
    
    if (totalPriceEl) {
      totalPriceEl.textContent = total.toFixed(2);
    }
    return total;
  }

  // ===== ADD NEW ITEM ROW =====
  if (addItemBtn && itemsContainer) {
    addItemBtn.addEventListener("click", function() {
      const newRow = document.createElement("div");
      newRow.className = "item-row";
      newRow.innerHTML = `
        <select class="itemSelect" required>
          <option value="">Select item</option>
          <option value="small">Small Bag – ₵40</option>
          <option value="medium">Medium Bag – ₵50</option>
          <option value="big">Big Bag – ₵60</option>
          <option value="fridge">Fridge – ₵70</option>
          <option value="free">Buckets – Free</option>
        </select>
        <input type="number" class="quantity" min="1" value="1" required>
        <button type="button" class="remove-btn">✕ Remove</button>
      `;
      
      itemsContainer.appendChild(newRow);
      
      // Add remove button functionality
      newRow.querySelector(".remove-btn").addEventListener("click", function() {
        if (document.querySelectorAll(".item-row").length > 1) {
          newRow.remove();
          calculateTotal();
        }
      });
      
      // Add input listeners for calculation
      newRow.querySelectorAll(".itemSelect, .quantity").forEach(input => {
        input.addEventListener("input", calculateTotal);
      });
      
      calculateTotal();
    });
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
  if (form) {
    form.addEventListener("submit", async function(e) {
      e.preventDefault();
      
      const submitBtn = document.getElementById("submitBtn");
      if (!submitBtn) return;
      
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";

      // Collect items
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

      // Get form data
      const formData = {
        name: document.getElementById("name")?.value || "",
        email: document.getElementById("email")?.value || "",
        phone: document.getElementById("phone")?.value || "",
        hostel: document.getElementById("hostel")?.value || "",
        date: document.getElementById("date")?.value || "",
        time: document.getElementById("time")?.value || "",
        description: document.getElementById("description")?.value || "",
        items: items,
        total: parseFloat(totalPriceEl?.textContent) || 0
      };

      try {
        const response = await fetch(`${API_URL}/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok) {
          // Show success message with booking reference
          alert(`✅ Booking sent successfully!\n\nYour booking reference is: ${result.bookingRef}\nPlease keep this reference for pickup.\nWe'll contact you soon.`);
          
          form.reset();
          
          // Reset to one empty row
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

          // Optional: Open WhatsApp with reference
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

  // ===== SET MIN DATE =====
  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.min = today;
  }

  // ===== MOBILE MENU =====
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // ===== INITIALIZE =====
  attachExistingRowListeners();
  calculateTotal();
  
  console.log("✅ Script initialized");
});