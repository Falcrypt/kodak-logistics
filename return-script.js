// return-script.js - Kodak Logistics Return Items System
const API_URL = 'https://kodak-logistics-api.onrender.com/api';

// Global variables
let verifiedBooking = null;
let currentStep = 1;

// ========== DOM ELEMENTS ==========
const verifySection = document.getElementById('verifySection');
const bookingInfoSection = document.getElementById('bookingInfoSection');
const returnFormSection = document.getElementById('returnFormSection');
const successSection = document.getElementById('successSection');
const historySection = document.getElementById('historySection');

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Return Items Page Loaded');
    
    // Setup mobile menu
    setupMobileMenu();
    
    // Setup verify button
    const verifyBtn = document.getElementById('verifyBtn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', verifyBooking);
    }
    
    // Setup return form submission
    const returnForm = document.getElementById('returnForm');
    if (returnForm) {
        returnForm.addEventListener('submit', submitReturnRequest);
    }
    
    // Setup payment method toggles
    setupPaymentMethodToggle();
    
    // Setup copy button for MoMo number
    setupCopyButton();
    
    // Load daily limit info
    loadDailyLimit();
    
    // Setup view history button
    const viewHistoryBtn = document.getElementById('viewHistoryBtn');
    if (viewHistoryBtn) {
        viewHistoryBtn.addEventListener('click', showReturnHistory);
    }
    
    // Set minimum date for return (tomorrow)
    const returnDateInput = document.getElementById('returnDate');
    if (returnDateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        returnDateInput.min = tomorrow.toISOString().split('T')[0];
        
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 30);
        returnDateInput.max = maxDate.toISOString().split('T')[0];
    }
});

// ========== MOBILE MENU ==========
function setupMobileMenu() {
    const menuToggle = document.getElementById('mobileMenuToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
        });
        
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => navLinks.classList.remove('active'));
        });
    }
}

