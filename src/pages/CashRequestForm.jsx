import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, Info, Sparkles, Shield, Clock } from "lucide-react";
import AuthenticatedNavbar from "../components/AuthenticatedNavbar";
import { supabase } from "../supabaseClient";
import CustomDropdown from "../components/CustomDropdown";

function CashRequestForm() {
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    amount: "",
    category: "",
    otherCategory: "",
    description: "",
    proofOfPurpose: null,
    paymentMethod: "bank", // 'bank' or 'easypaisa'
    accountName: "",
    accountNumber: "",
    bankName: "",
    phoneNumber: "",
  });

  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
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
    const { name, value } = e.target;
    
    // Account Name: Only letters and spaces
    if (name === "accountName") {
      if (!/^[a-zA-Z\s]*$/.test(value)) return;
    }
    
    // Account Number: Only numbers, max 14 digits
    if (name === "accountNumber") {
      if (!/^\d*$/.test(value)) return;
      if (value.length > 14) return;
    }

    // Bank Name: Only letters and spaces
    if (name === "bankName") {
      if (!/^[a-zA-Z\s]*$/.test(value)) return;
    }

    // Phone Number: Only numbers, max 11 digits
    if (name === "phoneNumber") {
      if (!/^\d*$/.test(value)) return;
      if (value.length > 11) return;
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    
    // Basic validation for Step 1
    if (!formData.amount || !formData.category || !formData.description || !formData.proofOfPurpose) {
      setFeedback({ type: "error", message: "Please fill all mandatory fields and upload proof." });
      return;
    }
    
    if (formData.category === "Other" && !formData.otherCategory) {
      setFeedback({ type: "error", message: "Please specify your category." });
      return;
    }

    if (Number(formData.amount) > 50000) {
      setFeedback({ type: "error", message: "You cannot request more than 50,000." });
      return;
    }

    setFeedback(null);
    setStep(2);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        proofOfPurpose: file,
      });
      setFileName(file.name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setFeedback(null);

    const user = localStorage.getItem("currentUser");
    if (!user) {
      setFeedback({ type: "error", message: "Please login first to submit a request." });
      navigate("/login");
      setLoading(false);
      return;
    }

    const userData = JSON.parse(user);
    if (!userData.is_verified) {
      setFeedback({
        type: "error",
        message: "Your account must be verified to make requests. Please complete verification first.",
      });
      setLoading(false);
      return;
    }

    if (formData.paymentMethod === "bank") {
      if (!formData.accountName || !formData.accountNumber || !formData.bankName) {
        setFeedback({ type: "error", message: "Please fill all bank details." });
        setLoading(false);
        return;
      }
      if (formData.accountNumber.length !== 14) {
        setFeedback({ type: "error", message: "Invalid account number. It must be exactly 14 digits." });
        setLoading(false);
        return;
      }
    } else {
      if (!formData.phoneNumber) {
        setFeedback({ type: "error", message: "Please enter your EasyPaisa phone number." });
        setLoading(false);
        return;
      }
      if (formData.phoneNumber.length !== 11 || !formData.phoneNumber.startsWith("03")) {
        setFeedback({ type: "error", message: "Invalid phone number. It must be 11 digits and start with '03'." });
        setLoading(false);
        return;
      }
    }

    try {
      // Check for pending requests
      const { data: pending } = await supabase
        .from("cash_requests")
        .select("status")
        .eq("user_id", userData.id)
        .eq("status", "pending");

      if (pending && pending.length > 0) {
        setFeedback({
          type: "warning",
          message: "cash request already in pending",
        });
        setLoading(false);
        return;
      }

      // Upload proof document if provided
      let proofUrl = null;
      if (formData.proofOfPurpose) {
        const fileExt = formData.proofOfPurpose.name.split(".").pop();
        const fileName = `${userData.id}_${Date.now()}.${fileExt}`;
        const filePath = `proof-documents/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("verification-documents")
          .upload(filePath, formData.proofOfPurpose);

        if (uploadError) throw uploadError;
        proofUrl = filePath;
      }

      // Insert cash request with fallback for missing columns
      let { error } = await supabase.from("cash_requests").insert([
        {
          user_id: userData.id,
          user_name: userData.name,
          user_email: userData.email,
          amount: formData.amount,
          category: formData.category === "Other" ? formData.otherCategory : formData.category,
          description: formData.description.trim(),
          proof_url: proofUrl,
          payment_method: formData.paymentMethod,
          account_name: formData.accountName,
          account_number: formData.accountNumber,
          bank_name: formData.bankName,
          phone_number: formData.phoneNumber,
        },
      ]);

      // Fallback: If columns don't exist in Supabase yet, append to description
      if (error && (error.message.includes("column") || error.code === "PGRST116" || error.code === "42703")) {
        console.warn("Retrying with fallback: Bank detail columns missing in database.");
        let paymentInfo = "";
        if (formData.paymentMethod === 'bank') {
          paymentInfo = `\n[BANK DETAILS]\nMethod: Bank Transfer\nBank: ${formData.bankName}\nAccount Name: ${formData.accountName}\nAccount Number: ${formData.accountNumber}`;
        } else {
          paymentInfo = `\n[PAYMENT DETAILS]\nMethod: EasyPaisa\nPhone Number: ${formData.phoneNumber}`;
        }
        
        const fallbackDescription = `${formData.description.trim()}\n${paymentInfo}`;
        
        const retry = await supabase.from("cash_requests").insert([
          {
            user_id: userData.id,
            user_name: userData.name,
            user_email: userData.email,
            amount: formData.amount,
            category: formData.category === "Other" ? formData.otherCategory : formData.category,
            description: fallbackDescription,
            proof_url: proofUrl,
          },
        ]);
        error = retry.error;
      }

      if (error) throw error;

      setFeedback({
        type: "success",
        message: "Cash request submitted successfully! Admin will review it soon.",
      });

      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Error submitting cash request:", error);
      setFeedback({
        type: "error",
        message: "Error submitting request: " + error.message,
      });
    } finally {
      setLoading(false);
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
              onClick={() => navigate("/request-donation")}
              className="w-10 h-10 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:border-primary-500 hover:bg-primary-50 transition-all flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="text-center max-w-3xl mx-auto flex-1">
              <h1 className="text-3xl md:text-4xl font-bold font-poppins text-gray-900 mb-2">
                Cash Request
              </h1>
              <p className="text-sm text-gray-600">
                Fill in the details for your financial assistance request.
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

              <form onSubmit={step === 1 ? handleNextStep : handleSubmit} className="space-y-6">
                {step === 1 ? (
                  <div className="space-y-6 animate-slide-in">
                    <div>
                      <label className="label">
                        Amount Needed (PKR) <span className="text-red-500">*</span>
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
                      <label className="label">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="description"
                        placeholder="Explain in detail why you need this financial help..."
                        value={formData.description}
                        onChange={handleChange}
                        rows="6"
                        required
                        className="input-field w-full resize-none"
                      />
                    </div>

                    <div>
                      <label className="label">
                        Proof of Purpose <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        id="proofOfPurpose"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        required
                        className="hidden"
                      />
                      <label
                        htmlFor="proofOfPurpose"
                        className="block cursor-pointer"
                      >
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 hover:bg-gray-50 transition-all">
                          {fileName ? (
                            <div className="space-y-2">
                              <FileText className="w-8 h-8 text-primary-600 mx-auto" />
                              <p className="font-medium text-gray-900">{fileName}</p>
                              <p className="text-xs text-gray-500">Click to change file</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                              <p className="font-medium text-gray-900">Upload Proof Document</p>
                              <p className="text-xs text-gray-500">PDF, JPG, PNG (Max 10MB)</p>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <span>Next Step</span>
                      <ArrowLeft className="w-5 h-5 rotate-180" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6 animate-slide-in">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-gray-900 font-poppins">
                        Enter your bank details to receive money
                      </h3>
                      <p className="text-sm text-gray-500">Choose your preferred payment method</p>
                    </div>

                    <div className="flex gap-4 p-1 bg-gray-100 rounded-xl mb-6">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, paymentMethod: "bank" })}
                        className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
                          formData.paymentMethod === "bank"
                            ? "bg-white text-primary-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Bank Transfer
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, paymentMethod: "easypaisa" })}
                        className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
                          formData.paymentMethod === "easypaisa"
                            ? "bg-white text-primary-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        EasyPaisa
                      </button>
                    </div>

                    {formData.paymentMethod === "bank" ? (
                      <div className="space-y-4 animate-fade-in">
                        <div>
                          <label className="label">Bank Name <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            name="bankName"
                            placeholder="e.g., HBL, Meezan Bank, Alfalah"
                            value={formData.bankName}
                            onChange={handleChange}
                            required
                            className="input-field w-full"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="label">Account Name (Title) <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              name="accountName"
                              value={formData.accountName}
                              onChange={handleChange}
                              required
                              className="input-field w-full"
                            />
                          </div>
                          <div>
                            <label className="label">Account Number (14 Digits) <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              name="accountNumber"
                              value={formData.accountNumber}
                              onChange={handleChange}
                              required
                              className="input-field w-full"
                              maxLength={14}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="animate-fade-in">
                        <label className="label">EasyPaisa Phone Number (11 Digits) <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <input
                            type="text"
                            name="phoneNumber"
                            placeholder="03XXXXXXXXX"
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            required
                            className="input-field w-full"
                            maxLength={11}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="btn-secondary flex-1 flex items-center justify-center gap-2"
                      >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back</span>
                      </button>
                      <button
                        type="submit"
                        className={`btn-primary flex-[2] flex items-center justify-center gap-2 ${loading ? 'btn-loading' : ''}`}
                        disabled={loading}
                      >
                        {loading ? 'Submitting...' : (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            <span>Submit Request</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
      </section>
    </div>
  );
}

export default CashRequestForm;

