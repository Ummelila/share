import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, CreditCard } from "lucide-react";
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

  const processSteps = [
    { title: "Need Details", desc: "Specify amount and purpose" },
    { title: "Proof Upload", desc: "Share relevant documentation" },
    { title: "Payment Info", desc: "How you want to receive funds" },
    { title: "Verification", desc: "Wait for admin to verify needs" },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "accountName") { if (!/^[a-zA-Z\s]*$/.test(value)) return; }
    if (name === "accountNumber") { if (!/^\d*$/.test(value)) return; if (value.length > 14) return; }
    if (name === "bankName") { if (!/^[a-zA-Z\s]*$/.test(value)) return; }
    if (name === "phoneNumber") { if (!/^\d*$/.test(value)) return; if (value.length > 11) return; }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleNextStep = (e) => {
    e.preventDefault();
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
      setFeedback({ type: "error", message: "Your account must be verified to make requests." });
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
        setFeedback({ type: "error", message: "Invalid phone number." });
        setLoading(false);
        return;
      }
    }

    try {
      const { data: pending } = await supabase
        .from("cash_requests")
        .select("status")
        .eq("user_id", userData.id)
        .eq("status", "pending");

      if (pending && pending.length > 0) {
        setFeedback({ type: "warning", message: "cash request already in pending" });
        setLoading(false);
        return;
      }

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

      if (error && (error.message.includes("column") || error.code === "PGRST116" || error.code === "42703")) {
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

      setFeedback({ type: "success", message: "Cash request submitted successfully! Admin will review it soon." });
      setTimeout(() => { navigate("/dashboard"); }, 2000);
    } catch (error) {
      setFeedback({ type: "error", message: "Error submitting request: " + error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-white text-slate-900 flex flex-col font-poppins overflow-hidden">
      <AuthenticatedNavbar />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Panel: Process Sidebar */}
        <aside className="w-[480px] bg-slate-50 border-r border-slate-200 p-16 flex flex-col justify-center animate-fade-in shrink-0">
          <div className="mb-14">
            <h2 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">Request <span className="text-slate-300">Process</span></h2>
          </div>

          <div className="space-y-12">
            {processSteps.map((s, index) => (
              <div key={index} className="flex gap-8 group">
                <div className="relative shrink-0">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black transition-all duration-500 shadow-sm text-xl border ${(step === 1 && index < 2) || (step === 2 && index >= 2)
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
                  <h4 className={`text-lg font-black uppercase tracking-widest transition-colors ${(step === 1 && index < 2) || (step === 2 && index >= 2)
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
              onClick={() => step === 1 ? navigate("/request-donation") : setStep(1)}
              className="flex items-center gap-2 text-slate-500 hover:text-[#124074] font-bold uppercase tracking-widest text-xs mt-4 mb-6 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span>Back</span>
            </button>

            <h1 className="text-4xl md:text-5xl font-medium mb-6 tracking-tighter leading-[1.1] text-[#124074]">
              Cash <br/>
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

            <form onSubmit={step === 1 ? handleNextStep : handleSubmit} className="space-y-5 pb-5">
              {step === 1 ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Amount (PKR)</label>
                      <div className="relative group">
                        <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#124074] transition-colors" />
                        <input
                          type="number"
                          name="amount"
                          placeholder="Amount"
                          value={formData.amount}
                          onChange={handleChange}
                          required
                          className="w-full bg-white border border-slate-200 rounded-[1.5rem] py-4 pl-12 pr-6 text-lg font-light focus:border-[#124074] focus:ring-4 focus:ring-[#124074]/5 transition-all outline-none placeholder:text-slate-200"
                          min="1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Category</label>
                      <CustomDropdown
                        options={categories.map(cat => ({ value: cat, label: cat }))}
                        value={formData.category}
                        onChange={(val) => setFormData({ ...formData, category: val })}
                        placeholder="Select"
                        className="!rounded-[1.5rem] !py-4 !px-6 !text-lg !font-light"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Reason / Description</label>
                    <textarea
                      name="description"
                      placeholder="Why do you need this help? Be brief but specific."
                      value={formData.description}
                      onChange={handleChange}
                      rows="2"
                      required
                      className="w-full bg-white border border-slate-200 rounded-[1.5rem] py-4 px-6 text-lg font-light focus:border-[#124074] focus:ring-4 focus:ring-[#124074]/5 transition-all outline-none placeholder:text-slate-200 resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Evidence / Proof</label>
                    <input
                      type="file"
                      id="proofOfPurpose"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      required
                      className="hidden"
                    />
                    <label htmlFor="proofOfPurpose" className="block cursor-pointer group">
                      <div className="border-2 border-dashed border-slate-200 rounded-[1.5rem] p-4 text-center group-hover:border-[#124074] group-hover:bg-slate-50 transition-all duration-500">
                        {fileName ? (
                          <div className="flex items-center gap-4 animate-fade-in">
                            <FileText className="w-6 h-6 text-[#124074]" strokeWidth={1} />
                            <p className="text-sm font-bold text-slate-900 truncate">{fileName}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#124074] ml-auto">Change</p>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-3">
                            <Upload className="w-5 h-5 text-slate-300 group-hover:text-[#124074]" strokeWidth={1} />
                            <p className="text-sm font-bold text-slate-400 group-hover:text-slate-600">Click to upload Proof</p>
                          </div>
                        )}
                      </div>
                    </label>
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
                  <div className="flex gap-3 p-1.5 bg-slate-100 rounded-[1.5rem] mb-6">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: "bank" })}
                      className={`flex-1 py-3 rounded-[1rem] text-sm font-black uppercase tracking-widest transition-all ${formData.paymentMethod === "bank" ? "bg-white text-[#124074] shadow-md" : "text-slate-400"}`}
                    >
                      Bank
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: "easypaisa" })}
                      className={`flex-1 py-3 rounded-[1rem] text-sm font-black uppercase tracking-widest transition-all ${formData.paymentMethod === "easypaisa" ? "bg-white text-[#124074] shadow-md" : "text-slate-400"}`}
                    >
                      EasyPaisa
                    </button>
                  </div>

                  {formData.paymentMethod === "bank" ? (
                    <div className="space-y-4 animate-fade-in">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Bank Name</label>
                        <input
                          type="text"
                          name="bankName"
                          placeholder="e.g., Meezan Bank"
                          value={formData.bankName}
                          onChange={handleChange}
                          required
                          className="w-full bg-white border border-slate-200 rounded-[1.5rem] py-4 px-6 text-lg font-light focus:border-[#124074] transition-all outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Account Title</label>
                          <input
                            type="text"
                            name="accountName"
                            placeholder="Title"
                            value={formData.accountName}
                            onChange={handleChange}
                            required
                            className="w-full bg-white border border-slate-200 rounded-[1.5rem] py-4 px-6 text-lg font-light focus:border-[#124074] transition-all outline-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Account No.</label>
                          <input
                            type="text"
                            name="accountNumber"
                            placeholder="14 digits"
                            value={formData.accountNumber}
                            onChange={handleChange}
                            required
                            className="w-full bg-white border border-slate-200 rounded-[1.5rem] py-4 px-6 text-lg font-light focus:border-[#124074] transition-all outline-none"
                            maxLength={14}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 animate-fade-in">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Phone Number</label>
                      <input
                        type="text"
                        name="phoneNumber"
                        placeholder="03XXXXXXXXX"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        required
                        className="w-full bg-white border border-slate-200 rounded-[1.5rem] py-4 px-6 text-lg font-light focus:border-[#124074] transition-all outline-none"
                        maxLength={11}
                      />
                    </div>
                  )}

                  <div className="flex flex-col items-center gap-4 pt-4">
                    <button
                      type="submit"
                      className={`w-max bg-[#124074] text-white rounded-[1.5rem] py-3.5 px-10 text-base font-black uppercase tracking-widest shadow-2xl shadow-blue-900/20 hover:scale-[1.02] hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3 ${loading ? 'opacity-70' : ''}`}
                      disabled={loading}
                    >
                      {loading ? <span className="animate-pulse text-base">Submitting...</span> : (
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
          </div>
        </main>
      </div>
    </div>
  );
}

export default CashRequestForm;
