// script.js - Kodak Logistics public site
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

  // ELECTRONICS
  tv_small: 39.99,
  tv_medium: 54.99,
  tv_large: 69.99,
  tv_xlarge: 89.99,

  // FREE ITEMS
  buckets: 0
};

const ITEM_IMAGES = {
  duffle_small: 'images/duffle-small.jpg', duffle_big: 'images/duffle-big.jpg',
  jute_small: 'images/jute-small.jpg', jute_medium: 'images/jute-medium.jpg', jute_big: 'images/jute-big.jpg',
  travel_small: 'images/travel-small.jpg', travel_medium: 'images/travel-medium.jpg', travel_big: 'images/travel-big.jpg',
  microwave: 'images/microwave.jpg',
  fridge_tabletop: 'images/fridge-tabletop.jpg', fridge_doubledoor: 'images/fridge-doubledoor.jpg', fridge_small: 'images/fridge-small.jpg',
  gas_small: 'images/gas-small.jpg', gas_medium: 'images/gas-medium.jpg', gas_big: 'images/gas-big.jpg',
  container_small: 'images/container-small.jpg', container_big: 'images/container-big.jpg',
  tv_small: 'images/smallscreen.jpg', tv_medium: 'images/mediumscreen.jpg', tv_large: 'images/largescreen.jpg', tv_xlarge: 'images/tv.jpg',
  buckets: 'images/buckets.jpg'
};

const ITEM_LABELS = {
  duffle_small: 'Duffle Bag (Small)', duffle_big: 'Duffle Bag (Big)',
  jute_small: 'Jute Bag (Small)', jute_medium: 'Jute Bag (Medium)', jute_big: 'Jute Bag (Big)',
  travel_small: 'Travel Bag (Small)', travel_medium: 'Travel Bag (Medium)', travel_big: 'Travel Bag (Big)',
  microwave: 'Microwave',
  fridge_tabletop: 'Fridge (Table Top)', fridge_doubledoor: 'Fridge (Double Door)', fridge_small: 'Fridge (Small)',
  gas_small: 'Gas Cylinder (Small)', gas_medium: 'Gas Cylinder (Medium)', gas_big: 'Gas Cylinder (Big)',
  container_small: 'Container (Small)', container_big: 'Container (Big)',
  tv_small: 'Television (Small, up to 32")', tv_medium: 'Television (Medium, 33"–43")',
  tv_large: 'Television (Large, 44"–55")', tv_xlarge: 'Television (Extra Large, 56"+)',
  buckets: 'Buckets'
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ===== LOAD BUSINESS SETTINGS =====
async function loadBusinessSettings() {
    try {
        const timestamp = Date.now();
        const response = await fetch(`${API_URL}/settings/contact?t=${timestamp}`);

        if (response.ok) {
            const contactInfo = await response.json();

            const whatsappNumber = contactInfo.whatsapp_number || '233541249742';
            let cleanNumber = whatsappNumber.replace(/\D/g, '');
            // The admin settings field stores the number without the Ghana
            // country code (e.g. "541249742"), so add it back if missing.
            if (cleanNumber.startsWith('0')) {
              cleanNumber = '233' + cleanNumber.substring(1);
            } else if (!cleanNumber.startsWith('233')) {
              cleanNumber = '233' + cleanNumber;
            }

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
        }
    } catch (error) {
        console.log('Using default contact info');
    }
}

// ===== LOAD TESTIMONIALS (real customer reviews) =====
function testimonialStars(rating) {
  const full = Math.round(rating);
  let out = '';
  for (let i = 1; i <= 5; i++) out += i <= full ? '★' : '<span class="dim">★</span>';
  return out;
}

function testimonialInitials(name) {
  const parts = (name || '?').trim().split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].substring(0, 2)).toUpperCase();
}

async function loadTestimonials() {
  try {
    const response = await fetch(`${API_URL}/reviews/public?limit=6`);
    if (!response.ok) return;

    const reviews = await response.json();
    if (!reviews || reviews.length === 0) return;

    const section = document.getElementById('testimonials');
    const grid = document.getElementById('testimonialsGrid');
    if (!section || !grid) return;

    grid.innerHTML = reviews.map(r => `
      <div class="testimonial-card">
        <div class="testimonial-stars">${testimonialStars(r.rating)}</div>
        ${r.comment ? `<p class="testimonial-comment">"${escapeHtml(r.comment)}"</p>` : ''}
        <div class="testimonial-footer">
          <div class="testimonial-avatar">${testimonialInitials(r.customer_name)}</div>
          <p class="testimonial-name">${escapeHtml(r.customer_name)}</p>
        </div>
      </div>
    `).join('');

    section.style.display = 'block';
  } catch (error) {
    console.log('Testimonials not loaded:', error.message);
  }
}