// ========== VERIFY BOOKING ==========
async function verifyBooking() {
    const bookingRef = document.getElementById('bookingRef').value.trim().toUpperCase();
    
    if (!bookingRef) {
        showToast('Please enter your booking reference', 'error');
        return;
    }
    
    const verifyBtn = document.getElementById('verifyBtn');
    const originalText = verifyBtn.innerHTML;
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<span class="loading-spinner"></span> Verifying...';
    
    try {
        const response = await fetch(`${API_URL}/returns/verify-booking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_ref: bookingRef })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            verifiedBooking = result.booking;
            displayBookingInfo(verifiedBooking);
            showToast('Booking verified! Please complete the form below.', 'success');
            
            // Show form sections
            bookingInfoSection.style.display = 'block';
            returnFormSection.style.display = 'block';
            verifySection.style.display = 'none';
            
            // Pre-fill customer info
            document.getElementById('returnCustomerName').value = verifiedBooking.customer_name;
            document.getElementById('returnCustomerEmail').value = verifiedBooking.customer_email;
            document.getElementById('returnCustomerPhone').value = verifiedBooking.customer_phone;
            document.getElementById('returnHostel').value = verifiedBooking.hostel_name;
            document.getElementById('bookingId').value = verifiedBooking.id;
            document.getElementById('bookingRefHidden').value = verifiedBooking.booking_ref;
            document.getElementById('itemsSummary').value = verifiedBooking.items_summary;
            document.getElementById('totalItems').value = verifiedBooking.total_items;
            
            // Scroll to form
            returnFormSection.scrollIntoView({ behavior: 'smooth' });
            
        } else {
            let errorMsg = result.error || 'Booking not found';
            showToast(errorMsg, 'error');
            
            // Show helpful message with redirect option
            if (result.not_found) {
                setTimeout(() => {
                    if (confirm('No booking found. Would you like to book storage instead?')) {
                        window.location.href = 'index.html#book';
                    }
                }, 1000);
            } else if (result.too_early) {
                showToast(`You can request return after ${result.available_date}`, 'error');
            }
        }
        
    } catch (error) {
        console.error('Verify error:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = originalText;
    }
}

// ========== DISPLAY BOOKING INFO ==========
function displayBookingInfo(booking) {
    const storageDate = new Date(booking.storage_date).toLocaleDateString();
    const availableDate = new Date(booking.storage_date);
    availableDate.setDate(availableDate.getDate() + 14);
    
    document.getElementById('displayBookingRef').textContent = booking.booking_ref;
    document.getElementById('displayCustomerName').textContent = booking.customer_name;
    document.getElementById('displayStorageDate').textContent = storageDate;
    document.getElementById('displayAvailableDate').textContent = availableDate.toLocaleDateString();
    document.getElementById('displayItems').innerHTML = booking.items_summary || 'No items listed';
    document.getElementById('displayTotalItems').textContent = booking.total_items;
}

// ========== PAYMENT METHOD TOGGLE ==========
function setupPaymentMethodToggle() {
    const paymentOptions = document.querySelectorAll('input[name="paymentMethod"]');
    const momoFields = document.getElementById('momoFields');
    
    paymentOptions.forEach(option => {
        option.addEventListener('change', function() {
            if (this.value === 'momo') {
                momoFields.style.display = 'block';
                document.getElementById('transactionId').required = true;
            } else {
                momoFields.style.display = 'none';
                document.getElementById('transactionId').required = false;
                document.getElementById('transactionId').value = '';
            }
        });
    });
}

// ========== COPY MOMO NUMBER ==========
function setupCopyButton() {
    const copyBtn = document.getElementById('copyMomoBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', async function() {
            const momoNumber = '0544705397';
            try {
                await navigator.clipboard.writeText(momoNumber);
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '✅ Copied!';
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                }, 2000);
                showToast('MoMo number copied!', 'success');
            } catch (err) {
                showToast('Failed to copy', 'error');
            }
        });
    }
}

// ========== LOAD DAILY LIMIT ==========
async function loadDailyLimit() {
    try {
        const response = await fetch(`${API_URL}/returns/daily-limit`);
        const limit = await response.json();
        
        const limitNotice = document.getElementById('dailyLimitNotice');
        if (limitNotice) {
            if (limit.remaining <= 10) {
                limitNotice.innerHTML = `⚠️ Only ${limit.remaining} slots remaining today! Book quickly.`;
                limitNotice.className = 'limit-notice warning';
            } else {
                limitNotice.innerHTML = `📊 Today's remaining slots: ${limit.remaining}/${limit.limit}`;
                limitNotice.className = 'limit-notice';
            }
        }
    } catch (error) {
        console.error('Daily limit error:', error);
    }
}

