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

                {!parameterMetadata[activeTab]?.isNumeric && (
                  <>
                    {/* Categorical State Display */}
                    <div className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium text-gray-900 flex items-center">
                          <FiLayers className="h-5 w-5 mr-2 text-indigo-600" /> State Display
                        </h5>
                        <span className="text-xs text-gray-500 bg-orange-100 px-2 py-1 rounded">
                          Categorical
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Display Mode
                          </label>
                          <select
                            value={getParameterConfig(activeTab).displayMode || 'states'}
                            onChange={(e) => updateParameterConfig(activeTab, {
                              displayMode: e.target.value
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          >
                            <option value="states">Show State Names</option>
                            <option value="numeric">Show as Numeric Values</option>
                            <option value="both">Show Both States and Values</option>
                          </select>
                          <p className="text-xs text-gray-600 mt-2">
                            Choose how categorical values are displayed on the chart
                          </p>
                        </div>

                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={getParameterConfig(activeTab).showStateTransitions || false}
                              onChange={() => updateParameterConfig(activeTab, {
                                showStateTransitions: !getParameterConfig(activeTab).showStateTransitions
                              })}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">Highlight State Transitions</span>
                          </label>
                          <p className="text-xs text-gray-600 mt-2 ml-6">
                            Mark points where the categorical value changes
                          </p>
                        </div>

                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={getParameterConfig(activeTab).stackDuplicates || false}
                              onChange={() => updateParameterConfig(activeTab, {
                                stackDuplicates: !getParameterConfig(activeTab).stackDuplicates
                              })}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">Stack Duplicate Values</span>
                          </label>
                          <p className="text-xs text-gray-600 mt-2 ml-6">
                            Vertically offset points with the same categorical value for better visibility
                          </p>
                        </div>
                      </div>

                      {/* Categorical Data Info */}
                      <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                        <div className="text-sm text-gray-600">
                          <div>Unique States:</div>
                          <div className="font-mono text-xs mt-1 max-h-20 overflow-y-auto">
                            {parameterMetadata[activeTab]?.uniqueValues?.length || 0} states
                            {parameterMetadata[activeTab]?.uniqueValues && 
                              ` (${parameterMetadata[activeTab].uniqueValues.slice(0, 5).join(', ')}${
                                parameterMetadata[activeTab].uniqueValues.length > 5 ? '...' : ''
                              })`
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* State Filtering */}
                    <div className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium text-gray-900 flex items-center">
                          <FiFilter className="h-5 w-5 mr-2 text-indigo-600" /> State Filtering
                        </h5>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={getParameterConfig(activeTab).enableStateFiltering || false}
                            onChange={() => updateParameterConfig(activeTab, {
                              enableStateFiltering: !getParameterConfig(activeTab).enableStateFiltering
                            })}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700">Enable State Filtering</span>
                        </label>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filter Mode
                          </label>
                          <select
                            value={getParameterConfig(activeTab).filterMode || 'include'}
                            onChange={(e) => updateParameterConfig(activeTab, {
                              filterMode: e.target.value
                            })}
                            disabled={!getParameterConfig(activeTab).enableStateFiltering}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 text-sm"
                          >
                            <option value="include">Include Selected States</option>
                            <option value="exclude">Exclude Selected States</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Minimum State Duration (seconds)
                          </label>
                          <input
                            type="number"
                            value={getParameterConfig(activeTab).minStateDuration || 0}
                            onChange={(e) => updateParameterConfig(activeTab, {
                              minStateDuration: parseFloat(e.target.value) || 0
                            })}
                            disabled={!getParameterConfig(activeTab).enableStateFiltering}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 text-sm"
                            min="0"
                            step="0.1"
                          />
                          <p className="text-xs text-gray-600 mt-2">
                            Filter out state changes that last less than this duration
                          </p>
                        </div>

                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={getParameterConfig(activeTab).ignoreInvalidStates || false}
                              onChange={() => updateParameterConfig(activeTab, {
                                ignoreInvalidStates: !getParameterConfig(activeTab).ignoreInvalidStates
                              })}
                              disabled={!getParameterConfig(activeTab).enableStateFiltering}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 disabled:opacity-50"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">Ignore Invalid/Unknown States</span>
                          </label>
                          <p className="text-xs text-gray-600 mt-2 ml-6">
                            Filter out null, undefined, or empty string values
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Missing Data Handling */}
                    <div className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium text-gray-900 flex items-center">
                          <FiLayers className="h-5 w-5 mr-2 text-indigo-600" /> Missing Data Handling
                        </h5>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          Advanced
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Missing Data Strategy
                          </label>
                          <select
                            value={getParameterConfig(activeTab).missingDataStrategy || 'forward'}
                            onChange={(e) => updateParameterConfig(activeTab, {
                              missingDataStrategy: e.target.value
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          >
                            <option value="forward">Forward Fill (Hold Last State)</option>
                            <option value="backward">Backward Fill</option>
                            <option value="gap">Show as Data Gaps</option>
                            <option value="unknown">Mark as 'Unknown' State</option>
                          </select>
                          <p className="text-xs text-gray-600 mt-2">
                            How to handle missing or null categorical values
                          </p>
                        </div>

                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={getParameterConfig(activeTab).showMissingDataMarkers || false}
                              onChange={() => updateParameterConfig(activeTab, {
                                showMissingDataMarkers: !getParameterConfig(activeTab).showMissingDataMarkers
                              })}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">Show Missing Data Markers</span>
                          </label>
                          <p className="text-xs text-gray-600 mt-2 ml-6">
                            Add visual indicators where data was originally missing
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Custom Unknown State Label
                          </label>
                          <input
                            type="text"
                            value={getParameterConfig(activeTab).unknownStateLabel || 'Unknown'}
                            onChange={(e) => updateParameterConfig(activeTab, {
                              unknownStateLabel: e.target.value || 'Unknown'
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            placeholder="Unknown"
                          />
                          <p className="text-xs text-gray-600 mt-2">
                            Label to use for missing or invalid categorical values
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Categorical Parameter Configuration */}
                {!parameterMetadata[activeTab]?.isNumeric && parameterMetadata[activeTab]?.states && (
                  <>
                    {/* State Display Configuration */}
                    <div className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium text-gray-900 flex items-center">
                          <FiLayers className="h-5 w-5 mr-2 text-indigo-600" /> State Display
                        </h5>
                        <span className="text-xs text-gray-500 bg-purple-100 px-2 py-1 rounded">
                          Categorical
                        </span>
                      </div>

                      {/* Available States */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Available States ({parameterMetadata[activeTab]?.states?.length || 0})
                        </label>
                        <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3">
                          <div className="flex flex-wrap gap-2">
                            {parameterMetadata[activeTab]?.states?.map((state, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full"
                              >
                                {state}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Chart Display Options */}
                      <div className="space-y-4">
                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={getParameterConfig(activeTab).showStepLines || true}
                              onChange={() => updateParameterConfig(activeTab, {
                                showStepLines: !getParameterConfig(activeTab).showStepLines
                              })}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">Show Step Lines</span>
                          </label>
                          <p className="text-xs text-gray-600 mt-2 ml-6">
                            Display categorical data as step lines instead of discrete points
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Line Width
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={getParameterConfig(activeTab).lineWidth || 2}
                            onChange={(e) => updateParameterConfig(activeTab, {
                              lineWidth: parseInt(e.target.value)
                            })}
                            className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-2">
                            <span>Thin (1px)</span>
                            <span>{getParameterConfig(activeTab).lineWidth || 2}px</span>
                            <span>Thick (5px)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* State Filtering */}
                    <div className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium text-gray-900 flex items-center">
                          <FiFilter className="h-5 w-5 mr-2 text-indigo-600" /> State Filtering
                        </h5>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={getParameterConfig(activeTab).enableStateFiltering || false}
                            onChange={() => updateParameterConfig(activeTab, {
                              enableStateFiltering: !getParameterConfig(activeTab).enableStateFiltering
                            })}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                          />
                          <span className="ml-2 text-sm font-medium text-gray-700">Enable State Filtering</span>
                        </label>
                      </div>

                      {getParameterConfig(activeTab).enableStateFiltering && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Excluded States
                            </label>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {parameterMetadata[activeTab]?.states?.map((state, index) => (
                                <label key={index} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={getParameterConfig(activeTab).excludedStates?.includes(state) || false}
                                    onChange={(e) => {
                                      const currentExcluded = getParameterConfig(activeTab).excludedStates || []
                                      const newExcluded = e.target.checked
                                        ? [...currentExcluded, state]
                                        : currentExcluded.filter(s => s !== state)
                                      updateParameterConfig(activeTab, {
                                        excludedStates: newExcluded
                                      })
                                    }}
                                    className="rounded border-gray-300 text-red-600 focus:ring-red-500 h-4 w-4"
                                  />
                                  <span className="ml-2 text-sm text-gray-700">{state}</span>
                                </label>
                              ))}
                            </div>
                            <p className="text-xs text-gray-600 mt-2">
                              Selected states will be excluded from the chart display
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sparse Data Handling for Categorical */}
                    <div className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium text-gray-900 flex items-center">
                          <FiLayers className="h-5 w-5 mr-2 text-indigo-600" /> Missing Data Handling
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
                              checked={getParameterConfig(activeTab).forceCategoricalFill || false}
                              onChange={() => updateParameterConfig(activeTab, {
                                forceCategoricalFill: !getParameterConfig(activeTab).forceCategoricalFill
                              })}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">Force Missing Data Fill</span>
                          </label>
                          <p className="text-xs text-gray-600 mt-2 ml-6">
                            Always fill missing categorical values, even for dense data
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Fill Method
                          </label>
                          <select
                            value={getParameterConfig(activeTab).categoricalFillMethod || 'forward'}
                            onChange={(e) => updateParameterConfig(activeTab, {
                              categoricalFillMethod: e.target.value
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          >
                            <option value="forward">Forward Fill (Recommended)</option>
                            <option value="backward">Backward Fill</option>
                            <option value="mostCommon">Use Most Common State</option>
                            <option value="none">Leave Empty</option>
                          </select>
                          <p className="text-xs text-gray-600 mt-2">
                            Forward fill maintains the last recorded state, ideal for flight phases
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Default State for Empty Values
                          </label>
                          <select
                            value={getParameterConfig(activeTab).defaultState || ''}
                            onChange={(e) => updateParameterConfig(activeTab, {
                              defaultState: e.target.value
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          >
                            <option value="">-- No Default --</option>
                            {parameterMetadata[activeTab]?.states?.map((state, index) => (
                              <option key={index} value={state}>{state}</option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-600 mt-2">
                            Use this state when no other fill method can be applied
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