// ===== UPDATE PRICE DISPLAYS =====
function updatePriceDisplay() {
  updateSelectOptions();
  updateDropdownPrices();
  updateBucketsTeaser();
  updateGalleryPriceTags();
}

// The gallery tiles' "From ₵X" tags were hardcoded text — this keeps them
// in sync with whatever the admin actually sets, using the cheapest size
// in each category (same data source as the price modal).
function updateGalleryPriceTags() {
  const categories = getCategoryItems();
  document.querySelectorAll('.gallery-item[data-category]').forEach(item => {
    const category = item.dataset.category;
    if (category === 'buckets') return; // handled by updateBucketsTeaser (can be free)

    const entries = categories[category];
    if (!entries || !entries.length) return;

    const values = entries.map(e => e.price).filter(p => typeof p === 'number' && !isNaN(p));
    if (!values.length) return;

    const tag = item.querySelector('.price-tag');
    if (tag) tag.textContent = `From ${Math.min(...values)}`;
  });
}

// Buckets can be free or priced by the admin — reflect whichever is set
// on the gallery teaser card (avoids showing a stale "FREE" label).
function updateBucketsTeaser() {
  const tag = document.getElementById('bucketsPriceTag');
  if (!tag) return;
  if (prices.buckets) {
    tag.textContent = `From ${prices.buckets}`;
    tag.classList.remove('free');
  } else {
    tag.textContent = 'FREE';
    tag.classList.add('free');
  }
}

// Refresh the visible price shown next to each item in every dropdown
// (static first row included) so admin price changes always show correctly.
function updateDropdownPrices() {
  document.querySelectorAll('.custom-option').forEach(opt => {
    const key = opt.getAttribute('data-value');
    const priceEl = opt.querySelector('.option-price');
    if (!key || !priceEl || !(key in prices)) return;
    priceEl.textContent = !prices[key] ? 'Free' : `₵${prices[key]}`;
  });
}

