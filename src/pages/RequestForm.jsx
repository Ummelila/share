import React from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, Package, ArrowRight, HeartHandshake } from "lucide-react";
import AuthenticatedNavbar from "../components/AuthenticatedNavbar";

function RequestForm() {
  const navigate = useNavigate();

  const handleTypeSelect = (type) => {
    if (type === "cash") {
      navigate("/cash-request");
    } else if (type === "product") {
      navigate("/browse");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      <AuthenticatedNavbar />

      {/* Hero Section */}
      <section className="py-6 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold font-poppins text-gray-900 mb-2">
            Request Donation
          </h1>
          <p className="text-sm text-gray-600 max-w-2xl mx-auto">
            Choose the type of assistance you need. We're here to help you get back on your feet.
          </p>
        </div>
      </section>

      {/* Selection Cards */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Cash Request Card */}
            <div
              onClick={() => handleTypeSelect("cash")}
              className="card cursor-pointer hover:border-primary-500 transition-colors"
            >
              <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold font-poppins text-gray-900 mb-3">
                Cash Request
              </h3>
              <p className="text-gray-600 mb-6">
                Request financial assistance for medical bills, education, rent, or other essential needs.
              </p>
              <div className="flex items-center text-primary-600 font-semibold">
                <span>Request Cash</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </div>
            </div>

            {/* Product Request Card */}
            <div
              onClick={() => handleTypeSelect("product")}
              className="card cursor-pointer hover:border-primary-500 transition-colors"
            >
              <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold font-poppins text-gray-900 mb-3">
                Product Request
              </h3>
              <p className="text-gray-600 mb-6">
                Browse available products and request items like clothes, books, electronics, and more.
              </p>
              <div className="flex items-center text-primary-600 font-semibold">
                <span>Browse Products</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-16 max-w-3xl mx-auto">
            <div className="card bg-gray-50 border border-gray-200 p-6">
              <h4 className="text-lg font-semibold font-poppins text-gray-900 mb-3">
                How It Works
              </h4>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 font-bold">1.</span>
                  <span>Select the type of assistance you need (Cash or Product)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 font-bold">2.</span>
                  <span>Fill out the request form with necessary details</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 font-bold">3.</span>
                  <span>Wait for admin approval (usually 2-3 business days)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary-600 font-bold">4.</span>
                  <span>Receive assistance once your request is approved</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default RequestForm;
