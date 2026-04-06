// backend/utils/email.js
const nodemailer = require('nodemailer');

// Create transporter (using Gmail - free)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'Philiptesimbo@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
    }
});

// Send booking confirmation to admin
async function sendAdminNotification(booking) {
    try {
        console.log("📧 Sending admin email...");
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.ADMIN_EMAIL || 'Philiptesimbo@gmail.com',
            subject: `📦 New Booking: ${booking.customer_name}`,
            html: `
                <h2>New Storage Booking Received!</h2>
                <p><strong>Name:</strong> ${booking.customer_name}</p>
                <p><strong>Phone:</strong> ${booking.customer_phone}</p>
                <p><strong>Email:</strong> ${booking.customer_email}</p>
                <p><strong>Hostel:</strong> ${booking.hostel_name}</p>
                <p><strong>Pickup Date:</strong> ${booking.booking_date} at ${booking.booking_time}</p>
                <p><strong>Items:</strong> ${booking.items_summary}</p>
                <p><strong>Total:</strong> ₵${booking.total_amount}</p>
                <p><strong>Status:</strong> ${booking.status}</p>
                <hr>
                <p><a href="http://localhost:5500/admin">Click here to manage</a></p>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log('✅ Admin email sent');
    } catch (error) {
        console.error('❌ Admin email error:', error);
    }
}

// Send confirmation to customer
async function sendCustomerConfirmation(booking) {
    try {
        console.log("📧 Sending customer email...");
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: booking.customer_email,
            subject: '✅ Your Kodak Logistics Booking Confirmation',
            html: `
                <h2>Thank you for booking with Kodak Logistics!</h2>
                <p>Hi ${booking.customer_name},</p>
                <p>We've received your storage booking request. Here are the details:</p>
                
                <table style="border-collapse: collapse; width: 100%;">
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
                        <td style="padding: 8px; border: 1px solid #ddd;"><strong>Total:</strong></td>
                        <td style="padding: 8px; border: 1px solid #ddd;">₵${booking.total_amount}</td>
                    </tr>
                </table>
                
                <p>We'll confirm your pickup soon via WhatsApp or call.</p>
                <p>If you have any questions, reply to this email or WhatsApp us at +233545025296</p>
                
                <hr>
                <p style="color: #666;">Kodak Logistics - Your KNUST Storage Partner</p>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log('✅ Customer email sent');
    } catch (error) {
        console.error('❌ Customer email error:', error);
    }
}

module.exports = {
    sendAdminNotification,
    sendCustomerConfirmation
};