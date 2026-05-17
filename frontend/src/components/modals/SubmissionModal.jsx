import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function SubmissionModal({ isOpen, state, error, onClose, onSuccess }) {
  const [showTick, setShowTick] = useState(false);

  useEffect(() => {
    if (state === 'success') {
      setShowTick(true);
      const timer = setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state, onSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        {state === 'loading' && (
          <div className="flex flex-col items-center">
            <div className="mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Submitting Application</h3>
            <p className="text-gray-600 text-center">Please wait while we process your application...</p>
          </div>
        )}

        {state === 'success' && (
          <div className="flex flex-col items-center">
            <div className="mb-4">
              {showTick ? (
                <div className="animate-bounce">
                  <CheckCircle size={48} className="text-green-500" />
                </div>
              ) : (
                <div className="h-12 w-12" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-green-900 mb-2">Application Submitted!</h3>
            <p className="text-gray-600 text-center">Your visa application has been successfully submitted. You will be redirected shortly.</p>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center">
            <div className="mb-4">
              <AlertCircle size={48} className="text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">Submission Failed</h3>
            <p className="text-gray-600 text-center mb-4">{error || 'An error occurred while submitting your application. Please try again.'}</p>
            <button
              onClick={onClose}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              Try Again
            </button>
          </div>
        )}

        {state !== 'success' && state !== 'error' && state !== 'loading' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        )}
      </div>
    </div>
  );
}
