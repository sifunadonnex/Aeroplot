'use client'
import React from 'react'

export default function ProcessingProgress({ progress, message, isVisible, onCancel }) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.44-1.01-5.879-2.621M3 18.5A2.5 2.5 0 015.5 21h13a2.5 2.5 0 002.5-2.5 0 00-2.5-2.5h-13A2.5 2.5 0 003 18.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">Processing Flight Data</h3>
          <p className="text-sm text-gray-500 mt-1">Please wait while we process your file...</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-blue-700">Progress</span>
            <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Current Step Message */}
        <div className="mb-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-700">{message}</span>
          </div>
        </div>

        {/* Processing Steps Indicator */}
        <div className="space-y-2 mb-6">
          <div className="text-xs text-gray-500 mb-2">Processing Steps:</div>
          <div className="grid grid-cols-4 gap-2">
            <div className={`h-1 rounded ${progress >= 25 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`h-1 rounded ${progress >= 50 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`h-1 rounded ${progress >= 75 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`h-1 rounded ${progress >= 100 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs text-gray-400">
            <span>Read</span>
            <span>Parse</span>
            <span>Sample</span>
            <span>Analyze</span>
          </div>
        </div>

        {/* Performance Info */}
        {progress > 0 && (
          <div className="bg-gray-50 rounded-md p-3 mb-4">
            <div className="text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Processing large dataset...</span>
                <span className="text-blue-600 font-medium">
                  {progress < 100 ? 'In Progress' : 'Complete'}
                </span>
              </div>
              {progress >= 50 && progress < 100 && (
                <div className="mt-1 text-gray-500">
                  Data will be intelligently sampled for optimal performance
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cancel Button - Only show if onCancel is provided and progress < 90% */}
        {onCancel && progress < 90 && (
          <div className="flex justify-center">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Success state */}
        {progress >= 100 && (
          <div className="text-center">
            <div className="inline-flex items-center text-green-600">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Processing Complete
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