// ===== UPDATE HIDDEN SELECT OPTIONS (kept in sync for price lookup) =====
function updateSelectOptions() {
  const selects = document.querySelectorAll('.itemSelect');
  const optionsHtml = `
    <option value="">Select item type</option>
    <option value="duffle_small">Duffle Bag (Small) – ₵${prices.duffle_small}</option>
    <option value="duffle_big">Duffle Bag (Big) – ₵${prices.duffle_big}</option>
    <option value="jute_small">Jute Bag (Small) – ₵${prices.jute_small}</option>
    <option value="jute_medium">Jute Bag (Medium) – ₵${prices.jute_medium}</option>
    <option value="jute_big">Jute Bag (Big) – ₵${prices.jute_big}</option>
    <option value="travel_small">Travel Bag (Small) – ₵${prices.travel_small}</option>
    <option value="travel_medium">Travel Bag (Medium) – ₵${prices.travel_medium}</option>
    <option value="travel_big">Travel Bag (Big) – ₵${prices.travel_big}</option>
    <option value="microwave">Microwave – ₵${prices.microwave}</option>
    <option value="fridge_tabletop">Fridge (Table Top) – ₵${prices.fridge_tabletop}</option>
    <option value="fridge_doubledoor">Fridge (Double Door) – ₵${prices.fridge_doubledoor}</option>
    <option value="fridge_small">Fridge (Small) – ₵${prices.fridge_small}</option>
    <option value="gas_small">Gas Cylinder (Small) – ₵${prices.gas_small}</option>
    <option value="gas_medium">Gas Cylinder (Medium) – ₵${prices.gas_medium}</option>
    <option value="gas_big">Gas Cylinder (Big) – ₵${prices.gas_big}</option>
    <option value="container_small">Container (Small) – ₵${prices.container_small}</option>
    <option value="container_big">Container (Big) – ₵${prices.container_big}</option>
    <option value="tv_small">Television (Small, up to 32") – ₵${prices.tv_small}</option>
    <option value="tv_medium">Television (Medium, 33"–43") – ₵${prices.tv_medium}</option>
    <option value="tv_large">Television (Large, 44"–55") – ₵${prices.tv_large}</option>
    <option value="tv_xlarge">Television (Extra Large, 56"+) – ₵${prices.tv_xlarge}</option>
    <option value="buckets">Buckets – ${prices.buckets ? '₵' + prices.buckets : 'Free'}</option>
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
      updatePriceDisplay();
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

  updateMomoAmountDisplay();

  return total;
}

// ===== CUSTOM ITEM DROPDOWN =====
function initCustomDropdowns() {
  document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
    if (wrapper.hasAttribute('data-initialized')) return;
    wrapper.setAttribute('data-initialized', 'true');

    const trigger = wrapper.querySelector('.custom-select-trigger');
    const hiddenSelect = wrapper.parentElement.querySelector('.itemSelect');
    const triggerImg = wrapper.querySelector('.trigger-image');
    const triggerText = wrapper.querySelector('.trigger-text');

    if (!trigger) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-select-wrapper').forEach(w => {
        if (w !== wrapper) w.classList.remove('open');
      });
      wrapper.classList.toggle('open');
    });

    wrapper.querySelectorAll('.custom-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const value = opt.getAttribute('data-value');
        const imgSrc = opt.getAttribute('data-img');
        const text = opt.querySelector('.option-name').textContent;

        if (hiddenSelect) {
          hiddenSelect.value = value;
          hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }

        if (triggerImg) triggerImg.src = imgSrc;
        if (triggerText) triggerText.textContent = text;

        wrapper.classList.remove('open');
        calculateTotal();
      });
    });
  });
}

document.addEventListener('click', () => {
  document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
});

// ===== QUANTITY STEPPER =====
// Quantity starts blank on purpose (not defaulted to 1) so customers have to
// consciously enter how many of an item they have — a blank/0 quantity row
// gets caught and blocked at submit time instead of silently under-counting.
function setupQtyStepper(row) {
  const input = row.querySelector('.quantity');
  const minusBtn = row.querySelector('.qty-minus');
  const plusBtn = row.querySelector('.qty-plus');
  if (!input || !minusBtn || !plusBtn) return;

  function clearInvalid() {
    row.querySelector('.qty-stepper')?.classList.remove('invalid');
  }

  minusBtn.addEventListener('click', () => {
    const current = parseInt(input.value) || 0;
    input.value = current > 1 ? current - 1 : '';
    clearInvalid();
    calculateTotal();
  });

  plusBtn.addEventListener('click', () => {
    const val = (parseInt(input.value) || 0) + 1;
    input.value = val;
    clearInvalid();
    calculateTotal();
  });

  input.addEventListener('input', () => {
    clearInvalid();
    calculateTotal();
  });
}

function setupRemoveButton(row) {
  const removeBtn = row.querySelector('.remove-btn');
  if (!removeBtn) return;
  removeBtn.addEventListener('click', () => {
    if (document.querySelectorAll('.item-row').length > 1) {
      row.remove();
      calculateTotal();
    }
  });
}

function itemRowTemplate() {
  return `
    <select class="itemSelect" style="display: none;">
      <option value="">Select item type</option>
    </select>

    <div class="custom-select-wrapper">
      <div class="custom-select-trigger">
        <img class="trigger-image" src="images/default-item.png" alt="icon" onerror="this.src='https://placehold.co/28x28/ffb347/8b0000?text=?'">
        <span class="trigger-text">Select item type</span>
        <span class="trigger-arrow"><i class="fas fa-chevron-down"></i></span>
      </div>
      <div class="custom-select-dropdown">
        ${Object.keys(ITEM_LABELS).map(key => `
          <div class="custom-option" data-value="${key}" data-img="${ITEM_IMAGES[key]}">
            <img src="${ITEM_IMAGES[key]}" alt="">
            <span class="option-name">${ITEM_LABELS[key]}</span>
            <span class="option-price">${!prices[key] ? 'Free' : '₵' + prices[key]}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="qty-stepper">
      <button type="button" class="qty-minus" aria-label="Decrease quantity">−</button>
      <input type="number" class="quantity" min="1" placeholder="Qty" required>
      <button type="button" class="qty-plus" aria-label="Increase quantity">+</button>
    </div>
    <button type="button" class="remove-btn"><i class="fas fa-xmark"></i> Remove</button>
  `;
}

function setupAddItem() {
  const addBtn = document.getElementById('addItem');
  const container = document.getElementById('itemsContainer');
  if (!addBtn || !container) return;

  addBtn.addEventListener('click', () => {
    const newRow = document.createElement('div');
    newRow.className = 'item-row';
    newRow.setAttribute('data-row', Date.now());
    newRow.innerHTML = itemRowTemplate();

    container.appendChild(newRow);

    setupRemoveButton(newRow);
    setupQtyStepper(newRow);
    initCustomDropdowns();
    calculateTotal();
  });
}

function setupExistingRows() {
  document.querySelectorAll('.item-row').forEach(row => {
    setupRemoveButton(row);
    setupQtyStepper(row);
  });
}

// ===== PRICE MODAL =====
function getCategoryItems() {
  return {
    duffle: [
      { name: "Duffle Bag (Small)", key: "duffle_small", price: prices.duffle_small, image: ITEM_IMAGES.duffle_small },
      { name: "Duffle Bag (Big)", key: "duffle_big", price: prices.duffle_big, image: ITEM_IMAGES.duffle_big }
    ],
    jute: [
      { name: "Jute Bag (Small)", key: "jute_small", price: prices.jute_small, image: ITEM_IMAGES.jute_small },
      { name: "Jute Bag (Medium)", key: "jute_medium", price: prices.jute_medium, image: ITEM_IMAGES.jute_medium },
      { name: "Jute Bag (Big)", key: "jute_big", price: prices.jute_big, image: ITEM_IMAGES.jute_big }
    ],
    travel: [
      { name: "Traveling Bag (Small)", key: "travel_small", price: prices.travel_small, image: ITEM_IMAGES.travel_small },
      { name: "Traveling Bag (Medium)", key: "travel_medium", price: prices.travel_medium, image: ITEM_IMAGES.travel_medium },
      { name: "Traveling Bag (Big)", key: "travel_big", price: prices.travel_big, image: ITEM_IMAGES.travel_big }
    ],
    microwave: [
      { name: "Microwave", key: "microwave", price: prices.microwave, image: ITEM_IMAGES.microwave }
    ],
    fridge_tabletop: [
      { name: "Fridge (Table Top)", key: "fridge_tabletop", price: prices.fridge_tabletop, image: ITEM_IMAGES.fridge_tabletop }
    ],
    fridge_doubledoor: [
      { name: "Fridge (Double Door)", key: "fridge_doubledoor", price: prices.fridge_doubledoor, image: ITEM_IMAGES.fridge_doubledoor }
    ],
    fridge_small: [
      { name: "Fridge (Small)", key: "fridge_small", price: prices.fridge_small, image: ITEM_IMAGES.fridge_small }
    ],
    gas: [
      { name: "Gas Cylinder (Small)", key: "gas_small", price: prices.gas_small, image: ITEM_IMAGES.gas_small },
      { name: "Gas Cylinder (Medium)", key: "gas_medium", price: prices.gas_medium, image: ITEM_IMAGES.gas_medium },
      { name: "Gas Cylinder (Big)", key: "gas_big", price: prices.gas_big, image: ITEM_IMAGES.gas_big }
    ],
    container: [
      { name: "Container (Small)", key: "container_small", price: prices.container_small, image: ITEM_IMAGES.container_small },
      { name: "Container (Big)", key: "container_big", price: prices.container_big, image: ITEM_IMAGES.container_big }
    ],
    tv: [
      { name: "Television (Small, up to 32\")", key: "tv_small", price: prices.tv_small, image: ITEM_IMAGES.tv_small },
      { name: "Television (Medium, 33\"–43\")", key: "tv_medium", price: prices.tv_medium, image: ITEM_IMAGES.tv_medium },
      { name: "Television (Large, 44\"–55\")", key: "tv_large", price: prices.tv_large, image: ITEM_IMAGES.tv_large },
      { name: "Television (Extra Large, 56\"+)", key: "tv_xlarge", price: prices.tv_xlarge, image: ITEM_IMAGES.tv_xlarge }
    ],
    buckets: [
      { name: "Buckets", key: "buckets", price: prices.buckets, image: ITEM_IMAGES.buckets }
    ]
  };
}

const categoryTitles = {
  duffle: "Duffle Bags", jute: "Jute Bags", travel: "Travel Bags", microwave: "Microwaves",
  fridge_tabletop: "Fridge (Table Top)", fridge_doubledoor: "Fridge (Double Door)", fridge_small: "Fridge (Small)",
  gas: "Gas Cylinders", container: "Storage Containers", tv: "Televisions", buckets: "Buckets"
};

window.openModal = function(category) {
  const modal = document.getElementById('priceModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalContainer = document.getElementById('modalItemsContainer');
  modalTitle.textContent = categoryTitles[category] || category;

  const items = getCategoryItems()[category];
  if (!items) return;

  modalContainer.innerHTML = items.map(item => `<div class="modal-item"><img class="modal-item-img" src="${item.image}" alt="${item.name}"><div class="modal-item-info"><div class="modal-item-name">${item.name}</div><div class="modal-item-price">${item.price}</div></div></div>`).join('');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
};

window.closeModal = function() {
  const modal = document.getElementById('priceModal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
};

function setupGallery() {
  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', function() {
      const category = this.getAttribute('data-category');
      if (category) openModal(category);
    });
  });

  const modal = document.getElementById('priceModal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === this) closeModal();
    });
  }
}

