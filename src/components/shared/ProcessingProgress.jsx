'use client'
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiLoader, FiCheckCircle, FiInfo } from 'react-icons/fi'

export default function ProcessingProgress({ progress, message, isVisible, onCancel }) {
  if (!isVisible) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl border border-gray-100"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-600 mb-6 shadow-lg"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <FiLoader className="h-8 w-8 text-white animate-spin" />
              </motion.div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-indigo-900 bg-clip-text text-transparent mb-2">
                Processing Flight Data
              </h3>
              <p className="text-gray-600 text-sm">Analyzing your flight data, please wait...</p>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-semibold text-gray-700">Progress</span>
                <motion.span
                  className="text-lg font-bold text-indigo-600"
                  key={Math.round(progress)}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {Math.round(progress)}%
                </motion.span>
              </div>
              <div className="relative">
                <div className="w-full bg-gray-100 rounded-full h-3 shadow-inner">
                  <motion.div
                    className="bg-gradient-to-r from-indigo-500 to-blue-600 h-3 rounded-full shadow-sm relative overflow-hidden"
                    style={{ width: `${progress}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-pulse" />
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Current Step Message */}
            <motion.div
              className="mb-8"
              key={message}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center space-x-3 bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                <motion.div
                  className="relative"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <FiLoader className="h-6 w-6 text-indigo-600" />
                </motion.div>
                <span className="text-sm font-medium text-indigo-800">{message}</span>
              </div>
            </motion.div>

            {/* Processing Steps Indicator */}
            <div className="space-y-4 mb-8">
              <div className="text-sm font-semibold text-gray-700 flex items-center">
                <FiInfo className="h-5 w-5 mr-2 text-indigo-600" /> Processing Pipeline
              </div>
              <div className="grid grid-cols-4 gap-3">
                {['Read', 'Parse', 'Sample', 'Analyze'].map((step, index) => {
                  const stepProgress = (index + 1) * 25
                  const isActive = progress >= stepProgress
                  const isCurrent = progress >= (index * 25) && progress < stepProgress

                  return (
                    <motion.div
                      key={step}
                      className="text-center"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                    >
                      <div
                        className={`relative h-3 rounded-full mb-2 transition-all duration-500 ${
                          isActive
                            ? 'bg-gradient-to-r from-emerald-400 to-green-500 shadow-md'
                            : isCurrent
                            ? 'bg-gradient-to-r from-indigo-400 to-blue-500 animate-pulse'
                            : 'bg-gray-200'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            className="absolute inset-0 bg-white/30 rounded-full"
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        )}
                      </div>
                      <span
                        className={`text-xs font-medium transition-colors duration-300 ${
                          isActive
                            ? 'text-emerald-600'
                            : isCurrent
                            ? 'text-indigo-600'
                            : 'text-gray-400'
                        }`}
                      >
                        {step}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Performance Info */}
            {progress > 0 && (
              <motion.div
                className="bg-gradient-to-r from-gray-50 to-indigo-50 rounded-xl p-4 mb-6 border border-indigo-100"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <div className="text-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700 font-medium">Dataset Processing</span>
                    <motion.div
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        progress < 100 ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                      animate={{ scale: progress < 100 ? [1, 1.05, 1] : 1 }}
                      transition={{ duration: 1.5, repeat: progress < 100 ? Infinity : 0 }}
                    >
                      {progress < 100 ? 'In Progress' : 'Complete'}
                    </motion.div>
                  </div>
                  {progress >= 50 && progress < 100 && (
                    <motion.div
                      className="flex items-center space-x-2 text-gray-600"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <FiInfo className="w-4 h-4 text-indigo-500" />
                      <span className="text-sm">Intelligent sampling for optimal performance</span>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Cancel Button */}
            {onCancel && progress < 90 && (
              <motion.div
                className="flex justify-center mb-4"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <button
                  onClick={onCancel}
                  className="flex items-center px-6 py-3 text-sm font-medium text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400 transition-all duration-200 shadow-sm"
                >
                  <FiX className="h-4 w-4 mr-2" /> Cancel Processing
                </button>
              </motion.div>
            )}

            {/* Success State */}
            {progress >= 100 && (
              <motion.div
                className="text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center space-x-3 bg-emerald-50 text-emerald-700 px-6 py-3 rounded-xl border border-emerald-200">
                  <motion.div
                    className="relative"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <FiCheckCircle className="w-6 h-6" />
                  </motion.div>
                  <span className="font-semibold">Processing Complete</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}