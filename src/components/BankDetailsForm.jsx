import React, { useState } from 'react';
import { CreditCard, User, Check, X, Smartphone, Building } from 'lucide-react';

function BankDetailsForm({ notification, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    accountHolderName: '',
    paymentMethod: 'mobile', // 'mobile' or 'bank'
    mobileNumber: '',
    bankDetails: '',
    relatedNotificationId: notification?.id || null
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required';
    } else if (/\d/.test(formData.accountHolderName)) {
      newErrors.accountHolderName = 'Account holder name cannot contain numbers';
    }
    
    if (formData.paymentMethod === 'mobile') {
      if (!formData.mobileNumber.trim()) {
        newErrors.mobileNumber = 'Mobile number is required';
      } else if (!/^03\d{9}$/.test(formData.mobileNumber.replace(/\s/g, ''))) {
        newErrors.mobileNumber = 'Invalid phone number';
      }
    } else if (formData.paymentMethod === 'bank') {
      if (!formData.bankDetails.trim()) {
        newErrors.bankDetails = 'Account number is required';
      } else if (!/^\d{14}$/.test(formData.bankDetails.replace(/\s/g, ''))) {
        newErrors.bankDetails = 'Account number must be exactly 14 digits';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log("Form submission started with data:", formData);
    
    if (!validateForm()) {
      console.log("Form validation failed:", errors);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log("Calling onSubmit with data:", formData);
      await onSubmit(formData);
      console.log("onSubmit completed successfully");
      onClose();
    } catch (error) {
      console.error('Error submitting bank details:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      setErrors({ submit: `Failed to submit bank details: ${error.message || 'Unknown error'}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    // Prevent numbers in account holder name
    if (field === 'accountHolderName') {
      // Allow only letters, spaces, and common punctuation
      if (!/^[a-zA-Z\s\-'.]*$/.test(value)) {
        return; // Don't update if invalid characters are entered
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleMobileNumberChange = (e) => {
    let value = e.target.value.replace(/\s/g, ''); // Remove spaces
    
    // Only allow numeric characters
    if (!/^\d*$/.test(value)) {
      return; // Don't update if non-numeric characters are entered
    }
    
    // Limit to 11 digits
    if (value.length > 11) {
      value = value.slice(0, 11);
    }
    
    handleInputChange('mobileNumber', value);
  };

  const handleAccountNumberChange = (e) => {
    let value = e.target.value.replace(/\s/g, ''); // Remove spaces
    
    // Only allow numeric characters
    if (!/^\d*$/.test(value)) {
      return; // Don't update if non-numeric characters are entered
    }
    
    // Limit to 14 digits
    if (value.length > 14) {
      value = value.slice(0, 14);
    }
    
    handleInputChange('bankDetails', value);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Provide Bank Details</h2>
                <p className="text-blue-100 text-sm">
                  To receive your approved cash request payment
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Account Holder Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Payment Details
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Holder Name *
              </label>
              <input
                type="text"
                value={formData.accountHolderName}
                onChange={(e) => handleInputChange('accountHolderName', e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                  errors.accountHolderName ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter full name as it appears on bank account"
              />
              {errors.accountHolderName && (
                <p className="mt-1 text-sm text-red-600">{errors.accountHolderName}</p>
              )}
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Payment Method *
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleInputChange('paymentMethod', 'mobile')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  formData.paymentMethod === 'mobile'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <Smartphone className="w-6 h-6" />
                <span className="font-medium">Mobile Number</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleInputChange('paymentMethod', 'bank')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  formData.paymentMethod === 'bank'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                <Building className="w-6 h-6" />
                <span className="font-medium">Bank</span>
              </button>
            </div>
          </div>

          {/* Payment Details Based on Selection */}
          <div className="space-y-4">
            {formData.paymentMethod === 'mobile' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number *
                </label>
                <input
                  type="text"
                  value={formData.mobileNumber}
                  onChange={handleMobileNumberChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono ${
                    errors.mobileNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="03XXXXXXXXX"
                  maxLength={11}
                />
                {errors.mobileNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.mobileNumber}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Enter 11-digit mobile number starting with 03
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number *
                </label>
                <input
                  type="text"
                  value={formData.bankDetails}
                  onChange={handleAccountNumberChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono ${
                    errors.bankDetails ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Enter account number (e.g., 12345678901234)"
                  maxLength={14}
                />
                {errors.bankDetails && (
                  <p className="mt-1 text-sm text-red-600">{errors.bankDetails}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Enter 14-digit account number
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Done
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BankDetailsForm;
