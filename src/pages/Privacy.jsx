import React from "react";
import "../styles/Privacy.css";

function Privacy() {
  return (
    <div className="privacy-container">
      <div className="privacy-hero">
        <h1>Privacy Policy</h1>
        <p className="privacy-subtitle">Last Updated: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="privacy-content">
        <section className="privacy-section">
          <h2>1. Introduction</h2>
          <p>
            Share For Good ("we," "our," or "us") is committed to protecting your privacy. This
            Privacy Policy explains how we collect, use, disclose, and safeguard your information
            when you use our Platform.
          </p>
        </section>

        <section className="privacy-section">
          <h2>2. Information We Collect</h2>
          <h3>2.1 Personal Information</h3>
          <p>We collect information that you provide directly to us, including:</p>
          <ul>
            <li>Name, email address, and phone number</li>
            <li>Account credentials (password)</li>
            <li>Verification documents (affidavit, proof of need)</li>
            <li>Donation and request details</li>
            <li>Payment and transaction information</li>
          </ul>

          <h3>2.2 Automatically Collected Information</h3>
          <p>We may automatically collect certain information when you use our Platform:</p>
          <ul>
            <li>IP address and device information</li>
            <li>Browser type and version</li>
            <li>Pages visited and time spent on pages</li>
            <li>Date and time of access</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve our Platform</li>
            <li>Process donations and requests</li>
            <li>Verify user accounts and documents</li>
            <li>Send notifications and updates</li>
            <li>Respond to your inquiries and support requests</li>
            <li>Detect and prevent fraud or abuse</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>4. Information Sharing and Disclosure</h2>
          <h3>4.1 With Admin Users</h3>
          <p>
            Admin users have access to your information for the purpose of reviewing and approving
            donations, requests, and verifications.
          </p>

          <h3>4.2 With Other Users</h3>
          <p>
            Limited information (such as name) may be visible to other users in certain contexts,
            such as bidding winners or donation acknowledgments. Your contact information is never
            shared with other users without your consent.
          </p>

          <h3>4.3 Service Providers</h3>
          <p>
            We may share information with third-party service providers who assist us in operating
            the Platform, such as hosting, analytics, and email services.
          </p>

          <h3>4.4 Legal Requirements</h3>
          <p>
            We may disclose your information if required by law or in response to valid legal
            requests.
          </p>
        </section>

        <section className="privacy-section">
          <h2>5. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal
            information. However, no method of transmission over the internet is 100% secure. While
            we strive to protect your information, we cannot guarantee absolute security.
          </p>
        </section>

        <section className="privacy-section">
          <h2>6. Data Retention</h2>
          <p>
            We retain your personal information for as long as necessary to fulfill the purposes
            outlined in this Privacy Policy, unless a longer retention period is required by law.
          </p>
        </section>

        <section className="privacy-section">
          <h2>7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal information</li>
            <li>Update or correct your information</li>
            <li>Request deletion of your account</li>
            <li>Opt-out of certain communications</li>
            <li>Request a copy of your data</li>
          </ul>
          <p>
            To exercise these rights, please contact us at support@shareforgood.com
          </p>
        </section>

        <section className="privacy-section">
          <h2>8. Cookies and Tracking</h2>
          <p>
            We use cookies and similar tracking technologies to track activity on our Platform and
            hold certain information. You can instruct your browser to refuse all cookies or to
            indicate when a cookie is being sent.
          </p>
        </section>

        <section className="privacy-section">
          <h2>9. Children's Privacy</h2>
          <p>
            Our Platform is not intended for users under the age of 18. We do not knowingly collect
            personal information from children. If you believe we have collected information from a
            child, please contact us immediately.
          </p>
        </section>

        <section className="privacy-section">
          <h2>10. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes
            by posting the new Privacy Policy on this page and updating the "Last Updated" date.
          </p>
        </section>

        <section className="privacy-section">
          <h2>11. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at:
            <br />
            Email: support@shareforgood.com
            <br />
            Phone: +92 300 1234567
            <br />
            Address: 123 Charity Street, Karachi, Pakistan
          </p>
        </section>
      </div>
    </div>
  );
}

export default Privacy;

