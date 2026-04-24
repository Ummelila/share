import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, Image as ImageIcon } from "lucide-react";
import AuthenticatedNavbar from "../components/AuthenticatedNavbar";
import { supabase } from "../supabaseClient";
import CustomDropdown from "../components/CustomDropdown";

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

  const processSteps = [
    { title: "Product Details", desc: "Tell us what you are donating" },
    { title: "Visual Proof", desc: "Upload a clear photo of the item" },
    { title: "AI Moderation", desc: "Automated check for prohibited items" },
    { title: "Admin Review", desc: "Final verification by our team" },
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
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setFeedback({ type: 'error', message: 'Only JPG, PNG, and WEBP images are allowed.' });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setFeedback({ type: 'error', message: 'Image size must be less than 5MB.' });
        return;
      }

      setProductImage(file);
      setProductImageName(file.name);

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

    if (!formData.productName.trim()) {
      setFeedback({ type: "error", message: "Please enter the product name." });
      setLoading(false);
      return;
    }

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
      const { data: pending } = await supabase
        .from("product_donations")
        .select("status")
        .eq("user_id", userData.id)
        .eq("status", "pending");

      if (pending && pending.length > 0) {
        setFeedback({ type: "warning", message: "Product donation already in pending" });
        setLoading(false);
        return;
      }

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

      const fileExt = productImage.name.split(".").pop();
      const fileName = `product_${userData.id}_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("verification-documents")
        .upload(fileName, productImage);

      if (uploadError) throw uploadError;

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

      setFeedback({ type: "success", message: "Product donation submitted! Admin will review it soon. AI check completed successfully." });
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      setLoading(false);
      setFeedback({ type: "error", message: "Error submitting donation: " + error.message });
    }
  };

  return (
    <div className="h-screen bg-white text-slate-900 flex flex-col font-poppins overflow-hidden">
      <AuthenticatedNavbar />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Panel: Process Sidebar */}
        <aside className="w-[480px] bg-slate-50 border-r border-slate-200 p-16 flex flex-col justify-center animate-fade-in shrink-0">
          <div className="mb-14">
            <h2 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">Donation <span className="text-slate-300">Process</span></h2>
          </div>

          <div className="space-y-12">
            {processSteps.map((s, index) => (
              <div key={index} className="flex gap-8 group">
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-black text-slate-400 group-hover:bg-[#124074] group-hover:text-white group-hover:border-[#124074] transition-all duration-500 shadow-sm group-hover:shadow-blue-900/10 text-xl">
                    {index + 1}
                  </div>
                  {index < processSteps.length - 1 && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[1px] h-12 bg-gradient-to-b from-slate-200 to-transparent"></div>
                  )}
                </div>
                <div>
                  <h4 className="text-lg font-black uppercase tracking-widest text-slate-500 group-hover:text-[#124074] transition-colors">{s.title}</h4>
                  <p className="text-base text-slate-400 font-medium leading-relaxed mt-3 group-hover:text-slate-600 transition-colors max-w-[280px]">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Right Panel: Form Area */}
        <main className="flex-1 relative flex flex-col pt-4 lg:pt-6 pb-8 lg:pb-12 px-8 lg:px-12 overflow-hidden bg-slate-50/30">
          <div className="max-w-2xl w-full mx-auto animate-slide-up">
            <button
              onClick={() => navigate("/donate")}
              className="flex items-center gap-2 text-slate-500 hover:text-[#124074] font-bold uppercase tracking-widest text-xs mt-4 mb-6 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span>Back</span>
            </button>

            <h1 className="text-4xl md:text-5xl font-medium mb-6 tracking-tighter leading-[1.1] text-[#124074]">
              Product <br/>
              <span className="text-[#124074] font-black">Donation</span>
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

            <form onSubmit={handleSubmit} className="space-y-6 pb-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Product Name</label>
                <div className="relative group">
                  <Package className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#124074] transition-colors" />
                  <input
                    type="text"
                    name="productName"
                    placeholder="e.g., Laptop, Books, Clothes"
                    value={formData.productName}
                    onChange={handleChange}
                    required
                    className="w-full bg-white border border-slate-200 rounded-[1.5rem] py-4 pl-14 pr-6 text-lg font-light focus:border-[#124074] focus:ring-4 focus:ring-[#124074]/5 transition-all outline-none placeholder:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Category</label>
                  <CustomDropdown
                    options={productCategories.map(cat => ({ value: cat, label: cat }))}
                    value={formData.productCategory}
                    onChange={(val) => setFormData({ ...formData, productCategory: val })}
                    placeholder="Select"
                    className="!rounded-[1.5rem] !py-4 !px-6 !text-lg !font-light"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Specify (If Other)</label>
                  <input
                    type="text"
                    name="productOtherCategory"
                    placeholder="Category"
                    value={formData.productOtherCategory}
                    onChange={handleChange}
                    disabled={formData.productCategory !== "Other"}
                    className="w-full bg-white border border-slate-200 rounded-[1.5rem] py-4 px-6 text-lg font-light focus:border-[#124074] focus:ring-4 focus:ring-[#124074]/5 transition-all outline-none placeholder:text-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Description</label>
                <textarea
                  name="productDescription"
                  placeholder="Describe the item condition..."
                  value={formData.productDescription}
                  onChange={handleChange}
                  rows="2"
                  required
                  className="w-full bg-white border border-slate-200 rounded-[1.5rem] py-4 px-6 text-lg font-light focus:border-[#124074] focus:ring-4 focus:ring-[#124074]/5 transition-all outline-none placeholder:text-slate-200 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Product Image</label>
                <input
                  type="file"
                  id="productImage"
                  accept="image/*"
                  onChange={handleProductImageChange}
                  required
                  className="hidden"
                />
                <label htmlFor="productImage" className="block cursor-pointer group">
                  <div className={`border-2 border-dashed rounded-[1.5rem] p-4 text-center transition-all duration-500 ${imageError ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-[#124074] hover:bg-slate-50'}`}>
                    {productImagePreview ? (
                      <div className="flex items-center gap-4 animate-fade-in">
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                          <img src={productImagePreview} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <p className="text-sm font-bold text-slate-900 truncate">{productImageName}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#124074] ml-auto">Change</p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-3">
                        <ImageIcon className={`w-5 h-5 ${imageError ? 'text-red-400' : 'text-slate-300 group-hover:text-[#124074]'}`} />
                        <p className="text-sm font-bold text-slate-400 group-hover:text-slate-600">Click to upload photo</p>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              <div className="flex justify-center pt-0">
                <button
                  type="submit"
                  className={`w-max bg-[#124074] text-white rounded-[1.5rem] py-3.5 px-10 text-base font-black uppercase tracking-widest shadow-2xl shadow-blue-900/20 hover:scale-[1.02] hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3 ${loading ? 'opacity-70 pointer-events-none' : ''}`}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="animate-pulse text-base">Submitting...</span>
                  ) : (
                    <span>Submit Product</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ProductDonationForm;