// ========== SUBMIT RETURN REQUEST ==========
async function submitReturnRequest(event) {
    event.preventDefault();
    
    // Validate payment method selected
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    if (!paymentMethod) {
        showToast('Please select a payment method', 'error');
        return;
    }
    
    // Validate MoMo transaction ID if needed
    const transactionId = document.getElementById('transactionId')?.value;
    if (paymentMethod === 'momo' && !transactionId) {
        showToast('Please enter your transaction ID', 'error');
        return;
    }
    
    // Get form data
    const returnDate = document.getElementById('returnDate').value;
    const returnTime = document.getElementById('returnTime').value;
    const specialInstructions = document.getElementById('specialInstructions').value;
    
    if (!returnDate || !returnTime) {
        showToast('Please select return date and time', 'error');
        return;
    }
    
    const requestData = {
        booking_id: parseInt(document.getElementById('bookingId').value),
        booking_ref: document.getElementById('bookingRefHidden').value,
        customer_name: document.getElementById('returnCustomerName').value,
        customer_email: document.getElementById('returnCustomerEmail').value,
        customer_phone: document.getElementById('returnCustomerPhone').value,
        original_hostel: document.getElementById('returnHostel').value,
        items_summary: document.getElementById('itemsSummary').value,
        total_items_stored: parseInt(document.getElementById('totalItems').value),
        return_date: returnDate,
        return_time: returnTime,
        special_instructions: specialInstructions,
        payment_method: paymentMethod,
        transaction_id: paymentMethod === 'momo' ? transactionId : null
    };
    
    const submitBtn = document.getElementById('submitReturnBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Submitting...';
    
    try {
        const response = await fetch(`${API_URL}/returns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Show success
            bookingInfoSection.style.display = 'none';
            returnFormSection.style.display = 'none';
            successSection.style.display = 'block';
            
            document.getElementById('successRef').textContent = result.request_ref;
            document.getElementById('successDate').textContent = new Date(returnDate).toLocaleDateString();
            
            showToast('Return request submitted successfully!', 'success');
            
            // Scroll to success message
            successSection.scrollIntoView({ behavior: 'smooth' });
            
        } else if (response.status === 429) {
            showToast(result.error || 'Daily limit reached. Please try tomorrow.', 'error');
        } else {
            showToast(result.error || 'Failed to submit request', 'error');
        }
        
    } catch (error) {
        console.error('Submit error:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ========== SHOW RETURN HISTORY ==========
async function showReturnHistory() {
    const email = prompt('Enter your email address to view your return requests:');
    
    if (!email) return;
    
    const historySection = document.getElementById('historySection');
    const historyContent = document.getElementById('historyContent');
    
    historyContent.innerHTML = '<div class="loading-spinner"></div> Loading...';
    historySection.style.display = 'block';
    historySection.scrollIntoView({ behavior: 'smooth' });
    
    try {
        const response = await fetch(`${API_URL}/returns/customer/${encodeURIComponent(email)}`);
        const requests = await response.json();
        
        if (requests.length === 0) {
            historyContent.innerHTML = '<p>No return requests found for this email.</p>';
            return;
        }
        
        let html = '<div class="history-list">';
        requests.forEach(req => {
            let statusClass = '';
            let statusText = req.status;
            
            switch(req.status) {
                case 'pending': statusClass = 'status-pending'; statusText = '🟡 Pending'; break;
                case 'confirmed': statusClass = 'status-confirmed'; statusText = '🟢 Confirmed'; break;
                case 'completed': statusClass = 'status-completed'; statusText = '✅ Completed'; break;
                case 'cancelled': statusClass = 'status-cancelled'; statusText = '❌ Cancelled'; break;
            }
            
            const returnDate = new Date(req.return_date).toLocaleDateString();
            
            html += `
                <div class="history-item" style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 12px; margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; flex-wrap: wrap; margin-bottom: 0.5rem;">
                        <strong style="color: #ffb347;">${req.request_ref}</strong>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <p><strong>Booking:</strong> ${req.booking_ref}</p>
                    <p><strong>Return Date:</strong> ${returnDate} at ${req.return_time}</p>
                    <p><strong>Items:</strong> ${req.items_summary?.substring(0, 100)}${req.items_summary?.length > 100 ? '...' : ''}</p>
                    <p><strong>Delivery Fee:</strong> ₵${req.delivery_fee}</p>
                    <p><strong>Payment:</strong> ${req.payment_method === 'momo' ? 'Mobile Money' : 'Pay on Delivery'}</p>
                </div>
            `;
        });
        html += '</div>';
        historyContent.innerHTML = html;
        
    } catch (error) {
        console.error('History error:', error);
        historyContent.innerHTML = '<p>Failed to load history. Please try again.</p>';
    }
}

// ========== TOAST NOTIFICATION ==========
function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        font-weight: bold;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// ========== RESET FORM (for new request) ==========
function resetForm() {
    verifiedBooking = null;
    bookingInfoSection.style.display = 'none';
    returnFormSection.style.display = 'none';
    successSection.style.display = 'none';
    verifySection.style.display = 'block';
    document.getElementById('bookingRef').value = '';
    document.getElementById('returnForm').reset();
}

// Export for global access
window.resetForm = resetForm;