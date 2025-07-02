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
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* File Icon */}
          <div className="flex-shrink-0">
            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.44-1.01-5.879-2.621M3 18.5A2.5 2.5 0 015.5 21h13a2.5 2.5 0 002.5-2.5 0 00-2.5-2.5h-13A2.5 2.5 0 003 18.5z" />
              </svg>
            </div>
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {fileName}
            </p>
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>{formatFileSize(fileSize)}</span>
              <span>•</span>
              {wasDownsampled ? (
                <span className="flex items-center">
                  {sampledCount?.toLocaleString() || recordCount.toLocaleString()} displayed 
                  <span className="ml-1 text-blue-600">
                    ({recordCount.toLocaleString()} total)
                  </span>
                  <svg className="ml-1 h-3 w-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </span>
              ) : (
                <span>{recordCount.toLocaleString()} records</span>
              )}
              <span>•</span>
              <span>{parameters} parameters</span>
              <span>•</span>
              <span>Uploaded {formatDate(uploadedAt)}</span>
            </div>
          </div>
        </div>

        {/* Downsampling Info */}
        {wasDownsampled && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start space-x-2">
              <svg className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-xs text-blue-700">
                <p className="font-medium">Large Dataset Optimized</p>
                <p>Data has been intelligently sampled for optimal performance while preserving trends and key patterns.</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onClearFile}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove
          </button>
        </div>
      </div>

      {/* Downsampling Info */}
      {wasDownsampled && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start space-x-2">
            <svg className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-xs text-blue-700">
              <p className="font-medium">Large Dataset Optimized</p>
              <p>Data has been intelligently sampled for optimal performance while preserving trends and key patterns.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
