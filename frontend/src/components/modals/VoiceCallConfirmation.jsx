import React from 'react';
import { Phone, AlertCircle } from 'lucide-react';

const VoiceCallConfirmation = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white px-8 py-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-white bg-opacity-20 p-4 rounded-full">
              <Phone size={32} className="text-white animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Connect with AI Agent</h2>
          <p className="text-center text-blue-100 text-sm">
            Start a voice conversation with our intelligent assistant
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          <div className="space-y-4">
            {/* Info Cards */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">Make sure your microphone is enabled</h3>
                  <p className="text-gray-600 text-xs">Your browser will ask for permission to access your microphone</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Phone size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">Or call us directly</h3>
                  <p className="text-green-700 font-bold text-lg">+1 (564) 242 9171</p>
                  <p className="text-gray-600 text-xs mt-1">Speak directly with our agent</p>
                </div>
              </div>
            </div>

            {/* Features List */}
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-3">What you can do:</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span>
                  Ask visa-related questions
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span>
                  Get application guidance
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span>
                  Receive instant assistance
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-50 px-8 py-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-all duration-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-105 flex items-center justify-center gap-2"
          >
            <Phone size={18} />
            Start Call
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceCallConfirmation;
