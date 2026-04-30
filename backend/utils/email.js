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

// Send return request confirmation to customer
async function sendReturnRequestConfirmation(returnRequest) {
    try {
        console.log("📧 Sending return request confirmation email...");
        
        // Format the date nicely
        const returnDateFormatted = new Date(returnRequest.return_date).toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const statusMessage = returnRequest.payment_method === 'momo' && returnRequest.payment_status === 'pending_verification'
            ? '⚠️ Payment pending verification. We will confirm once payment is verified.'
            : '💰 Pay ₵30 on delivery (cash or MoMo)';
        
        const mailOptions = {
            from: `"Kodak Logistics" <${process.env.EMAIL_USER}>`,
            to: returnRequest.customer_email,
            subject: `📦 Return Request Received - ${returnRequest.request_ref}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #8b0000;">Return Request Received!</h2>
                    
                    <p>Dear ${returnRequest.customer_name},</p>
                    
                    <p>We have received your request to return your stored items. Here are the details:</p>
                    
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <h3 style="margin-top: 0; color: #8b0000;">📋 Request Details</h3>
                        <p><strong>Request Reference:</strong> ${returnRequest.request_ref}</p>
                        <p><strong>Original Booking:</strong> ${returnRequest.booking_ref}</p>
                        <p><strong>Return Date:</strong> ${returnDateFormatted}</p>
                        <p><strong>Return Time:</strong> ${returnRequest.return_time}</p>
                        <p><strong>Delivery Location:</strong> ${returnRequest.original_hostel}</p>
                        <p><strong>Items to Return:</strong> ${returnRequest.items_summary}</p>
                        <p><strong>Delivery Fee:</strong> ₵30.00</p>
                        <p><strong>Payment:</strong> ${statusMessage}</p>
                        ${returnRequest.special_instructions ? `<p><strong>Special Instructions:</strong> ${returnRequest.special_instructions}</p>` : ''}
                    </div>
                    
                    <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <h3 style="margin-top: 0; color: #8b0000;">⏳ What Happens Next?</h3>
                        <ol style="margin: 0; padding-left: 20px;">
                            <li>Our team will review your request within 24 hours</li>
                            <li>You will receive a confirmation email once approved</li>
                            <li>We will deliver your items on the scheduled date</li>
                        </ol>
                    </div>
                    
                    <p>Need to modify or cancel? Please contact us within 12 hours.</p>
                    
                    <hr>
                    <p style="color: #666;">Kodak Logistics - Your KNUST Storage Partner</p>
                    <p>📞 WhatsApp: +233545025296 | 📧 Email: ${process.env.EMAIL_USER}</p>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log('✅ Return confirmation email sent to customer');
    } catch (error) {
        console.error('❌ Return confirmation email error:', error);
    }
}

// Send return request notification to admin
async function sendReturnRequestNotification(returnRequest) {
    try {
        console.log("📧 Sending return request notification to admin...");
        
        const returnDateFormatted = new Date(returnRequest.return_date).toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const mailOptions = {
            from: `"Kodak Logistics" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL || 'Kodaklogisticsservices@gmail.com',
            subject: `📦 NEW RETURN REQUEST - ${returnRequest.request_ref}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #8b0000;">📦 New Return Request Received!</h2>
                    
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <h3 style="margin-top: 0;">Customer Information</h3>
                        <p><strong>Name:</strong> ${returnRequest.customer_name}</p>
                        <p><strong>Phone:</strong> ${returnRequest.customer_phone}</p>
                        <p><strong>Email:</strong> ${returnRequest.customer_email}</p>
                        <p><strong>Original Booking:</strong> ${returnRequest.booking_ref}</p>
                    </div>
                    
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <h3 style="margin-top: 0;">Return Details</h3>
                        <p><strong>Request Reference:</strong> ${returnRequest.request_ref}</p>
                        <p><strong>Return Date:</strong> ${returnDateFormatted}</p>
                        <p><strong>Return Time:</strong> ${returnRequest.return_time}</p>
                        <p><strong>Delivery Location:</strong> ${returnRequest.original_hostel}</p>
                        <p><strong>Items:</strong> ${returnRequest.items_summary}</p>
                        <p><strong>Delivery Fee:</strong> ₵30.00</p>
                        <p><strong>Payment Method:</strong> ${returnRequest.payment_method === 'momo' ? 'Mobile Money (Pending Verification)' : 'Pay on Delivery'}</p>
                        ${returnRequest.transaction_id ? `<p><strong>Transaction ID:</strong> ${returnRequest.transaction_id}</p>` : ''}
                        ${returnRequest.special_instructions ? `<p><strong>Instructions:</strong> ${returnRequest.special_instructions}</p>` : ''}
                    </div>
                    
                    <p><a href="https://falcrypt.github.io/kodak-logistics/admin/#returns" style="background: #8b0000; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Manage Request</a></p>
                    
                    <hr>
                    <p><strong>Action Required:</strong> Please review and confirm this return request.</p>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log('✅ Return notification email sent to admin');
    } catch (error) {
        console.error('❌ Return notification email error:', error);
    }
}

// Send return status update to customer
async function sendReturnStatusUpdateEmail(returnRequest) {
    try {
        console.log("📧 Sending return status update email...");
        
        const returnDateFormatted = new Date(returnRequest.return_date).toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        let statusTitle = '';
        let statusColor = '';
        let statusMessage = '';
        let nextSteps = '';
        
        switch(returnRequest.status) {
            case 'confirmed':
                statusTitle = '✅ Return Request Confirmed!';
                statusColor = '#28a745';
                statusMessage = 'Your return request has been approved!';
                nextSteps = `
                    <li>We will deliver your items on ${returnDateFormatted} at ${returnRequest.return_time}</li>
                    <li>Please be available at ${returnRequest.original_hostel} during the delivery time</li>
                    <li>Have your payment ready (₵30 delivery fee)</li>
                `;
                break;
            case 'completed':
                statusTitle = '✅ Items Successfully Delivered!';
                statusColor = '#28a745';
                statusMessage = 'Your items have been delivered successfully.';
                nextSteps = `
                    <li>Thank you for choosing Kodak Logistics!</li>
                    <li>We hope you enjoyed our service.</li>
                    <li>Please consider leaving a review!</li>
                `;
                break;
            case 'cancelled':
                statusTitle = '❌ Return Request Cancelled';
                statusColor = '#dc3545';
                statusMessage = 'Your return request has been cancelled.';
                nextSteps = `
                    <li>If you did not request this cancellation, please contact us immediately</li>
                    <li>You can submit a new return request at any time</li>
                `;
                break;
            default:
                statusTitle = '📦 Return Request Update';
                statusColor = '#ffc107';
                statusMessage = 'There has been an update to your return request.';
                nextSteps = `<li>Please contact us if you have any questions</li>`;
        }
        
        const mailOptions = {
            from: `"Kodak Logistics" <${process.env.EMAIL_USER}>`,
            to: returnRequest.customer_email,
            subject: `${statusTitle} - ${returnRequest.request_ref}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: ${statusColor};">${statusTitle}</h2>
                    
                    <p>Dear ${returnRequest.customer_name},</p>
                    
                    <p>${statusMessage}</p>
                    
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <h3 style="margin-top: 0;">📋 Request Details</h3>
                        <p><strong>Request Reference:</strong> ${returnRequest.request_ref}</p>
                        <p><strong>Original Booking:</strong> ${returnRequest.booking_ref}</p>
                        <p><strong>Return Date:</strong> ${returnDateFormatted}</p>
                        <p><strong>Return Time:</strong> ${returnRequest.return_time}</p>
                        <p><strong>Delivery Location:</strong> ${returnRequest.original_hostel}</p>
                        <p><strong>Items:</strong> ${returnRequest.items_summary}</p>
                        <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${returnRequest.status.toUpperCase()}</span></p>
                    </div>
                    
                    <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <h3 style="margin-top: 0;">📋 Next Steps</h3>
                        <ol style="margin: 0; padding-left: 20px;">
                            ${nextSteps}
                        </ol>
                    </div>
                    
                    <hr>
                    <p style="color: #666;">Kodak Logistics - Your KNUST Storage Partner</p>
                    <p>📞 WhatsApp: +233545025296 | 📧 Email: ${process.env.EMAIL_USER}</p>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log('✅ Return status update email sent to customer');
    } catch (error) {
        console.error('❌ Return status update email error:', error);
    }
}

module.exports = {
    sendAdminNotification,
    sendCustomerConfirmation,
    sendPaymentVerificationEmail,
    sendReturnRequestConfirmation,
    sendReturnRequestNotification,
    sendReturnStatusUpdateEmail
};