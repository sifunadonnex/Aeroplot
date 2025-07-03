'use client'
import React, {useState, useEffect, useMemo, useCallback} from 'react'
import * as echarts from 'echarts'
import FileUpload from '@/components/shared/FileUpload'
import FlightInfo from '@/components/shared/FlightInfo'
import ProcessingProgress from '@/components/shared/ProcessingProgress'
import ChartConfig from '@/components/shared/ChartConfig'
import LargeCSVParser from '@/utils/LargeCSVParser'
import Spinner from '@/components/ui/Spinner'

export default function FlightChart() {
  const [data, setData] = useState([])
  const [parameters, setParameters] = useState([])
  const [selectedParameters, setSelectedParameters] = useState([])
  const [units, setUnits] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [parameterMetadata, setParameterMetadata] = useState({}) // Cache for parameter analysis
  const [searchTerm, setSearchTerm] = useState('') // Search functionality
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('') // Debounced search
  const [flightData, setFlightData] = useState(null) // Store file information
  const [hasFile, setHasFile] = useState(false) // Track if file is uploaded
  const [processingProgress, setProcessingProgress] = useState(0) // File processing progress
  const [processingMessage, setProcessingMessage] = useState('') // Processing status message
  const [showProgress, setShowProgress] = useState(false) // Show progress modal
  const [chartConfig, setChartConfig] = useState({}) // Custom chart configuration per parameter
  const [showChartConfig, setShowChartConfig] = useState(false) // Show chart config panel

  // Remove the automatic fetch effect since we're now using file upload
  // useEffect(() => {
  //   fetchCSVData(flight.file)
  // }, [flight.file])

  // Debounce search term to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300) // 300ms delay

    return () => clearTimeout(timer)
  }, [searchTerm])

  const handleFileUpload = async (file) => {
    setIsLoading(true)
    setShowProgress(true)
    setProcessingProgress(0)
    setProcessingMessage('Starting file processing...')
    
    try {
      // Create parser with progress callback
      const parser = new LargeCSVParser((progress, message) => {
        setProcessingProgress(progress)
        setProcessingMessage(message)
      })

      // Parse the CSV file with progress tracking
      const { data, units, headers, totalRows, fileSize } = await parser.parseCSVStream(file)
      
      setProcessingMessage('Optimizing data for visualization...')
      
      // Use intelligent sampling for large datasets
      const sampledData = LargeCSVParser.sampleLargeDataset(data, 15000) // Increased sample size
      
      setData(sampledData)
      setUnits(units)
      const paramList = headers.filter(key => key !== 'time' && key !== 'Sample' && key !== 'Phase')
      setParameters(paramList)
      setSelectedParameters(paramList.length > 0 ? [paramList[0]] : [])
      
      setProcessingMessage('Analyzing parameters...')
      
      // Pre-analyze parameters for performance
      analyzeParameters(sampledData, paramList)
      
      // Store flight data information
      setFlightData({
        fileName: file.name,
        fileSize: file.size,
        recordCount: totalRows,
        sampledCount: sampledData.length,
        parameters: paramList.length,
        uploadedAt: new Date(),
        wasDownsampled: totalRows > sampledData.length
      })
      setHasFile(true)
      
      setProcessingMessage('Complete!')
      setTimeout(() => setShowProgress(false), 1000) // Hide progress after 1 second
      
    } catch (error) {
      console.error('Error processing file:', error)
      setProcessingMessage('Error processing file: ' + error.message)
      setTimeout(() => {
        setShowProgress(false)
        setIsLoading(false)
      }, 3000)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = (e) => reject(e)
      reader.readAsText(file)
    })
  }

  const handleClearFile = () => {
    setData([])
    setParameters([])
    setSelectedParameters([])
    setUnits([])
    setParameterMetadata({})
    setFlightData(null)
    setHasFile(false)
    setSearchTerm('')
    setDebouncedSearchTerm('')
    setShowProgress(false)
    setProcessingProgress(0)
    setProcessingMessage('')
    setChartConfig({})
    setShowChartConfig(false)
  }

  // Intelligent data sampling to reduce dataset size while preserving trends
  const sampleData = (data, targetSize) => {
    if (data.length <= targetSize) return data
    
    const step = Math.floor(data.length / targetSize)
    const sampled = []
    
    for (let i = 0; i < data.length; i += step) {
      sampled.push(data[i])
    }
    
    // Always include the last point
    if (sampled[sampled.length - 1] !== data[data.length - 1]) {
      sampled.push(data[data.length - 1])
    }
    
    return sampled
  }

  // Pre-analyze parameters once to avoid repeated calculations
  const analyzeParameters = (data, paramList) => {
    const metadata = {}
    paramList.forEach(param => {
      const values = data.map(row => row[param]).filter(val => val !== '' && val !== null && val !== undefined)
      const numericValues = values.filter(val => !isNaN(parseFloat(val)))
      
      metadata[param] = {
        isNumeric: numericValues.length / values.length > 0.8,
        states: [...new Set(values)],
        min: numericValues.length > 0 ? Math.min(...numericValues.map(v => parseFloat(v))) : 0,
        max: numericValues.length > 0 ? Math.max(...numericValues.map(v => parseFloat(v))) : 1
      }
    })
    setParameterMetadata(metadata)
  }

  const parseCSV = csvString => {
    const lines = csvString.split('\n').filter(line => line.trim() !== '')
    const headers = lines[0].split(',').map(header => header.trim())
    const units = lines[1].split(',').map(unit => unit.trim())
    const rows = lines.slice(2).map(line => {
      const values = line.split(',').map(value => value.trim())
      const obj = {}
      headers.forEach((header, index) => {
        obj[header] = values[index]
      })
      return obj
    })
    return { data: rows, units: units }
  }

  // Optimized parameter type checking using cached metadata
  const isNumericParameter = useCallback((param) => {
    return parameterMetadata[param]?.isNumeric ?? true
  }, [parameterMetadata])

  // Optimized categorical states retrieval using cached metadata
  const getCategoricalStates = useCallback((param) => {
    return parameterMetadata[param]?.states ?? []
  }, [parameterMetadata])

  // Memoize expensive computations
  const { numericParams, categoricalParams } = useMemo(() => {
    const numeric = selectedParameters.filter(param => isNumericParameter(param))
    const categorical = selectedParameters.filter(param => !isNumericParameter(param))
    return { numericParams: numeric, categoricalParams: categorical }
  }, [selectedParameters, isNumericParameter])

  // Memoize parameter grouping with search filtering - optimized
  const parameterGroups = useMemo(() => {
    const groups = {}
    const processedParams = new Set() // Track processed parameters to avoid duplicates
    
    // Get the parameters to process (filtered or all)
    const paramsToProcess = debouncedSearchTerm 
      ? parameters.filter(param => param.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
      : parameters
    
    paramsToProcess.forEach(param => {
      // Skip if already processed (prevents duplicates)
      if (processedParams.has(param)) return
      
      const parts = param.split(/[_\s]/)
      const groupName = parts.length > 1 ? parts[0] : 'General'
      
      if (!groups[groupName]) {
        groups[groupName] = []
      }
      
      groups[groupName].push(param)
      processedParams.add(param)
    })
    
    return groups
  }, [parameters, debouncedSearchTerm])

  // Optimized filtered parameters count
  const filteredParametersCount = useMemo(() => {
    if (!debouncedSearchTerm) return parameters.length
    const searchLower = debouncedSearchTerm.toLowerCase()
    return parameters.filter(param => 
      param.toLowerCase().includes(searchLower)
    ).length
  }, [parameters, debouncedSearchTerm])

  // Chart configuration functions
  const updateParameterConfig = useCallback((param, config) => {
    setChartConfig(prev => ({
      ...prev,
      [param]: { ...prev[param], ...config }
    }))
  }, [])

  const resetParameterConfig = useCallback((param) => {
    setChartConfig(prev => {
      const newConfig = { ...prev }
      delete newConfig[param]
      return newConfig
    })
  }, [])

  const getParameterConfig = useCallback((param) => {
    return chartConfig[param] || {}
  }, [chartConfig])

  // Apply outlier filtering and range limiting
  const applyParameterFiltering = useCallback((data, param, config) => {
    if (!config.enableFiltering) return data

    return data.map(row => {
      const value = parseFloat(row[param])
      if (isNaN(value)) return row

      // Apply custom range if set
      if (config.customRange) {
        const { min, max } = config.customRange
        if (value < min || value > max) {
          return { ...row, [param]: null } // Filter out values outside range
        }
      }

      // Apply outlier filtering
      if (config.removeOutliers && config.outlierThreshold) {
        const metadata = parameterMetadata[param]
        if (metadata && metadata.isNumeric) {
          const range = metadata.max - metadata.min
          const threshold = range * (config.outlierThreshold / 100)
          const mean = (metadata.max + metadata.min) / 2
          
          if (Math.abs(value - mean) > threshold) {
            return { ...row, [param]: null } // Filter out outliers
          }
        }
      }

      return row
    })
  }, [parameterMetadata, chartConfig])

  // Memoize chart configuration to prevent unnecessary recalculations
  const chartOption = useMemo(() => {
    if (selectedParameters.length === 0 || data.length === 0) return null

    const colorPalette = ['#4CAF50', '#3F51B5', '#FF9800', '#F44336', '#9C27B0']
    const generateLineColor = (index) => colorPalette[index % colorPalette.length]

    // Calculate proper spacing
    const titleHeight = 8
    const toolboxHeight = 6
    const zoomHeight = 8
    const availableHeight = 100 - titleHeight - toolboxHeight - zoomHeight
    const totalParams = selectedParameters.length
    const gridHeight = totalParams > 0 ? Math.floor(availableHeight / totalParams) - 3 : 0
    const gridGap = 1

    // Create grid configuration
    const grids = selectedParameters.map((param, index) => ({
      left: '8%',
      right: '4%',
      top: `${titleHeight + toolboxHeight + index * (gridHeight + gridGap)}%`,
      height: `${gridHeight - 2}%`,
      containLabel: false
    }))

    // Optimize data processing - use cached metadata
    const series = selectedParameters.map((param, index) => {
      const metadata = parameterMetadata[param]
      if (!metadata) return null

      if (metadata.isNumeric) {
        // Numeric parameter - optimized data processing with filtering
        let processedData = data
        const config = getParameterConfig(param)
        
        // Apply filtering if enabled
        if (config.enableFiltering) {
          processedData = applyParameterFiltering(data, param, config)
        }

        const numericData = processedData.map(row => {
          const val = parseFloat(row[param])
          return isNaN(val) ? null : val
        })

        return {
          name: param,
          type: 'line',
          showSymbol: false,
          lineStyle: {
            width: 1.5,
            color: generateLineColor(index)
          },
          smooth: false,
          xAxisIndex: index,
          yAxisIndex: index,
          data: numericData,
          connectNulls: false,
          large: data.length > 1000,
          largeThreshold: 1000
        }
      } else {
        // Categorical parameter - step line chart for discrete states
        const states = metadata.states
        const stateColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']
        
        // Pre-build state index map for faster lookup
        const stateMap = new Map()
        states.forEach((state, idx) => stateMap.set(state, idx))

        // Convert categorical data to numeric indices for step line
        const stepData = data.map((row, idx) => {
          const value = row[param]
          const stateIndex = stateMap.get(value)
          return stateIndex !== undefined ? stateIndex : null
        })

        return {
          name: param,
          type: 'line',
          step: 'end', // Creates step line effect - horizontal then vertical
          showSymbol: false,
          lineStyle: {
            width: 2,
            color: generateLineColor(index)
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                offset: 0,
                color: generateLineColor(index) + '40' // Add transparency
              }, {
                offset: 1,
                color: generateLineColor(index) + '10'
              }]
            }
          },
          xAxisIndex: index,
          yAxisIndex: index,
          data: stepData,
          connectNulls: false,
          large: data.length > 1000,
          largeThreshold: 1000
        }
      }
    }).filter(Boolean)

    // Create optimized x-axis
    const xAxis = selectedParameters.map((param, index) => {
      const interval = Math.max(1, Math.floor(data.length / 10))
      return {
        type: 'category',
        data: data.map((row, idx) => idx),
        gridIndex: index,
        axisLabel: {
          show: index === selectedParameters.length - 1,
          fontSize: 10,
          color: '#666',
          interval: interval
        },
        axisTick: {
          show: index === selectedParameters.length - 1,
          length: 3,
          interval: interval
        },
        axisLine: {
          show: index === selectedParameters.length - 1,
          lineStyle: { color: '#ddd' }
        },
        splitLine: { show: false }
      }
    })

    // Create optimized y-axis using cached metadata
    const yAxis = selectedParameters.map((param, index) => {
      const metadata = parameterMetadata[param]
      if (!metadata) return null

      const generateLineColor = (index) => colorPalette[index % colorPalette.length]

      if (metadata.isNumeric) {
        const config = getParameterConfig(param)
        const useCustomRange = config.customRange && config.useCustomRange
        
        return {
          type: 'value',
          name: param,
          gridIndex: index,
          nameLocation: 'middle',
          nameRotate: 0,
          nameTextStyle: {
            color: generateLineColor(index),
            fontSize: 9,
            fontWeight: 'bold',
          },
          min: useCustomRange ? config.customRange.min : metadata.min,
          max: useCustomRange ? config.customRange.max : metadata.max,
          splitNumber: config.splitNumber || 5,
          axisLabel: {
            fontSize: 9,
            color: '#666',
            formatter: (value) => {
              if (Math.abs(value) >= 1000) {
                return (value / 1000).toFixed(1) + 'k'
              }
              return value.toFixed(2)
            }
          },
          axisLine: { show: true, lineStyle: { color: '#ddd' } },
          axisTick: { show: true, length: 3, lineStyle: { color: '#ddd' } },
          splitLine: {
            show: true,
            lineStyle: { type: 'solid', color: '#f0f0f0', opacity: 0.8 }
          }
        }
      } else {
        const states = metadata.states
        return {
          type: 'value',
          name: param,
          gridIndex: index,
          nameLocation: 'middle',
          nameRotate: 0,
          nameTextStyle: {
            color: generateLineColor(index),
            fontSize: 11,
            fontWeight: 'bold',
          },
          min: -0.3, // Slight padding below
          max: states.length - 0.7, // Slight padding above
          interval: 1, // Ensure integer intervals
          splitNumber: states.length,
          axisLabel: {
            fontSize: 9,
            color: '#666',
            formatter: (value) => {
              const stateIndex = Math.round(value)
              return states[stateIndex] || ''
            }
          },
          axisLine: { show: true, lineStyle: { color: '#ddd' } },
          axisTick: { 
            show: true, 
            length: 3,
            lineStyle: { color: '#ddd' },
            interval: 0 // Show tick for each state
          },
          splitLine: { 
            show: true,
            lineStyle: { 
              type: 'dashed', 
              color: '#f0f0f0', 
              opacity: 0.6 
            },
            interval: 0 // Show grid line for each state
          }
        }
      }
    }).filter(Boolean)

    return {
      backgroundColor: '#fff',
      animation: false, // Disable animation for better performance
      title: {
        text: `Flight Data - ${flightData?.fileName || 'Uploaded File'}`,
        left: 'center',
        top: '1%',
        textStyle: { fontSize: 16, fontWeight: 'bold', color: '#333' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line',
          link: { xAxisIndex: 'all' },
          lineStyle: { color: '#666', type: 'dashed' }
        },
        backgroundColor: 'rgba(0,0,0,0.8)',
        textStyle: { color: '#fff', fontSize: 12 },
        formatter: function(params) {
          if (!params || params.length === 0) return ''
          
          let tooltipContent = `<div><strong>Sample: ${params[0].dataIndex}</strong></div>`
          
          params.forEach(param => {
            const paramName = param.seriesName
            const metadata = parameterMetadata[paramName]
            
            if (metadata && !metadata.isNumeric) {
              // For categorical parameters, show the actual state name
              const stateIndex = Math.round(param.value)
              const stateName = metadata.states[stateIndex] || 'Unknown'
              tooltipContent += `<div>${paramName}: <span style="color:${param.color}">${stateName}</span></div>`
            } else {
              // For numeric parameters, show the value
              const value = param.value !== null ? param.value.toFixed(2) : 'N/A'
              tooltipContent += `<div>${paramName}: <span style="color:${param.color}">${value}</span></div>`
            }
          })
          
          return tooltipContent
        }
      },
      grid: grids,
      xAxis: xAxis,
      yAxis: yAxis,
      toolbox: {
        right: 15,
        top: 35,
        feature: {
          dataZoom: {
            yAxisIndex: 'none',
            title: { zoom: 'Zoom', back: 'Reset Zoom' }
          },
          restore: { title: 'Restore' },
          saveAsImage: {
            name: `Flight_Data_${flightData?.fileName?.replace(/\.[^/.]+$/, "") || 'Chart'}`,
            title: 'Save as Image'
          }
        },
        iconStyle: { borderColor: '#666' }
      },
      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: selectedParameters.map((_, index) => index),
          start: 0,
          end: 100,
          bottom: 15,
          height: 20,
          backgroundColor: '#f8f8f8',
          dataBackground: { areaStyle: { color: '#ddd' } },
          selectedDataBackground: { areaStyle: { color: '#666' } }
        },
        {
          type: 'inside',
          xAxisIndex: selectedParameters.map((_, index) => index)
        }
      ],
      series: series
    }
  }, [selectedParameters, data, parameterMetadata, flightData?.fileName, chartConfig, getParameterConfig, applyParameterFiltering])

  useEffect(() => {
    if (!chartOption) return

    const chartDom = document.getElementById('main')
    if (!chartDom) return

    const myChart = echarts.init(chartDom, null, { 
      renderer: 'canvas', // Use canvas for better performance with large datasets
      useDirtyRect: true // Enable dirty rectangle optimization
    })

    myChart.setOption(chartOption, true)

    const handleResize = () => myChart.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      myChart.dispose()
    }
  }, [chartOption])

  // Group parameters by category (assuming parameter names follow a pattern)
  const groupParameters = useCallback((params) => {
    const groups = {}
    params.forEach(param => {
      // Extract prefix before underscore or space as group name
      const parts = param.split(/[_\s]/)
      const groupName = parts.length > 1 ? parts[0] : 'General'
      if (!groups[groupName]) {
        groups[groupName] = []
      }
      groups[groupName].push(param)
    })
    return groups
  }, [])

  const handleParameterToggle = useCallback((param) => {
    setSelectedParameters(prev => 
      prev.includes(param) 
        ? prev.filter(p => p !== param)
        : [...prev, param]
    )
  }, [])

  const handleGroupToggle = useCallback((groupParams) => {
    setSelectedParameters(prev => {
      const allSelected = groupParams.every(param => prev.includes(param))
      if (allSelected) {
        return prev.filter(p => !groupParams.includes(p))
      } else {
        return [...new Set([...prev, ...groupParams])]
      }
    })
  }, [])

  const getParameterColor = useCallback((param) => {
    const index = parameters.indexOf(param)
    const colorPalette = ['#4CAF50', '#3F51B5', '#FF9800', '#F44336', '#9C27B0']
    return colorPalette[index % colorPalette.length]
  }, [parameters])

  // Clear search when no results
  const clearSearch = useCallback(() => {
    setSearchTerm('')
    setDebouncedSearchTerm('')
  }, [])

  // Handle search input change with debouncing
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value
    setSearchTerm(value)
  }, [])

  // Optimized highlight function
  const getHighlightedName = useCallback((param, searchTerm) => {
    if (!searchTerm) return param
    
    const parts = param.split(new RegExp(`(${searchTerm})`, 'gi'))
    return parts.map((part, index) => 
      part.toLowerCase() === searchTerm.toLowerCase() ? (
        <span key={`${param}-highlight-${index}`} className="bg-yellow-200 text-yellow-800">{part}</span>
      ) : (
        <span key={`${param}-normal-${index}`}>{part}</span>
      )
    )
  }, [])

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Processing Progress Modal */}
      <ProcessingProgress 
        progress={processingProgress}
        message={processingMessage}
        isVisible={showProgress}
      />

      {/* Chart Configuration Modal */}
      <ChartConfig
        selectedParameters={selectedParameters}
        parameterMetadata={parameterMetadata}
        chartConfig={chartConfig}
        updateParameterConfig={updateParameterConfig}
        resetParameterConfig={resetParameterConfig}
        isVisible={showChartConfig}
        onClose={() => setShowChartConfig(false)}
      />

      {/* Loading Indicator */}
      {isLoading && !showProgress && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-center">
            <Spinner className="h-12 w-12 text-blue-600 animate-spin" />
            <p className="mt-4 text-gray-600">Loading flight data...</p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 p-4 flex flex-col">
        {/* File Upload Section - Show when no file is uploaded */}
        {!hasFile && (
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-lg w-full">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Aeroplot</h1>
                <p className="text-gray-600">Upload your CSV flight data to get started</p>
              </div>
              <FileUpload 
                onFileUpload={handleFileUpload}
                isLoading={isLoading}
                acceptedFormats={['.csv']}
              />
            </div>
          </div>
        )}

        {/* Chart Section - Show when file is uploaded */}
        {hasFile && (
          <>
            {/* Flight Info */}
            <FlightInfo 
              flightData={flightData}
              onClearFile={handleClearFile}
            />
            
            {/* Chart Controls */}
            <div className="mb-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {selectedParameters.length} parameter{selectedParameters.length !== 1 ? 's' : ''} selected
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowChartConfig(true)}
                  disabled={selectedParameters.length === 0}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                  Configure Charts
                </button>
              </div>
            </div>
            
            {/* Chart Container */}
            <div className="flex-1 bg-white rounded-lg shadow-sm">
              <div 
                id='main' 
                className="w-full h-full"
                style={{ 
                  minHeight: `${Math.max(500, selectedParameters.length * 120 + 150)}px`
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* Parameter Selection Panel - Only show when file is uploaded */}
      {hasFile && (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Parameters</h3>
          <p className="text-sm text-gray-600 mt-1">
            Total: {parameters.length} | Selected: {selectedParameters.length}
            {debouncedSearchTerm && ` | Filtered: ${filteredParametersCount}`}
          </p>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search parameters..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            {searchTerm && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  onClick={clearSearch}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          
          {/* Search Results Info */}
          {searchTerm && (
            <div className="mt-2 text-xs text-gray-500">
              {debouncedSearchTerm === searchTerm ? (
                filteredParametersCount === 0 ? (
                  <span className="text-red-500">No parameters found matching "{searchTerm}"</span>
                ) : (
                  <span>Found {filteredParametersCount} parameter{filteredParametersCount !== 1 ? 's' : ''}</span>
                )
              ) : (
                <span className="text-blue-500">Searching...</span>
              )}
            </div>
          )}
        </div>

        {/* Parameter Groups */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {Object.keys(parameterGroups).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.44-1.01-5.879-2.621M3 18.5A2.5 2.5 0 015.5 21h13a2.5 2.5 0 002.5-2.5 0 00-2.5-2.5h-13A2.5 2.5 0 003 18.5z" />
              </svg>
              <p className="mt-2 text-sm">No parameters found</p>
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            Object.entries(parameterGroups).map(([groupName, groupParams]) => {
              const allSelected = groupParams.every(param => selectedParameters.includes(param))
              const someSelected = groupParams.some(param => selectedParameters.includes(param))
              
              return (
                <div key={groupName} className="border border-gray-200 rounded-lg">
                  {/* Group Header */}
                  <div 
                    className="p-3 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleGroupToggle(groupParams)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={input => {
                            if (input) input.indeterminate = someSelected && !allSelected
                          }}
                          onChange={() => handleGroupToggle(groupParams)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="font-medium text-gray-800">
                          {groupName}
                          {debouncedSearchTerm && (
                            <span className="ml-1 text-xs text-blue-600">
                              ({groupParams.length})
                            </span>
                          )}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {groupParams.filter(p => selectedParameters.includes(p)).length}/{groupParams.length}
                      </span>
                    </div>
                  </div>

                  {/* Group Parameters */}
                  <div className="p-2 space-y-1">
                    {groupParams.map((param, paramIndex) => {
                      const isSelected = selectedParameters.includes(param)
                      const paramColor = getParameterColor(param)
                      const unit = units[parameters.indexOf(param) + 1] || ''
                      const isNumeric = isNumericParameter(param)
                      
                      return (
                        <div
                          key={`${groupName}-${param}-${paramIndex}`}
                          className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-blue-50 border border-blue-200' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleParameterToggle(param)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleParameterToggle(param)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          
                          {/* Color Indicator */}
                          {isSelected && (
                            <div 
                              className="w-3 h-3 rounded-full border border-gray-300"
                              style={{ backgroundColor: paramColor }}
                            />
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium text-gray-800 truncate">
                                {getHighlightedName(param, debouncedSearchTerm)}
                              </div>
                              {!isNumeric && (
                                <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                                  CAT
                                </span>
                              )}
                            </div>
                            {unit && (
                              <div className="text-xs text-gray-500">
                                {unit}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          {debouncedSearchTerm ? (
            <>
              <button
                onClick={() => {
                  const searchLower = debouncedSearchTerm.toLowerCase()
                  const filteredParams = parameters.filter(param => 
                    param.toLowerCase().includes(searchLower)
                  )
                  setSelectedParameters(prev => [...new Set([...prev, ...filteredParams])])
                }}
                className="w-full px-4 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
                disabled={isLoading || filteredParametersCount === 0}
              >
                Select Filtered ({filteredParametersCount})
              </button>
              <button
                onClick={() => {
                  const searchLower = debouncedSearchTerm.toLowerCase()
                  const filteredParams = parameters.filter(param => 
                    param.toLowerCase().includes(searchLower)
                  )
                  setSelectedParameters(prev => prev.filter(p => !filteredParams.includes(p)))
                }}
                className="w-full px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors"
                disabled={isLoading || filteredParametersCount === 0}
              >
                Deselect Filtered
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setSelectedParameters(parameters)}
                className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                disabled={isLoading}
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedParameters([])}
                className="w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                disabled={isLoading}
              >
                Clear All
              </button>
            </>
          )}
        </div>
        </div>
      )}
    </div>
  )
}