// ========== PAYMENT SYSTEM FUNCTIONS ==========

// Cached after the first fetch so we don't hit the backend on every toggle.
let paystackPublicKey = null;
let paystackConfigChecked = false;

async function getPaystackPublicKey() {
    if (paystackConfigChecked) return paystackPublicKey;
    paystackConfigChecked = true;
    try {
        const response = await fetch(`${API_URL}/payments/config`);
        if (response.ok) {
            const data = await response.json();
            paystackPublicKey = data.publicKey || null;
        }
    } catch (error) {
        console.log('Paystack config not available:', error.message);
    }
    return paystackPublicKey;
}

function togglePaymentFields() {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    const paystackFields = document.getElementById('paystackFields');
    if (paystackFields) paystackFields.style.display = paymentMethod === 'paystack' ? 'block' : 'none';
}

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

function updateMomoAmountDisplay() {
    const totalElement = document.getElementById('totalPrice');
    const displayAmountElement = document.getElementById('paystackDisplayAmount');

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
        paymentMethod: document.querySelector('input[name="paymentMethod"]:checked')?.value || 'pickup'
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
            if (confirm('We found a partially filled booking form. Would you like to restore it?')) {
                if (document.getElementById('name')) document.getElementById('name').value = data.name || '';
                if (document.getElementById('email')) document.getElementById('email').value = data.email || '';
                if (document.getElementById('phone')) document.getElementById('phone').value = data.phone || '';
                if (document.getElementById('hostel')) document.getElementById('hostel').value = data.hostel || '';
                if (document.getElementById('date')) document.getElementById('date').value = data.date || '';
                if (document.getElementById('time')) document.getElementById('time').value = data.time || '';
                if (document.getElementById('description')) document.getElementById('description').value = data.description || '';

                const paymentRadio = document.querySelector(`input[name="paymentMethod"][value="${data.paymentMethod}"]`);
                if (paymentRadio) {
                    paymentRadio.checked = true;
                    togglePaymentFields();
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
    const formInputs = ['name', 'email', 'phone', 'hostel', 'date', 'time', 'description'];

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
            togglePaymentFields();
        });
    });
}

