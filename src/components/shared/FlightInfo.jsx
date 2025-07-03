'use client'
import React from 'react'

export default function FlightInfo({ flightData, onClearFile }) {
  if (!flightData) return null

  const { 
    fileName, 
    fileSize, 
    recordCount, 
    sampledCount, 
    parameters, 
    uploadedAt, 
    wasDownsampled 
  } = flightData

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  return (
    <div className="bg-gradient-to-r from-white to-gray-50 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-6 mb-6">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          {/* Enhanced File Icon */}
          <div className="flex-shrink-0">
            <div className="h-12 w-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>

          {/* File Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {fileName}
              </h3>
              {wasDownsampled && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  Optimized
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              Uploaded {formatDate(uploadedAt)}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClearFile}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-red-50 hover:border-red-300 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
        >
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Remove File
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* File Size */}
        <div className="bg-white rounded-lg p-3 border border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">File Size</p>
              <p className="text-sm font-semibold text-gray-900">{formatFileSize(fileSize)}</p>
            </div>
          </div>
        </div>

        {/* Records Count */}
        <div className="bg-white rounded-lg p-3 border border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Records</p>
              {wasDownsampled ? (
                <div className="flex items-center space-x-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {sampledCount?.toLocaleString() || recordCount.toLocaleString()}
                  </p>
                  <span className="text-xs text-gray-500">of</span>
                  <p className="text-xs font-medium text-blue-600">
                    {recordCount.toLocaleString()}
                  </p>
                </div>
              ) : (
                <p className="text-sm font-semibold text-gray-900">{recordCount.toLocaleString()}</p>
              )}
            </div>
          </div>
        </div>

        {/* Parameters Count */}
        <div className="bg-white rounded-lg p-3 border border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Parameters</p>
              <p className="text-sm font-semibold text-gray-900">{parameters}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Downsampling Info */}
      {wasDownsampled && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">
                Large Dataset Optimization Applied
              </h4>
              <p className="text-sm text-blue-700 leading-relaxed">
                Your dataset has been intelligently sampled to ensure optimal performance while preserving all important trends, patterns, and statistical characteristics. The visualization accuracy remains high while providing smooth interaction.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
