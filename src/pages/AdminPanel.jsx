import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "../styles/AdminPanel.css";
import { notifyUser } from "../utils/notifications";
import { X, RefreshCw, CheckCheck, AlertCircle, ArrowUpDown, Bell } from "lucide-react";
import CustomDropdown from "../components/CustomDropdown";
import Summary from "../components/Summary";

function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("verifications");
  const [verifications, setVerifications] = useState([]);
  const [cashRequests, setCashRequests] = useState([]);
  const [cashDonations, setCashDonations] = useState([]);
  const [productDonations, setProductDonations] = useState([]);
  const [productRequests, setProductRequests] = useState([]);
  const [biddingProducts, setBiddingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', message }
  const [isLoading, setIsLoading] = useState(false); // Prevent duplicate loads
  const [submittingId, setSubmittingId] = useState(null); // Track which item is being submitted
  const [showBiddingModal, setShowBiddingModal] = useState(false);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [showAdminNotifications, setShowAdminNotifications] = useState(false);

  // Search and filter states for each tab
  const [verificationSearch, setVerificationSearch] = useState("");
  const [verificationStatusFilter, setVerificationStatusFilter] = useState("all");
  const [cashRequestSearch, setCashRequestSearch] = useState("");
  const [cashRequestStatusFilter, setCashRequestStatusFilter] = useState("all");
  const [cashDonationSearch, setCashDonationSearch] = useState("");
  const [cashDonationStatusFilter, setCashDonationStatusFilter] = useState("all");
  const [productDonationSearch, setProductDonationSearch] = useState("");
  const [productDonationStatusFilter, setProductDonationStatusFilter] = useState("all");
  const [productDonationCategoryFilter, setProductDonationCategoryFilter] = useState("all");
  const [productRequestSearch, setProductRequestSearch] = useState("");
  const [productRequestStatusFilter, setProductRequestStatusFilter] = useState("all");
  const [biddingSearch, setBiddingSearch] = useState("");
  const [biddingStatusFilter, setBiddingStatusFilter] = useState("all");
  const [biddingSortBy, setBiddingSortBy] = useState("newest");
  const [selectedProductForBidding, setSelectedProductForBidding] = useState(null);

  // Filter visibility states for each tab
  const [showCashDonationFilters, setShowCashDonationFilters] = useState(false);
  const [showProductDonationFilters, setShowProductDonationFilters] = useState(false);
  const [showProductRequestFilters, setShowProductRequestFilters] = useState(false);
  const [showBiddingFilters, setShowBiddingFilters] = useState(false);

  // Sorting states for all sections
  const [verificationSortBy, setVerificationSortBy] = useState("newest");
  const [cashRequestSortBy, setCashRequestSortBy] = useState("newest");
  const [cashDonationSortBy, setCashDonationSortBy] = useState("newest");
  const [productDonationSortBy, setProductDonationSortBy] = useState("newest");
  const [productRequestSortBy, setProductRequestSortBy] = useState("newest");
  const [biddingFormData, setBiddingFormData] = useState({
    startingPrice: "",
    bidStartDate: "",
    bidEndDate: "",
  });
  const [biddingLoading, setBiddingLoading] = useState(false);

  const sortByStatus = (items) => {  // store verification requests, cash requests, donations
    const priority = { pending: 0, approved: 1, rejected: 2 };

    return [...items].sort((a, b) => {
      const aPriority = priority[a.status] ?? 3;
      const bPriority = priority[b.status] ?? 3;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // For same status, show newest first
      return new Date(b.created_at) - new Date(a.created_at);
    });
  };

  // Sorting function for all sections
  const sortItems = (items, sortBy) => {
    const sorted = [...items];

    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.created_at || b.bid_start_date) - new Date(a.created_at || a.bid_start_date));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.created_at || a.bid_start_date) - new Date(b.created_at || b.bid_start_date));
      case 'name-asc':
        return sorted.sort((a, b) => {
          const nameA = (a.user_name || a.product_name || '').toLowerCase();
          const nameB = (b.user_name || b.product_name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
      case 'name-desc':
        return sorted.sort((a, b) => {
          const nameA = (a.user_name || a.product_name || '').toLowerCase();
          const nameB = (b.user_name || b.product_name || '').toLowerCase();
          return nameB.localeCompare(nameA);
        });
      case 'status':
        return sortByStatus(sorted);
      default:
        return sorted;
    }
  };

  // Load all data function - load verifications separately to avoid blocking
  const loadAllData = async () => {
    // Prevent duplicate loads
    if (isLoading) {
      console.log("⏸️ Load already in progress, skipping...");
      return;
    }

    setIsLoading(true);
    setLoading(true);
    console.log("🔄 Starting data load...");

    try {
      // Helper function to add timeout to each query
      const queryWithTimeout = async (queryPromise, timeoutMs = 10000) => {
        return Promise.race([
          queryPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Query timeout after 10s")), timeoutMs)
          )
        ]);
      };

      // Start ALL queries in parallel (including verifications)
      // But only wait for the fast ones, verifications loads in background
      const [reqRes, donRes, prodRes, prodReqRes, bidRes] = await Promise.allSettled([
        queryWithTimeout(supabase.from("cash_requests").select("*").order("created_at", { ascending: false }), 10000),
        queryWithTimeout(supabase.from("cash_donations").select("*").order("created_at", { ascending: false }), 10000),
        queryWithTimeout(supabase.from("product_donations").select("*").order("created_at", { ascending: false }), 10000),
        queryWithTimeout(supabase.from("product_requests").select("*").order("created_at", { ascending: false }), 10000),
        queryWithTimeout(supabase.from("bidding_products").select("*").order("created_at", { ascending: false }), 10000),
      ]);

      // Start verifications query immediately (don't wait for it)
      loadVerificationsSeparately();

      console.log("✅ Other queries completed");

      // Process cash requests
      if (reqRes.status === "fulfilled" && !reqRes.value.error) {
        setCashRequests(sortByStatus(reqRes.value.data || []));
        console.log("✅ Cash Requests:", reqRes.value.data?.length || 0);
      } else {
        const error = reqRes.status === "fulfilled" ? reqRes.value.error : reqRes.reason;
        console.error("❌ Error loading cash requests:", error);
        setCashRequests([]);
      }

      // Process cash donations
      if (donRes.status === "fulfilled" && !donRes.value.error) {
        setCashDonations(sortByStatus(donRes.value.data || []));
        console.log("✅ Cash Donations:", donRes.value.data?.length || 0);
      } else {
        const error = donRes.status === "fulfilled" ? donRes.value.error : donRes.reason;
        console.error("❌ Error loading cash donations:", error);
        setCashDonations([]);
      }

      // Process product donations
      if (prodRes.status === "fulfilled" && !prodRes.value.error) {
        setProductDonations(sortByStatus(prodRes.value.data || []));
        console.log("✅ Product Donations:", prodRes.value.data?.length || 0);
      } else {
        const error = prodRes.status === "fulfilled" ? prodRes.value.error : prodRes.reason;
        console.error("❌ Error loading product donations:", error);
        setProductDonations([]);
      }

      // Process product requests
      if (prodReqRes.status === "fulfilled" && !prodReqRes.value.error) {
        setProductRequests(sortByStatus(prodReqRes.value.data || []));
        console.log("✅ Product Requests:", prodReqRes.value.data?.length || 0);
      } else {
        const error = prodReqRes.status === "fulfilled" ? prodReqRes.value.error : prodReqRes.reason;
        console.error("❌ Error loading product requests:", error);
        setProductRequests([]);
      }

      // Process bidding products
      if (bidRes.status === "fulfilled" && !bidRes.value.error) {
        setBiddingProducts(bidRes.value.data || []);
        console.log("✅ Bidding Products:", bidRes.value.data?.length || 0);
      } else {
        const error = bidRes.status === "fulfilled" ? bidRes.value.error : bidRes.reason;
        console.error("❌ Error loading bidding products:", error);
        setBiddingProducts([]);
      }

      // Hide loading spinner - other data is ready
      setLoading(false);
      setIsLoading(false);
      console.log("✅ Other data loaded successfully");
    } catch (error) {
      console.error("❌ Fatal error loading data:", error);
      setFeedback({
        type: "error",
        message: error.message || "Error loading data. Please refresh the page."
      });
      // Set empty arrays so UI doesn't stay in loading state
      setCashRequests([]);
      setCashDonations([]);
      setProductDonations([]);
      setProductRequests([]);
      setBiddingProducts([]);
      setLoading(false);
      setIsLoading(false);
    }
  };

  // Load verifications separately - handle JSON parse errors from malformed data
  const loadVerificationsSeparately = async () => {
    try {
      console.log("🔄 Loading verifications...");

      // Try loading with specific columns first (avoid problematic text fields)
      // If that fails, try loading all with limit
      let result = await supabase
        .from("verification_requests")
        .select("id, user_id, user_name, user_email, status, created_at, affidavit_name, affidavit_url, reason")
        .order("created_at", { ascending: false });

      if (result.error) {
        console.warn("⚠️ Error with specific columns, trying with limit...");
        // Try with a limit to get at least some data
        result = await supabase
          .from("verification_requests")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
      }

      if (result.error) {
        console.error("❌ Error loading verifications:", result.error);
        console.error("❌ Error message:", result.error.message);

        // If it's a JSON parse error, there's malformed data in the table
        if (result.error.message && result.error.message.includes("JSON")) {
          console.error("⚠️ JSON parse error detected - there's malformed data in verification_requests table");
          console.error("⚠️ You need to fix the data in Supabase - check for unescaped quotes in text fields");
          setFeedback({
            type: "error",
            message: "Error loading verifications: Malformed data in database. Please check verification_requests table in Supabase."
          });
        }
        setVerifications([]);
        return;
      }

      if (!result.data) {
        console.warn("⚠️ No data returned from verifications query");
        setVerifications([]);
        return;
      }

      console.log("✅ Verifications loaded:", result.data.length, "items");
      const sorted = sortByStatus(result.data);
      setVerifications(sorted);
      console.log("✅ Verifications set in state, count:", sorted.length);
    } catch (error) {
      console.error("❌ Exception loading verifications:", error);
      console.error("❌ Error message:", error.message);

      if (error.message && error.message.includes("JSON")) {
        setFeedback({
          type: "error",
          message: "Error loading verifications: Malformed JSON data in database. Please check verification_requests table."
        });
      }
      setVerifications([]);
    }
  };

  const loadAdminNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("type", "bank_details_submitted")
        .order("created_at", { ascending: false });
      if (!error && data) {
        setAdminNotifications(data);
      }
    } catch (err) {
      console.error('Error loading admin notifications', err);
    }
  };

  const markAdminNotificationAsRead = async (id) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (!error) {
        setAdminNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // Check authentication
    const storedAdmin = localStorage.getItem("adminUser");
    if (!storedAdmin) {
      navigate("/admin");
      return;
    }

    // Load all data on mount
    loadAllData();
    loadAdminNotifications();
    const notifInterval = setInterval(loadAdminNotifications, 30000);

    return () => clearInterval(notifInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAdminNotifications && !event.target.closest('[data-notification-dropdown]')) {
        setShowAdminNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAdminNotifications]);

  // Reload functions for after actions (approve/reject)
  const reloadVerifications = async () => {
    const { data, error } = await supabase
      .from("verification_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setVerifications(sortByStatus(data || []));
  };

  const reloadCashRequests = async () => {
    const { data, error } = await supabase
      .from("cash_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setCashRequests(sortByStatus(data || []));
  };

  const reloadCashDonations = async () => {
    const { data, error } = await supabase
      .from("cash_donations")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setCashDonations(sortByStatus(data || []));
  };

  const reloadProductDonations = async () => {
    const { data, error } = await supabase
      .from("product_donations")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setProductDonations(sortByStatus(data || []));
  };

  const reloadProductRequests = async () => {
    const { data, error } = await supabase
      .from("product_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setProductRequests(sortByStatus(data || []));
  };

  const getSignedUrl = async (filePath) => {
    try {
      const { data, error } = await supabase.storage
        .from("verification-documents")
        .createSignedUrl(filePath, 3600);

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error("Error getting signed URL:", error);
      return null;
    }
  };

  const [viewingDocument, setViewingDocument] = useState(null);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(null); // { type: 'verification'|'request'|'donation', id: number, name: string }
  const [rejectionReason, setRejectionReason] = useState("");

  const handleViewDocument = async (filePath, fileName) => {
    setDocumentLoading(true);
    setViewingDocument(fileName);
    const url = await getSignedUrl(filePath);
    setDocumentUrl(url);
    setDocumentLoading(false);
  };

  const closeDocumentViewer = () => {
    setViewingDocument(null);
    setDocumentUrl(null);
    setDocumentLoading(false);
  };

  const DocumentViewer = ({ filePath, fileName, label = "View Document" }) => {
    return (
      <button
        className="btn-view-document"
        onClick={() => handleViewDocument(filePath, fileName)}
      >
        📄 {label}
      </button>
    );
  };

  const handleApprove = async (request) => {
    const actionId = `verify-${request.id}`;
    try {
      setSubmittingId(actionId);
      const { error: userError } = await supabase
        .from("users")
        .update({ is_verified: true })
        .eq("id", request.user_id);

      if (userError) throw userError;

      const { error: reqError } = await supabase
        .from("verification_requests")
        .update({ status: "approved" })
        .eq("id", request.id);

      if (reqError) throw reqError;

      // Create notification and send email
      await notifyUser(
        request.user_id,
        request.user_email,
        request.user_name,
        "verification_approved",
        "Account Verified",
        "Your account has been verified successfully. You can now submit requests for donations.",
        "Your verification documents have been approved.",
        request.id
      );

      setFeedback({ type: "success", message: "User verified successfully." });
      reloadVerifications();
    } catch (error) {
      setFeedback({ type: "error", message: "Error verifying user: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReject = async (requestId, reason) => {
    const actionId = `verify-${requestId}`;
    try {
      setSubmittingId(actionId);
      // Get request details before updating
      const { data: request } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      const { error } = await supabase
        .from("verification_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;

      // Create notification and send email
      if (request) {
        const message = reason
          ? `Your verification request has been rejected. Reason: ${reason}`
          : "Your verification request has been rejected. Please resubmit your documents.";

        await notifyUser(
          request.user_id,
          request.user_email,
          request.user_name,
          "verification_rejected",
          "Verification Rejected",
          message,
          reason || "Please review your documents and resubmit for verification.",
          requestId,
          reason
        );
      }

      setFeedback({ type: "success", message: "Verification request rejected." });
      setRejectModal(null);
      setRejectionReason("");
      reloadVerifications();
    } catch (error) {
      setFeedback({ type: "error", message: "Error rejecting verification: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleApproveRequest = async (id) => {
    const actionId = `cash-req-${id}`;
    try {
      setSubmittingId(actionId);
      // Get request details before updating
      const { data: request } = await supabase
        .from("cash_requests")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("cash_requests")
        .update({ status: "approved" })
        .eq("id", id);

      if (error) throw error;

      // Create notification and send email
      if (request) {
        await notifyUser(
          request.user_id,
          request.user_email,
          request.user_name,
          "request_approved_bank_details",
          "Request Approved",
          `Your cash request of PKR ${request.amount} has been approved!`,
          `Amount: PKR ${request.amount}\nCategory: ${request.category}\nDescription: ${request.description}\n\nYour request has been processed.`,
          id
        );
      }

      setFeedback({ type: "success", message: "Cash request approved." });
      reloadCashRequests();
    } catch (error) {
      setFeedback({ type: "error", message: "Error approving request: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleRejectRequest = async (id, reason) => {
    const actionId = `cash-req-${id}`;
    try {
      setSubmittingId(actionId);
      // Get request details before updating
      const { data: request } = await supabase
        .from("cash_requests")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("cash_requests")
        .update({ status: "rejected" })
        .eq("id", id);

      if (error) throw error;

      // Create notification and send email
      if (request) {
        const message = reason
          ? `Your cash request of PKR ${request.amount} has been rejected. Reason: ${reason}`
          : `Your cash request of PKR ${request.amount} has been rejected.`;

        await notifyUser(
          request.user_id,
          request.user_email,
          request.user_name,
          "request_rejected",
          "Request Rejected",
          message,
          reason || `Amount: PKR ${request.amount}\nCategory: ${request.category}`,
          id,
          reason
        );
      }

      setFeedback({ type: "success", message: "Cash request rejected." });
      setRejectModal(null);
      setRejectionReason("");
      reloadCashRequests();
    } catch (error) {
      setFeedback({ type: "error", message: "Error rejecting request: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleApproveDonation = async (id) => {
    const actionId = `cash-don-${id}`;
    try {
      setSubmittingId(actionId);
      // Get donation details before updating
      const { data: donation } = await supabase
        .from("cash_donations")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("cash_donations")
        .update({ status: "approved" })
        .eq("id", id);

      if (error) throw error;

      // Create notification and send email
      if (donation) {
        await notifyUser(
          donation.user_id,
          donation.user_email,
          donation.user_name,
          "donation_approved",
          "Donation Approved",
          `Your donation of PKR ${donation.amount} has been approved! Thank you for your generosity.`,
          `Amount: PKR ${donation.amount}\nCategory: ${donation.category}\nMessage: ${donation.message || "N/A"}`,
          id
        );
      }

      setFeedback({ type: "success", message: "Donation approved." });
      reloadCashDonations();
    } catch (error) {
      setFeedback({ type: "error", message: "Error approving donation: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleRejectDonation = async (id, reason) => {
    const actionId = `cash-don-${id}`;
    try {
      setSubmittingId(actionId);
      // Get donation details before updating
      const { data: donation } = await supabase
        .from("cash_donations")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("cash_donations")
        .update({ status: "rejected" })
        .eq("id", id);

      if (error) throw error;

      // Create notification and send email
      if (donation) {
        const message = reason
          ? `Your donation of PKR ${donation.amount} has been rejected. Reason: ${reason}`
          : `Your donation of PKR ${donation.amount} has been rejected.`;

        await notifyUser(
          donation.user_id,
          donation.user_email,
          donation.user_name,
          "donation_rejected",
          "Donation Rejected",
          message,
          reason || `Amount: PKR ${donation.amount}\nCategory: ${donation.category}`,
          id,
          reason
        );
      }

      setFeedback({ type: "success", message: "Donation rejected." });
      setRejectModal(null);
      setRejectionReason("");
      reloadCashDonations();
    } catch (error) {
      setFeedback({ type: "error", message: "Error rejecting donation: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  const openRejectModal = (type, id, name) => {
    setRejectModal({ type, id, name });
    setRejectionReason("");
  };

  const handleApproveProductDonation = async (id) => {
    const actionId = `prod-don-${id}`;
    try {
      setSubmittingId(actionId);
      // Get donation details before updating
      const { data: donation } = await supabase
        .from("product_donations")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("product_donations")
        .update({ status: "approved" })
        .eq("id", id);

      if (error) throw error;

      // Create notification and send email
      if (donation) {
        await notifyUser(
          donation.user_id,
          donation.user_email,
          donation.user_name,
          "donation_approved",
          "Product Donation Approved",
          `Your product donation has been approved! Thank you for your generosity.`,
          `Product: ${donation.product_name || "N/A"}\nCategory: ${donation.category}\nDescription: ${donation.description || "N/A"}`,
          id
        );
      }

      setFeedback({ type: "success", message: "Product donation approved." });
      reloadProductDonations();
    } catch (error) {
      setFeedback({ type: "error", message: "Error approving product donation: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleRejectProductDonation = async (id, reason) => {
    const actionId = `prod-don-${id}`;
    try {
      setSubmittingId(actionId);
      // Get donation details before updating
      const { data: donation } = await supabase
        .from("product_donations")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("product_donations")
        .update({ status: "rejected", rejection_reason: reason })
        .eq("id", id);

      if (error) throw error;

      // Create notification and send email
      if (donation) {
        const message = reason
          ? `Your product donation has been rejected. Reason: ${reason}`
          : `Your product donation has been rejected.`;

        await notifyUser(
          donation.user_id,
          donation.user_email,
          donation.user_name,
          "donation_rejected",
          "Product Donation Rejected",
          message,
          reason || `Product: ${donation.product_name || "N/A"}\nCategory: ${donation.category}`,
          id,
          reason
        );
      }

      setFeedback({ type: "success", message: "Product donation rejected." });
      setRejectModal(null);
      setRejectionReason("");
      reloadProductDonations();
    } catch (error) {
      setFeedback({ type: "error", message: "Error rejecting product donation: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleApproveProductRequest = async (id) => {
    const actionId = `prod-req-${id}`;
    try {
      setSubmittingId(actionId);
      // Get request details before updating
      const { data: request } = await supabase
        .from("product_requests")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("product_requests")
        .update({ status: "approved" })
        .eq("id", id);

      if (error) throw error;

      // Create notification and send email
      if (request) {
        await notifyUser(
          request.user_id,
          request.user_email,
          request.user_name,
          "request_approved",
          "Product Request Approved",
          `Your product request for "${request.product_name}" has been approved!`,
          `Product: ${request.product_name}\nCategory: ${request.product_category}\nReason: ${request.reason}`,
          id
        );
      }

      setFeedback({ type: "success", message: "Product request approved." });
      reloadProductRequests();
    } catch (error) {
      setFeedback({ type: "error", message: "Error approving product request: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleRejectProductRequest = async (id, reason) => {
    const actionId = `prod-req-${id}`;
    try {
      setSubmittingId(actionId);
      // Get request details before updating
      const { data: request } = await supabase
        .from("product_requests")
        .select("*")
        .eq("id", id)
        .single();

      const { error } = await supabase
        .from("product_requests")
        .update({ status: "rejected", rejection_reason: reason })
        .eq("id", id);

      if (error) throw error;

      // Create notification and send email
      if (request) {
        const message = reason
          ? `Your product request for "${request.product_name}" has been rejected. Reason: ${reason}`
          : `Your product request for "${request.product_name}" has been rejected.`;

        await notifyUser(
          request.user_id,
          request.user_email,
          request.user_name,
          "request_rejected",
          "Product Request Rejected",
          message,
          reason || `Product: ${request.product_name}\nCategory: ${request.product_category}`,
          id,
          reason
        );
      }

      setFeedback({ type: "success", message: "Product request rejected." });
      setRejectModal(null);
      setRejectionReason("");
      reloadProductRequests();
    } catch (error) {
      setFeedback({ type: "error", message: "Error rejecting product request: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectModal || !!submittingId) return;

    if (rejectModal.type === "verification") {
      await handleReject(rejectModal.id, rejectionReason);
    } else if (rejectModal.type === "request") {
      await handleRejectRequest(rejectModal.id, rejectionReason);
    } else if (rejectModal.type === "donation") {
      await handleRejectDonation(rejectModal.id, rejectionReason);
    } else if (rejectModal.type === "product-donation") {
      await handleRejectProductDonation(rejectModal.id, rejectionReason);
    } else if (rejectModal.type === "product-request") {
      await handleRejectProductRequest(rejectModal.id, rejectionReason);
    }
  };

  // Bidding Management Functions
  const openBiddingModal = (product) => {
    setSelectedProductForBidding(product);
    setBiddingFormData({
      startingPrice: "",
      bidStartDate: "",
      bidEndDate: "",
    });
    setShowBiddingModal(true);
  };

  const closeBiddingModal = () => {
    setShowBiddingModal(false);
    setSelectedProductForBidding(null);
    setBiddingFormData({
      startingPrice: "",
      bidStartDate: "",
      bidEndDate: "",
    });
  };

  const handleCreateBiddingProduct = async (e) => {
    e.preventDefault();
    if (!selectedProductForBidding) {
      setFeedback({ type: "error", message: "Please select a product first." });
      return;
    }

    if (biddingLoading) return; // Prevent double submission

    setBiddingLoading(true);
    setFeedback(null); // Clear previous feedback

    const adminUser = JSON.parse(localStorage.getItem("adminUser") || "{}");

    // Check if admin user exists in users table, otherwise set to null
    let adminUserId = null;
    if (adminUser && adminUser.id) {
      try {
        const { data: userCheck } = await supabase
          .from("users")
          .select("id")
          .eq("id", adminUser.id)
          .single();
        if (userCheck) {
          adminUserId = adminUser.id;
        }
      } catch (err) {
        console.log("Admin user not found in users table, setting created_by_admin_id to null");
        adminUserId = null; // Explicitly set to null if not found
      }
    }

    try {
      // Validate form
      if (!biddingFormData.startingPrice || parseFloat(biddingFormData.startingPrice) <= 0) {
        setFeedback({ type: "error", message: "Please enter a valid starting price." });
        return;
      }

      if (!biddingFormData.bidStartDate || !biddingFormData.bidEndDate) {
        setFeedback({ type: "error", message: "Please select both start and end dates." });
        return;
      }

      const startDate = new Date(biddingFormData.bidStartDate);
      const endDate = new Date(biddingFormData.bidEndDate);
      const now = new Date();

      if (endDate <= startDate) {
        setFeedback({ type: "error", message: "End date must be after start date." });
        return;
      }

      // Determine initial status
      let status = "upcoming";
      if (startDate <= now && endDate >= now) {
        status = "active";
      } else if (endDate < now) {
        setFeedback({ type: "error", message: "End date cannot be in the past." });
        return;
      }

      // Check if product is already in bidding
      const { data: existing } = await supabase
        .from("bidding_products")
        .select("id")
        .eq("product_donation_id", selectedProductForBidding.id)
        .in("status", ["upcoming", "active"]);

      if (existing && existing.length > 0) {
        setFeedback({ type: "error", message: "This product is already up for bidding." });
        return;
      }

      // Convert datetime-local format to ISO string for Supabase
      const startDateISO = new Date(biddingFormData.bidStartDate).toISOString();
      const endDateISO = new Date(biddingFormData.bidEndDate).toISOString();

      console.log("Creating bidding product with data:", {
        product_donation_id: selectedProductForBidding.id,
        starting_price: parseFloat(biddingFormData.startingPrice),
        bid_start_date: startDateISO,
        bid_end_date: endDateISO,
        status: status,
      });

      // Create bidding product
      const { data, error } = await supabase.from("bidding_products").insert([
        {
          product_donation_id: selectedProductForBidding.id,
          product_name: selectedProductForBidding.product_name || "Unnamed Product",
          product_category: selectedProductForBidding.category,
          product_description: selectedProductForBidding.description,
          product_image_url: selectedProductForBidding.image_url,
          starting_price: parseFloat(biddingFormData.startingPrice),
          current_highest_bid: parseFloat(biddingFormData.startingPrice),
          bid_start_date: startDateISO,
          bid_end_date: endDateISO,
          status: status,
          created_by_admin_id: adminUserId,
        },
      ]).select();

      if (error) {
        console.error("Error creating bidding product:", error);
        throw error;
      }

      console.log("Bidding product created successfully:", data);

      setFeedback({ type: "success", message: "Product added to bidding successfully!" });
      closeBiddingModal();
      await loadAllData();
    } catch (error) {
      console.error("Error creating bidding product:", error);
      setFeedback({
        type: "error",
        message: "Error creating bidding product: " + (error.message || "Unknown error. Please check console.")
      });
    } finally {
      setBiddingLoading(false);
    }
  };

  const reloadBiddingProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("bidding_products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBiddingProducts(data || []);
    } catch (error) {
      console.error("Error reloading bidding products:", error);
    }
  };

  // Check for ended bids and set winners
  const checkAndSetWinners = async () => {
    try {
      const now = new Date().toISOString();

      // Find active bids that have ended
      const { data: endedBids, error: fetchError } = await supabase
        .from("bidding_products")
        .select("*")
        .eq("status", "active")
        .lte("bid_end_date", now);

      if (fetchError) throw fetchError;

      if (!endedBids || endedBids.length === 0) return;

      // Process each ended bid
      for (const bidding of endedBids) {
        // Check if winner already set
        if (bidding.winner_id) continue;

        // Get the highest bidder (winning bid)
        if (bidding.highest_bidder_id) {
          // Update bidding product with winner
          const { error: updateError } = await supabase
            .from("bidding_products")
            .update({
              status: "ended",
              winner_id: bidding.highest_bidder_id,
              winner_name: bidding.highest_bidder_name,
              winner_email: bidding.highest_bidder_email,
            })
            .eq("id", bidding.id);

          if (updateError) {
            console.error(`Error updating winner for bidding ${bidding.id}:`, updateError);
            continue;
          }

          // Send notification to winner
          await notifyUser(
            bidding.highest_bidder_id,
            bidding.highest_bidder_email,
            bidding.highest_bidder_name,
            "bid_won",
            "Congratulations! You Won the Bid",
            `Congratulations! You won the bid for "${bidding.product_name}" with a bid of PKR ${parseFloat(bidding.current_highest_bid).toLocaleString()}. Please complete payment to receive your product.`,
            `Product: ${bidding.product_name}\nWinning Bid: PKR ${parseFloat(bidding.current_highest_bid).toLocaleString()}\nPlease contact admin for payment details.`,
            bidding.id
          );

          // Send notification to admin
          const adminUsers = await supabase
            .from("users")
            .select("id, email, name")
            .eq("role", "admin");

          if (adminUsers.data && adminUsers.data.length > 0) {
            for (const admin of adminUsers.data) {
              await notifyUser(
                admin.id,
                admin.email,
                admin.name,
                "bid_ended",
                "Bidding Ended - Winner Selected",
                `Bidding for "${bidding.product_name}" has ended. Winner: ${bidding.highest_bidder_name} (PKR ${parseFloat(bidding.current_highest_bid).toLocaleString()})`,
                `Product: ${bidding.product_name}\nWinner: ${bidding.highest_bidder_name}\nWinning Bid: PKR ${parseFloat(bidding.current_highest_bid).toLocaleString()}\nPlease verify payment and arrange delivery.`,
                bidding.id
              );
            }
          }
        } else {
          // No bids placed, just mark as ended
          await supabase
            .from("bidding_products")
            .update({ status: "ended" })
            .eq("id", bidding.id);
        }
      }

      // Reload bidding products to show updated status
      await reloadBiddingProducts();
    } catch (error) {
      console.error("Error checking and setting winners:", error);
    }
  };

  // View bids for a bidding product
  const [selectedBiddingForBids, setSelectedBiddingForBids] = useState(null);
  const [bidsList, setBidsList] = useState([]);
  const [showBidsModal, setShowBidsModal] = useState(false);

  const openBidsModal = async (bidding) => {
    setSelectedBiddingForBids(bidding);
    setShowBidsModal(true);
    await loadBidsForProduct(bidding.id);
  };

  const closeBidsModal = () => {
    setShowBidsModal(false);
    setSelectedBiddingForBids(null);
    setBidsList([]);
  };

  const loadBidsForProduct = async (biddingProductId) => {
    try {
      const { data, error } = await supabase
        .from("bids")
        .select("*")
        .eq("bidding_product_id", biddingProductId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBidsList(data || []);
    } catch (error) {
      console.error("Error loading bids:", error);
      setBidsList([]);
    }
  };

  // Verify payment for winner
  const handleVerifyPayment = async (biddingId) => {
    const actionId = `bid-verify-${biddingId}`;
    try {
      setSubmittingId(actionId);
      // Get current bidding product
      const { data: currentBidding } = await supabase
        .from("bidding_products")
        .select("*")
        .eq("id", biddingId)
        .single();

      if (!currentBidding) throw new Error("Bidding product not found");

      // Update payment_verified
      // Keep status as "ended" (will show as "Action Required" in UI until delivery is arranged)
      // Only change to "completed" when both payment verified AND delivery arranged
      const newStatus = (currentBidding.payment_verified && currentBidding.delivery_arranged) ? "completed" : "ended";

      const { error } = await supabase
        .from("bidding_products")
        .update({
          payment_verified: true,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", biddingId);

      if (error) throw error;

      // Get updated bidding product to notify winner
      const { data: bidding } = await supabase
        .from("bidding_products")
        .select("*")
        .eq("id", biddingId)
        .single();

      if (bidding && bidding.winner_id) {
        await notifyUser(
          bidding.winner_id,
          bidding.winner_email,
          bidding.winner_name,
          "payment_verified",
          "Payment Verified",
          `Your payment for "${bidding.product_name}" has been verified. Delivery will be arranged soon.`,
          `Product: ${bidding.product_name}\nWinning Bid: PKR ${parseFloat(bidding.current_highest_bid).toLocaleString()}\nPayment Status: Verified`,
          biddingId
        );
      }

      setFeedback({ type: "success", message: "Payment verified successfully!" });
      await reloadBiddingProducts();
    } catch (error) {
      console.error("Error verifying payment:", error);
      setFeedback({ type: "error", message: "Error verifying payment: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  // Mark delivery as arranged
  const handleArrangeDelivery = async (biddingId) => {
    const actionId = `bid-deliver-${biddingId}`;
    try {
      setSubmittingId(actionId);
      const { error } = await supabase
        .from("bidding_products")
        .update({ delivery_arranged: true, status: "completed" })
        .eq("id", biddingId);

      if (error) throw error;

      // Get bidding product to notify winner
      const { data: bidding } = await supabase
        .from("bidding_products")
        .select("*")
        .eq("id", biddingId)
        .single();

      if (bidding && bidding.winner_id) {
        await notifyUser(
          bidding.winner_id,
          bidding.winner_email,
          bidding.winner_name,
          "delivery_arranged",
          "Delivery Arranged",
          `Delivery for "${bidding.product_name}" has been arranged. You will be contacted soon for delivery details.`,
          `Product: ${bidding.product_name}\nDelivery Status: Arranged\nYou will be contacted with delivery details.`,
          biddingId
        );
      }

      setFeedback({ type: "success", message: "Delivery arranged successfully!" });
      await reloadBiddingProducts();
    } catch (error) {
      console.error("Error arranging delivery:", error);
      setFeedback({ type: "error", message: "Error arranging delivery: " + error.message });
    } finally {
      setSubmittingId(null);
    }
  };

  // Check for ended bids on component mount and periodically
  useEffect(() => {
    checkAndSetWinners();
    // Check every 5 minutes for ended bids
    const interval = setInterval(checkAndSetWinners, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="admin-panel-container">
      <div className="admin-header">
        <div>
          <h1>Admin Panel</h1>
          <p>Manage verification requests</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>
          {/* Admin Bell */}
          <div style={{ position: "relative", zIndex: 9999 }} data-notification-dropdown>
            <button
              onClick={() => setShowAdminNotifications(!showAdminNotifications)}
              className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary-600 transition-colors duration-200 cursor-pointer border-none bg-transparent"
              title="Bank Details Submissions"
            >
              <Bell className="w-5 h-5" />
              {adminNotifications.length > 0 && adminNotifications.filter(n => !n.is_read).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {adminNotifications.filter(n => !n.is_read).length > 99 ? '99+' : adminNotifications.filter(n => !n.is_read).length}
                </span>
              )}
            </button>
            
            {/* Notification Dropdown */}
            {showAdminNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-card border border-gray-200 z-[100] animate-slide-up overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                </div>
                
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  {adminNotifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Bell className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm font-medium">No notifications yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {adminNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 transition-all duration-200 cursor-pointer ${
                            notification.is_read ? 'bg-white' : 'bg-primary-50/30'
                          } hover:bg-gray-50`}
                          onClick={() => markAdminNotificationAsRead(notification.id)}
                        >
                          <div className="flex gap-3">
                            <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                              notification.is_read ? 'bg-gray-200' : 'bg-red-500 animate-pulse'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm text-gray-900 mb-0.5 ${!notification.is_read ? 'font-semibold' : ''}`}>
                                {notification.user_name || 'User'} submitted bank details
                              </p>
                              <p className="text-xs text-gray-500 truncate mb-1">
                                {notification.user_email}
                              </p>
                              <p className="text-[10px] text-gray-400 font-medium">
                                {new Date(notification.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            className="btn-admin-logout"
            onClick={() => {
              localStorage.removeItem("adminUser");
              navigate("/admin");
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`page-alert ${feedback.type === "success"
              ? "page-alert-success"
              : "page-alert-error"
            }`}
          style={{ maxWidth: "1200px", margin: "0 auto 1rem" }}
        >
          <span className="page-alert-emoji">
            {feedback.type === "success" ? "✅" : "❌"}
          </span>
          <span>{feedback.message}</span>
        </div>
      )}

      <nav className="admin-navbar">
        <div className="admin-navbar-container">
          <button
            className={`admin-nav-item ${activeTab === "verifications" ? "active" : ""}`}
            onClick={() => setActiveTab("verifications")}
          >
            <span className="nav-item-text">Verification Requests</span>
            <span className="nav-item-badge">{verifications.filter((v) => v.status === "pending").length}</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === "requests" ? "active" : ""}`}
            onClick={() => setActiveTab("requests")}
          >
            <span className="nav-item-text">Cash Requests</span>
            <span className="nav-item-badge">{cashRequests.filter((r) => r.status === "pending").length}</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === "donations" ? "active" : ""}`}
            onClick={() => setActiveTab("donations")}
          >
            <span className="nav-item-text">Cash Donations</span>
            <span className="nav-item-badge">{cashDonations.filter((d) => d.status === "pending").length}</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === "product-donations" ? "active" : ""}`}
            onClick={() => setActiveTab("product-donations")}
          >
            <span className="nav-item-text">Product Donations</span>
            <span className="nav-item-badge">{productDonations.filter((d) => d.status === "pending").length}</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === "product-requests" ? "active" : ""}`}
            onClick={() => setActiveTab("product-requests")}
          >
            <span className="nav-item-text">Product Requests</span>
            <span className="nav-item-badge">{productRequests.filter((r) => r.status === "pending").length}</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === "bidding" ? "active" : ""}`}
            onClick={() => setActiveTab("bidding")}
          >
            <span className="nav-item-text">Bidding Management</span>
            <span className="nav-item-badge">{biddingProducts.filter((b) => {
              const needsPaymentAction = b.status === "ended" && b.highest_bidder_name && !b.payment_verified;
              const needsDeliveryAction = b.status === "ended" && b.highest_bidder_name && b.payment_verified && !b.delivery_arranged;
              return needsPaymentAction || needsDeliveryAction;
            }).length}</span>
          </button>
          <button
            className={`admin-nav-item ${activeTab === "summary" ? "active" : ""}`}
            onClick={() => setActiveTab("summary")}
          >
            <span className="nav-item-text">Summary</span>
            <span className="nav-item-badge">📊</span>
          </button>
        </div>
      </nav>

      {activeTab === "summary" && (
        <Summary
          verifications={verifications}
          cashRequests={cashRequests}
          cashDonations={cashDonations}
          productDonations={productDonations}
          productRequests={productRequests}
          biddingProducts={biddingProducts}
        />
      )}

      <div className="admin-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        ) : (
          <>
            {activeTab === "verifications" && (
              <div className="requests-section">
                {/* Search and Filter */}
                <div className="admin-search-filter">
                  <div className="admin-search-box">
                    <input
                      type="text"
                      placeholder="Search by name, email, or ID..."
                      value={verificationSearch}
                      onChange={(e) => setVerificationSearch(e.target.value)}
                      className="admin-search-input"
                    />
                    <i className="ri-search-line admin-search-icon"></i>
                    {verificationSearch && (
                      <button
                        className="admin-clear-search"
                        onClick={() => setVerificationSearch("")}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div className="admin-filter-group">
                    <label>Status</label>
                    <CustomDropdown
                      options={[
                        { value: "all", label: "All Status" },
                        { value: "pending", label: "Pending" },
                        { value: "approved", label: "Approved" },
                        { value: "rejected", label: "Rejected" }
                      ]}
                      value={verificationStatusFilter}
                      onChange={setVerificationStatusFilter}
                    />
                  </div>
                  <div className="admin-filter-group">
                    <label>Sort By</label>
                    <CustomDropdown
                      options={[
                        { value: "newest", label: "Newest First" },
                        { value: "oldest", label: "Oldest First" },
                        { value: "name-asc", label: "Name (A-Z)" },
                        { value: "name-desc", label: "Name (Z-A)" }
                      ]}
                      value={verificationSortBy}
                      onChange={setVerificationSortBy}
                    />
                  </div>
                  {(verificationSearch || verificationStatusFilter !== "all" || verificationSortBy !== "newest") && (
                    <button
                      className="admin-clear-filters"
                      onClick={() => {
                        setVerificationSearch("");
                        setVerificationStatusFilter("all");
                        setVerificationSortBy("newest");
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                {(() => {
                  const filtered = verifications.filter((v) => {
                    if (verificationStatusFilter !== "all" && v.status !== verificationStatusFilter) return false;
                    if (verificationSearch.trim()) {
                      const search = verificationSearch.toLowerCase();
                      return (
                        (v.user_name && v.user_name.toLowerCase().includes(search)) ||
                        (v.user_email && v.user_email.toLowerCase().includes(search)) ||
                        (v.id && v.id.toString().includes(search))
                      );
                    }
                    return true;
                  });
                  const sorted = sortItems(filtered, verificationSortBy);
                  return sorted.length === 0 ? (
                    <div className="empty-state">
                      {verifications.length === 0
                        ? "No verification requests"
                        : "No requests match your filters"}
                    </div>
                  ) : (
                    sorted.map((request) => {
                      if (!request || !request.id) {
                        console.warn("⚠️ Invalid request object:", request);
                        return null;
                      }
                      return (
                        <div key={request.id} className="verification-card">
                          <div className="request-header">
                            <h3>{request.user_name}</h3>
                            <span className={`status-badge ${request.status}`}>
                              {request.status}
                            </span>
                          </div>
                          <div className="request-details">
                            <p>
                              <strong>Email:</strong> {request.user_email}
                            </p>
                            <p>
                              <strong>Document:</strong> {request.affidavit_name}
                            </p>
                            <p>
                              <strong>Reason:</strong> {request.reason}
                            </p>
                            <p>
                              <strong>Submitted:</strong>{" "}
                              {new Date(request.created_at).toLocaleDateString()}
                            </p>
                            {request.affidavit_url && (
                              <div className="document-preview">
                                <DocumentViewer
                                  filePath={request.affidavit_url}
                                  fileName={request.affidavit_name}
                                />
                              </div>
                            )}
                          </div>
                          {request.status === "pending" && (
                            <div className="action-buttons">
                              <button
                                className={`btn-approve ${submittingId === `verify-${request.id}` ? 'btn-loading' : ''}`}
                                onClick={() => handleApprove(request)}
                                disabled={submittingId === `verify-${request.id}`}
                              >
                                {submittingId === `verify-${request.id}` ? 'Approving...' : 'Approve & Verify User'}
                              </button>
                              <button
                                className="btn-reject"
                                onClick={() => openRejectModal("verification", request.id, request.user_name)}
                                disabled={submittingId === `verify-${request.id}`}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  );
                })()}
              </div>
            )}

            {activeTab === "requests" && (
              <div className="requests-section">
                {/* Search and Filter */}
                <div className="admin-search-filter">
                  <div className="admin-search-box">
                    <input
                      type="text"
                      placeholder="Search by name, email, amount, or ID..."
                      value={cashRequestSearch}
                      onChange={(e) => setCashRequestSearch(e.target.value)}
                      className="admin-search-input"
                    />
                    <i className="ri-search-line admin-search-icon"></i>
                    {cashRequestSearch && (
                      <button
                        className="admin-clear-search"
                        onClick={() => setCashRequestSearch("")}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div className="admin-filter-group">
                    <label>Status</label>
                    <CustomDropdown
                      options={[
                        { value: "all", label: "All Status" },
                        { value: "pending", label: "Pending" },
                        { value: "approved", label: "Approved" },
                        { value: "rejected", label: "Rejected" }
                      ]}
                      value={cashRequestStatusFilter}
                      onChange={setCashRequestStatusFilter}
                    />
                  </div>
                  <div className="admin-filter-group">
                    <label>Sort By</label>
                    <CustomDropdown
                      options={[
                        { value: "newest", label: "Newest First" },
                        { value: "oldest", label: "Oldest First" },
                        { value: "name-asc", label: "Name (A-Z)" },
                        { value: "name-desc", label: "Name (Z-A)" }
                      ]}
                      value={cashRequestSortBy}
                      onChange={setCashRequestSortBy}
                    />
                  </div>
                  {(cashRequestSearch || cashRequestStatusFilter !== "all" || cashRequestSortBy !== "newest") && (
                    <button
                      className="admin-clear-filters"
                      onClick={() => {
                        setCashRequestSearch("");
                        setCashRequestStatusFilter("all");
                        setCashRequestSortBy("newest");
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                {(() => {
                  const filtered = cashRequests.filter((r) => {
                    if (cashRequestStatusFilter !== "all" && r.status !== cashRequestStatusFilter) return false;
                    if (cashRequestSearch.trim()) {
                      const search = cashRequestSearch.toLowerCase();
                      return (
                        (r.user_name && r.user_name.toLowerCase().includes(search)) ||
                        (r.user_email && r.user_email.toLowerCase().includes(search)) ||
                        (r.amount && r.amount.toString().includes(search)) ||
                        (r.id && r.id.toString().includes(search)) ||
                        (r.description && r.description.toLowerCase().includes(search))
                      );
                    }
                    return true;
                  });
                  const sorted = sortItems(filtered, cashRequestSortBy);
                  return sorted.length === 0 ? (
                    <div className="empty-state">
                      {cashRequests.length === 0
                        ? "No cash requests"
                        : "No requests match your filters"}
                    </div>
                  ) : (
                    sorted.map((request) => (
                      <div key={request.id} className="verification-card">
                        <div className="request-header">
                          <h3>{request.user_name}</h3>
                          <span className={`status-badge ${request.status}`}>
                            {request.status}
                          </span>
                        </div>
                        <div className="request-details">
                          <p>
                            <strong>Email:</strong> {request.user_email}
                          </p>
                          <p>
                            <strong>Amount:</strong> PKR {request.amount}
                          </p>
                          <p>
                            <strong>Category:</strong> {request.category}
                          </p>
                          <p>
                            <strong>Description:</strong> {request.description}
                          </p>
                          <p>
                            <strong>Date:</strong>{" "}
                            {new Date(request.created_at).toLocaleDateString()}
                          </p>
                          {request.proof_url && (
                            <div className="document-preview">
                              <DocumentViewer
                                filePath={request.proof_url}
                                fileName="proof_of_need"
                                label="View Proof Document"
                              />
                            </div>
                          )}
                        </div>
                        {request.status === "pending" && (
                          <div className="action-buttons">
                            <button
                              className={`btn-approve ${submittingId === `cash-req-${request.id}` ? 'btn-loading' : ''}`}
                              onClick={() => handleApproveRequest(request.id)}
                              disabled={submittingId === `cash-req-${request.id}`}
                            >
                              {submittingId === `cash-req-${request.id}` ? 'Approving...' : 'Approve'}
                            </button>
                            <button
                              className="btn-reject"
                              onClick={() => openRejectModal("request", request.id, request.user_name)}
                              disabled={submittingId === `cash-req-${request.id}`}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  );
                })()}
              </div>
            )}

            {activeTab === "product-requests" && (
              <div className="requests-section">
                {/* Search and Filter */}
                <div className="admin-search-filter">
                  <div className="admin-search-box">
                    <input
                      type="text"
                      placeholder="Search by name, product, category, or ID..."
                      value={productRequestSearch}
                      onChange={(e) => setProductRequestSearch(e.target.value)}
                      className="admin-search-input"
                    />
                    <i className="ri-search-line admin-search-icon"></i>
                    {productRequestSearch && (
                      <button
                        className="admin-clear-search"
                        onClick={() => setProductRequestSearch("")}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="admin-filter-group">
                    <label>Status</label>
                    <CustomDropdown
                      options={[
                        { value: "all", label: "All Status" },
                        { value: "pending", label: "Pending" },
                        { value: "approved", label: "Approved" },
                        { value: "rejected", label: "Rejected" }
                      ]}
                      value={productRequestStatusFilter}
                      onChange={setProductRequestStatusFilter}
                    />
                  </div>
                  <div className="admin-filter-group">
                    <label>Sort By</label>
                    <CustomDropdown
                      options={[
                        { value: "status", label: "By Status" },
                        { value: "newest", label: "Newest First" },
                        { value: "oldest", label: "Oldest First" },
                        { value: "name-asc", label: "Name (A-Z)" },
                        { value: "name-desc", label: "Name (Z-A)" }
                      ]}
                      value={productRequestSortBy}
                      onChange={setProductRequestSortBy}
                    />
                  </div>
                  {(productRequestSearch || productRequestStatusFilter !== "all" || productRequestSortBy !== "newest") && (
                    <button
                      className="admin-clear-filters"
                      onClick={() => {
                        setProductRequestSearch("");
                        setProductRequestStatusFilter("all");
                        setProductRequestSortBy("newest");
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                {(() => {
                  const filtered = productRequests.filter((r) => {
                    if (productRequestStatusFilter !== "all" && r.status !== productRequestStatusFilter) return false;
                    if (productRequestSearch.trim()) {
                      const search = productRequestSearch.toLowerCase();
                      return (
                        (r.user_name && r.user_name.toLowerCase().includes(search)) ||
                        (r.product_name && r.product_name.toLowerCase().includes(search)) ||
                        (r.product_category && r.product_category.toLowerCase().includes(search)) ||
                        (r.reason && r.reason.toLowerCase().includes(search)) ||
                        (r.id && r.id.toString().includes(search))
                      );
                    }
                    return true;
                  });
                  const sorted = sortItems(filtered, productRequestSortBy);
                  return sorted.length === 0 ? (
                    <div className="empty-state">
                      {productRequests.length === 0
                        ? "No product requests"
                        : "No requests match your filters"}
                    </div>
                  ) : (
                    sorted.map((request) => (
                      <div key={request.id} className="verification-card">
                        <div className="request-header">
                          <h3>{request.user_name}</h3>
                          <span className={`status-badge ${request.status}`}>
                            {request.status}
                          </span>
                        </div>
                        <div className="request-details">
                          <p>
                            <strong>Email:</strong> {request.user_email}
                          </p>
                          <p>
                            <strong>Product:</strong> {request.product_name || "N/A"}
                          </p>
                          <p>
                            <strong>Category:</strong> {request.product_category}
                          </p>
                          <p>
                            <strong>Reason:</strong> {request.reason}
                          </p>
                          <p>
                            <strong>Date:</strong>{" "}
                            {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {request.status === "pending" && (
                          <div className="action-buttons">
                            <button
                              className={`btn-approve ${submittingId === `prod-req-${request.id}` ? 'btn-loading' : ''}`}
                              onClick={() => handleApproveProductRequest(request.id)}
                              disabled={submittingId === `prod-req-${request.id}`}
                            >
                              {submittingId === `prod-req-${request.id}` ? 'Approving...' : 'Approve'}
                            </button>
                            <button
                              className="btn-reject"
                              onClick={() => openRejectModal("product-request", request.id, request.user_name)}
                              disabled={submittingId === `prod-req-${request.id}`}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  );
                })()}
              </div>
            )}

            {activeTab === "donations" && (
              <div className="donations-section">
                {/* Search and Filter */}
                <div className="admin-search-filter">
                  <div className="admin-search-box">
                    <input
                      type="text"
                      placeholder="Search by name, email, amount, or ID..."
                      value={cashDonationSearch}
                      onChange={(e) => setCashDonationSearch(e.target.value)}
                      className="admin-search-input"
                    />
                    <i className="ri-search-line admin-search-icon"></i>
                    {cashDonationSearch && (
                      <button
                        className="admin-clear-search"
                        onClick={() => setCashDonationSearch("")}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="admin-filter-group">
                    <label>Status</label>
                    <CustomDropdown
                      options={[
                        { value: "all", label: "All Status" },
                        { value: "pending", label: "Pending" },
                        { value: "approved", label: "Approved" },
                        { value: "rejected", label: "Rejected" }
                      ]}
                      value={cashDonationStatusFilter}
                      onChange={setCashDonationStatusFilter}
                    />
                  </div>
                  {(cashDonationSearch || cashDonationStatusFilter !== "all") && (
                    <button
                      className="admin-clear-filters"
                      onClick={() => {
                        setCashDonationSearch("");
                        setCashDonationStatusFilter("all");
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                {(() => {
                  const filtered = cashDonations.filter((d) => {
                    if (cashDonationStatusFilter !== "all" && d.status !== cashDonationStatusFilter) return false;
                    if (cashDonationSearch.trim()) {
                      const search = cashDonationSearch.toLowerCase();
                      return (
                        (d.user_name && d.user_name.toLowerCase().includes(search)) ||
                        (d.user_email && d.user_email.toLowerCase().includes(search)) ||
                        (d.amount && d.amount.toString().includes(search)) ||
                        (d.id && d.id.toString().includes(search)) ||
                        (d.message && d.message.toLowerCase().includes(search))
                      );
                    }
                    return true;
                  });
                  return filtered.length === 0 ? (
                    <div className="empty-state">
                      {cashDonations.length === 0
                        ? "No cash donations"
                        : "No donations match your filters"}
                    </div>
                  ) : (
                    filtered.map((donation) => (
                      <div key={donation.id} className="verification-card">
                        <div className="request-header">
                          <h3>{donation.user_name}</h3>
                          <span className={`status-badge ${donation.status}`}>
                            {donation.status}
                          </span>
                        </div>
                        <div className="request-details">
                          <p>
                            <strong>Email:</strong> {donation.user_email}
                          </p>
                          <p>
                            <strong>Amount:</strong> PKR {donation.amount}
                          </p>
                          <p>
                            <strong>Category:</strong> {donation.category}
                          </p>
                          <p>
                            <strong>Message:</strong> {donation.message}
                          </p>
                          <p>
                            <strong>Date:</strong>{" "}
                            {new Date(donation.created_at).toLocaleDateString()}
                          </p>

                          {donation.screenshot_url && (
                            <div className="document-preview">
                              <DocumentViewer
                                filePath={donation.screenshot_url}
                                fileName="payment_screenshot"
                                label="View Payment Screenshot"
                              />
                            </div>
                          )}
                        </div>
                        {donation.status === "pending" && (
                          <div className="action-buttons">
                            <button
                              className={`btn-approve ${submittingId === `cash-don-${donation.id}` ? 'btn-loading' : ''}`}
                              onClick={() => handleApproveDonation(donation.id)}
                              disabled={submittingId === `cash-don-${donation.id}`}
                            >
                              {submittingId === `cash-don-${donation.id}` ? 'Approving...' : 'Approve'}
                            </button>
                            <button
                              className="btn-reject"
                              onClick={() => openRejectModal("donation", donation.id, donation.user_name)}
                              disabled={submittingId === `cash-don-${donation.id}`}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  );
                })()}
              </div>
            )}

            {activeTab === "product-donations" && (
              <div className="donations-section">
                {productDonations.length === 0 ? (
                  <div className="empty-state">No product donations</div>
                ) : (
                  productDonations.map((donation) => (
                    <div key={donation.id} className="verification-card">
                      <div className="request-header">
                        <h3>{donation.user_name}</h3>
                        <span className={`status-badge ${donation.status}`}>
                          {donation.status}
                        </span>
                      </div>
                      <div className="request-details">
                        <p>
                          <strong>Email:</strong> {donation.user_email}
                        </p>
                        {donation.product_name && (
                          <p>
                            <strong>Product Name:</strong> {donation.product_name}
                          </p>
                        )}
                        <p>
                          <strong>Category:</strong> {donation.category}
                        </p>
                        <p>
                          <strong>Description:</strong> {donation.description}
                        </p>
                        <p>
                          <strong>AI Check:</strong>{" "}
                          <span className={`status-badge ${donation.ai_result === "safe" ? "approved" : donation.ai_result === "unsafe" ? "rejected" : "pending"}`}>
                            {donation.ai_result || "pending"}
                          </span>
                        </p>
                        <p>
                          <strong>Date:</strong>{" "}
                          {new Date(donation.created_at).toLocaleDateString()}
                        </p>

                        {donation.image_url && (
                          <div className="document-preview">
                            <DocumentViewer
                              filePath={donation.image_url}
                              fileName="product_image"
                              label="View Product Image"
                            />
                          </div>
                        )}
                      </div>
                      {donation.status === "pending" && (
                        <div className="action-buttons">
                          <button
                            className={`btn-approve ${submittingId === `prod-don-${donation.id}` ? 'btn-loading' : ''}`}
                            onClick={() => handleApproveProductDonation(donation.id)}
                            disabled={donation.ai_result === "unsafe" || submittingId === `prod-don-${donation.id}`}
                          >
                            {submittingId === `prod-don-${donation.id}` ? 'Approving...' : (donation.ai_result === "unsafe" ? "⚠️ Cannot Approve (AI Flagged)" : "Approve")}
                          </button>
                          <button
                            className="btn-reject"
                            onClick={() => openRejectModal("product-donation", donation.id, donation.user_name)}
                            disabled={submittingId === `prod-don-${donation.id}`}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "bidding" && (
              <div className="bidding-section">
                <div className="bidding-section-header">
                  <h2 className="bidding-section-title">Bidding Management</h2>
                  <button
                    className="btn-add-bidding"
                    onClick={async () => {
                      await reloadProductRequests();
                      setShowBiddingModal(true);
                      setSelectedProductForBidding(null);
                    }}
                  >
                    + Add Product to Bidding
                  </button>
                </div>

                {/* Search and Filter */}
                <div className="admin-search-filter" style={{ marginBottom: "1.5rem" }}>
                  <div className="admin-search-box">
                    <input
                      type="text"
                      placeholder="Search by product name, category, or bidder..."
                      value={biddingSearch}
                      onChange={(e) => setBiddingSearch(e.target.value)}
                      className="admin-search-input"
                    />
                    <i className="ri-search-line admin-search-icon"></i>
                    {biddingSearch && (
                      <button
                        className="admin-clear-search"
                        onClick={() => setBiddingSearch("")}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="admin-filter-group" style={{ minWidth: '180px' }}>
                    <label style={{ marginBottom: '0.5rem', display: 'block', fontWeight: '600', color: '#4a5568' }}>Status</label>
                    <CustomDropdown
                      options={[
                        { value: "all", label: "All Status" },
                        { value: "action-required", label: "Action Required" },
                        { value: "active", label: "Active" },
                        { value: "upcoming", label: "Upcoming" },
                        { value: "ended", label: "Ended" },
                        { value: "completed", label: "Completed" }
                      ]}
                      value={biddingStatusFilter}
                      onChange={setBiddingStatusFilter}
                    />
                  </div>
                  <div className="admin-filter-group" style={{ minWidth: '180px' }}>
                    <label style={{ marginBottom: '0.5rem', display: 'block', fontWeight: '600', color: '#4a5568' }}>Sort By</label>
                    <CustomDropdown
                      options={[
                        { value: "newest", label: "Newest First" },
                        { value: "oldest", label: "Oldest First" },
                        { value: "name-asc", label: "Name (A-Z)" },
                        { value: "name-desc", label: "Name (Z-A)" },
                        { value: "highest-bid", label: "Highest Bid" }
                      ]}
                      value={biddingSortBy}
                      onChange={setBiddingSortBy}
                    />
                  </div>
                  {(biddingSearch || biddingStatusFilter !== "all" || biddingSortBy !== "newest") && (
                    <button
                      className="admin-clear-filters"
                      onClick={() => {
                        setBiddingSearch("");
                        setBiddingStatusFilter("all");
                        setBiddingSortBy("newest");
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {biddingProducts.length === 0 ? (
                  <div className="empty-state">No products in bidding</div>
                ) : (() => {
                  // Filter bidding products
                  let filtered = biddingProducts.filter((b) => {
                    // Action required: ended bids with highest bidder but payment not verified OR delivery not arranged
                    const needsPaymentAction = b.status === "ended" && b.highest_bidder_name && !b.payment_verified;
                    const needsDeliveryAction = b.status === "ended" && b.highest_bidder_name && b.payment_verified && !b.delivery_arranged;
                    const needsAction = needsPaymentAction || needsDeliveryAction;

                    if (biddingStatusFilter === "action-required") {
                      if (!needsAction) return false;
                    } else if (biddingStatusFilter === "completed") {
                      if (b.status !== "completed") return false;
                    } else if (biddingStatusFilter === "completed-bids") {
                      // Show all completed bids (payment verified and delivery arranged)
                      if (b.status !== "completed" || !b.payment_verified || !b.delivery_arranged) return false;
                    } else if (biddingStatusFilter !== "all" && b.status !== biddingStatusFilter) {
                      return false;
                    }

                    if (biddingSearch.trim()) {
                      const search = biddingSearch.toLowerCase();
                      return (
                        (b.product_name && b.product_name.toLowerCase().includes(search)) ||
                        (b.product_category && b.product_category.toLowerCase().includes(search)) ||
                        (b.highest_bidder_name && b.highest_bidder_name.toLowerCase().includes(search))
                      );
                    }
                    return true;
                  });

                  // Sort: Priority order - Action Required first, then Active, then Upcoming, then others
                  filtered = filtered.sort((a, b) => {
                    const aNeedsPaymentAction = a.status === "ended" && a.highest_bidder_name && !a.payment_verified;
                    const aNeedsDeliveryAction = a.status === "ended" && a.highest_bidder_name && a.payment_verified && !a.delivery_arranged;
                    const aNeedsAction = aNeedsPaymentAction || aNeedsDeliveryAction;

                    const bNeedsPaymentAction = b.status === "ended" && b.highest_bidder_name && !b.payment_verified;
                    const bNeedsDeliveryAction = b.status === "ended" && b.highest_bidder_name && b.payment_verified && !b.delivery_arranged;
                    const bNeedsAction = bNeedsPaymentAction || bNeedsDeliveryAction;

                    // Action required first (payment action has higher priority than delivery action)
                    if (aNeedsAction && !bNeedsAction) return -1;
                    if (!aNeedsAction && bNeedsAction) return 1;
                    if (aNeedsAction && bNeedsAction) {
                      // If both need action, payment action comes before delivery action
                      if (aNeedsPaymentAction && !bNeedsPaymentAction) return -1;
                      if (!aNeedsPaymentAction && bNeedsPaymentAction) return 1;
                    }

                    // If both or neither need action, sort by status priority
                    const statusPriority = {
                      'ended': aNeedsAction ? 0 : 3, // Action required ended = 0, regular ended = 3
                      'active': 1,
                      'upcoming': 2,
                      'completed': 4,
                      'cancelled': 5
                    };

                    const aPriority = statusPriority[a.status] ?? 6;
                    const bPriority = statusPriority[b.status] ?? 6;

                    if (aPriority !== bPriority) {
                      return aPriority - bPriority;
                    }

                    // If same status priority, apply user's sort preference
                    if (biddingSortBy === "highest-bid") {
                      return parseFloat(b.current_highest_bid || b.starting_price) - parseFloat(a.current_highest_bid || a.starting_price);
                    } else {
                      // Use sortItems for other sorts
                      const sorted = sortItems([a, b], biddingSortBy);
                      return sorted[0].id === a.id ? -1 : 1;
                    }
                  });

                  return filtered.length === 0 ? (
                    <div className="empty-state">No bids match your filters</div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
                      {filtered.map((bidding) => {
                        const needsPaymentAction = bidding.status === "ended" && bidding.highest_bidder_name && !bidding.payment_verified;
                        const needsDeliveryAction = bidding.status === "ended" && bidding.highest_bidder_name && bidding.payment_verified && !bidding.delivery_arranged;
                        const needsAction = needsPaymentAction || needsDeliveryAction;
                        return (
                          <div
                            key={bidding.id}
                            data-bidding-id={bidding.id}
                            className="verification-card"
                            style={{
                              border: needsAction ? "3px solid #f59e0b" : undefined,
                              background: needsAction ? "#fef3c7" : undefined,
                              boxShadow: needsAction ? "0 4px 12px rgba(245, 158, 11, 0.3)" : undefined
                            }}
                          >
                            {needsAction && (
                              <div style={{
                                background: needsPaymentAction ? "#f59e0b" : "#3b82f6",
                                color: "white",
                                padding: "0.5rem",
                                marginBottom: "1rem",
                                borderRadius: "4px",
                                fontWeight: "bold",
                                textAlign: "center"
                              }}>
                                ⚠️ Action Required: {needsPaymentAction ? "Verify Payment" : "Arrange Delivery"}
                              </div>
                            )}

                            {/* Product Image */}
                            {bidding.product_image_url && (
                              <BiddingProductImage
                                imageUrl={bidding.product_image_url}
                                productName={bidding.product_name}
                              />
                            )}

                            <div className="request-header">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                <div>
                                  <h3 style={{ margin: 0, marginBottom: '0.25rem' }}>{bidding.product_name || "Unnamed Product"}</h3>
                                  <p style={{
                                    margin: 0,
                                    fontSize: '0.75rem',
                                    color: '#6b7280',
                                    fontFamily: 'monospace',
                                    fontWeight: 'bold'
                                  }}>
                                    📦 Product ID: {bidding.product_donation_id || 'N/A'} | Bid ID: {bidding.id}
                                  </p>
                                </div>
                                <span className={`status-badge ${needsAction ? 'action-required' : bidding.status}`}>
                                  {needsAction ? '⚠️ Action Required' : bidding.status}
                                </span>
                              </div>
                            </div>
                            <div className="request-details">
                              <p><strong>Category:</strong> {bidding.product_category || 'N/A'}</p>
                              {bidding.product_description && (
                                <p style={{
                                  fontSize: '0.875rem',
                                  color: '#4b5563',
                                  marginTop: '0.5rem',
                                  marginBottom: '0.5rem',
                                  lineHeight: '1.4',
                                  maxHeight: '3rem',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  <strong>Description:</strong> {bidding.product_description.substring(0, 100)}
                                  {bidding.product_description.length > 100 ? '...' : ''}
                                </p>
                              )}
                              <p><strong>Starting Price:</strong> PKR {parseFloat(bidding.starting_price).toLocaleString()}</p>
                              <p><strong>Current Highest Bid:</strong> PKR {parseFloat(bidding.current_highest_bid || bidding.starting_price).toLocaleString()}</p>
                              {bidding.highest_bidder_name && (
                                <p><strong>Highest Bidder:</strong> {bidding.highest_bidder_name}</p>
                              )}
                              <p><strong>Start Date:</strong> {new Date(bidding.bid_start_date).toLocaleDateString()}</p>
                              <p><strong>End Date:</strong> {new Date(bidding.bid_end_date).toLocaleDateString()}</p>
                              {bidding.status === "ended" && (bidding.winner_name || bidding.highest_bidder_name) && (
                                <>
                                  <p><strong>Winner:</strong> {bidding.winner_name || bidding.highest_bidder_name}</p>
                                  <p><strong>Winning Bid:</strong> PKR {parseFloat(bidding.current_highest_bid || bidding.starting_price).toLocaleString()}</p>
                                  <p>
                                    <strong>Payment:</strong>{" "}
                                    <span className={`status-badge ${bidding.payment_verified ? "approved" : "pending"}`}>
                                      {bidding.payment_verified ? "✅ Verified" : "⏳ Pending"}
                                    </span>
                                  </p>
                                  <p>
                                    <strong>Delivery:</strong>{" "}
                                    <span className={`status-badge ${bidding.delivery_arranged ? "approved" : "pending"}`}>
                                      {bidding.delivery_arranged ? "✅ Arranged" : "⏳ Pending"}
                                    </span>
                                  </p>
                                </>
                              )}
                            </div>
                            <div className="action-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                              <button
                                className="btn-approve"
                                onClick={() => openBidsModal(bidding)}
                              >
                                View Bids ({bidding.current_highest_bid > bidding.starting_price ? "Has Bids" : "No Bids"})
                              </button>
                              {bidding.status === "ended" && bidding.highest_bidder_name && (
                                <>
                                  <button
                                    className={`btn-approve ${submittingId === `bid-verify-${bidding.id}` ? 'btn-loading' : ''}`}
                                    onClick={() => handleVerifyPayment(bidding.id)}
                                    style={{
                                      background: "#10b981",
                                      opacity: (bidding.payment_verified || submittingId === `bid-verify-${bidding.id}`) ? 0.5 : 1,
                                      cursor: (bidding.payment_verified || submittingId === `bid-verify-${bidding.id}`) ? "not-allowed" : "pointer"
                                    }}
                                    disabled={bidding.payment_verified || submittingId === `bid-verify-${bidding.id}`}
                                    title={bidding.payment_verified ? "Payment already verified" : "Verify payment"}
                                  >
                                    {submittingId === `bid-verify-${bidding.id}` ? 'Verifying...' : (bidding.payment_verified ? "✓ Payment Verified" : "Verify Payment")}
                                  </button>
                                  <button
                                    className={`btn-approve ${submittingId === `bid-deliver-${bidding.id}` ? 'btn-loading' : ''}`}
                                    onClick={() => handleArrangeDelivery(bidding.id)}
                                    style={{
                                      background: bidding.payment_verified ? "#3b82f6" : "#f59e0b",
                                      opacity: (bidding.delivery_arranged || !bidding.payment_verified || submittingId === `bid-deliver-${bidding.id}`) ? 0.5 : 1,
                                      cursor: (!bidding.payment_verified || bidding.delivery_arranged || submittingId === `bid-deliver-${bidding.id}`) ? "not-allowed" : "pointer"
                                    }}
                                    disabled={!bidding.payment_verified || bidding.delivery_arranged || submittingId === `bid-deliver-${bidding.id}`}
                                    title={!bidding.payment_verified ? "Please verify payment first" : bidding.delivery_arranged ? "Delivery already arranged" : "Arrange delivery"}
                                  >
                                    {submittingId === `bid-deliver-${bidding.id}` ? 'Arranging...' : (bidding.delivery_arranged ? "✓ Delivery Arranged" : "Arrange Delivery")}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}

        {/* Bidding Product Modal */}
        {showBiddingModal && (
          <div className="bidding-modal-overlay" onClick={closeBiddingModal}>
            <div className="bidding-modal" onClick={(e) => e.stopPropagation()}>
              <div className="bidding-modal-header">
                <h3>Add Product to Bidding</h3>
                <button className="bidding-modal-close" onClick={closeBiddingModal}>
                  ✕
                </button>
              </div>
              <div className="bidding-modal-content">
                {!selectedProductForBidding ? (
                  <div>
                    <p className="bidding-modal-instruction">Select an approved product to add to bidding. Items available for request are listed; requested items are hidden. Products already in bidding show &quot;Already in bidding&quot;.</p>
                    <div className="bidding-product-list">
                      {productDonations
                        // Only approved products are candidates
                        .filter((p) => p.status === "approved")
                        .map((product) => {
                          const productId = product.id;

                          // Any bidding record for this product (any status)
                          const inBiddingAny = biddingProducts.some(
                            (bp) => Number(bp.product_donation_id) === Number(productId)
                          );

                          // Only upcoming/active bids are considered "already in bidding"
                          const inBiddingActive = biddingProducts.some(
                            (bp) =>
                              Number(bp.product_donation_id) === Number(productId) &&
                              ["upcoming", "active"].includes(bp.status)
                          );

                          // Requests that are not rejected
                          const hasActiveRequest = productRequests.some(
                            (r) =>
                              Number(r.product_donation_id) === Number(productId) &&
                              r.status !== "rejected"
                          );

                          // 1) If bidding is ended/completed but there is still a row, hide it
                          if (inBiddingAny && !inBiddingActive) return null;

                          // 2) If product is requested (pending/approved) and not in active bidding, hide it
                          if (!inBiddingActive && hasActiveRequest) return null;

                          // At this point:
                          // - Either product is available (no request, not in bidding)
                          // - Or product is in upcoming/active bidding
                          return (
                            <div
                              key={product.id}
                              className={`bidding-product-card ${inBiddingActive ? "disabled" : ""
                                }`}
                              onClick={() =>
                                !inBiddingActive && openBiddingModal(product)
                              }
                            >
                              <div className="bidding-product-info">
                                <strong className="bidding-product-name">
                                  {product.product_name || "Unnamed Product"}
                                </strong>
                                <p className="bidding-product-category">
                                  {product.category}
                                </p>
                              </div>
                              {inBiddingActive && (
                                <span className="bidding-product-badge">
                                  Already in bidding
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreateBiddingProduct} className="bidding-form">
                    <div className="bidding-selected-product">
                      <strong>Selected Product:</strong>
                      <p className="bidding-selected-name">{selectedProductForBidding.product_name || "Unnamed Product"}</p>
                      <p className="bidding-selected-category">{selectedProductForBidding.category}</p>
                    </div>
                    <div className="bidding-form-group">
                      <label htmlFor="starting-price">
                        Starting Price (PKR) <span className="required">*</span>
                      </label>
                      <input
                        type="number"
                        id="starting-price"
                        min="0"
                        step="0.01"
                        value={biddingFormData.startingPrice}
                        onChange={(e) =>
                          setBiddingFormData({ ...biddingFormData, startingPrice: e.target.value })
                        }
                        required
                        className="bidding-form-input"
                      />
                    </div>
                    <div className="bidding-form-group">
                      <label htmlFor="bid-start-date">
                        Bid Start Date <span className="required">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        id="bid-start-date"
                        value={biddingFormData.bidStartDate}
                        onChange={(e) =>
                          setBiddingFormData({ ...biddingFormData, bidStartDate: e.target.value })
                        }
                        required
                        className="bidding-form-input"
                      />
                    </div>
                    <div className="bidding-form-group">
                      <label htmlFor="bid-end-date">
                        Bid End Date <span className="required">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        id="bid-end-date"
                        value={biddingFormData.bidEndDate}
                        onChange={(e) =>
                          setBiddingFormData({ ...biddingFormData, bidEndDate: e.target.value })
                        }
                        required
                        className="bidding-form-input"
                      />
                    </div>
                    <div className="bidding-modal-actions">
                      <button
                        type="button"
                        className="bidding-btn-cancel"
                        onClick={closeBiddingModal}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="bidding-btn-back"
                        onClick={() => setSelectedProductForBidding(null)}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className={`bidding-btn-submit ${biddingLoading ? 'btn-loading' : ''}`}
                        disabled={biddingLoading}
                      >
                        {biddingLoading ? "Creating..." : "Create Bidding"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* View Bids Modal */}
        {showBidsModal && selectedBiddingForBids && (
          <div className="bidding-modal-overlay" onClick={closeBidsModal}>
            <div className="bidding-modal view-bids-modal" onClick={(e) => e.stopPropagation()}>
              <div className="bidding-modal-header">
                <h3>Bids for: {selectedBiddingForBids.product_name || "Unnamed Product"}</h3>
                <button className="bidding-modal-close" onClick={closeBidsModal}>
                  ✕
                </button>
              </div>
              <div className="bidding-modal-content">
                <div className="bids-summary">
                  <div className="bids-summary-item">
                    <span className="bids-summary-label">Current Highest Bid</span>
                    <span className="bids-summary-value">
                      PKR {parseFloat(selectedBiddingForBids.current_highest_bid || selectedBiddingForBids.starting_price).toLocaleString()}
                    </span>
                  </div>
                  {selectedBiddingForBids.highest_bidder_name && (
                    <div className="bids-summary-item">
                      <span className="bids-summary-label">Highest Bidder</span>
                      <span className="bids-summary-value">{selectedBiddingForBids.highest_bidder_name}</span>
                    </div>
                  )}
                  <div className="bids-summary-item">
                    <span className="bids-summary-label">Total Bids</span>
                    <span className="bids-summary-value">{bidsList.length}</span>
                  </div>
                </div>

                {bidsList.length === 0 ? (
                  <div className="bids-empty-state">
                    <p>No bids placed yet.</p>
                  </div>
                ) : (
                  <div className="bids-table-container">
                    <table className="bids-table">
                      <thead>
                        <tr>
                          <th>Bidder</th>
                          <th>Amount</th>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bidsList.map((bid, index) => (
                          <tr key={bid.id} className={bid.is_winning_bid ? "winning-bid" : ""}>
                            <td className="bid-bidder">{bid.user_name}</td>
                            <td className="bid-amount">
                              PKR {parseFloat(bid.bid_amount).toLocaleString()}
                            </td>
                            <td className="bid-date">
                              {new Date(bid.created_at).toLocaleString()}
                            </td>
                            <td className="bid-status">
                              {bid.is_winning_bid ? (
                                <span className="winning-badge">🏆 Winning</span>
                              ) : (
                                <span className="bid-status-placeholder">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="bidding-modal-actions">
                  <button
                    className="bidding-btn-submit"
                    onClick={closeBidsModal}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Reason Modal */}
        {rejectModal && (
          <div className="reject-modal-overlay" onClick={() => setRejectModal(null)}>  {/*if click on background model close */}
            <div className="reject-modal" onClick={(e) => e.stopPropagation()}>    {/*if click inside model dont close */}
              <div className="reject-modal-header">
                <h3>Reject {rejectModal.type === "verification" ? "Verification" : rejectModal.type === "request" ? "Request" : rejectModal.type === "product-donation" ? "Product Donation" : "Donation"}</h3>
                <button className="btn-close-modal" onClick={() => setRejectModal(null)}>
                  ✕
                </button>
              </div>
              <div className="reject-modal-content">
                <p className="reject-modal-info">
                  You are about to reject {rejectModal.name}'s {rejectModal.type === "verification" ? "verification request" : rejectModal.type === "request" ? "cash request" : rejectModal.type === "product-donation" ? "product donation" : rejectModal.type === "product-request" ? "product request" : "donation"}.
                </p>
                <div className="reject-reason-input">
                  <label htmlFor="rejection-reason">
                    Rejection Reason <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <textarea
                    id="rejection-reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a reason for rejection (e.g., Missing documents, Invalid information, etc.)"
                    rows="4"
                    required
                  />
                  <small>This reason will be shown to the user in their notification.</small>
                </div>
                <div className="reject-modal-actions">
                  <button
                    className="btn-cancel-reject"
                    onClick={() => {
                      setRejectModal(null);
                      setRejectionReason("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className={`btn-confirm-reject ${submittingId ? 'btn-loading' : ''}`}
                    onClick={confirmReject}
                    disabled={!rejectionReason.trim() || !!submittingId}
                    style={{ position: 'relative' }}
                  >
                    {submittingId ? 'Processing...' : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Document Viewer Modal */}
        {viewingDocument && (
          <div className="document-modal-overlay" onClick={closeDocumentViewer}>
            <div className="document-modal" onClick={(e) => e.stopPropagation()}>
              <div className="document-modal-header">
                <h3>{viewingDocument}</h3>
                <button className="btn-close-modal" onClick={closeDocumentViewer}>
                  ✕
                </button>
              </div>
              <div className="document-modal-content">
                {documentLoading ? (
                  <div className="document-loading">
                    <p>⏳ Loading document...</p>
                  </div>
                ) : documentUrl ? (
                  <>
                    {viewingDocument.toLowerCase().endsWith(".pdf") ||
                      documentUrl.toLowerCase().includes(".pdf") ? (
                      <iframe
                        src={documentUrl}
                        className="pdf-viewer-modal"
                        title="Document"
                      />
                    ) : (
                      <img
                        src={documentUrl}
                        alt="Document"
                        className="document-image-modal"
                      />
                    )}
                    <div className="document-modal-actions">
                      <a
                        href={documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-open-new-tab"
                      >
                        🔗 Open in New Tab
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="document-error">
                    <p>❌ Unable to load document</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Component for displaying bidding product image
const BiddingProductImage = ({ imageUrl, productName }) => {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        if (!imageUrl) {
          setLoading(false);
          return;
        }

        const { data, error: urlError } = await supabase.storage
          .from('verification-documents')
          .createSignedUrl(imageUrl, 3600);

        if (urlError) throw urlError;
        setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error('Error loading bidding product image:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [imageUrl]);

  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '200px',
        background: '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div style={{
        width: '100%',
        height: '200px',
        background: '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        marginBottom: '1rem',
        color: '#9ca3af'
      }}>
        📦 No Image Available
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '200px',
      borderRadius: '8px',
      overflow: 'hidden',
      marginBottom: '1rem',
      border: '2px solid #e5e7eb',
      background: '#fff'
    }}>
      <img
        src={signedUrl}
        alt={productName || 'Product'}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          cursor: 'pointer'
        }}
        onClick={() => {
          // Open image in new window for full view
          window.open(signedUrl, '_blank');
        }}
        title="Click to view full image"
      />
    </div>
  );
};

export default AdminPanel;
