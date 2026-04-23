import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, Info, Sparkles, Shield, Clock, Image as ImageIcon } from "lucide-react";
import AuthenticatedNavbar from "../components/AuthenticatedNavbar";
import { supabase } from "../supabaseClient";

function ProductDonationForm() {
  const navigate = useNavigate();
  const [productImage, setProductImage] = useState(null);
  const [productImageName, setProductImageName] = useState("");
  const [productImagePreview, setProductImagePreview] = useState(null);
  const [imageError, setImageError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    productName: "",
    productDescription: "",
    productCategory: "",
    productOtherCategory: "",
  });

  const [feedback, setFeedback] = useState(null);

  const productCategories = [
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleProductImageChange = (e) => {
    setImageError(null);
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setFeedback({ type: 'error', message: 'Only JPG, PNG, and WEBP images are allowed.' });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFeedback({ type: 'error', message: 'Image size must be less than 5MB.' });
        return;
      }

      setProductImage(file);
      setProductImageName(file.name);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setFeedback(null);

    // Validate product form
    if (!productImage) {
      setFeedback({ type: "error", message: "Please upload a product image." });
      setLoading(false);
      return;
    }

    if (!formData.productCategory) {
      setFeedback({ type: "error", message: "Please select a category." });
      setLoading(false);
      return;
    }

    if (formData.productCategory === "Other" && !formData.productOtherCategory.trim()) {
      setFeedback({ type: "error", message: "Please specify the category." });
      setLoading(false);
      return;
    }

    if (!formData.productDescription.trim()) {
      setFeedback({ type: "error", message: "Please provide a product description." });
      setLoading(false);
      return;
    }

    const user = localStorage.getItem("currentUser");
    if (!user) {
      setLoading(false);
      setFeedback({ type: "error", message: "Please login first to make a donation." });
      navigate("/login");
      return;
    }

    const userData = JSON.parse(user);
    const finalCategory =
      formData.productCategory === "Other"
        ? formData.productOtherCategory
        : formData.productCategory;

    try {
      // Check for pending product donations
      const { data: pending } = await supabase
        .from("product_donations")
        .select("status")
        .eq("user_id", userData.id)
        .eq("status", "pending");

      if (pending && pending.length > 0) {
        setFeedback({ type: "warning", message: "You already have a pending product donation. Please wait for admin approval before creating a new one." });
        setLoading(false);
        return;
      }

      // AI Image Moderate with Sightengine using 'wad' (Weapons, Alcohol, Drugs) and nudity models
      const moderationFormData = new FormData();
      moderationFormData.append('models', 'nudity-2.0,wad');
      moderationFormData.append('api_user', process.env.REACT_APP_SIGHTENGINE_USER);
      moderationFormData.append('api_secret', process.env.REACT_APP_SIGHTENGINE_SECRET);
      moderationFormData.append('media', productImage);

      const moderationResponse = await fetch('https://api.sightengine.com/1.0/check.json', {
        method: 'POST',
        body: moderationFormData,
      });

      const moderationResult = await moderationResponse.json();

      if (moderationResult.status !== "success") {
        setImageError(`Moderation API Error: ${moderationResult.error ? moderationResult.error.message : "Invalid credentials"}`);
        setLoading(false);
        return;
      }

      const weaponScore = moderationResult.weapon || 0;
      const drugsScore = moderationResult.drugs || 0;

      let isHarmful = false;
      let rejectionReason = "";

      if (weaponScore > 0.5) {
        isHarmful = true;
        rejectionReason = "Weapons or firearms detected.";
      } else if (drugsScore > 0.5) {
        isHarmful = true;
        rejectionReason = "Recreational drugs detected.";
      } else if (moderationResult.nudity && moderationResult.nudity.safe < 0.5) {
        isHarmful = true;
        rejectionReason = "Explicit or inappropriate content detected.";
      }

      if (isHarmful) {
        setImageError(`Upload rejected: Our automated system detected ${rejectionReason.toLowerCase()}`);
        setLoading(false);
        return;
      }

      // Upload product image
      const fileExt = productImage.name.split(".").pop();
      const fileName = `product_${userData.id}_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("verification-documents")
        .upload(fileName, productImage);

      if (uploadError) throw uploadError;

      // Insert product donation
      const { error } = await supabase.from("product_donations").insert([
        {
          user_id: userData.id,
          user_name: userData.name,
          user_email: userData.email,
          product_name: formData.productName || null,
          category: finalCategory,
          description: formData.productDescription,
          image_url: uploadData.path,
          status: "pending",
          ai_checked: true,
          ai_result: "safe",
        },
      ]);

      if (error) throw error;

      setFeedback({ type: "success", message: "Product donation submitted! Admin will review it soon. AI check will be performed automatically." });
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      setLoading(false);
      setFeedback({ type: "error", message: "Error submitting donation: " + error.message });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      <AuthenticatedNavbar />
      
      {/* Hero Section */}
      <section className="py-6 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start">
            <button
              type="button"
              onClick={() => navigate("/donate")}
              className="w-10 h-10 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:border-primary-500 hover:bg-primary-50 transition-all flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="text-center max-w-3xl mx-auto flex-1">
              <h1 className="text-3xl md:text-4xl font-bold font-poppins text-gray-900 mb-2">
                Product Donation
              </h1>
              <p className="text-sm text-gray-600">
                Upload product image and details
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-8 -mt-4">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card">
            {feedback && (
              <div
                className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${
                  feedback.type === "success"
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

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="label">Product Name (Optional)</label>
                  <div className="relative">
                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="productName"
                      placeholder="e.g., Laptop, Books, Clothes"
                      value={formData.productName}
                      onChange={handleChange}
                      className="input-field w-full pl-12"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="productCategory"
                    value={formData.productCategory}
                    onChange={handleChange}
                    required
                    className="input-field w-full"
                  >
                    <option value="">Select a category</option>
                    {productCategories.map((cat, index) => (
                      <option key={index} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.productCategory === "Other" && (
                  <div className="animate-fade-in">
                    <label className="label">
                      Specify Category <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="productOtherCategory"
                      placeholder="Enter your category"
                      value={formData.productOtherCategory}
                      onChange={handleChange}
                      required
                      className="input-field w-full"
                    />
                  </div>
                )}

                <div>
                  <label className="label">
                    Product Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="productDescription"
                    placeholder="Describe the product, its condition, and any relevant details..."
                    value={formData.productDescription}
                    onChange={handleChange}
                    rows="5"
                    required
                    className="input-field w-full resize-none"
                  />
                </div>

                <div>
                  <label className="label">
                    Product Image <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    id="productImage"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleProductImageChange}
                    required
                    className="hidden"
                  />
                  <label
                    htmlFor="productImage"
                    className="block cursor-pointer"
                  >
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${imageError ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'}`}>
                      {productImagePreview ? (
                        <div className="space-y-2">
                          <div className="w-32 h-32 mx-auto rounded-lg overflow-hidden border border-gray-200">
                            <img
                              src={productImagePreview}
                              alt="Product preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="font-medium text-gray-900">{productImageName}</p>
                          <p className="text-xs text-gray-500">Click to change image</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <ImageIcon className={`w-8 h-8 mx-auto ${imageError ? 'text-red-400' : 'text-gray-400'}`} />
                          <p className="font-medium text-gray-900">Upload Product Image</p>
                          <p className={`text-xs ${imageError ? 'text-red-500' : 'text-gray-500'}`}>JPG, PNG, or WEBP (Max 5MB)</p>
                        </div>
                      )}
                    </div>
                  </label>
                  {imageError && (
                    <div className="mt-2 text-sm text-red-600 flex items-start gap-1">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{imageError}</span>
                    </div>
                  )}
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
                      <span>Submit Product Donation</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
      </section>
    </div>
  );
}

export default ProductDonationForm;
