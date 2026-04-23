import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload, CheckCircle, AlertCircle, Info, Sparkles, Shield, Clock, ArrowLeft, Lock } from 'lucide-react';
import { supabase } from '../supabaseClient';
import AuthenticatedNavbar from '../components/AuthenticatedNavbar';

function VerifyDocuments() {
  const navigate = useNavigate();
  const [affidavit, setAffidavit] = useState(null);
  const [fileName, setFileName] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error'|'warning', message }

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setFeedback({ type: 'error', message: 'Only PDF, JPG, and PNG files are allowed.' });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setFeedback({ type: 'error', message: 'File size must be less than 10MB.' });
        return;
      }

      setAffidavit(file);
      setFileName(file.name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;
    setFeedback(null);
    setLoading(true);

    const user = localStorage.getItem('currentUser');
    if (!user) {
      setFeedback({ type: 'error', message: 'Please login first to submit verification.' });
      navigate('/login');
      return;
    }

    const userData = JSON.parse(user);

    try {
      const fileExt = affidavit.name.split('.').pop();
      const uniqueFileName = `${userData.id}_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('verification-documents')
        .upload(uniqueFileName, affidavit);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('verification_requests')
        .insert([{
          user_id: userData.id,
          user_name: userData.name,
          user_email: userData.email,
          affidavit_name: fileName,
          affidavit_url: uploadData.path,
          reason: reason,
          status: 'pending'
        }]);

      if (dbError) throw dbError;

      setFeedback({ type: 'success', message: 'Verification request submitted! Admin will review within 24-48 hours.' });
      setLoading(false);
      navigate('/dashboard');
    } catch (error) {
      setLoading(false);
      setFeedback({ type: 'error', message: 'Error submitting verification: ' + error.message });
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
              onClick={() => navigate("/dashboard")}
              className="w-10 h-10 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:border-primary-500 hover:bg-primary-50 transition-all flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="text-center max-w-3xl mx-auto flex-1">
              <h1 className="text-3xl md:text-4xl font-bold font-poppins text-gray-900 mb-2">
                Document Verification
              </h1>
              <p className="text-sm text-gray-600">
                Upload your affidavit to get verified. This helps us ensure the authenticity of requests.
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
                  feedback.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : feedback.type === 'warning'
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                  {feedback.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  ) : feedback.type === 'warning' ? (
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  )}
                  <span className="font-medium">{feedback.message}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="label">
                    Upload Affidavit <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    id="affidavit"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    required
                    disabled={loading}
                    className="hidden"
                  />
                  <label
                    htmlFor="affidavit"
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
                          <p className="font-medium text-gray-900">Upload Affidavit</p>
                          <p className="text-xs text-gray-500">PDF, JPG, PNG (Max 10MB)</p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                <div>
                  <label className="label">
                    Reason for Assistance <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="reason"
                    placeholder="Why you need assistance. Please provide details about your situation..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows="6"
                    required
                    disabled={loading}
                    className="input-field w-full resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      <span>Submit for Review</span>
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

export default VerifyDocuments;