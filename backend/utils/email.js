// backend/utils/email.js
const nodemailer = require('nodemailer');

// Create transporter (using Gmail - free)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'Kodaklogisticsservices@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
});

// Helper function to get payment method display text
function getPaymentMethodDisplay(paymentMethod, paymentStatus, transactionId) {
    if (paymentMethod === 'momo') {
        let statusMessage = '';
        if (paymentStatus === 'pending_verification') {
            statusMessage = '⏳ Pending Verification - We will verify your payment within 24 hours';
        } else if (paymentStatus === 'verified') {
            statusMessage = '✅ Verified - Your payment has been confirmed';
        } else if (paymentStatus === 'rejected') {
            statusMessage = '❌ Rejected - Please contact us';
        } else {
            statusMessage = '⏳ Awaiting Verification';
        }
        
        return `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Payment Method:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">📱 Mobile Money (MoMo)</td>
            </tr>
            ${transactionId ? `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Transaction ID:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${transactionId}</td>
            </tr>
            ` : ''}
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Payment Status:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">${statusMessage}</td>
            </tr>
        `;
    } else {
        return `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Payment Method:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">💵 Pay on Pickup</td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Payment Instructions:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">You will pay when we collect your items (Cash or MoMo on arrival)</td>
            </tr>
        `;
    }
}

// Helper function to get payment message for customer
function getPaymentMessage(paymentMethod, paymentStatus) {
    if (paymentMethod === 'momo') {
        if (paymentStatus === 'pending_verification') {
            return `
                <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ff9800;">
                    <strong>💰 Payment Information:</strong><br>
                    We have received your payment information. Our team will verify your payment within 24 hours.
                    You will receive another email once your payment is confirmed.
                    Your booking will be scheduled after payment verification.
                </div>
            `;
        } else if (paymentStatus === 'verified') {
            return `
                <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #28a745;">
                    <strong>✅ Payment Verified!</strong><br>
                    Your payment has been confirmed. We will contact you shortly to schedule your pickup.
                </div>
            `;
        }
    } else {
        return `
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2196f3;">
                <strong>💵 Payment on Pickup:</strong><br>
                You will pay when we collect your items. We accept Mobile Money and Cash.
            </div>
        `;
    }
    return '';
}

