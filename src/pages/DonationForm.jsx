import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AuthenticatedNavbar from "../components/AuthenticatedNavbar";

function DonationForm() {
  const navigate = useNavigate();

  const handleTypeSelect = (type) => {
    if (type === "cash") {
      navigate("/cash-donation");
    } else if (type === "product") {
      navigate("/product-donation");
    }
  };

  const processSteps = [
    { title: "Select Type", desc: "Select the mode of donation" },
    { title: "Fill Form", desc: "Fill the donation form" },
    { title: "Under Review", desc: "Submit for administrative verification" },
    { title: "Get Notified", desc: "Get notified once the process is complete" },
  ];

  return (
    <div className="h-screen bg-white text-slate-900 flex flex-col font-poppins overflow-hidden">
      <AuthenticatedNavbar />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Panel: How It Works */}
        <aside className="w-[480px] bg-slate-50 border-r border-slate-200 p-16 flex flex-col justify-center animate-fade-in shrink-0">
          <div className="mb-14">
            <h2 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">How It <span className="text-slate-300">Works</span></h2>
          </div>

          <div className="space-y-12">
            {processSteps.map((step, index) => (
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
                  <h4 className="text-lg font-black uppercase tracking-widest text-slate-500 group-hover:text-[#124074] transition-colors">{step.title}</h4>
                  <p className="text-base text-slate-400 font-medium leading-relaxed mt-3 group-hover:text-slate-600 transition-colors max-w-[280px]">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Right Panel: Options */}
        <main className="flex-1 relative flex flex-col justify-center p-20 overflow-hidden bg-slate-50/30">
          <div className="relative z-10 w-full max-w-6xl animate-slide-up text-left">
            <h1 className="text-5xl md:text-7xl font-medium mb-8 tracking-tighter leading-[1.1] text-[#124074]">
              Donation <br/>
              <span className="text-[#124074] font-black">Hub</span>
            </h1>

            <div className="grid md:grid-cols-2 gap-12">
              {/* Cash Donation Card */}
              <div
                onClick={() => handleTypeSelect("cash")}
                className="group relative bg-[#2A6F97] rounded-[3.5rem] p-12 transition-all duration-700 hover:scale-[1.03] hover:-translate-y-4 cursor-pointer text-left shadow-[0_30px_60px_rgba(42,111,151,0.25)] hover:shadow-[0_50px_100px_rgba(42,111,151,0.35)]"
              >
                <h3 className="text-4xl font-black mb-6 tracking-tight text-white">Donate Cash</h3>
                <p className="text-lg text-white/80 font-medium leading-relaxed tracking-tight mb-14">
                  Contribute funds to support medical bills, education scholarships, or critical community projects.
                </p>
                <div className="flex items-center gap-3 text-xl font-black uppercase tracking-[0.2em] text-white transition-colors">
                  <span>Donate Cash</span>
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </div>
              </div>

              {/* Product Donation Card */}
              <div
                onClick={() => handleTypeSelect("product")}
                className="group relative bg-[#2A6F97] rounded-[3.5rem] p-12 transition-all duration-700 hover:scale-[1.03] hover:-translate-y-4 cursor-pointer text-left shadow-[0_30px_60px_rgba(42,111,151,0.25)] hover:shadow-[0_50px_100px_rgba(42,111,151,0.35)]"
              >
                <h3 className="text-4xl font-black mb-6 tracking-tight text-white">Donate Product</h3>
                <p className="text-lg text-white/80 font-medium leading-relaxed tracking-tight mb-14">
                  Share surplus clothing, books, or electronics. Our logistics ensure they reach those in need.
                </p>
                <div className="flex items-center gap-3 text-xl font-black uppercase tracking-[0.2em] text-white transition-colors">
                  <span>Donate Product</span>
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default DonationForm;
