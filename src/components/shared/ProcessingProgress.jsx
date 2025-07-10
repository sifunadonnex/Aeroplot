'use client'
import React from 'react'

export default function ProcessingProgress({ progress, message, isVisible, onCancel }) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 mb-6 shadow-lg">
            <svg className="h-8 w-8 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.44-1.01-5.879-2.621M3 18.5A2.5 2.5 0 015.5 21h13a2.5 2.5 0 002.5-2.5 0 00-2.5-2.5h-13A2.5 2.5 0 003 18.5z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent mb-2">
            Processing Flight Data
          </h3>
          <p className="text-gray-600">Please wait while we analyze your flight data...</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-semibold text-gray-700">Processing Progress</span>
            <span className="text-lg font-bold text-blue-600">{Math.round(progress)}%</span>
          </div>
          <div className="relative">
            <div className="w-full bg-gray-100 rounded-full h-3 shadow-inner">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-700 ease-out shadow-sm relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-pulse"></div>
              </div>
            </div>
            
          </div>
        </div>

        {/* Current Step Message */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="relative">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-600"></div>
              <div className="absolute inset-0 rounded-full bg-blue-100/20 animate-ping"></div>
            </div>
            <span className="text-sm font-medium text-blue-800">{message}</span>
          </div>
        </div>

        {/* Processing Steps Indicator */}
        <div className="space-y-4 mb-8">
          <div className="text-sm font-semibold text-gray-700">Processing Pipeline</div>
          <div className="grid grid-cols-4 gap-3">
            {['Read', 'Parse', 'Sample', 'Analyze'].map((step, index) => {
              const stepProgress = (index + 1) * 25
              const isActive = progress >= stepProgress
              const isCurrent = progress >= (index * 25) && progress < stepProgress
              
              return (
                <div key={step} className="text-center">
                  <div className={`relative h-3 rounded-full mb-2 transition-all duration-500 ${
                    isActive 
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500 shadow-md' 
                      : isCurrent
                      ? 'bg-gradient-to-r from-blue-400 to-blue-500 animate-pulse'
                      : 'bg-gray-200'
                  }`}>
                    {isActive && (
                      <div className="absolute inset-0 bg-white/30 rounded-full animate-pulse"></div>
                    )}
                  </div>
                  <span className={`text-xs font-medium transition-colors duration-300 ${
                    isActive 
                      ? 'text-green-600' 
                      : isCurrent
                      ? 'text-blue-600'
                      : 'text-gray-400'
                  }`}>
                    {step}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Performance Info */}
        {progress > 0 && (
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 mb-6 border border-gray-100">
            <div className="text-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700 font-medium">Dataset Processing</span>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  progress < 100 
                    ? 'bg-blue-100 text-blue-700 animate-pulse' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {progress < 100 ? 'In Progress' : 'Complete'}
                </div>
              </div>
              {progress >= 50 && progress < 100 && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-sm">Intelligent sampling for optimal performance</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cancel Button - Only show if onCancel is provided and progress < 90% */}
        {onCancel && progress < 90 && (
          <div className="flex justify-center mb-4">
            <button
              onClick={onCancel}
              className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all duration-200 shadow-sm"
            >
              Cancel Processing
            </button>
          </div>
        )}

        {/* Success state */}
        {progress >= 100 && (
          <div className="text-center animate-in fade-in duration-500">
            <div className="inline-flex items-center space-x-3 bg-green-50 text-green-700 px-6 py-3 rounded-xl border border-green-200">
              <div className="relative">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div className="absolute inset-0 bg-green-400/20 rounded-full animate-ping"></div>
              </div>
              <span className="font-semibold">Processing Complete</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