// ========== MAIN SUBMIT FUNCTION ==========
// Shared success handling — same reset regardless of which payment path got us here.
function handleBookingSuccess(bookingRef, paymentMethod) {
    clearSavedFormData();

    let successMessage = `Booking confirmed!\nReference: ${bookingRef}\n\n`;
    if (paymentMethod === 'paystack') {
        successMessage += `Your payment has been received and confirmed instantly.\n\n`;
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
        const firstTriggerText = firstRow.querySelector('.trigger-text');
        const firstTriggerImg = firstRow.querySelector('.trigger-image');
        if (firstSelect) firstSelect.value = '';
        if (firstQuantity) firstQuantity.value = '';
        if (firstTriggerText) firstTriggerText.textContent = 'Select item type';
        if (firstTriggerImg) firstTriggerImg.src = 'images/default-item.png';
    }

    const pickupRadio = document.querySelector('input[name="paymentMethod"][value="pickup"]');
    if (pickupRadio) pickupRadio.checked = true;
    togglePaymentFields();

    calculateTotal();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetSubmitButton() {
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-circle-check"></i> Confirm Booking';
    }
}

async function submitBooking(event) {
    if (event) event.preventDefault();

    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;

    if (!paymentMethod) {
        showToastMessage('Please select a payment method (Pay on Pickup or Pay Now)', 'error');
        return;
    }

    const items = [];
    let firstInvalidRow = null;
    let missingQtyLabel = null;

    document.querySelectorAll('.item-row').forEach(row => {
        const select = row.querySelector('.itemSelect');
        const quantityInput = row.querySelector('.quantity');
        const quantity = parseInt(quantityInput?.value);
        const stepper = row.querySelector('.qty-stepper');

        if (!select || !select.value) return; // empty row (no item picked) is fine, just skip it

        if (!quantity || quantity < 1) {
            stepper?.classList.add('invalid');
            if (!firstInvalidRow) {
                firstInvalidRow = quantityInput;
                missingQtyLabel = ITEM_LABELS[select.value] || 'this item';
            }
            return;
        }

        stepper?.classList.remove('invalid');
        items.push({ type: select.value, quantity });
    });

    if (missingQtyLabel) {
        showToastMessage(`Enter how many ${missingQtyLabel} you have`, 'error');
        firstInvalidRow.closest('.item-row').scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalidRow.focus();
        return;
    }

    if (items.length === 0) {
        showToastMessage('Please add at least one item to store', 'error');
        return;
    }

    // Compute the total straight from the validated items + live prices —
    // never trust the displayed #totalPrice text, which can go stale.
    const computedTotal = items.reduce((sum, item) => sum + (prices[item.type] || 0) * item.quantity, 0);

    const bookingData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        hostel: document.getElementById('hostel').value,
        date: document.getElementById('date').value,
        time: document.getElementById('time').value,
        description: document.getElementById('description').value,
        items: items,
        total: computedTotal,
        payment_method: paymentMethod
    };

    if (!bookingData.name || !bookingData.email || !bookingData.phone || !bookingData.hostel || !bookingData.date || !bookingData.time) {
        showToastMessage('Please fill in all required fields', 'error');
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Processing...';

    if (paymentMethod === 'paystack') {
        await submitWithPaystack(bookingData);
        return;
    }

    // Pay on pickup — straight through, no payment step
    try {
        const response = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });

        const result = await response.json();

        if (response.ok) {
            handleBookingSuccess(result.bookingRef, paymentMethod);
        } else {
            showToastMessage(result.error || 'Booking failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Booking error:', error);
        showToastMessage('Network error. Please check your connection.', 'error');
    } finally {
        resetSubmitButton();
    }
}

