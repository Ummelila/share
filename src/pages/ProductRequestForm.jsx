import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Package, ArrowLeft, CheckCircle, AlertCircle, FileText, Tag, MapPin } from "lucide-react";
import AuthenticatedNavbar from "../components/AuthenticatedNavbar";
import { supabase } from "../supabaseClient";

function ProductRequestForm() {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1);
  const [productData, setProductData] = useState(null);
  const [productRequestReason, setProductRequestReason] = useState("");
  const [address, setAddress] = useState("");
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
      setFeedback({ type: "error", message: "Error loading product: " + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (!productRequestReason.trim()) {
      setFeedback({ type: "error", message: "Please provide a reason for requesting this product." });
      return;
    }
    setFeedback(null);
    setStep(2);
  };

  const handleProductRequestSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setFeedback(null);

    if (!productRequestReason.trim()) {
      setFeedback({ type: "error", message: "Please provide a reason for requesting this product." });
      return;
    }

    if (!address.trim()) {
      setFeedback({ type: "error", message: "Please provide your delivery address." });
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
      setFeedback({ type: "error", message: "Your account must be verified to request products." });
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
        setFeedback({ type: "warning", message: "Your product request is already in pending" });
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

      let { error } = await supabase.from("product_requests").insert([
        {
          user_id: userData.id,
          user_name: userData.name,
          user_email: userData.email,
          product_donation_id: productData.id,
          product_name: productData.product_name,
          product_category: productData.category,
          reason: productRequestReason.trim(),
          address: address.trim(),
        },
      ]);

      if (error && (error.message.includes("address") || error.code === "PGRST116" || error.code === "42703")) {
        const fallbackReason = `${productRequestReason.trim()}\n\n[DELIVERY ADDRESS]\n${address.trim()}`;
        const retry = await supabase.from("product_requests").insert([
          {
            user_id: userData.id,
            user_name: userData.name,
            user_email: userData.email,
            product_donation_id: productData.id,
            product_name: productData.product_name,
            product_category: productData.category,
            reason: fallbackReason,
          },
        ]);
        error = retry.error;
      }

      if (error) throw error;

      setFeedback({ type: "success", message: "Product request submitted successfully! Admin will review it soon." });
      setTimeout(() => { navigate("/dashboard"); }, 2000);
    } catch (error) {
      setFeedback({ type: "error", message: "Error submitting request: " + error.message });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !productData) {
    return (
      <div className="h-screen bg-white flex flex-col font-poppins overflow-hidden">
        <AuthenticatedNavbar />
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center animate-pulse">
            <div className="w-16 h-16 border-4 border-slate-200 border-t-[#124074] rounded-full animate-spin mx-auto mb-6"></div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Synchronizing Product...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="h-screen bg-white flex flex-col font-poppins overflow-hidden">
        <AuthenticatedNavbar />
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="max-w-md w-full p-12 bg-white rounded-[3rem] shadow-2xl shadow-slate-200 text-center animate-slide-up">
            <div className="w-24 h-24 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Unavailable</h2>
            <p className="text-slate-500 font-medium mb-10 leading-relaxed">{feedback?.message || "Product not found or not available for request."}</p>
            <button
              onClick={() => navigate("/browse")}
              className="w-full bg-[#124074] text-white rounded-2xl py-6 text-lg font-black uppercase tracking-widest shadow-xl shadow-blue-900/10 hover:scale-[1.02] transition-all"
            >
              Browse Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white text-slate-900 flex flex-col font-poppins overflow-hidden">
      <AuthenticatedNavbar />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Panel: Product Detail Sidebar */}
        <aside className="w-[480px] bg-slate-50 border-r border-slate-200 p-16 flex flex-col overflow-y-auto animate-fade-in shrink-0">
          <div className="mb-14">
            <h2 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">Product <span className="text-slate-300">Details</span></h2>
          </div>

          <div className="space-y-12">
            {productImageUrl && (
              <div className="relative group">
                <div className="absolute inset-0 bg-[#124074] rounded-[2.5rem] blur-2xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
                <div className="relative aspect-square rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl">
                  <img
                    src={productImageUrl}
                    alt={productData.product_name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
              </div>
            )}

            <div className="space-y-8">
              <div className="flex items-start gap-5">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 shrink-0">
                  <FileText className="w-6 h-6 text-[#124074]" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Item Name</p>
                  <p className="text-xl font-black text-slate-900 leading-tight">{productData.product_name || "Unnamed Product"}</p>
                </div>
              </div>

              <div className="flex items-start gap-5">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 shrink-0">
                  <Tag className="w-6 h-6 text-[#124074]" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Category</p>
                  <p className="text-xl font-black text-slate-900 leading-tight">{productData.category}</p>
                </div>
              </div>

              {productData.description && (
                <div className="bg-white/50 rounded-3xl p-8 border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Description</p>
                  <p className="text-slate-600 font-medium leading-relaxed italic">"{productData.description}"</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Right Panel: Form Area */}
        <main className="flex-1 relative flex flex-col pt-4 lg:pt-6 pb-8 lg:pb-12 px-8 lg:px-12 overflow-hidden bg-slate-50/30">
          <div className="max-w-2xl w-full mx-auto animate-slide-up">
            <button
              onClick={() => step === 1 ? navigate("/browse") : setStep(1)}
              className="flex items-center gap-2 text-slate-500 hover:text-[#124074] font-bold uppercase tracking-widest text-xs mt-4 mb-6 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span>Back</span>
            </button>

            <h1 className="text-4xl md:text-5xl font-medium mb-6 tracking-tighter leading-[1.1] text-[#124074]">
              Submit <br/>
              <span className="text-[#124074] font-black">Request</span>
            </h1>

            {feedback && (
              <div className={`mb-6 p-4 rounded-[1.5rem] border flex items-start gap-3 animate-fade-in ${
                feedback.type === "success" ? "bg-green-50 border-green-100 text-green-800" :
                feedback.type === "warning" ? "bg-yellow-50 border-yellow-100 text-yellow-800" :
                "bg-red-50 border-red-100 text-red-800"
              }`}>
                <AlertCircle className="w-5 h-5 shrink-0 mt-1" />
                <span className="font-bold text-base">{feedback.message}</span>
              </div>
            )}

            <form onSubmit={step === 1 ? handleNextStep : handleProductRequestSubmit} className="space-y-6 pb-6">
              {step === 1 ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Reason for Request</label>
                    <textarea
                      name="productRequestReason"
                      placeholder="Why do you need this product?..."
                      value={productRequestReason}
                      onChange={(e) => setProductRequestReason(e.target.value)}
                      rows="4"
                      required
                      className="w-full bg-white border border-slate-200 rounded-[1.5rem] py-5 px-8 text-lg font-light focus:border-[#124074] transition-all outline-none placeholder:text-slate-200 resize-none"
                    />
                  </div>

                  <div className="flex justify-center pt-0">
                    <button
                      type="submit"
                      className="w-max bg-[#124074] text-white rounded-[1.5rem] py-3.5 px-10 text-base font-black uppercase tracking-widest shadow-2xl shadow-blue-900/20 hover:scale-[1.02] hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      <span>Next Step</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2 animate-fade-in">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Delivery Address</label>
                    <div className="relative group">
                      <MapPin className="absolute left-6 top-6 w-5 h-5 text-slate-300 group-focus-within:text-[#124074] transition-colors" />
                      <textarea
                        name="address"
                        placeholder="Enter your full address..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        rows="4"
                        required
                        className="w-full bg-white border border-slate-200 rounded-[1.5rem] py-5 pl-14 pr-6 text-lg font-light focus:border-[#124074] transition-all outline-none placeholder:text-slate-200 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4 pt-4">
                    <button
                      type="submit"
                      className={`w-max bg-[#124074] text-white rounded-[1.5rem] py-3.5 px-10 text-base font-black uppercase tracking-widest shadow-2xl shadow-blue-900/20 hover:scale-[1.02] hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3 ${loading ? 'opacity-70 pointer-events-none' : ''}`}
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="animate-pulse text-base">Submitting...</span>
                      ) : (
                        <span>Submit Request</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] transition-colors"
                    >
                      Back to details
                    </button>
                  </div>
                </>
              )}
            </form>

            <div className="flex justify-center mt-2">
              <button
                type="button"
                onClick={() => navigate("/browse")}
                className="w-max border border-slate-200 text-slate-400 rounded-[1.5rem] py-3 px-8 text-[10px] font-black uppercase tracking-widest hover:border-[#124074] hover:text-[#124074] transition-all flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4" />
                <span>Browse More</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ProductRequestForm;

