import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, Info, Sparkles, Shield, Clock, CreditCard } from "lucide-react";
import AuthenticatedNavbar from "../components/AuthenticatedNavbar";
import { supabase } from "../supabaseClient";
import CustomDropdown from "../components/CustomDropdown";

function CashDonationForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotName, setScreenshotName] = useState("");
  const [formData, setFormData] = useState({
    amount: "",
    category: "",
    otherCategory: "",
    message: "",
  });

  const [feedback, setFeedback] = useState(null);

  const categories = [
    "Medical Treatment",
    "Education",
    "Food & Groceries",
    "House Rent",
    "Utility Bills",
    "Emergency Relief",
    "Other",
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (formData.category === "Other" && !formData.otherCategory.trim()) {
      setFeedback({ type: "error", message: "Please specify the category before continuing." });
      return;
    }

    // Step 1: Go to payment screen
    if (step === 1) {
      if (Number(formData.amount) > 50000) {
        setFeedback({ type: "error", message: "Maximum donation limit is 50,000." });
        return;
      }
      setStep(2);
      return;
    }

    // Step 2: Submit everything
    if (loading) return;
    setLoading(true);

    const user = localStorage.getItem("currentUser");
    if (!user) {
      setLoading(false);
      setFeedback({ type: "error", message: "Please login first to make a donation." });
      navigate("/login");
      return;
    }

    const userData = JSON.parse(user);
    const finalCategory =
      formData.category === "Other"
        ? formData.otherCategory
        : formData.category;

    try {
      // Check for pending donations
      const { data: pending } = await supabase
        .from("cash_donations")
        .select("status")
        .eq("user_id", userData.id)
        .eq("status", "pending");

      if (pending && pending.length > 0) {
        setFeedback({ type: "warning", message: "You already have a pending donation. Please wait for admin approval before creating a new one." });
        setLoading(false);
        return;
      }
      
      const fileExt = screenshot.name.split(".").pop();
      const fileName = `${userData.id}_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("verification-documents")
        .upload(fileName, screenshot);

      if (uploadError) throw uploadError;

      const { error } = await supabase.from("cash_donations").insert([
        {
          user_id: userData.id,
          user_name: userData.name,
          user_email: userData.email,
          amount: formData.amount,
          category: finalCategory,
          message: formData.message,
          screenshot_url: uploadData.path,
        },
      ]);

      if (error) throw error;

      setFeedback({ type: "success", message: "Donation submitted successfully! Admin will review it soon." });
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
            {step === 1 ? (
              <button
                type="button"
                onClick={() => navigate("/donate")}
                className="w-10 h-10 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:border-primary-500 hover:bg-primary-50 transition-all flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-10 h-10 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:border-primary-500 hover:bg-primary-50 transition-all flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            
            <div className="text-center max-w-3xl mx-auto flex-1">
              <h1 className="text-3xl md:text-4xl font-bold font-poppins text-gray-900 mb-2">
                {step === 1 ? "Cash Donation" : "Payment Details"}
              </h1>
              <p className="text-sm text-gray-600">
                {step === 1
                  ? "Fill in your donation details"
                  : "Complete payment and upload proof"}
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
                {step === 1 ? (
                  <>
                    <div>
                      <label className="label">
                        Donation Amount (PKR) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="number"
                          name="amount"
                          placeholder="Enter amount in PKR"
                          value={formData.amount}
                          onChange={handleChange}
                          required
                          className="input-field w-full pl-12"
                          min="1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <CustomDropdown
                        options={categories.map(cat => ({ value: cat, label: cat }))}
                        value={formData.category}
                        onChange={(val) => setFormData({ ...formData, category: val })}
                        placeholder="Select a category"
                      />
                    </div>

                    {formData.category === "Other" && (
                      <div className="animate-fade-in">
                        <label className="label">
                          Specify Category <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="otherCategory"
                          placeholder="Enter your category"
                          value={formData.otherCategory}
                          onChange={handleChange}
                          required
                          className="input-field w-full"
                        />
                      </div>
                    )}

                    <div>
                      <label className="label">Message (Optional)</label>
                      <textarea
                        name="message"
                        placeholder="Add a message of support..."
                        value={formData.message}
                        onChange={handleChange}
                        rows="4"
                        className="input-field w-full resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className={`btn-primary w-full flex items-center justify-center gap-2 ${loading ? 'btn-loading' : ''}`}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          <span>Continue to Payment</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 font-poppins mb-4">Bank Transfer Details</h3>
                      <div className="space-y-2 text-gray-700">
                        <p><strong>Bank:</strong> Meezan Bank</p>
                        <p><strong>Account Title:</strong> Share For Good</p>
                        <p><strong>Account Number:</strong> 01234567890123</p>
                        <p><strong>IBAN:</strong> PK12MEZN0001234567890123</p>
                      </div>
                    </div>

                    <div>
                      <label className="label">
                        Upload Payment Screenshot <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        id="screenshot"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setScreenshot(file);
                            setScreenshotName(file.name);
                          }
                        }}
                        required
                        className="hidden"
                      />
                      <label
                        htmlFor="screenshot"
                        className="block cursor-pointer"
                      >
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 hover:bg-gray-50 transition-all">
                          {screenshotName ? (
                            <div className="space-y-2">
                              <FileText className="w-8 h-8 text-primary-600 mx-auto" />
                              <p className="font-medium text-gray-900">{screenshotName}</p>
                              <p className="text-xs text-gray-500">Click to change file</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                              <p className="font-medium text-gray-900">Upload Payment Screenshot</p>
                              <p className="text-xs text-gray-500">JPG, PNG (Max 10MB)</p>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>

                    <button
                      type="submit"
                      className={`btn-primary w-full flex items-center justify-center gap-2 ${loading ? 'btn-loading' : ''}`}
                      disabled={loading}
                    >
                      {loading ? 'Submitting...' : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          <span>Submit Donation</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </form>
            </div>
          </div>
      </section>
    </div>
  );
}

export default CashDonationForm;
