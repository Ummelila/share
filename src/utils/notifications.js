import { supabase } from "../supabaseClient";

/**
 * Create a notification in the database
 */
export const createNotification = async (userId, type, title, message, relatedId = null, rejectionReason = null) => {
  try {
    // Ensure user_id is BIGINT (convert string to number if needed)
    const userIdNum = typeof userId === 'string' ? parseInt(userId) : userId;
    const relatedIdNum = relatedId && (typeof relatedId === 'string' ? parseInt(relatedId) : relatedId);
    
    console.log("Creating notification:", { userId: userIdNum, type, title, relatedId: relatedIdNum, rejectionReason });
    
    const notificationData = {
      user_id: userIdNum,
      type: type, // 'request_approved', 'request_rejected', 'donation_approved', 'donation_rejected', 'verification_approved', 'verification_rejected'
      title: title,
      message: message,
      related_id: relatedIdNum,
      is_read: false,
    };

    // Add rejection_reason if provided (store as JSON in message or separate field)
    // Since we might not have a rejection_reason column, we'll append it to message for now
    // Or store it in a way that can be parsed
    if (rejectionReason) {
      notificationData.rejection_reason = rejectionReason;
    }
    
    const { data, error } = await supabase.from("notifications").insert([notificationData]).select();

    if (error) {
      console.error("Error creating notification:", error);
      return false;
    }
    
    console.log("Notification created successfully:", data);
    return true;
  } catch (error) {
    console.error("Error creating notification:", error);
    return false;
  }
};

/**
 * Send email notification using EmailJS
 * Note: EmailJS is optional - install with: npm install @emailjs/browser
 * Then add to .env: REACT_APP_EMAILJS_SERVICE_ID, REACT_APP_EMAILJS_TEMPLATE_ID, REACT_APP_EMAILJS_PUBLIC_KEY
 */
export const sendEmailNotification = async (userEmail, userName, type, details) => {
  // Check if EmailJS is configured
  try {
    // Try to dynamically import EmailJS if available
    const emailjs = await import("@emailjs/browser").catch(() => null);
    
    if (!emailjs || !process.env.REACT_APP_EMAILJS_SERVICE_ID) {
      console.log("EmailJS not configured, skipping email notification");
      return false;
    }

    // Initialize EmailJS if public key is available
    if (process.env.REACT_APP_EMAILJS_PUBLIC_KEY) {
      emailjs.init(process.env.REACT_APP_EMAILJS_PUBLIC_KEY);
    }

    const emailTemplates = {
      request_approved: {
        subject: "✅ Your Request Has Been Approved!",
        body: `Dear ${userName},\n\nGreat news! Your cash request has been approved by the admin.\n\nDetails:\n${details}\n\nThank you for using Share For Good!`,
      },
      request_rejected: {
        subject: "❌ Request Status Update",
        body: `Dear ${userName},\n\nWe regret to inform you that your cash request has been rejected.\n\nDetails:\n${details}\n\nIf you have any questions, please contact support.\n\nThank you for using Share For Good!`,
      },
      donation_approved: {
        subject: "✅ Your Donation Has Been Approved!",
        body: `Dear ${userName},\n\nThank you! Your donation has been approved and processed.\n\nDetails:\n${details}\n\nYour generosity makes a difference!\n\nThank you for using Share For Good!`,
      },
      donation_rejected: {
        subject: "❌ Donation Status Update",
        body: `Dear ${userName},\n\nWe regret to inform you that your donation has been rejected.\n\nDetails:\n${details}\n\nIf you have any questions, please contact support.\n\nThank you for using Share For Good!`,
      },
      verification_approved: {
        subject: "✅ Account Verified Successfully!",
        body: `Dear ${userName},\n\nCongratulations! Your account has been verified.\n\nYou can now submit requests for donations.\n\nThank you for using Share For Good!`,
      },
      verification_rejected: {
        subject: "❌ Verification Status Update",
        body: `Dear ${userName},\n\nWe regret to inform you that your verification request has been rejected.\n\nPlease resubmit your documents for verification.\n\nThank you for using Share For Good!`,
      },
    };

    const template = emailTemplates[type];
    if (!template) {
      console.error("Unknown notification type:", type);
      return false;
    }

    await emailjs.send(
      process.env.REACT_APP_EMAILJS_SERVICE_ID,
      process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
      {
        to_email: userEmail,
        to_name: userName,
        subject: template.subject,
        message: template.body,
      }
    );

    return true;
  } catch (error) {
    // EmailJS not installed or not configured - this is fine, just log and continue
    console.log("Email notification skipped:", error.message);
    return false;
  }
};

/**
 * Create notification and send email
 */
export const notifyUser = async (userId, userEmail, userName, type, title, message, details, relatedId = null, rejectionReason = null) => {
  // Create dashboard notification
  await createNotification(userId, type, title, message, relatedId, rejectionReason);

  // Send email notification (optional, won't fail if not configured)
  // Include rejection reason in email details if provided
  const emailDetails = rejectionReason ? `${details}\n\nRejection Reason: ${rejectionReason}` : details;
  await sendEmailNotification(userEmail, userName, type, emailDetails);
};

