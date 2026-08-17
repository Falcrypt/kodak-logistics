// review-script.js - Kodak Logistics Leave-a-Review page
const API_URL = 'https://kodak-logistics-api.onrender.com/api';

let verifiedBooking = null;
let selectedRating = 0;

const verifySection = document.getElementById('verifySection');
const reviewFormSection = document.getElementById('reviewFormSection');
const successSection = document.getElementById('successSection');

document.addEventListener('DOMContentLoaded', function() {
    setupMobileMenu();

    const verifyBtn = document.getElementById('verifyBtn');
    if (verifyBtn) verifyBtn.addEventListener('click', verifyBooking);

    setupStarRating();

    const submitBtn = document.getElementById('submitReviewBtn');
    if (submitBtn) submitBtn.addEventListener('click', submitReview);

    // Pre-fill booking ref if arrived via an email link (?ref=KDL-000123)
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) document.getElementById('bookingRef').value = ref.toUpperCase();
});

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

async function verifyBooking() {
    const bookingRef = document.getElementById('bookingRef').value.trim().toUpperCase();
    const phone = document.getElementById('verifyPhone').value.trim();

    if (!bookingRef) {
        showToast('Please enter your booking reference', 'error');
        return;
    }
    if (!phone) {
        showToast('Please enter the phone number used at booking', 'error');
        return;
    }

    const verifyBtn = document.getElementById('verifyBtn');
    const originalText = verifyBtn.innerHTML;
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<span class="loading-spinner"></span> Verifying...';

    try {
        const response = await fetch(`${API_URL}/reviews/verify-booking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_ref: bookingRef, phone })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            verifiedBooking = result.booking;
            document.getElementById('reviewCustomerName').textContent = verifiedBooking.customer_name.split(' ')[0] || 'there';

            verifySection.style.display = 'none';
            reviewFormSection.style.display = 'block';
            document.getElementById('step1').classList.remove('active');
            document.getElementById('step1').classList.add('completed');
            document.getElementById('step2').classList.add('active');

            reviewFormSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            showToast(result.error || 'Booking not found', 'error');
        }
    } catch (error) {
        console.error('Verify booking error:', error);
        showToast('Connection error. Please try again.', 'error');
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = originalText;
    }
}

function setupStarRating() {
    const stars = document.querySelectorAll('#starRating i');
    const label = document.getElementById('ratingLabel');
    const labels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.value);
            updateStars(stars, selectedRating);
            label.textContent = labels[selectedRating];
        });

        star.addEventListener('mouseenter', () => {
            updateStars(stars, parseInt(star.dataset.value));
        });
    });

    document.getElementById('starRating').addEventListener('mouseleave', () => {
        updateStars(stars, selectedRating);
        label.textContent = selectedRating ? labels[selectedRating] : 'Tap a star to rate';
    });
}

function updateStars(stars, value) {
    stars.forEach(star => {
        star.classList.toggle('active', parseInt(star.dataset.value) <= value);
    });
}

async function submitReview() {
    if (!verifiedBooking) return;

    if (selectedRating === 0) {
        showToast('Please select a star rating', 'error');
        return;
    }

    const phone = document.getElementById('verifyPhone').value.trim();
    const comment = document.getElementById('reviewComment').value.trim();

    const submitBtn = document.getElementById('submitReviewBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Submitting...';

    try {
        const response = await fetch(`${API_URL}/reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                booking_ref: verifiedBooking.booking_ref,
                phone,
                rating: selectedRating,
                comment
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            reviewFormSection.style.display = 'none';
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step2').classList.add('completed');
            successSection.style.display = 'block';
            successSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            showToast(result.error || 'Failed to submit review', 'error');
        }
    } catch (error) {
        console.error('Submit review error:', error);
        showToast('Connection error. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        padding: 14px 22px; border-radius: 10px; color: white; font-weight: 600;
        box-shadow: 0 8px 20px rgba(0,0,0,0.3);
        background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8'};
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}
