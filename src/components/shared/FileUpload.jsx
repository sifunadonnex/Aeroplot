'use client'
import React, { useCallback, useState } from 'react'
import { FiUpload, FiAlertCircle, FiCheckCircle, FiShield, FiLayers } from 'react-icons/fi'

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
    <div className="w-full max-w-3xl mx-auto p-6">
      <div
        className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 ease-in-out ${
          dragActive
            ? 'border-indigo-500 bg-indigo-50/80 shadow-lg scale-100'
            : uploadError
            ? 'border-red-400 bg-red-50/80'
            : 'border-gray-300 bg-white hover:bg-gray-50 scale-100 hover:shadow-md'
        } ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
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
        
        <div className="space-y-6">
          {/* Upload Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 transition-colors duration-300">
            <FiUpload className="h-8 w-8 text-indigo-600" />
          </div>

          {/* Upload Text */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-900">
              {isLoading ? 'Processing Your File...' : 'Upload Flight Data'}
            </h3>
            <p className="text-sm text-gray-600">
              Drag and drop your CSV file here or click to browse
            </p>
            <p className="text-xs text-gray-500">
              Accepted formats: {acceptedFormats.join(', ')} • No size limit • Optimized for large files
            </p>
            {!isLoading && (
              <button
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-sm font-medium"
                onClick={() => document.querySelector('input[type="file"]').click()}
              >
                Select File
              </button>
            )}
          </div>

          {/* CSV Format Instructions */}
          {!isLoading && (
            <div className="bg-indigo-50/50 border border-indigo-200 rounded-lg p-6 text-left mt-6">
              <h4 className="text-sm font-semibold text-indigo-900 mb-3 flex items-center">
                <FiLayers className="h-5 w-5 mr-2" /> CSV Format Guide
              </h4>
              <ul className="text-xs text-indigo-800 space-y-2">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong>Header Row:</strong> Parameter names (e.g., time, airspeed, altitude)</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong>Units Row (Optional):</strong> Units auto-detected if provided</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong>Data Rows:</strong> Numeric or categorical values</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong>Missing Data:</strong> Empty cells handled automatically</span>
                </li>
              </ul>
              
              <div className="mt-4 pt-4 border-t border-indigo-200">
                <h5 className="text-xs font-semibold text-indigo-900 mb-2 flex items-center">
                  <FiLayers className="h-4 w-4 mr-2" /> Flight Data Tips
                </h5>
                <ul className="text-xs text-indigo-700 space-y-2">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Automatic time column detection</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Supports FDM, QAR, FOQA, and custom formats</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Optimized for large files (100MB+) with intelligent sampling</span>
                  </li>
                </ul>
              </div>

              <div className="mt-4 pt-4 border-t border-indigo-200">
                <h5 className="text-xs font-semibold text-indigo-900 mb-2 flex items-center">
                  <FiLayers className="h-4 w-4 mr-2" /> Example CSV
                </h5>
                <div className="bg-gray-100 rounded-lg p-3 font-mono text-xs text-gray-700">
                  <div>time,airspeed,altitude,phase</div>
                  <div>sec,kts,ft,--</div>
                  <div>0.0,150.2,1000,CRUISE</div>
                  <div>0.5,151.1,1005,CRUISE</div>
                  <div className="text-gray-500">...</div>
                </div>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center justify-center mt-6">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-700">Processing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
          <div className="flex items-center">
            <FiAlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-700 font-medium">{uploadError}</p>
          </div>
        </div>
      )}

      {/* Additional Information */}
      {!isLoading && !uploadError && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <FiCheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="font-semibold text-green-800 text-sm">High Performance</span>
            </div>
            <p className="text-xs text-green-700 mt-2">Handles files up to 2GB with intelligent sampling for smooth visualization.</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <FiShield className="h-5 w-5 text-purple-600 mr-2" />
              <span className="font-semibold text-purple-800 text-sm">Secure Processing</span>
            </div>
            <p className="text-xs text-purple-700 mt-2">All processing happens locally in your browser. No data leaves your device.</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center">
              <FiLayers className="h-5 w-5 text-blue-600 mr-2" />
              <span className="font-semibold text-blue-800 text-sm">Wide Compatibility</span>
            </div>
            <p className="text-xs text-blue-700 mt-2">Supports exports from L3 FOQA, Teledyne, and custom flight data formats.</p>
          </div>
        </div>
      )}
    </div>
  )
}