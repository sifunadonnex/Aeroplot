'use client'
import React, { useState, useCallback } from 'react'
import { FiX, FiSettings, FiSliders, FiFilter, FiLayers, FiRefreshCw } from 'react-icons/fi'

export default function ChartConfig({ 
  selectedParameters, 
  parameterMetadata, 
  chartConfig, 
  updateParameterConfig, 
  resetParameterConfig,
  isVisible, 
  onClose,
  parameters,
  globalConfig = {},
  updateGlobalConfig
}) {
  const [activeTab, setActiveTab] = useState(selectedParameters[0] || '')

  const getParameterConfig = useCallback((param) => {
    return chartConfig[param] || {}
  }, [chartConfig])

  const handleRangeChange = useCallback((param, field, value) => {
    const config = getParameterConfig(param)
    const customRange = config.customRange || {}
    
    updateParameterConfig(param, {
      customRange: {
        ...customRange,
        [field]: parseFloat(value) || 0
      },
      useCustomRange: true
    })
  }, [getParameterConfig, updateParameterConfig])

  const toggleCustomRange = useCallback((param) => {
    const config = getParameterConfig(param)
    updateParameterConfig(param, {
      useCustomRange: !config.useCustomRange
    })
  }, [getParameterConfig, updateParameterConfig])

  const toggleFiltering = useCallback((param) => {
    const config = getParameterConfig(param)
    updateParameterConfig(param, {
      enableFiltering: !config.enableFiltering
    })
  }, [getParameterConfig, updateParameterConfig])

  const handleOutlierThresholdChange = useCallback((param, value) => {
    updateParameterConfig(param, {
      outlierThreshold: parseFloat(value) || 5,
      removeOutliers: true
    })
  }, [updateParameterConfig])

  const handleSplitNumberChange = useCallback((param, value) => {
    updateParameterConfig(param, {
      splitNumber: parseInt(value) || 5
    })
  }, [updateParameterConfig])

  if (!isVisible || selectedParameters.length === 0) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center">
            <FiSettings className="h-6 w-6 text-indigo-600 mr-2" />
            <h3 className="text-xl font-semibold text-gray-900">Chart Configuration</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none transition-colors duration-200"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Parameter Tabs */}
          <div className="w-64 border-r border-gray-200 bg-gray-50 p-4 flex flex-col">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center flex-shrink-0">
              <FiLayers className="h-5 w-5 mr-2 text-indigo-600" /> Parameters
            </h4>
            <div className="flex-1 overflow-y-auto space-y-1 pr-2">
              {selectedParameters.map(param => {
                const metadata = parameterMetadata[param] || {}
                const config = getParameterConfig(param)
                const hasCustomConfig = Object.keys(config).length > 0
                
                return (
                  <button
                    key={param}
                    onClick={() => setActiveTab(param)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                      activeTab === param
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate font-medium">{param}</span>
                      {hasCustomConfig && (
                        <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0"></div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {metadata.isNumeric ? 'Numeric' : 'Categorical'}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Configuration Panel */}
          <div className="flex-1 p-6 overflow-y-auto bg-white">
            {/* Global Settings Section */}
            <div className="space-y-6 mb-8">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FiSettings className="h-5 w-5 mr-2 text-indigo-600" /> Print Configuration
                </h4>
                <p className="text-sm text-gray-600 mt-1">Global settings for chart printing and layout</p>
              </div>

              {/* Focus Parameter Setting */}
              <div className="border border-gray-200 rounded-lg p-5 bg-indigo-50/50">
                <div className="mb-4">
                  <h5 className="font-medium text-gray-900 flex items-center">
                    <FiLayers className="h-5 w-5 mr-2 text-indigo-600" /> Focus Parameter
                  </h5>
                  <p className="text-sm text-gray-600 mt-2">
                    Select a parameter to appear as the last chart on every printed page for quick reference.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={globalConfig.enableFocusParameter || false}
                        onChange={(e) => updateGlobalConfig && updateGlobalConfig({
                          enableFocusParameter: e.target.checked
                        })}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">Enable Focus Parameter</span>
                    </label>
                  </div>

                  {globalConfig.enableFocusParameter && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Focus Parameter
                      </label>
                      <select
                        value={globalConfig.focusParameter || ''}
                        onChange={(e) => updateGlobalConfig && updateGlobalConfig({
                          focusParameter: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      >
                        <option value="">-- Select Parameter --</option>
                        {parameters && parameters.map(param => (
                          <option key={param} value={param}>
                            {param} {parameterMetadata[param]?.isNumeric ? '(Numeric)' : '(Categorical)'}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-600 mt-2">
                        Appears as the last chart on every printed page (up to 5 other charts + focus parameter per page)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Individual Parameter Settings */}
            {activeTab && (
              <div className="space-y-6">
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                    <FiSliders className="h-5 w-5 mr-2 text-indigo-600" /> {activeTab}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">Configure display and filtering options for this parameter</p>
                </div>

                {parameterMetadata[activeTab]?.isNumeric && (
                  <>
                    {/* Range Configuration */}
                    <div className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium text-gray-900 flex items-center">
                          <FiSliders className="h-5 w-5 mr-2 text-indigo-600" /> Y-Axis Range
                        </h5>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={getParameterConfig(activeTab).useCustomRange || false}
                            onChange={() => toggleCustomRange(activeTab)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700">Custom Range</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Minimum
                          </label>
                          <input
                            type="number"
                            value={getParameterConfig(activeTab).customRange?.min || parameterMetadata[activeTab]?.min || 0}
                            onChange={(e) => handleRangeChange(activeTab, 'min', e.target.value)}
                            disabled={!getParameterConfig(activeTab).useCustomRange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 text-sm"
                            step="any"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Maximum
                          </label>
                          <input
                            type="number"
                            value={getParameterConfig(activeTab).customRange?.max || parameterMetadata[activeTab]?.max || 1}
                            onChange={(e) => handleRangeChange(activeTab, 'max', e.target.value)}
                            disabled={!getParameterConfig(activeTab).useCustomRange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 text-sm"
                            step="any"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Number of Scale Marks
                        </label>
                        <input
                          type="number"
                          value={getParameterConfig(activeTab).splitNumber || 5}
                          onChange={(e) => handleSplitNumberChange(activeTab, e.target.value)}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          min="2"
                          max="20"
                        />
                      </div>

                      {/* Data Range Info */}
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-600">
                          <div>Original Data Range:</div>
                          <div className="font-mono text-xs mt-1">
                            {parameterMetadata[activeTab]?.min?.toFixed(4) || 0} to {parameterMetadata[activeTab]?.max?.toFixed(4) || 1}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Data Filtering */}
                    <div className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium text-gray-900 flex items-center">
                          <FiFilter className="h-5 w-5 mr-2 text-indigo-600" /> Data Filtering
                        </h5>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={getParameterConfig(activeTab).enableFiltering || false}
                            onChange={() => toggleFiltering(activeTab)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700">Enable Filtering</span>
                        </label>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Outlier Removal Threshold (%)
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="50"
                            value={getParameterConfig(activeTab).outlierThreshold || 5}
                            onChange={(e) => handleOutlierThresholdChange(activeTab, e.target.value)}
                            disabled={!getParameterConfig(activeTab).enableFiltering}
                            className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer disabled:opacity-50"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-2">
                            <span>1%</span>
                            <span>{getParameterConfig(activeTab).outlierThreshold || 5}%</span>
                            <span>50%</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Remove data points that deviate more than this percentage from the mean
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Sparse Data Handling */}
                    <div className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium text-gray-900 flex items-center">
                          <FiLayers className="h-5 w-5 mr-2 text-indigo-600" /> Sparse Data Handling
                        </h5>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          Advanced
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={getParameterConfig(activeTab).forceInterpolation || false}
                              onChange={() => updateParameterConfig(activeTab, {
                                forceInterpolation: !getParameterConfig(activeTab).forceInterpolation
                              })}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">Force Interpolation</span>
                          </label>
                          <p className="text-xs text-gray-600 mt-2 ml-6">
                            Always interpolate missing values, even for dense data
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Interpolation Method
                          </label>
                          <select
                            value={getParameterConfig(activeTab).interpolationMethod || 'forward'}
                            onChange={(e) => updateParameterConfig(activeTab, {
                              interpolationMethod: e.target.value
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          >
                            <option value="forward">Forward Fill (Recommended)</option>
                            <option value="linear">Linear Interpolation</option>
                            <option value="backward">Backward Fill</option>
                            <option value="none">No Interpolation</option>
                          </select>
                          <p className="text-xs text-gray-600 mt-2">
                            Forward fill maintains the last recorded value, ideal for flight parameters
                          </p>
                        </div>

                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={getParameterConfig(activeTab).smoothInterpolated || false}
                              onChange={() => updateParameterConfig(activeTab, {
                                smoothInterpolated: !getParameterConfig(activeTab).smoothInterpolated
                              })}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">Smooth Interpolated Lines</span>
                          </label>
                          <p className="text-xs text-gray-600 mt-2 ml-6">
                            Apply smoothing to interpolated data for better visual continuity
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Reset Button */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => resetParameterConfig(activeTab)}
                    className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors duration-200"
                  >
                    <FiRefreshCw className="h-4 w-4 mr-2" /> Reset to Defaults
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-5 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors duration-200"
          >
            <FiX className="h-4 w-4 mr-2" /> Close
          </button>
        </div>
      </div>
    </div>
  )
}