import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../styles/Help.css";

function Help() {
  const [openSection, setOpenSection] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const faqSections = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: "▶",
      questions: [
        {
          q: "How do I create an account?",
          a: "Click on 'Sign Up' in the navigation bar, fill in your details (name, email, phone, password), and submit the form. You'll receive a confirmation email to verify your account.",
        },
        {
          q: "What's the difference between a donor and recipient?",
          a: "A donor is someone who wants to give help (cash or products). A recipient is someone who needs help and can request donations. You can be both!",
        },
        {
          q: "Do I need to verify my account?",
          a: "Recipients need to verify their account by submitting documents (affidavit) to request donations. Donors can donate immediately after signing up.",
        },
      ],
    },
    {
      id: "donations",
      title: "Making Donations",
      icon: "$",
      questions: [
        {
          q: "How do I donate cash?",
          a: "Go to Dashboard → 'Make a Donation' → Select 'Donate Cash'. Enter the amount, select a category, add a message, and submit. You'll receive bank details for transfer and can upload a receipt.",
        },
        {
          q: "How do I donate products?",
          a: "Go to Dashboard → 'Make a Donation' → Select 'Donate Product'. Upload a product image, select category, add description, and submit. Admin will review and approve your donation.",
        },
        {
          q: "How long does it take for my donation to be approved?",
          a: "Admin reviews donations typically within 24-48 hours. You'll receive a notification once your donation is approved or rejected.",
        },
        {
          q: "Can I donate anonymously?",
          a: "Currently, donations are linked to your account. However, recipient information is kept private and secure.",
        },
      ],
    },
    {
      id: "requests",
      title: "Requesting Help",
      icon: "◫",
      questions: [
        {
          q: "How do I request cash assistance?",
          a: "First, verify your documents (Dashboard → 'Verify Documents'). Once verified, go to Dashboard → 'Request Donation' → Select 'Cash Request'. Fill in the amount, purpose, and upload proof of need.",
        },
        {
          q: "How do I request a product?",
          a: "After verification, go to Dashboard → 'Browse Products' to see available products. Click on a product and select 'Request This Product'. Fill in your reason for requesting.",
        },
        {
          q: "How long does it take for my request to be approved?",
          a: "Admin reviews requests typically within 24-48 hours. You'll receive a notification once your request is approved or rejected.",
        },
        {
          q: "What if my request is rejected?",
          a: "You'll receive a notification with the rejection reason. You can review the reason and submit a new request if needed.",
        },
      ],
    },
    {
      id: "bidding",
      title: "Bidding System",
      icon: "◈",
      questions: [
        {
          q: "What is the bidding system?",
          a: "Unique and valuable products are put up for bidding. Users can place bids, and the highest bidder wins the product. Proceeds support the platform's mission.",
        },
        {
          q: "How do I place a bid?",
          a: "Go to 'Live Bidding' page, browse products, click 'View Details', and then 'Place Bid'. Enter an amount higher than the current highest bid.",
        },
        {
          q: "What happens if I win a bid?",
          a: "You'll receive a notification. Admin will verify your payment, and then arrange delivery of the product to you.",
        },
        {
          q: "Can I cancel my bid?",
          a: "Bids cannot be cancelled once placed. Please bid responsibly.",
        },
      ],
    },
    {
      id: "account",
      title: "Account & Profile",
      icon: "i",
      questions: [
        {
          q: "How do I update my profile?",
          a: "Click on your name in the Dashboard navbar, or go to '/profile'. You can edit your name and email in the Profile tab.",
        },
        {
          q: "How do I change my password?",
          a: "Go to Profile → Settings tab → Click 'Change Password'. Enter your current password and new password.",
        },
        {
          q: "I forgot my password. What should I do?",
          a: "Click 'Forgot Password' on the login page. Enter your email, and you'll receive a reset link.",
        },
        {
          q: "How do I delete my account?",
          a: "Currently, account deletion is handled by admin. Please contact support for account deletion requests.",
        },
      ],
    },
    {
      id: "technical",
      title: "Technical Support",
      icon: "⚙",
      questions: [
        {
          q: "I'm having trouble uploading images. What should I do?",
          a: "Make sure your image is in JPG, PNG, or GIF format and under 5MB. Try using a different browser or clearing your cache.",
        },
        {
          q: "I'm not receiving notifications. Why?",
          a: "Check your notification settings in the Dashboard. Make sure notifications are enabled in your browser settings as well.",
        },
        {
          q: "The page is not loading. What can I do?",
          a: "Try refreshing the page, clearing your browser cache, or using a different browser. If the problem persists, contact support.",
        },
        {
          q: "How do I report a bug?",
          a: "Use the Contact Us page to report bugs. Include details about what happened, what you were trying to do, and any error messages.",
        },
      ],
    },
  ];

  const toggleSection = (sectionId) => {
    setOpenSection(openSection === sectionId ? null : sectionId);
  };

  // Filter FAQ sections and questions based on search term
  const filterFAQs = () => {
    if (!searchTerm.trim()) {
      return faqSections;
    }

    const searchLower = searchTerm.toLowerCase();
    return faqSections
      .map((section) => {
        const filteredQuestions = section.questions.filter(
          (item) =>
            item.q.toLowerCase().includes(searchLower) ||
            item.a.toLowerCase().includes(searchLower) ||
            section.title.toLowerCase().includes(searchLower)
        );
        return {
          ...section,
          questions: filteredQuestions,
        };
      })
      .filter((section) => section.questions.length > 0);
  };

  const filteredSections = filterFAQs();

  // Auto-expand sections when searching
  useEffect(() => {
    if (searchTerm.trim() && filteredSections.length > 0) {
      // Auto-expand the first matching section
      if (!openSection || !filteredSections.find((s) => s.id === openSection)) {
        setOpenSection(filteredSections[0].id);
      }
    }
    // Don't auto-close when search is empty - let user manually control sections
  }, [searchTerm]);

  return (
    <div className="help-container">
      <div className="help-hero">
        <h1>Help & FAQ</h1>
        <p className="help-subtitle">Find answers to common questions</p>
      </div>

      <div className="help-content">
        <div className="help-search-box">
          <input
            type="text"
            placeholder="Search for help..."
            className="help-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <i className="ri-search-line help-search-icon"></i>
          {searchTerm && (
            <button
              className="help-clear-search-btn"
              onClick={() => setSearchTerm("")}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {filteredSections.length === 0 && searchTerm.trim() ? (
          <div className="no-results">
            <i className="ri-search-line"></i>
            <h3>No results found</h3>
            <p>Try searching with different keywords or browse the categories below.</p>
          </div>
        ) : (
          <div className="faq-sections">
            {filteredSections.map((section) => (
            <div key={section.id} className="faq-section">
              <button
                className="faq-section-header"
                onClick={() => toggleSection(section.id)}
              >
                <span className="section-icon">{section.icon}</span>
                <h2>{section.title}</h2>
                <span className="toggle-icon">
                  {openSection === section.id ? "−" : "+"}
                </span>
              </button>
              {openSection === section.id && (
                <div className="faq-questions">
                  {section.questions.map((item, index) => (
                    <div key={index} className="faq-item">
                      <h3 className="faq-question">Q: {item.q}</h3>
                      <p className="faq-answer">A: {item.a}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          </div>
        )}

        <div className="help-cta">
          <h2>Still Need Help?</h2>
          <p>Can't find what you're looking for? We're here to help!</p>
          <Link to="/contact" className="btn btn-primary">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Help;

