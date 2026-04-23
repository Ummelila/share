import React from "react";
import "../styles/Terms.css";

function Terms() {
  return (
    <div className="terms-container">
      <div className="terms-hero">
        <h1>Terms & Conditions</h1>
        <p className="terms-subtitle">Last Updated: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="terms-content">
        <section className="terms-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using Share For Good ("the Platform"), you accept and agree to be bound
            by the terms and provision of this agreement. If you do not agree to these Terms, please
            do not use our Platform.
          </p>
        </section>

        <section className="terms-section">
          <h2>2. Use of the Platform</h2>
          <h3>2.1 Eligibility</h3>
          <p>
            You must be at least 18 years old to use this Platform. By using the Platform, you
            represent and warrant that you are at least 18 years of age.
          </p>

          <h3>2.2 Account Registration</h3>
          <p>
            You agree to provide accurate, current, and complete information during the registration
            process. You are responsible for maintaining the confidentiality of your account
            credentials and for all activities that occur under your account.
          </p>

          <h3>2.3 User Responsibilities</h3>
          <ul>
            <li>You agree to use the Platform only for lawful purposes</li>
            <li>You will not use the Platform to violate any laws or regulations</li>
            <li>You will not impersonate any person or entity</li>
            <li>You will not upload malicious code or viruses</li>
            <li>You will not interfere with the Platform's operation</li>
          </ul>
        </section>

        <section className="terms-section">
          <h2>3. Donations</h2>
          <h3>3.1 Cash Donations</h3>
          <p>
            All cash donations are final. Donations are processed through bank transfers, and you
            are responsible for ensuring the accuracy of transfer details. We are not responsible
            for any errors in bank transfers made by donors.
          </p>

          <h3>3.2 Product Donations</h3>
          <p>
            Product donations must be in good condition and legal to donate. All products are
            subject to admin review and approval. We reserve the right to reject any product
            donation that does not meet our standards.
          </p>

          <h3>3.3 Donation Refunds</h3>
          <p>
            Donations are generally non-refundable. In exceptional circumstances, refund requests
            will be reviewed on a case-by-case basis by our admin team.
          </p>
        </section>

        <section className="terms-section">
          <h2>4. Requests</h2>
          <h3>4.1 Request Eligibility</h3>
          <p>
            Recipients must be verified through our document verification process before they can
            make requests. Verification is subject to admin approval.
          </p>

          <h3>4.2 Request Approval</h3>
          <p>
            All requests are subject to admin review and approval. We reserve the right to approve
            or reject any request at our discretion. Approved requests will be fulfilled based on
            available resources.
          </p>
        </section>

        <section className="terms-section">
          <h2>5. Bidding System</h2>
          <h3>5.1 Bidding Rules</h3>
          <ul>
            <li>Bids are binding and cannot be cancelled once placed</li>
            <li>You must bid higher than the current highest bid</li>
            <li>Bidding ends at the specified end date and time</li>
            <li>The highest bidder at the end time wins the auction</li>
          </ul>

          <h3>5.2 Payment and Delivery</h3>
          <p>
            Winners must complete payment within 48 hours of winning. Payment verification is
            required before delivery. Delivery will be arranged after payment verification.
          </p>
        </section>

        <section className="terms-section">
          <h2>6. Privacy and Data</h2>
          <p>
            Your use of the Platform is also governed by our Privacy Policy. Please review our
            Privacy Policy to understand our practices regarding your personal information.
          </p>
        </section>

        <section className="terms-section">
          <h2>7. Intellectual Property</h2>
          <p>
            All content on the Platform, including text, graphics, logos, and software, is the
            property of Share For Good and is protected by copyright and other intellectual
            property laws.
          </p>
        </section>

        <section className="terms-section">
          <h2>8. Limitation of Liability</h2>
          <p>
            Share For Good is provided "as is" without warranties of any kind. We are not liable
            for any damages arising from your use of the Platform, including but not limited to
            direct, indirect, incidental, or consequential damages.
          </p>
        </section>

        <section className="terms-section">
          <h2>9. Termination</h2>
          <p>
            We reserve the right to terminate or suspend your account at any time, with or without
            cause or notice, for any reason, including violation of these Terms.
          </p>
        </section>

        <section className="terms-section">
          <h2>10. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. Changes will be effective
            immediately upon posting. Your continued use of the Platform after changes constitutes
            acceptance of the new Terms.
          </p>
        </section>

        <section className="terms-section">
          <h2>11. Contact Information</h2>
          <p>
            If you have any questions about these Terms, please contact us at:
            <br />
            Email: support@shareforgood.com
            <br />
            Phone: +92 300 1234567
          </p>
        </section>
      </div>
    </div>
  );
}

export default Terms;

