'use client'
import React, { useCallback, useState } from 'react'

export default function FileUpload({ onFileUpload, isLoading, acceptedFormats = ['.csv'] }) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const handleFiles = useCallback((files) => {
    setUploadError(null)
    
    if (!files || files.length === 0) return

    const file = files[0]
    
    // Validate file type
    const fileName = file.name.toLowerCase()
    const isValidFormat = acceptedFormats.some(format => 
      fileName.endsWith(format.toLowerCase())
    )
    
    if (!isValidFormat) {
      setUploadError(`Please upload a valid file. Accepted formats: ${acceptedFormats.join(', ')}`)
      return
    }

    // No size limit for flight data files - they can be very large
    // Just warn if file is extremely large (>500MB) but still allow processing
    const warningSize = 500 * 1024 * 1024 // 500MB
    if (file.size > warningSize) {
      console.log(`Warning: Large file detected (${(file.size / 1024 / 1024).toFixed(1)}MB). Processing may take longer.`)
    }

    onFileUpload(file)
  }, [onFileUpload, acceptedFormats])

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleChange = useCallback((e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  return (
    <div className="w-full">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : uploadError
            ? 'border-red-300 bg-red-50'
            : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
        } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleChange}
          accept={acceptedFormats.join(',')}
          disabled={isLoading}
        />
        
        <div className="space-y-4">
          {/* Upload Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-md bg-blue-100">
            <svg
              className="h-6 w-6 text-blue-600"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Upload Text */}
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {isLoading ? 'Processing file...' : 'Upload your CSV file'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Drag and drop a file here, or click to select
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Supported formats: {acceptedFormats.join(', ')} • No size limit
            </p>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">Processing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{uploadError}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
