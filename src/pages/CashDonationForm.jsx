import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, CreditCard } from "lucide-react";
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

  const processSteps = [
    { title: "Amount & Category", desc: "Specify how much and where to help" },
    { title: "Bank Transfer", desc: "Transfer funds to our verified account" },
    { title: "Upload Proof", desc: "Share the transaction screenshot" },
    { title: "Verification", desc: "Wait for admin to verify and approve" },
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

    if (step === 1) {
      if (Number(formData.amount) > 50000) {
        setFeedback({ type: "error", message: "Maximum donation limit is 50,000." });
        return;
      }
      setStep(2);
      return;
    }

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
      const { data: pending } = await supabase
        .from("cash_donations")
        .select("status")
        .eq("user_id", userData.id)
        .eq("status", "pending");

      if (pending && pending.length > 0) {
        setFeedback({ type: "warning", message: "Cash Donation already in pending" });
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
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black transition-all duration-500 shadow-sm text-xl border ${(step === 1 && index === 0) || (step === 2 && index > 0 && index < 3)
                      ? "bg-[#124074] text-white border-[#124074]"
                      : "bg-white text-slate-400 border-slate-200 group-hover:bg-[#124074] group-hover:text-white group-hover:border-[#124074]"
                    }`}>
                    {index + 1}
                  </div>
                  {index < processSteps.length - 1 && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[1px] h-12 bg-gradient-to-b from-slate-200 to-transparent"></div>
                  )}
                </div>
                <div>
                  <h4 className={`text-lg font-black uppercase tracking-widest transition-colors ${(step === 1 && index === 0) || (step === 2 && index > 0 && index < 3)
                      ? "text-[#124074]"
                      : "text-slate-500 group-hover:text-[#124074]"
                    }`}>{s.title}</h4>
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
              onClick={() => step === 1 ? navigate("/donate") : setStep(1)}
              className="flex items-center gap-2 text-slate-500 hover:text-[#124074] font-bold uppercase tracking-widest text-xs mt-4 mb-6 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span>Back</span>
            </button>

            <h1 className="text-4xl md:text-5xl font-medium mb-6 tracking-tighter leading-[1.1] text-[#124074]">
              {step === 1 ? "Cash" : "Payment"} <br/>
              <span className="text-[#124074] font-black">{step === 1 ? "Donation" : "Details"}</span>
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

            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 1 ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Donation Amount (PKR)</label>
                    <div className="relative group">
                      <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-[#124074] transition-colors" />
                      <input
                        type="number"
                        name="amount"
                        placeholder="Enter amount in PKR"
                        value={formData.amount}
                        onChange={handleChange}
                        required
                        className="w-full bg-white border border-slate-200 rounded-[1.5rem] py-4 pl-14 pr-6 text-lg font-light focus:border-[#124074] focus:ring-4 focus:ring-[#124074]/5 transition-all outline-none placeholder:text-slate-200"
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Assistance Category</label>
                    <CustomDropdown
                      options={categories.map(cat => ({ value: cat, label: cat }))}
                      value={formData.category}
                      onChange={(val) => setFormData({ ...formData, category: val })}
                      placeholder="Select a category"
                      className="!rounded-[1.5rem] !py-4 !px-6 !text-lg !font-light"
                    />
                  </div>

                  {formData.category === "Other" && (
                    <div className="space-y-2 animate-fade-in">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Specify Category</label>
                      <input
                        type="text"
                        name="otherCategory"
                        placeholder="What are you supporting?"
                        value={formData.otherCategory}
                        onChange={handleChange}
                        required
                        className="w-full bg-white border border-slate-200 rounded-[1.5rem] py-4 px-6 text-lg font-light focus:border-[#124074] focus:ring-4 focus:ring-[#124074]/5 transition-all outline-none placeholder:text-slate-200"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Message of Support</label>
                    <textarea
                      name="message"
                      placeholder="Add a message (Optional)..."
                      value={formData.message}
                      onChange={handleChange}
                      rows="3"
                      className="w-full bg-white border border-slate-200 rounded-[2rem] py-4 px-6 text-lg font-light focus:border-[#124074] focus:ring-4 focus:ring-[#124074]/5 transition-all outline-none placeholder:text-slate-200 resize-none"
                    />
                  </div>

                  <div className="flex justify-center pt-0">
                    <button
                      type="submit"
                      className="w-max bg-[#124074] text-white rounded-[1.5rem] py-3.5 px-10 text-base font-black uppercase tracking-widest shadow-2xl shadow-blue-900/20 hover:scale-[1.02] hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3"
                      disabled={loading}
                    >
                      <span>Proceed to Pay</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-3 mb-6">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight mb-4">Bank Details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bank</span>
                        <span className="text-base font-bold text-[#124074]">Meezan Bank</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Title</span>
                        <span className="text-base font-bold text-[#124074]">Share For Good</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account</span>
                        <span className="text-base font-bold text-[#124074]">01234567890123</span>
                      </div>
                      <div className="flex flex-col gap-1 pt-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">IBAN</span>
                        <span className="text-sm font-bold text-[#124074] break-all">PK12MEZN0001234567890123</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Upload Payment Screenshot</label>
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
                      className="block cursor-pointer group"
                    >
                      <div className="border-4 border-dashed border-slate-200 rounded-[2rem] p-6 text-center group-hover:border-[#124074] group-hover:bg-slate-50 transition-all duration-500">
                        {screenshotName ? (
                          <div className="space-y-2 animate-fade-in">
                            <FileText className="w-10 h-10 text-[#124074] mx-auto" strokeWidth={1} />
                            <p className="text-sm font-bold text-slate-900">{screenshotName}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#124074]">Click to change</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Upload className="w-10 h-10 text-slate-200 mx-auto group-hover:text-[#124074] transition-colors" strokeWidth={1} />
                            <p className="text-base font-bold text-slate-400 group-hover:text-slate-600 transition-colors">Select Proof</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">JPG, PNG (Max 10MB)</p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  <div className="flex justify-center pt-2">
                    <button
                      type="submit"
                      className={`w-max bg-[#124074] text-white rounded-[1.5rem] py-5 px-12 text-lg font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-900/20 hover:scale-[1.02] hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3 ${loading ? 'opacity-70 pointer-events-none' : ''}`}
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="animate-pulse">Processing...</span>
                      ) : (
                        <span>Submit Donation</span>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default CashDonationForm;
