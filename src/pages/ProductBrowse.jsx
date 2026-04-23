import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import AuthenticatedNavbar from "../components/AuthenticatedNavbar";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import SkeletonLoader from "../components/SkeletonLoader";
import CustomDropdown from "../components/CustomDropdown";
import { getErrorMessage } from "../utils/errorHandler";
import "../styles/ProductBrowse.css";

function ProductBrowse() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, name-asc, name-desc
  const [dateFilter, setDateFilter] = useState("all"); // all, today, week, month
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productImageUrl, setProductImageUrl] = useState(null);
  const [requestReason, setRequestReason] = useState("");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestingProduct, setRequestingProduct] = useState(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);

  const categories = [
    "All",
    "Electronics",
    "Clothing",
    "Furniture",
    "Books",
    "Toys",
    "Food Items",
    "Medical Supplies",
    "Educational Materials",
    "Other",
  ];

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, selectedCategory, sortBy, dateFilter]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("product_donations")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch product requests: hide products that are requested (status !== rejected)
      const { data: requested, error: requestError } = await supabase
        .from("product_requests")
        .select("product_donation_id, status")
        .order("created_at", { ascending: false });

      if (requestError) throw requestError;

      const requestedIds = new Set(
        (requested || [])
          .filter((r) => r.status !== "rejected")
          .map((r) => r.product_donation_id)
      );

      // Fetch bidding products: hide products that are in bidding (any status)
      const { data: inBidding, error: biddingError } = await supabase
        .from("bidding_products")
        .select("product_donation_id");

      if (biddingError) console.error("Error loading bidding products:", biddingError);

      const biddingIds = new Set((inBidding || []).map((bp) => bp.product_donation_id));

      // Request list = approved, not requested, not in bidding
      const availableProducts = (data || []).filter(
        (product) => !requestedIds.has(product.id) && !biddingIds.has(product.id)
      );

      setProducts(availableProducts);
    } catch (error) {
      console.error("Error loading products:", error);
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (product) => product.category === selectedCategory
      );
    }

    // Filter by search term (enhanced - searches in multiple fields)
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          (product.product_name &&
            product.product_name.toLowerCase().includes(search)) ||
          (product.description &&
            product.description.toLowerCase().includes(search)) ||
          (product.category && product.category.toLowerCase().includes(search)) ||
          (product.user_name && product.user_name.toLowerCase().includes(search))
      );
    }

    // Filter by date
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      filtered = filtered.filter((product) => {
        const productDate = new Date(product.created_at);
        switch (dateFilter) {
          case "today":
            return productDate >= today;
          case "week":
            return productDate >= weekAgo;
          case "month":
            return productDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at) - new Date(a.created_at);
        case "oldest":
          return new Date(a.created_at) - new Date(b.created_at);
        case "name-asc":
          return (a.product_name || "").localeCompare(b.product_name || "");
        case "name-desc":
          return (b.product_name || "").localeCompare(a.product_name || "");
        default:
          return 0;
      }
    });

    setFilteredProducts(filtered);
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

  const handleViewProduct = async (product) => {
    setSelectedProduct(product);
    if (product.image_url) {
      const url = await getSignedUrl(product.image_url);
      setProductImageUrl(url);
    }
  };

  const closeProductDetail = () => {
    setSelectedProduct(null);
    setProductImageUrl(null);
  };

  const handleRequestProduct = (product) => {
    // Check if user is logged in and verified
    const user = localStorage.getItem("currentUser");
    if (!user) {
      setFeedback({ type: "error", message: "Please login first to request a product." });
      setTimeout(() => {
        navigate("/login");
      }, 1500);
      return;
    }

    const userData = JSON.parse(user);
    if (!userData.is_verified) {
      setFeedback({ type: "error", message: "Your account must be verified to request products. Redirecting to verification..." });
      setTimeout(() => {
        navigate("/verify-documents");
      }, 1500);
      return;
    }

    // Navigate to product request form with productId
    navigate(`/product-request?productId=${product.id}`);
  };

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setRequestingProduct(null);
    setRequestReason("");
  };

  const submitProductRequest = async () => {
    if (!requestReason.trim()) {
      setFeedback({ type: "error", message: "Please provide a reason for requesting this product." });
      return;
    }

    const user = localStorage.getItem("currentUser");
    if (!user) {
      setFeedback({ type: "error", message: "Please login first." });
      navigate("/login");
      return;
    }

    const userData = JSON.parse(user);

    try {
      setRequestLoading(true);

      // Check for pending product requests
      const { data: pending } = await supabase
        .from("product_requests")
        .select("status")
        .eq("user_id", userData.id)
        .eq("status", "pending");

      if (pending && pending.length > 0) {
        setFeedback({ type: "warning", message: "You already have a pending product request. Please wait for admin approval before requesting another." });
        setRequestLoading(false);
        return;
      }

      // Check if this product was already requested by this user
      const { data: existing } = await supabase
        .from("product_requests")
        .select("id, status")
        .eq("user_id", userData.id)
        .eq("product_donation_id", requestingProduct.id)
        .in("status", ["pending", "approved"]);

      if (existing && existing.length > 0) {
        setFeedback({ type: "warning", message: "You have already requested this product." });
        setRequestLoading(false);
        return;
      }

      // Insert product request
      const { error } = await supabase.from("product_requests").insert([
        {
          user_id: userData.id,
          user_name: userData.name,
          user_email: userData.email,
          product_donation_id: requestingProduct.id,
          product_name: requestingProduct.product_name,
          product_category: requestingProduct.category,
          reason: requestReason.trim(),
        },
      ]);

      if (error) throw error;

      setFeedback({ type: "success", message: "Product request submitted successfully! Admin will review it soon." });
      closeRequestModal();
      closeProductDetail();
      
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Error submitting product request:", error);
      const errorMessage = getErrorMessage(error);
      setFeedback({ type: "error", message: errorMessage });
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <>
      <AuthenticatedNavbar />
      <div className="product-browse-container">
        {feedback && (
          <div
            className={`page-alert ${
              feedback.type === "success"
                ? "page-alert-success"
                : feedback.type === "warning"
                ? "page-alert-warning"
                : "page-alert-error"
            }`}
            style={{ maxWidth: "1200px", margin: "0 auto 1rem" }}
          >
            <span className="page-alert-emoji">
              {feedback.type === "success" ? "✅" : feedback.type === "warning" ? "⚠️" : "❌"}
            </span>
            <span>{feedback.message}</span>
          </div>
        )}

      <div className="product-browse-header">
        <h1>Browse Available Products</h1>
        <p className="browse-subtitle">
          Find products donated by generous donors
        </p>
      </div>

      {/* Enhanced Search and Filter Section */}
      <div className="search-filter-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name, description, category, or donor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <i className="ri-search-line search-icon"></i>
          {searchTerm && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchTerm("")}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="filters-row">
          <div className="filter-group">
            <label>Category</label>
            <CustomDropdown
              options={categories.map(cat => ({ value: cat === "All" ? "all" : cat, label: cat }))}
              value={selectedCategory}
              onChange={setSelectedCategory}
              placeholder="Select Category"
            />
          </div>

          <div className="filter-group">
            <label>Date</label>
            <CustomDropdown
              options={[
                { value: "all", label: "All Time" },
                { value: "today", label: "Today" },
                { value: "week", label: "This Week" },
                { value: "month", label: "This Month" }
              ]}
              value={dateFilter}
              onChange={setDateFilter}
              placeholder="Select Date"
            />
          </div>

          <div className="filter-group">
            <label>Sort By</label>
            <CustomDropdown
              options={[
                { value: "newest", label: "Newest First" },
                { value: "oldest", label: "Oldest First" },
                { value: "name-asc", label: "Name (A-Z)" },
                { value: "name-desc", label: "Name (Z-A)" }
              ]}
              value={sortBy}
              onChange={setSortBy}
              placeholder="Sort By"
            />
          </div>

          {(searchTerm || selectedCategory !== "all" || dateFilter !== "all") && (
            <button
              className="clear-filters-btn"
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("all");
                setDateFilter("all");
                setSortBy("newest");
              }}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="results-info">
        <p>
          Showing <strong>{filteredProducts.length}</strong> of{" "}
          <strong>{products.length}</strong> products
        </p>
      </div>

      {error && (
        <div style={{ maxWidth: "1200px", margin: "0 auto 1rem" }}>
          <ErrorMessage
            message={error}
            onRetry={() => {
              setError(null);
              loadProducts();
            }}
            dismissible={true}
            onDismiss={() => setError(null)}
          />
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        products.length === 0 ? (
          <LoadingSpinner size="large" message="Loading products..." />
        ) : (
          <SkeletonLoader type="card" count={6} />
        )
      ) : filteredProducts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>No products found</h3>
          <p>
            {searchTerm || selectedCategory !== "all"
              ? "Try adjusting your search or filter criteria"
              : "No products available at the moment"}
          </p>
        </div>
      ) : (
        <div className="products-grid">
          {filteredProducts.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-image-container">
                {product.image_url ? (
                  <ProductImageThumbnail filePath={product.image_url} />
                ) : (
                  <div className="product-image-placeholder">📦</div>
                )}
              </div>
              <div className="product-info">
                <div className="product-category-badge">{product.category}</div>
                <h3 className="product-name">
                  {product.product_name || "Unnamed Product"}
                </h3>
                <p className="product-description">
                  {product.description
                    ? product.description.length > 100
                      ? product.description.substring(0, 100) + "..."
                      : product.description
                    : "No description available"}
                </p>
                <div className="product-footer">
                  <span className="product-date">
                    {new Date(product.created_at).toLocaleDateString()}
                  </span>
                  <button
                    className="btn-view-product"
                    onClick={() => handleViewProduct(product)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div
          className="product-modal-overlay"
          onClick={closeProductDetail}
        >
          <div
            className="product-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="product-modal-header">
              <h2>Product Details</h2>
              <button className="btn-close-modal" onClick={closeProductDetail}>
                ✕
              </button>
            </div>
            <div className="product-modal-content">
              {productImageUrl && (
                <div className="product-modal-image">
                  <img src={productImageUrl} alt={selectedProduct.product_name} />
                </div>
              )}
              <div className="product-modal-info">
                <div className="product-modal-category">
                  {selectedProduct.category}
                </div>
                <h3>{selectedProduct.product_name || "Unnamed Product"}</h3>
                <div className="product-modal-section">
                  <strong>Description:</strong>
                  <p>{selectedProduct.description || "No description available"}</p>
                </div>
                <div className="product-modal-section">
                  <strong>Donated by:</strong>
                  <p>{selectedProduct.user_name}</p>
                </div>
                <div className="product-modal-section">
                  <strong>Date:</strong>
                  <p>
                    {new Date(selectedProduct.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="product-modal-actions">
                  <button
                    className="btn-request-product"
                    onClick={() => handleRequestProduct(selectedProduct)}
                  >
                    Request This Product
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Request Modal */}
      {showRequestModal && requestingProduct && (
        <div
          className="product-modal-overlay"
          onClick={closeRequestModal}
        >
          <div
            className="product-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "600px" }}
          >
            <div className="product-modal-header">
              <h2>Request Product</h2>
              <button className="btn-close-modal" onClick={closeRequestModal}>
                ✕
              </button>
            </div>
            <div className="product-modal-content">
              <div className="product-modal-section">
                <strong>Product:</strong>
                <p>{requestingProduct.product_name || "Unnamed Product"}</p>
              </div>
              <div className="product-modal-section">
                <strong>Category:</strong>
                <p>{requestingProduct.category}</p>
              </div>
              <div className="product-modal-section">
                <label htmlFor="request-reason">
                  <strong>Reason for Request *</strong>
                </label>
                <textarea
                  id="request-reason"
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Please explain why you need this product..."
                  rows="5"
                  className="request-reason-textarea"
                  required
                />
                <small>This information will help the admin review your request.</small>
              </div>
              <div className="product-modal-actions">
                <button
                  className="btn-cancel"
                  onClick={closeRequestModal}
                  disabled={requestLoading}
                >
                  Cancel
                </button>
                <button
                  className={`btn-request-product ${requestLoading ? 'btn-loading' : ''}`}
                  onClick={submitProductRequest}
                  disabled={requestLoading || !requestReason.trim()}
                >
                  {requestLoading ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

// Component for product image thumbnail
function ProductImageThumbnail({ filePath }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadImage();
  }, [filePath]);

  const loadImage = async () => {
    try {
      const { data, error } = await supabase.storage
        .from("verification-documents")
        .createSignedUrl(filePath, 3600);

      if (error) throw error;
      setImageUrl(data.signedUrl);
    } catch (error) {
      console.error("Error loading image:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="product-image-placeholder">⏳</div>;
  }

  if (!imageUrl) {
    return <div className="product-image-placeholder">📦</div>;
  }

  return (
    <img
      src={imageUrl}
      alt="Product"
      className="product-thumbnail"
      onError={() => setImageUrl(null)}
    />
  );
}

export default ProductBrowse;