// Send booking confirmation to admin (UPDATED with payment info)
async function sendAdminNotification(booking) {
    try {
        console.log("📧 Sending admin email...");
        
        const paymentMethodText = booking.payment_method === 'momo' ? '📱 Mobile Money' : '💵 Pay on Pickup';
        const paymentStatusText = booking.payment_status || (booking.payment_method === 'momo' ? 'pending_verification' : 'unpaid');
        
        let paymentStatusDisplay = '';
        if (paymentStatusText === 'pending_verification') {
            paymentStatusDisplay = '🟡 Pending Verification - Check transaction';
        } else if (paymentStatusText === 'verified') {
            paymentStatusDisplay = '🟢 Verified';
        } else if (paymentStatusText === 'rejected') {
            paymentStatusDisplay = '🔴 Rejected';
        } else {
            paymentStatusDisplay = '⚪ Not Paid Yet';
        }
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.ADMIN_EMAIL || 'Kodaklogisticsservices@gmail.com',
            subject: `📦 New Booking: ${booking.customer_name} - ${paymentMethodText}`,
            html: `
                <h2>New Storage Booking Received!</h2>
                
                <h3>Customer Details:</h3>
                <p><strong>Name:</strong> ${booking.customer_name}</p>
                <p><strong>Phone:</strong> ${booking.customer_phone}</p>
                <p><strong>Email:</strong> ${booking.customer_email}</p>
                <p><strong>Hostel:</strong> ${booking.hostel_name}</p>
                
                <h3>Booking Details:</h3>
                <p><strong>Pickup Date:</strong> ${booking.booking_date} at ${booking.booking_time}</p>
                <p><strong>Items:</strong> ${booking.items_summary}</p>
                <p><strong>Total:</strong> ₵${booking.total_amount}</p>
                <p><strong>Status:</strong> ${booking.status}</p>
                
                <h3>💰 Payment Information:</h3>
                <p><strong>Payment Method:</strong> ${paymentMethodText}</p>
                <p><strong>Payment Status:</strong> ${paymentStatusDisplay}</p>
                ${booking.transaction_id ? `<p><strong>Transaction ID:</strong> ${booking.transaction_id}</p>` : ''}
                
                <hr>
                <p><a href="https://falcrypt.github.io/kodak-logistics/admin/">Click here to manage booking</a></p>
                <p><strong>Action Required:</strong> ${booking.payment_method === 'momo' ? 'Please verify this payment in your mobile money statement.' : 'No payment verification needed.'}</p>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log('✅ Admin email sent');
    } catch (error) {
        console.error('❌ Admin email error:', error);
    }
}

// Send confirmation to customer (UPDATED with payment info)
async function sendCustomerConfirmation(booking) {
    try {
        console.log("📧 Sending customer email...");
        
        const paymentMethod = booking.payment_method || 'pickup';
        const paymentStatus = booking.payment_status || (paymentMethod === 'momo' ? 'pending_verification' : 'unpaid');
        const transactionId = booking.transaction_id || null;
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: booking.customer_email,
            subject: paymentMethod === 'momo' ? '📱 Your Kodak Logistics Booking - Payment Pending Verification' : '✅ Your Kodak Logistics Booking Confirmation',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #8b0000;">Thank you for booking with Kodak Logistics!</h2>
                    
                    <p>Hi ${booking.customer_name},</p>
                    
                    <p>We've received your storage booking request. Here are the details:</p>
                    
                    <table style="border-collapse: collapse; width: 100%; margin: 15px 0;">
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Booking Reference:</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${booking.booking_ref || 'Processing...'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Pickup Date:</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${booking.booking_date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Pickup Time:</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${booking.booking_time}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Hostel:</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${booking.hostel_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Items:</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${booking.items_summary}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Total Amount:</strong></td>
                            <td style="padding: 8px; border: 1px solid #ddd;">₵${booking.total_amount}</td>
                        </tr>
                        ${getPaymentMethodDisplay(paymentMethod, paymentStatus, transactionId)}
                    </table>
                    
                    ${getPaymentMessage(paymentMethod, paymentStatus)}
                    
                    <p>If you have any questions, reply to this email or WhatsApp us at +233541249742</p>
                    
                    <hr style="margin: 20px 0;">
                    
                    <p style="color: #666; font-size: 12px;">
                        Kodak Logistics - Your KNUST Storage Partner<br>
                        📍 Serving all KNUST hostels and surrounding areas
                    </p>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log('✅ Customer email sent');
    } catch (error) {
        console.error('❌ Customer email error:', error);
    }
}

// NEW: Send payment verification email to customer
async function sendPaymentVerificationEmail(booking) {
    try {
        console.log("📧 Sending payment verification email...");
        
        const isVerified = booking.payment_status === 'verified';
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: booking.customer_email,
            subject: isVerified ? '✅ Payment Verified - Kodak Logistics' : '⚠️ Payment Issue - Kodak Logistics',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: ${isVerified ? '#28a745' : '#dc3545'};">
                        ${isVerified ? '✅ Payment Verified!' : '⚠️ Payment Verification Issue'}
                    </h2>
                    
                    <p>Dear ${booking.customer_name},</p>
                    
                    ${isVerified ? `
                        <p>Great news! Your payment for booking <strong>${booking.booking_ref}</strong> has been <strong style="color: #28a745;">VERIFIED</strong>.</p>
                        <p>Your booking is now confirmed. We will contact you shortly via WhatsApp to arrange your pickup.</p>
                        <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <strong>✅ What's next?</strong><br>
                            1. Our team will call you to confirm pickup time<br>
                            2. We'll collect your items from your hostel<br>
                            3. Your items will be stored safely until you need them
                        </div>
                    ` : `
                        <p>We were unable to verify your payment for booking <strong>${booking.booking_ref}</strong>.</p>
                        <p>Please check your transaction and contact us with the correct transaction ID.</p>
                        <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            <strong>📞 Need help?</strong><br>
                            WhatsApp us at +233541249742 with your transaction screenshot.
                        </div>
                    `}
                    
                    <h3>Booking Summary:</h3>
                    <table style="border-collapse: collapse; width: 100%; margin: 10px 0;">
                        <tr>
                            <td style="padding: 5px;"><strong>Reference:</strong></td>
                            <td>${booking.booking_ref}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px;"><strong>Total Amount:</strong></td>
                            <td>₵${booking.total_amount}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px;"><strong>Transaction ID:</strong></td>
                            <td>${booking.transaction_id || 'N/A'}</td>
                        </tr>
                    </table>
                    
                    <hr>
                    <p style="color: #666;">Kodak Logistics - Your KNUST Storage Partner</p>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log('✅ Payment verification email sent');
    } catch (error) {
        console.error('❌ Payment verification email error:', error);
    }
}

module.exports = {
    sendAdminNotification,
    sendCustomerConfirmation,
    sendPaymentVerificationEmail
};