// Opens Paystack's secure checkout popup, then asks our own backend to
// verify the payment (never trust the client-side callback alone) before
// the booking is actually created.
async function submitWithPaystack(bookingData) {
    const publicKey = await getPaystackPublicKey();

    if (!publicKey || typeof PaystackPop === 'undefined') {
        showToastMessage('Online payment is temporarily unavailable — please choose Pay on Pickup instead', 'error');
        resetSubmitButton();
        return;
    }

    const handler = PaystackPop.setup({
        key: publicKey,
        email: bookingData.email,
        amount: Math.round(bookingData.total * 100), // cedis -> pesewas
        currency: 'GHS',
        metadata: {
            name: bookingData.name,
            phone: bookingData.phone,
            hostel: bookingData.hostel,
            date: bookingData.date,
            time: bookingData.time,
            description: bookingData.description,
            items: bookingData.items
        },
        callback: function(response) {
            (async () => {
                try {
                    const verifyResponse = await fetch(`${API_URL}/payments/verify-and-book`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reference: response.reference })
                    });
                    const result = await verifyResponse.json();

                    if (verifyResponse.ok) {
                        handleBookingSuccess(result.bookingRef, 'paystack');
                    } else {
                        showToastMessage(result.error || 'Payment received, but confirming it failed — contact us with your payment reference: ' + response.reference, 'error');
                    }
                } catch (error) {
                    console.error('Verify-and-book error:', error);
                    showToastMessage('Payment received, but confirming it failed — contact us with your payment reference: ' + response.reference, 'error');
                } finally {
                    resetSubmitButton();
                }
            })();
        },
        onClose: function() {
            showToastMessage('Payment cancelled — your booking was not submitted', 'info');
            resetSubmitButton();
        }
    });

    handler.openIframe();
}

// ========== INITIALIZE PAYMENT SYSTEM ==========
function initPaymentSystem() {
    const paymentRadios = document.querySelectorAll('input[name="paymentMethod"]');
    paymentRadios.forEach(radio => {
        radio.addEventListener('change', togglePaymentFields);
    });

    togglePaymentFields();
    getPaystackPublicKey();
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

// ===== INITIALIZE =====
document.addEventListener("DOMContentLoaded", function() {
  const dateInput = document.getElementById("date");
  if (dateInput) {
    dateInput.min = new Date().toISOString().split("T")[0];
  }

  initCustomDropdowns();
  setupAddItem();
  setupExistingRows();
  setupGallery();

  loadPrices().then(() => {
    calculateTotal();
  });

  loadBusinessSettings();
  loadTestimonials();

  initPaymentSystem();

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
