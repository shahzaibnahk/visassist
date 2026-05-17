import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Mic, X } from 'lucide-react';
import Vapi from '@vapi-ai/web';

const VapiWidget = ({ apiKey, assistantId, isOpen, onClose }) => {
  const [vapi, setVapi] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!apiKey || !assistantId) return;

    const vapiInstance = new Vapi(apiKey);
    setVapi(vapiInstance);

    // Event listeners
    const handleCallStart = () => {
      console.log('Call started');
      setIsConnected(true);
      setIsLoading(false);
      setError(null);
    };

    const handleCallEnd = () => {
      console.log('Call ended');
      setIsConnected(false);
      setIsSpeaking(false);
      setCallDuration(0);
    };

    const handleSpeechStart = () => {
      console.log('Assistant started speaking');
      setIsSpeaking(true);
    };

    const handleSpeechEnd = () => {
      console.log('Assistant stopped speaking');
      setIsSpeaking(false);
    };

    const handleError = (error) => {
      console.error('Vapi error:', error);
      setError('Connection error. Please try again.');
      setIsLoading(false);
    };

    vapiInstance.on('call-start', handleCallStart);
    vapiInstance.on('call-end', handleCallEnd);
    vapiInstance.on('speech-start', handleSpeechStart);
    vapiInstance.on('speech-end', handleSpeechEnd);
    vapiInstance.on('error', handleError);

    return () => {
      vapiInstance?.stop();
      vapiInstance.off('call-start', handleCallStart);
      vapiInstance.off('call-end', handleCallEnd);
      vapiInstance.off('speech-start', handleSpeechStart);
      vapiInstance.off('speech-end', handleSpeechEnd);
      vapiInstance.off('error', handleError);
    };
  }, [apiKey, assistantId]);

  // Call duration timer
  useEffect(() => {
    let interval;
    if (isConnected) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  const startCall = () => {
    if (vapi && !isConnected) {
      setError(null);
      setIsLoading(true);
      vapi.start(assistantId);
    }
  };

  const endCall = () => {
    if (vapi && isConnected) {
      vapi.stop();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Phone size={28} className="animate-pulse" />
              AI Voice Assistant
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              {isConnected ? (
                <>
                  <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                  Connected - {formatTime(callDuration)}
                </>
              ) : isLoading ? (
                'Connecting...'
              ) : (
                'Ready to assist you'
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isConnected}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col p-8">
          {/* Phone Number Info */}
          {!isConnected && !isLoading && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 font-medium mb-1">Or call us directly:</p>
                  <p className="text-2xl font-bold text-green-700">+1 (564) 242 9171</p>
                </div>
                <Phone className="text-green-600" size={32} />
              </div>
            </div>
          )}

          {/* Call Animation - Loading State */}
          {isLoading && !isConnected && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative flex items-center justify-center w-32 h-32">
                {/* Outer circles animation */}
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 border-r-purple-600 animate-spin"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-b-blue-600 border-l-purple-600 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2s' }}></div>
                
                {/* Center icon */}
                <div className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <Mic className="text-white" size={40} />
                </div>
              </div>
              <p className="text-center text-gray-600 mt-8 font-semibold">Connecting to AI Agent...</p>
              <p className="text-center text-gray-500 text-sm mt-2">Please wait while we establish your call</p>
            </div>
          )}

          {/* Call Animation - Active Call */}
          {isConnected && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative flex items-center justify-center w-36 h-36">
                {/* Animated circles */}
                <div className={`absolute inset-0 rounded-full border-4 ${isSpeaking ? 'border-green-500' : 'border-blue-500'} animate-pulse`}></div>
                <div className={`absolute inset-0 rounded-full border-2 ${isSpeaking ? 'border-green-400' : 'border-blue-400'} animate-ping`}></div>
                
                {/* Center circle with icon */}
                <div className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center ${isSpeaking ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-blue-600 to-purple-600'}`}>
                  <Mic className="text-white animate-bounce" size={40} />
                </div>
              </div>
              
              <p className="text-center text-gray-900 mt-8 font-semibold text-lg">
                {isSpeaking ? 'Agent Speaking...' : 'Listening...'}
              </p>
              <p className="text-center text-gray-500 text-sm mt-2">
                {isSpeaking ? 'The AI agent is speaking to you' : 'Tell us how we can help with your visa application'}
              </p>
              
              {/* Duration */}
              <div className="mt-6 text-center">
                <p className="text-3xl font-bold text-gray-900">{formatTime(callDuration)}</p>
                <p className="text-gray-500 text-sm mt-1">Call Duration</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-4 justify-center mt-8">
            {!isConnected ? (
              <button
                onClick={startCall}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Phone size={20} />
                {isLoading ? 'Connecting...' : 'Start Voice Call'}
              </button>
            ) : (
              <button
                onClick={endCall}
                className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 flex items-center justify-center gap-2"
              >
                <PhoneOff size={20} />
                End Call
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VapiWidget;
