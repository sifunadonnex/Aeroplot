'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { FiFile, FiXCircle, FiDatabase, FiLayers, FiInfo } from 'react-icons/fi'

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
    <motion.div
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 p-6 mb-6 max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Header Section */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          {/* Enhanced File Icon */}
          <motion.div
            className="flex-shrink-0"
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <FiFile className="h-7 w-7 text-white" />
            </div>
          </motion.div>

          {/* File Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{fileName}</h3>
              {wasDownsampled && (
                <motion.span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <FiLayers className="w-3 h-3 mr-1" />
                  Optimized
                </motion.span>
              )}
            </div>
            <p className="text-sm text-gray-500">Uploaded {formatDate(uploadedAt)}</p>
          </div>
        </div>

        {/* Action Button */}
        <motion.button
          onClick={onClearFile}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-red-50 hover:border-red-300 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FiXCircle className="h-4 w-4 mr-2" />
          Remove File
        </motion.button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* File Size */}
        <motion.div
          className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <FiFile className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">File Size</p>
              <p className="text-sm font-semibold text-gray-900">{formatFileSize(fileSize)}</p>
            </div>
          </div>
        </motion.div>

        {/* Records Count */}
        <motion.div
          className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiDatabase className="h-4 w-4 text-blue-600" />
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
        </motion.div>

        {/* Parameters Count */}
        <motion.div
          className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <FiLayers className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Parameters</p>
              <p className="text-sm font-semibold text-gray-900">{parameters}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Downsampling Info */}
      {wasDownsampled && (
        <motion.div
          className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          <div className="flex items-start space-x-3">
            <motion.div
              className="flex-shrink-0"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <FiInfo className="h-4 w-4 text-indigo-600" />
              </div>
            </motion.div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-indigo-900 mb-1 flex items-center">
                <FiInfo className="h-4 w-4 mr-2" /> Large Dataset Optimization
              </h4>
              <p className="text-sm text-indigo-700 leading-relaxed">
                Your dataset has been intelligently sampled to ensure fast performance while preserving key trends, patterns, and statistical accuracy for smooth visualization.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}