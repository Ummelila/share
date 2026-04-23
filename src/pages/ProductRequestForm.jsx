import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Package, ArrowLeft, CheckCircle, AlertCircle, Info, Sparkles, Shield, Clock, FileText, Tag } from "lucide-react";
import AuthenticatedNavbar from "../components/AuthenticatedNavbar";
import { supabase } from "../supabaseClient";

function ProductRequestForm() {
  const navigate = useNavigate();
  const location = useLocation();

  const [productData, setProductData] = useState(null);
  const [productRequestReason, setProductRequestReason] = useState("");
  const [productImageUrl, setProductImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const productId = searchParams.get("productId");

    if (productId) {
      loadProduct(productId);
    } else {
      setFeedback({ type: "error", message: "No product selected. Please browse products first." });
      setLoading(false);
    }
  }, [location.search]);

  const loadProduct = async (productId) => {
    try {
      setLoading(true);
      setFeedback(null);

      const productIdNum = parseInt(productId, 10);
      if (isNaN(productIdNum)) {
        setFeedback({ type: "error", message: "Invalid product ID." });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("product_donations")
        .select("*")
        .eq("id", productIdNum)
        .eq("status", "approved")
        .single();

      if (error) throw error;
      if (!data) {
        setFeedback({ type: "error", message: "Product not found or not available for request." });
        setLoading(false);
        return;
      }

      // Check if this product has already been requested by any user (not rejected)
      const { data: activeRequests, error: activeError } = await supabase
        .from("product_requests")
        .select("id, status")
        .eq("product_donation_id", data.id)
        .neq("status", "rejected");

      if (activeError) throw activeError;

      if (activeRequests && activeRequests.length > 0) {
        setFeedback({
          type: "warning",
          message: "This product has already been requested and is no longer available.",
        });
        setProductData(null);
        setLoading(false);
        return;
      }

      setProductData(data);

      if (data.image_url) {
        const { data: urlData, error: urlError } = await supabase.storage
          .from("verification-documents")
          .createSignedUrl(data.image_url, 3600);

        if (!urlError && urlData) {
          setProductImageUrl(urlData.signedUrl);
        }
      }
    } catch (error) {
      console.error("Error loading product:", error);
      setFeedback({ type: "error", message: "Error loading product: " + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleProductRequestSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setFeedback(null);

    if (!productRequestReason.trim()) {
      setFeedback({ type: "error", message: "Please provide a reason for requesting this product." });
      return;
    }

    const user = localStorage.getItem("currentUser");
    if (!user) {
      setFeedback({ type: "error", message: "Please login first to submit a request." });
      navigate("/login");
      return;
    }

    const userData = JSON.parse(user);
    if (!userData.is_verified) {
      setFeedback({ type: "error", message: "Your account must be verified to request products. Please complete verification first." });
      return;
    }

    try {
      setLoading(true);

      const { data: pending } = await supabase
        .from("product_requests")
        .select("status")
        .eq("user_id", userData.id)
        .eq("status", "pending");

      if (pending && pending.length > 0) {
        setFeedback({ type: "warning", message: "You already have a pending product request. Please wait for admin approval before requesting another." });
        setLoading(false);
        return;
      }

      const { data: existing } = await supabase
        .from("product_requests")
        .select("id, status")
        .eq("user_id", userData.id)
        .eq("product_donation_id", productData.id)
        .in("status", ["pending", "approved"]);

      if (existing && existing.length > 0) {
        setFeedback({ type: "warning", message: "You have already requested this product." });
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("product_requests").insert([
        {
          user_id: userData.id,
          user_name: userData.name,
          user_email: userData.email,
          product_donation_id: productData.id,
          product_name: productData.product_name,
          product_category: productData.category,
          reason: productRequestReason.trim(),
        },
      ]);

      if (error) throw error;

      setFeedback({ type: "success", message: "Product request submitted successfully! Admin will review it soon." });

      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Error submitting product request:", error);
      setFeedback({ type: "error", message: "Error submitting request: " + error.message });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !productData) {
    return (
      <div className="min-h-screen bg-gray-50 animate-fade-in">
        <AuthenticatedNavbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading product...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="min-h-screen bg-gray-50 animate-fade-in">
        <AuthenticatedNavbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 font-poppins">Product Not Found</h2>
            <p className="text-gray-600 mb-6">Product not found or not available for request. Please browse available products.</p>
            <button
              onClick={() => navigate("/browse")}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Package className="w-5 h-5" />
              Browse Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      <AuthenticatedNavbar />

      {/* Hero Section */}
      <section className="py-6 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start">
            <button
              type="button"
              onClick={() => navigate("/browse")}
              className="w-10 h-10 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:border-primary-500 hover:bg-primary-50 transition-all flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>

            <div className="text-center max-w-3xl mx-auto flex-1">
              <h1 className="text-3xl md:text-4xl font-bold font-poppins text-gray-900 mb-2">
                Request Product
              </h1>
              <p className="text-sm text-gray-600">
                Request this product by providing your reason. Be specific about why you need it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-8 -mt-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Product Info Card */}
            <div className="card">
              <h3 className="text-xl font-bold font-poppins text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary-600" />
                Product Details
              </h3>
              {productImageUrl && (
                <div className="mb-4 rounded-xl overflow-hidden border-2 border-gray-200">
                  <img
                    src={productImageUrl}
                    alt={productData.product_name || "Product"}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Product Name</p>
                    <p className="font-semibold text-gray-900">{productData.product_name || "Unnamed Product"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Tag className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Category</p>
                    <p className="font-semibold text-gray-900">{productData.category}</p>
                  </div>
                </div>
                {productData.description && (
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Description</p>
                      <p className="text-gray-700 text-sm leading-relaxed">{productData.description}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Request Form Card */}
            <div className="card">
            {feedback && (
              <div
                className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${feedback.type === "success"
                    ? "bg-green-50 border-green-200 text-green-800"
                    : feedback.type === "warning"
                      ? "bg-yellow-50 border-yellow-200 text-yellow-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                ) : feedback.type === "warning" ? (
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                )}
                <span className="font-medium">{feedback.message}</span>
              </div>
            )}

             <form onSubmit={handleProductRequestSubmit} className="space-y-6">
               <div>
                 <label className="label">
                   Reason for Request <span className="text-red-500">*</span>
                 </label>
                 <textarea
                   name="productRequestReason"
                   placeholder="Please explain why you need this product..."
                   value={productRequestReason}
                   onChange={(e) => setProductRequestReason(e.target.value)}
                   rows="8"
                   required
                   className="input-field w-full resize-none"
                 />
               </div>

              <button
                type="submit"
                className="btn-primary w-full flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Submit Request</span>
                  </>
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => navigate("/browse")}
              className="btn-secondary w-full mt-4 flex items-center justify-center gap-2"
            >
              <Package className="w-5 h-5" />
              <span>Browse More Products</span>
            </button>
          </div>
        </div>
        </div>
      </section>
    </div>
  );
}

export default ProductRequestForm;

