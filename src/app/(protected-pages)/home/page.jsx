'use client'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
    const [analystInfo, setAnalystInfo] = useState({
        name: 'J.MALLIT',
        aircraft: '5Y-CHH',
        partNumber: '5703-1000-00',
        serialNumber: '02221',
        fileId: '666679GC.FDT',
    })

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
            const { data, units, headers, totalRows, fileSize } =
                await parser.parseCSVStream(file)

            setProcessingMessage('Optimizing data for visualization...')

            // Use intelligent sampling for large datasets
            const sampledData = LargeCSVParser.sampleLargeDataset(data, 15000) // Increased sample size

            setData(sampledData)
            setUnits(units)
            const paramList = headers.filter(
                (key) => key !== 'time' && key !== 'Sample' && key !== 'Phase',
            )
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
                wasDownsampled: totalRows > sampledData.length,
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
        paramList.forEach((param) => {
            const values = data
                .map((row) => row[param])
                .filter(
                    (val) => val !== '' && val !== null && val !== undefined,
                )
            const numericValues = values.filter(
                (val) => !isNaN(parseFloat(val)),
            )

            metadata[param] = {
                isNumeric: numericValues.length / values.length > 0.8,
                states: [...new Set(values)].sort(), // Remove duplicates and sort for consistency
                min:
                    numericValues.length > 0
                        ? Math.min(...numericValues.map((v) => parseFloat(v)))
                        : 0,
                max:
                    numericValues.length > 0
                        ? Math.max(...numericValues.map((v) => parseFloat(v)))
                        : 1,
            }
        })
        setParameterMetadata(metadata)
    }

    const parseCSV = (csvString) => {
        const lines = csvString.split('\n').filter((line) => line.trim() !== '')
        const headers = lines[0].split(',').map((header) => header.trim())
        const units = lines[1].split(',').map((unit) => unit.trim())
        const rows = lines.slice(2).map((line) => {
            const values = line.split(',').map((value) => value.trim())
            const obj = {}
            headers.forEach((header, index) => {
                obj[header] = values[index]
            })
            return obj
        })
        return { data: rows, units: units }
    }

    // Utility function to interpolate missing values in sparse data
    const interpolateSparseData = useCallback(
        (data, param, method = 'linear') => {
            const values = data.map((row) => {
                const val = row[param]
                return val === '' || val === null || val === undefined
                    ? null
                    : parseFloat(val)
            })

            // Find valid (non-null) data points
            const validPoints = []
            values.forEach((val, index) => {
                if (val !== null && !isNaN(val)) {
                    validPoints.push({ index, value: val })
                }
            })

            if (validPoints.length === 0) return values

            // Create interpolated array
            const interpolated = [...values]

            for (let i = 0; i < values.length; i++) {
                if (values[i] === null || isNaN(values[i])) {
                    // Find surrounding valid points
                    let prevPoint = null
                    let nextPoint = null

                    for (let j = validPoints.length - 1; j >= 0; j--) {
                        if (validPoints[j].index < i) {
                            prevPoint = validPoints[j]
                            break
                        }
                    }

                    for (let j = 0; j < validPoints.length; j++) {
                        if (validPoints[j].index > i) {
                            nextPoint = validPoints[j]
                            break
                        }
                    }

                    // Apply interpolation based on method
                    switch (method) {
                        case 'forward':
                        default:
                            // Forward fill - use the last recorded value (most common for flight data)
                            if (prevPoint) {
                                interpolated[i] = prevPoint.value
                            } else if (nextPoint) {
                                // If no previous value, use next value (edge case for beginning of data)
                                interpolated[i] = nextPoint.value
                            }
                            break

                        case 'linear':
                            if (prevPoint && nextPoint) {
                                // Linear interpolation between two points
                                const ratio =
                                    (i - prevPoint.index) /
                                    (nextPoint.index - prevPoint.index)
                                interpolated[i] =
                                    prevPoint.value +
                                    ratio * (nextPoint.value - prevPoint.value)
                            } else if (prevPoint) {
                                interpolated[i] = prevPoint.value
                            } else if (nextPoint) {
                                interpolated[i] = nextPoint.value
                            }
                            break

                        case 'backward':
                            if (nextPoint) {
                                interpolated[i] = nextPoint.value
                            } else if (prevPoint) {
                                interpolated[i] = prevPoint.value
                            }
                            break

                        case 'none':
                            // Leave as null - no interpolation
                            break
                    }
                }
            }

            return interpolated
        },
        [],
    )

    // Utility function to fill missing values in sparse categorical data using forward fill
    const fillSparseCategoricalData = useCallback((data, param) => {
        const values = data.map((row) => {
            const val = row[param]
            return val === '' || val === null || val === undefined ? null : val
        })

        // Find valid (non-null) data points
        const validPoints = []
        values.forEach((val, index) => {
            if (val !== null) {
                validPoints.push({ index, value: val })
            }
        })

        if (validPoints.length === 0) return values

        // Create filled array using forward fill
        const filled = [...values]

        for (let i = 0; i < values.length; i++) {
            if (values[i] === null) {
                // Find the last recorded value (forward fill)
                let lastValue = null

                for (let j = validPoints.length - 1; j >= 0; j--) {
                    if (validPoints[j].index < i) {
                        lastValue = validPoints[j].value
                        break
                    }
                }

                // Use forward fill, or backward fill if no previous value exists
                if (lastValue !== null) {
                    filled[i] = lastValue
                } else {
                    // Find next value if no previous value (edge case at beginning)
                    for (let j = 0; j < validPoints.length; j++) {
                        if (validPoints[j].index > i) {
                            filled[i] = validPoints[j].value
                            break
                        }
                    }
                }
            }
        }

        return filled
    }, [])

    // Check if a parameter has sparse data (significant missing values)
    const hasSparsityIssues = useCallback((data, param) => {
        const totalRows = data.length
        const validRows = data.filter((row) => {
            const val = row[param]
            // For both numeric and categorical, check if value exists and is not empty
            return val !== '' && val !== null && val !== undefined
        }).length

        // Consider sparse if more than 20% of data is missing
        return (totalRows - validRows) / totalRows > 0.2
    }, [])

    // Optimized parameter type checking using cached metadata
    const isNumericParameter = useCallback(
        (param) => {
            return parameterMetadata[param]?.isNumeric ?? true
        },
        [parameterMetadata],
    )

    // Optimized categorical states retrieval using cached metadata
    const getCategoricalStates = useCallback(
        (param) => {
            return parameterMetadata[param]?.states ?? []
        },
        [parameterMetadata],
    )

    // Memoize expensive computations
    const { numericParams, categoricalParams } = useMemo(() => {
        const numeric = selectedParameters.filter((param) =>
            isNumericParameter(param),
        )
        const categorical = selectedParameters.filter(
            (param) => !isNumericParameter(param),
        )
        return { numericParams: numeric, categoricalParams: categorical }
    }, [selectedParameters, isNumericParameter])

    // Memoize parameter grouping with search filtering - optimized
    const parameterGroups = useMemo(() => {
        const groups = {}
        const processedParams = new Set() // Track processed parameters to avoid duplicates

        // Get the parameters to process (filtered or all)
        const paramsToProcess = debouncedSearchTerm
            ? parameters.filter((param) =>
                  param
                      .toLowerCase()
                      .includes(debouncedSearchTerm.toLowerCase()),
              )
            : parameters

        paramsToProcess.forEach((param) => {
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
        return parameters.filter((param) =>
            param.toLowerCase().includes(searchLower),
        ).length
    }, [parameters, debouncedSearchTerm])

    // Chart configuration functions
    const updateParameterConfig = useCallback((param, config) => {
        setChartConfig((prev) => ({
            ...prev,
            [param]: { ...prev[param], ...config },
        }))
    }, [])

    const resetParameterConfig = useCallback((param) => {
        setChartConfig((prev) => {
            const newConfig = { ...prev }
            delete newConfig[param]
            return newConfig
        })
    }, [])

    const getParameterConfig = useCallback(
        (param) => {
            return chartConfig[param] || {}
        },
        [chartConfig],
    )

    // Apply outlier filtering and range limiting
    const applyParameterFiltering = useCallback(
        (data, param, config) => {
            if (!config.enableFiltering) return data

            return data.map((row) => {
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
                        const threshold =
                            range * (config.outlierThreshold / 100)
                        const mean = (metadata.max + metadata.min) / 2

                        if (Math.abs(value - mean) > threshold) {
                            return { ...row, [param]: null } // Filter out outliers
                        }
                    }
                }

                return row
            })
        },
        [parameterMetadata, chartConfig],
    )

    // Memoize chart configuration to prevent unnecessary recalculations
    const chartOption = useMemo(() => {
        if (selectedParameters.length === 0 || data.length === 0) return null

        const colorPalette = [
            '#4CAF50',
            '#3F51B5',
            '#FF9800',
            '#F44336',
            '#9C27B0',
        ]
        const generateLineColor = (index) =>
            colorPalette[index % colorPalette.length]

        // Calculate proper spacing with minimum chart height
        const titleHeight = 8
        const toolboxHeight = 6
        const zoomHeight = 8
        const availableHeight = 100 - titleHeight - toolboxHeight - zoomHeight
        const totalParams = selectedParameters.length

        // Set minimum height per chart (in percentage) and calculate if we need more space
        const minChartHeight = 15 // Increased minimum height per chart for better visibility
        const gridGap = 6 // Increased gap for better visual separation
        const requiredHeight = totalParams * (minChartHeight + gridGap)

        // Always ensure adequate space for each parameter
        const useMinimumHeight = requiredHeight > availableHeight
        const gridHeight = useMinimumHeight
            ? minChartHeight
            : Math.max(
                  minChartHeight,
                  Math.floor(availableHeight / totalParams) - gridGap,
              )

        // Calculate actual container height needed
        const calculatedContainerHeight = Math.max(
            600, // Minimum container height
            totalParams * (minChartHeight * 8 + gridGap * 8) + 300, // Dynamic height: each param gets adequate spacing
        )

        // Create grid configuration with adaptive positioning
        const grids = selectedParameters.map((param, index) => {
            // For many parameters, switch to absolute positioning to ensure all are visible
            if (totalParams > 6) {
                const chartHeight = Math.max(
                    120,
                    Math.floor(
                        (calculatedContainerHeight - 200) / totalParams,
                    ) - 20,
                )
                const gapBetweenCharts = 25 // Fixed gap between charts
                return {
                    left: '8%',
                    right: '4%',
                    top: `${100 + index * (chartHeight + gapBetweenCharts)}px`, // Absolute positioning with proper gaps
                    height: `${chartHeight}px`,
                    containLabel: false,
                }
            } else {
                // Use percentage for smaller numbers of parameters
                return {
                    left: '8%',
                    right: '4%',
                    top: `${titleHeight + toolboxHeight + index * (gridHeight + gridGap)}%`,
                    height: `${gridHeight - 1}%`,
                    containLabel: false,
                }
            }
        })

        // Optimize data processing - use cached metadata
        const series = selectedParameters
            .map((param, index) => {
                const metadata = parameterMetadata[param]
                if (!metadata) return null

                if (metadata.isNumeric) {
                    // Numeric parameter - optimized data processing with filtering
                    let processedData = data
                    const config = getParameterConfig(param)

                    // Apply filtering if enabled
                    if (config.enableFiltering) {
                        processedData = applyParameterFiltering(
                            data,
                            param,
                            config,
                        )
                    }

                    // Check if parameter has sparsity issues and needs interpolation
                    const needsInterpolation =
                        hasSparsityIssues(processedData, param) ||
                        config.forceInterpolation
                    const interpolationMethod =
                        config.interpolationMethod || 'forward' // Default to forward fill for flight data

                    let numericData
                    if (needsInterpolation && interpolationMethod !== 'none') {
                        // Use interpolation for sparse data
                        numericData = interpolateSparseData(
                            processedData,
                            param,
                            interpolationMethod,
                        )
                    } else {
                        // Standard processing for dense data
                        numericData = processedData.map((row) => {
                            const val = parseFloat(row[param])
                            return isNaN(val) ? null : val
                        })
                    }

                    return {
                        name: param,
                        type: 'line',
                        showSymbol: false,
                        lineStyle: {
                            width: 1.5,
                            color: generateLineColor(index),
                        },
                        smooth:
                            needsInterpolation &&
                            interpolationMethod === 'linear' &&
                            config.smoothInterpolated !== false, // Only smooth for linear interpolation
                        xAxisIndex: index,
                        yAxisIndex: index,
                        data: numericData,
                        connectNulls: needsInterpolation, // Connect nulls for interpolated data
                        large: data.length > 1000,
                        largeThreshold: 1000,
                    }
                } else {
                    // Categorical parameter - step line chart for discrete states
                    const states = [...new Set(metadata.states)].sort() // Remove duplicates and sort

                    // Check if categorical parameter has sparsity issues
                    const hasSparseCategoricalData = hasSparsityIssues(
                        data,
                        param,
                    )

                    // Handle sparse categorical data with forward fill
                    let categoricalValues
                    if (hasSparseCategoricalData) {
                        categoricalValues = fillSparseCategoricalData(
                            data,
                            param,
                        )
                    } else {
                        categoricalValues = data.map((row) => {
                            const val = row[param]
                            return val === '' ||
                                val === null ||
                                val === undefined
                                ? null
                                : val
                        })
                    }

                    // Pre-build state index map for faster lookup
                    const stateMap = new Map()
                    states.forEach((state, idx) => stateMap.set(state, idx))

                    // Convert categorical data to numeric indices for step line
                    const stepData = categoricalValues.map((value, idx) => {
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
                            color: generateLineColor(index),
                        },
                        // Remove areaStyle to eliminate shading
                        xAxisIndex: index,
                        yAxisIndex: index,
                        data: stepData,
                        connectNulls: false,
                        large: data.length > 1000,
                        largeThreshold: 1000,
                    }
                }
            })
            .filter(Boolean)

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
                    interval: interval,
                },
                axisTick: {
                    show: index === selectedParameters.length - 1,
                    length: 3,
                    interval: interval,
                },
                axisLine: {
                    show: index === selectedParameters.length - 1,
                    lineStyle: { color: '#ddd' },
                },
                splitLine: { show: false },
            }
        })

        // Create optimized y-axis using cached metadata
        const yAxis = selectedParameters
            .map((param, index) => {
                const metadata = parameterMetadata[param]
                if (!metadata) return null

                const generateLineColor = (index) =>
                    colorPalette[index % colorPalette.length]

                if (metadata.isNumeric) {
                    const config = getParameterConfig(param)
                    const useCustomRange =
                        config.customRange && config.useCustomRange
                    const paramColor = generateLineColor(index)

                    const minValue = useCustomRange ? config.customRange.min : metadata.min
                    const maxValue = useCustomRange ? config.customRange.max : metadata.max

                    return {
                        type: 'value',
                        name: param,
                        gridIndex: index,
                        nameLocation: 'end',
                        nameRotate: 0,
                        nameGap: 10,
                        nameTextStyle: {
                            color: paramColor,
                            fontSize: 10,
                            fontWeight: 'bold',
                            align: 'left',
                        },
                        min: minValue,
                        max: maxValue,
                        splitNumber: 2, // Only show min and max
                        axisLabel: {
                            fontSize: 9,
                            color: paramColor,
                            formatter: (value) => {
                                if (Math.abs(value) >= 1000) {
                                    return (value / 1000).toFixed(1) + 'k'
                                }
                                return value.toFixed(2)
                            },
                        },
                        axisLine: { show: true, lineStyle: { color: paramColor } },
                        axisTick: {
                            show: true,
                            length: 3,
                            lineStyle: { color: paramColor },
                        },
                        splitLine: {
                            show: true,
                            lineStyle: {
                                type: 'solid',
                                color: paramColor,
                                opacity: 0.2,
                            },
                        },
                    }
                } else {
                    const states = [...new Set(metadata.states)].sort() // Remove duplicates and sort
                    const paramColor = generateLineColor(index)
                    
                    return {
                        type: 'value',
                        name: param,
                        gridIndex: index,
                        nameLocation: 'end',
                        nameRotate: 0,
                        nameGap: 10,
                        nameTextStyle: {
                            color: paramColor,
                            fontSize: 10,
                            fontWeight: 'bold',
                            align: 'left',
                        },
                        min: 0, // Start from 0 for proper alignment
                        max: states.length - 1, // End at length-1 for proper alignment
                        interval: 1, // Ensure integer intervals
                        splitNumber: states.length,
                        axisLabel: {
                            fontSize: 9,
                            color: paramColor,
                            formatter: (value) => {
                                const stateIndex = Math.round(value)
                                if (
                                    stateIndex >= 0 &&
                                    stateIndex < states.length
                                ) {
                                    return states[stateIndex]
                                }
                                return ''
                            },
                        },
                        axisLine: { show: true, lineStyle: { color: paramColor } },
                        axisTick: {
                            show: true,
                            length: 3,
                            lineStyle: { color: paramColor },
                            interval: 0, // Show tick for each state
                            alignWithLabel: true, // Align ticks with labels
                        },
                        splitLine: {
                            show: true,
                            lineStyle: {
                                type: 'dashed',
                                color: paramColor,
                                opacity: 0.3,
                            },
                            interval: 0, // Show grid line for each state
                        },
                    }
                }
            })
            .filter(Boolean)
        //Flight Data - ${flightData?.fileName || 'Uploaded File'}
        return {
            backgroundColor: '#fff',
            animation: false, // Disable animation for better performance
            title: {
                text: ``,
                left: 'center',
                top: '1%',
                textStyle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'line',
                    link: { xAxisIndex: 'all' },
                    lineStyle: { color: '#666', type: 'dashed' },
                },
                backgroundColor: 'rgba(0,0,0,0.8)',
                textStyle: { color: '#fff', fontSize: 12 },
                formatter: function (params) {
                    if (!params || params.length === 0) return ''

                    let tooltipContent = `<div><strong>Sample: ${params[0].dataIndex}</strong></div>`

                    params.forEach((param, paramIndex) => {
                        const paramName = param.seriesName
                        const metadata = parameterMetadata[paramName]
                        // Use the same color generation logic as the chart
                        const colorPalette = [
                            '#4CAF50',
                            '#3F51B5',
                            '#FF9800',
                            '#F44336',
                            '#9C27B0',
                        ]
                        const selectedParamIndex =
                            selectedParameters.indexOf(paramName)
                        const paramColor =
                            colorPalette[
                                selectedParamIndex % colorPalette.length
                            ]

                        if (metadata && !metadata.isNumeric) {
                            // For categorical parameters, show the actual state name
                            const stateIndex = Math.round(param.value)
                            const cleanedStates = [
                                ...new Set(metadata.states),
                            ].sort()
                            const stateName =
                                cleanedStates[stateIndex] || 'Unknown'
                            tooltipContent += `<div>${paramName}: <span style="color:${paramColor}">${stateName}</span></div>`
                        } else {
                            // For numeric parameters, show the value
                            const value =
                                param.value !== null
                                    ? param.value.toFixed(2)
                                    : 'N/A'
                            tooltipContent += `<div>${paramName}: <span style="color:${paramColor}">${value}</span></div>`
                        }
                    })

                    return tooltipContent
                },
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
                        title: { zoom: 'Zoom', back: 'Reset Zoom' },
                    },
                    restore: { title: 'Restore' },
                    saveAsImage: {
                        name: `Flight_Data_${flightData?.fileName?.replace(/\.[^/.]+$/, '') || 'Chart'}`,
                        title: 'Save as Image',
                        pixelRatio: 2, // Higher resolution for better quality
                    },
                    myPrint: {
                        show: true,
                        title: 'Print Chart',
                        icon: 'path://M64 0C28.7 0 0 28.7 0 64V352c0 35.3 28.7 64 64 64H224V304c0-26.5 21.5-48 48-48s48 21.5 48 48V416H448c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64H64zM448 448H320V304c0-8.8-7.2-16-16-16s-16 7.2-16 16V448H224c-35.3 0-64-28.7-64-64V64c0-35.3 28.7-64 64-64H448c35.3 0 64 28.7 64 64V384c0 35.3-28.7 64-64 64z',
                        onclick: function () {
                            window.printChart && window.printChart()
                        },
                    },
                },
                iconStyle: { borderColor: '#666' },
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
                    selectedDataBackground: { areaStyle: { color: '#666' } },
                },
                {
                    type: 'inside',
                    xAxisIndex: selectedParameters.map((_, index) => index),
                },
            ],
            series: series,
        }
    }, [
        selectedParameters,
        data,
        parameterMetadata,
        flightData?.fileName,
        chartConfig,
        getParameterConfig,
        applyParameterFiltering,
    ])

    useEffect(() => {
        if (!chartOption) return

        const chartDom = document.getElementById('main')
        if (!chartDom) return

        const myChart = echarts.init(chartDom, null, {
            renderer: 'svg', // Use SVG for better print quality
            useDirtyRect: true, // Enable dirty rectangle optimization
        })

        myChart.setOption(chartOption, true)

        // Add print functionality to window
        window.printChart = () => {
            // Create a new window for printing with optimized layout
            const printWindow = window.open(
                '',
                '_blank',
                'width=1200,height=800,scrollbars=yes,resizable=yes',
            )

            if (!printWindow) {
                alert('Please allow pop-ups to enable chart printing.')
                return
            }

            // Calculate how many pages we need (6 charts per page)
            const chartsPerPage = 6
            const totalParams = selectedParameters.length
            const totalPages = Math.ceil(totalParams / chartsPerPage)

            // Generate chart pages
            const chartPages = []

            for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
                const startIndex = pageIndex * chartsPerPage
                const endIndex = Math.min(
                    startIndex + chartsPerPage,
                    totalParams,
                )
                const pageParams = selectedParameters.slice(
                    startIndex,
                    endIndex,
                )
                const chartsOnThisPage = pageParams.length

                // Create a print-specific chart configuration for this page
                const printChartOption = {
                    ...chartOption,
                    // Remove toolbox (zoom, refresh, download controls)
                    toolbox: null,
                    // Remove dataZoom controls
                    dataZoom: null,
                    // Adjust layout for print without toolbox and header
                    title: null, // Remove title/header completely for more space
                    // Show parameters for this page only with adjusted indices
                    series: chartOption.series
                        ? chartOption.series
                              .slice(startIndex, endIndex)
                              .map((series, index) => ({
                                  ...series,
                                  xAxisIndex: index, // Reset to 0-based indexing for this page
                                  yAxisIndex: index, // Reset to 0-based indexing for this page
                                  gridIndex: index, // Reset to 0-based gridIndex for this page
                              }))
                        : [],
                    // Slice and reset the xAxis and yAxis to match the grid indices
                    xAxis: chartOption.xAxis
                        ? chartOption.xAxis
                              .slice(startIndex, endIndex)
                              .map((axis, index) => ({
                                  ...axis,
                                  gridIndex: index, // Reset gridIndex to 0-based for this page
                                  axisLabel: {
                                      ...axis.axisLabel,
                                      show: index === chartsOnThisPage - 1, // Show x-axis labels on the last chart of each page
                                  },
                                  axisTick: {
                                      ...axis.axisTick,
                                      show: index === chartsOnThisPage - 1, // Show x-axis ticks on the last chart of each page
                                  },
                                  axisLine: {
                                      ...axis.axisLine,
                                      show: index === chartsOnThisPage - 1, // Show x-axis line on the last chart of each page
                                  },
                              }))
                        : [],
                    yAxis: chartOption.yAxis
                        ? chartOption.yAxis
                              .slice(startIndex, endIndex)
                              .map((axis, index) => ({
                                  type: axis.type,
                                  name: axis.name,
                                  gridIndex: index, // Reset gridIndex to 0-based for this page
                                  nameLocation: axis.nameLocation,
                                  nameRotate: axis.nameRotate,
                                  nameGap: axis.nameGap,
                                  nameTextStyle: axis.nameTextStyle,
                                  min: axis.min,
                                  max: axis.max,
                                  splitNumber: axis.splitNumber, // Preserve min/max only display for numeric
                                  interval: axis.interval,
                                  axisLabel: axis.axisLabel,
                                  axisLine: axis.axisLine,
                                  axisTick: axis.axisTick,
                                  splitLine: axis.splitLine,
                              }))
                        : [],
                    // Recalculate grid positions for print - 6 graphs max per page or less for last page
                    grid: pageParams.map((param, index) => {
                        // Optimized positioning for charts with professional header
                        const topMargin = 8 // Margin for professional header space
                        const availablePrintHeight = 88 // Available height with header space
                        const printGridHeight =
                            Math.floor(
                                availablePrintHeight / chartsOnThisPage,
                            ) - 2.5 // Divide space evenly among charts on this page
                        const printGapBetweenCharts = 4 // Restored gap between charts for better readability

                        return {
                            left: '2%', // Minimal left margin for maximum chart width
                            right: '1%', // Minimal right margin for maximum chart width
                            top: `${topMargin + index * (printGridHeight + printGapBetweenCharts)}%`,
                            height: `${printGridHeight}%`,
                            containLabel: false,
                        }
                    }),
                }

                // Create a temporary chart for print rendering
                const printChartDom = document.createElement('div')
                printChartDom.style.width = '1200px'
                printChartDom.style.height = '850px' // Increased height for larger charts
                printChartDom.style.position = 'absolute'
                printChartDom.style.left = '-9999px'
                document.body.appendChild(printChartDom)

                const printChart = echarts.init(printChartDom, null, {
                    renderer: 'svg',
                    useDirtyRect: false,
                })

                printChart.setOption(printChartOption, true)

                // Get clean SVG without controls
                const chartSVG = printChart.renderToSVGString()

                // Clean up temporary chart
                printChart.dispose()
                document.body.removeChild(printChartDom)

                // Store the SVG and page info
                chartPages.push({
                    svg: chartSVG,
                    params: pageParams,
                    pageNumber: pageIndex + 1,
                    totalPages: totalPages,
                    startIndex: startIndex,
                })
            }

            // Create the print HTML content with professional header matching the reference image
            const currentDate = new Date()
            const dateStr = currentDate.toLocaleDateString('en-US', {
                month: 'numeric',
                day: 'numeric',
                year: '2-digit',
            })
            const timeStr = currentDate.toLocaleTimeString('en-US', {
                hour12: true,
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
            })

            const printHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flight Data Analysis - ${analystInfo.aircraft}</title>
  <style>
    * {
      box-sizing: border-box;
    }
    
    @page {
      size: A4 landscape;
      margin: 8mm;
    }
    
    html, body {
      margin: 0;
      padding: 0;
      font-family: 'Arial', sans-serif;
      background: white;
      color: #000;
      line-height: 1.2;
      font-size: 11px;
    }
    
    .print-container {
      width: 100%;
      max-width: 100%;
      padding: 0;
      margin: 0;
    }
    
    .chart-page {
      page-break-before: always;
      page-break-after: always;
      page-break-inside: avoid;
      height: 100vh;
      position: relative;
    }
    
    .chart-page:first-child {
      page-break-before: auto;
    }
    
    .professional-header {
      width: 100%;
      padding-bottom: 3px;
      margin-bottom: 8px;
      font-size: 11px;
      font-weight: normal;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .header-left {
      text-align: left;
      flex: 1;
    }
    
    .header-center {
      text-align: center;
      flex: 1;
      font-weight: normal;
    }
    
    .header-right {
      text-align: right;
      flex: 1;
    }
    
    .chart-container {
      width: 100%;
      text-align: center;
      page-break-inside: avoid;
      page-break-before: auto;
      page-break-after: avoid;
      height: 88vh;
      max-height: 88vh;
      margin-top: 0;
    }
    
    .chart-container svg {
      max-width: 100%;
      height: 100%;
      max-height: 100%;
      display: block;
      margin: 0 auto;
      page-break-inside: avoid;
    }
    
    .parameters-section {
      margin-top: 20px;
      page-break-before: always;
      page-break-inside: avoid;
    }
    
    .parameters-section h3 {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #000;
      font-weight: bold;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
    }
    
    .parameters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 6px;
      margin-bottom: 15px;
    }
    
    .parameter-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      background: #f8f9fa;
      border: 1px solid #ddd;
      border-radius: 3px;
      font-size: 10px;
      page-break-inside: avoid;
    }
    
    .color-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 1px solid #666;
      flex-shrink: 0;
    }
    
    .parameter-name {
      font-weight: bold;
      color: #000;
    }
    
    .parameter-unit {
      color: #666;
      font-style: italic;
    }
    
    .parameter-type {
      color: #666;
      font-size: 9px;
      font-weight: normal;
    }
    
    /* Print-specific optimizations */
    @media print {
      html, body {
        background: white !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .print-container {
        padding: 0 !important;
        margin: 0 !important;
      }
      
      .chart-page {
        page-break-before: always !important;
        page-break-after: always !important;
        page-break-inside: avoid !important;
        height: 100vh !important;
      }
      
      .chart-page:first-child {
        page-break-before: auto !important;
      }
      
      .chart-container {
        page-break-inside: avoid !important;
        page-break-before: auto !important;
        page-break-after: avoid !important;
        height: 88vh !important;
        max-height: 88vh !important;
        margin-top: 0 !important;
      }
      
      .parameters-section {
        page-break-before: always !important;
        page-break-inside: avoid !important;
      }
      
      @page {
        margin: 8mm !important;
        size: A4 landscape !important;
      }
      
      .parameter-item {
        page-break-inside: avoid !important;
        orphans: 2;
        widows: 2;
      }
      
      .chart-container svg {
        height: 100% !important;
        max-height: 100% !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-container">
    ${chartPages
        .map(
            (page, pageIndex) => `
      <div class="chart-page">
        <div class="professional-header">
          <div class="header-left">ANALYST: ${analystInfo.name}</div>
          <div class="header-center">${dateStr} ${timeStr}</div>
          <div class="header-right">${analystInfo.aircraft} P/N: ${analystInfo.partNumber} S/N: ${analystInfo.serialNumber} FILE ID: ${analystInfo.fileId}</div>
        </div>
        <div class="chart-container">
          ${page.svg}
        </div>
      </div>
    `,
        )
        .join('')}
    
  </div>
  
  <script>
    // Ensure the content is fully loaded before printing
    function initiatePrint() {
      // Give the SVG time to render properly
      setTimeout(() => {
        // Focus the window to ensure print dialog appears
        window.focus();
        
        // Trigger print
        window.print();
        
        // Close window after printing (with a delay for user to complete printing)
        setTimeout(() => {
          window.close();
        }, 2000);
      }, 1000);
    }
    
    // Wait for all content to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initiatePrint);
    } else {
      initiatePrint();
    }
    
    // Fallback: also trigger on window load
    window.addEventListener('load', () => {
      setTimeout(initiatePrint, 500);
    });
  </script>
</body>
</html>`

            // Write content to the new window
            printWindow.document.open()
            printWindow.document.write(printHTML)
            printWindow.document.close()
        }

        const handleResize = () => myChart.resize()
        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            // Clean up print function
            if (window.printChart) {
                delete window.printChart
            }
            myChart.dispose()
        }
    }, [
        chartOption,
        flightData,
        data.length,
        selectedParameters,
        units,
        parameters,
        parameterMetadata,
    ])

    // Group parameters by category (assuming parameter names follow a pattern)
    const groupParameters = useCallback((params) => {
        const groups = {}
        params.forEach((param) => {
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
        setSelectedParameters((prev) =>
            prev.includes(param)
                ? prev.filter((p) => p !== param)
                : [...prev, param],
        )
    }, [])

    const handleGroupToggle = useCallback((groupParams) => {
        setSelectedParameters((prev) => {
            const allSelected = groupParams.every((param) =>
                prev.includes(param),
            )
            if (allSelected) {
                return prev.filter((p) => !groupParams.includes(p))
            } else {
                return [...new Set([...prev, ...groupParams])]
            }
        })
    }, [])

    const getParameterColor = useCallback(
        (param) => {
            const index = parameters.indexOf(param)
            const colorPalette = [
                '#4CAF50',
                '#3F51B5',
                '#FF9800',
                '#F44336',
                '#9C27B0',
            ]
            return colorPalette[index % colorPalette.length]
        },
        [parameters],
    )

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
                <span
                    key={`${param}-highlight-${index}`}
                    className="bg-yellow-200 text-yellow-800"
                >
                    {part}
                </span>
            ) : (
                <span key={`${param}-normal-${index}`}>{part}</span>
            ),
        )
    }, [])

    return (
        <div className="flex">
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
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="text-center bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                        <Spinner className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
                        <p className="mt-4 text-gray-700 font-medium">
                            Loading flight data...
                        </p>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 p-6 flex flex-col">
                {/* File Upload Section - Show when no file is uploaded */}
                {!hasFile && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="max-w-2xl w-full">
                            {/* Hero Section */}
                            <div className="text-center mb-12">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-6">
                                    <svg
                                        className="w-10 h-10 text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                        />
                                    </svg>
                                </div>
                                <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent mb-4">
                                    Aeroplot
                                </h1>
                                <p className="text-xl text-gray-600 mb-2">
                                    Advanced Flight Data Visualization
                                </p>
                                <p className="text-gray-500">
                                    Upload your CSV flight data to start
                                    analyzing and visualizing your flight
                                    parameters
                                </p>
                            </div>

                            {/* Upload Component */}
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                                <FileUpload
                                    onFileUpload={handleFileUpload}
                                    isLoading={isLoading}
                                    acceptedFormats={['.csv']}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Chart Section - Show when file is uploaded */}
                {hasFile && (
                    <>
                        {/* Flight Info */}
                        <div className="mb-6">
                            <FlightInfo
                                flightData={flightData}
                                onClearFile={handleClearFile}
                            />
                        </div>

                        {/* Chart Controls */}
                        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            {/* Header Section: Parameters + Data Info */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center space-x-4">
                                    {/* Live Pulse + Parameters Selected */}
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                        <span className="text-sm font-medium text-gray-700">
                                            {selectedParameters.length}{' '}
                                            parameter
                                            {selectedParameters.length !== 1
                                                ? 's'
                                                : ''}{' '}
                                            selected
                                        </span>
                                    </div>

                                    {/* Data Count Display */}
                                    {selectedParameters.length > 0 && (
                                        <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                                            {data.length.toLocaleString()} data
                                            points
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() =>
                                            window.printChart &&
                                            window.printChart()
                                        }
                                        disabled={
                                            selectedParameters.length === 0
                                        }
                                        className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                                    >
                                        <svg
                                            className="h-4 w-4 mr-2"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                                            />
                                        </svg>
                                        Print Chart
                                    </button>

                                    <button
                                        onClick={() => setShowChartConfig(true)}
                                        disabled={
                                            selectedParameters.length === 0
                                        }
                                        className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                                    >
                                        <svg
                                            className="h-4 w-4 mr-2"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                                            />
                                        </svg>
                                        Configure Charts
                                    </button>
                                </div>
                            </div>

                            {/* Analyst Header Information Section */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-800 mb-3">
                                    Print Header Information
                                </h4>

                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                    {[
                                        {
                                            label: 'Analyst Name',
                                            value: analystInfo.name,
                                            key: 'name',
                                            placeholder: 'J.MALLIT',
                                        },
                                        {
                                            label: 'Aircraft',
                                            value: analystInfo.aircraft,
                                            key: 'aircraft',
                                            placeholder: '5Y-CHH',
                                        },
                                        {
                                            label: 'Part Number',
                                            value: analystInfo.partNumber,
                                            key: 'partNumber',
                                            placeholder: '5703-1000-00',
                                        },
                                        {
                                            label: 'Serial Number',
                                            value: analystInfo.serialNumber,
                                            key: 'serialNumber',
                                            placeholder: '02221',
                                        },
                                        {
                                            label: 'File ID',
                                            value: analystInfo.fileId,
                                            key: 'fileId',
                                            placeholder: '666679GC.FDT',
                                        },
                                    ].map(
                                        ({
                                            label,
                                            value,
                                            key,
                                            placeholder,
                                        }) => (
                                            <div key={key}>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    {label}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={value}
                                                    onChange={(e) =>
                                                        setAnalystInfo(
                                                            (prev) => ({
                                                                ...prev,
                                                                [key]: e.target
                                                                    .value,
                                                            }),
                                                        )
                                                    }
                                                    placeholder={placeholder}
                                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sparse Data Info Banner */}
                        {selectedParameters.some((p) =>
                            hasSparsityIssues(data, p),
                        ) && (
                            <div className="mb-6 bg-orange-50 border border-orange-200 rounded-xl p-4">
                                <div className="flex items-start space-x-3">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                            <svg
                                                className="w-4 h-4 text-orange-600"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-medium text-orange-800 mb-1">
                                            Sparse Data Detected
                                        </h4>
                                        <p className="text-sm text-orange-700 mb-2">
                                            {
                                                selectedParameters.filter((p) =>
                                                    hasSparsityIssues(data, p),
                                                ).length
                                            }{' '}
                                            parameter
                                            {selectedParameters.filter((p) =>
                                                hasSparsityIssues(data, p),
                                            ).length !== 1
                                                ? 's'
                                                : ''}{' '}
                                            ha
                                            {selectedParameters.filter((p) =>
                                                hasSparsityIssues(data, p),
                                            ).length === 1
                                                ? 's'
                                                : 've'}{' '}
                                            missing values that will be filled
                                            with the last recorded value
                                            (forward fill).
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedParameters
                                                .filter((p) =>
                                                    hasSparsityIssues(data, p),
                                                )
                                                .map((param) => {
                                                    const isNumeric =
                                                        isNumericParameter(
                                                            param,
                                                        )
                                                    return (
                                                        <span
                                                            key={param}
                                                            className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                                                                isNumeric
                                                                    ? 'bg-orange-100 text-orange-800'
                                                                    : 'bg-purple-100 text-purple-800'
                                                            }`}
                                                        >
                                                            {param}{' '}
                                                            {!isNumeric &&
                                                                '(CAT)'}
                                                        </span>
                                                    )
                                                })}
                                        </div>
                                        <p className="text-xs text-orange-600 mt-2">
                                            Use "Configure Charts" to change
                                            interpolation method or disable gap
                                            filling for specific parameters.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Chart Container */}
                        <div className="flex-1 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="h-full overflow-auto">
                                <div
                                    id="main"
                                    className="w-full"
                                    style={{
                                        height: `${Math.max(600, selectedParameters.length * 180 + 350)}px`,
                                        minHeight: '600px',
                                    }}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Parameter Selection Panel - Only show when file is uploaded */}
            {hasFile && (
                <div className="w-96 bg-white/95 backdrop-blur-sm border-l h-[200vh] border-gray-200 flex flex-col shadow-xl">
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-r from-slate-900 to-blue-900 text-white">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-white">
                                Parameters
                            </h3>
                        </div>

                        {/* Stats Overview */}
                        <div className="grid grid-cols-4 gap-2 text-center">
                            <div className="bg-white/10 rounded-lg p-3">
                                <div className="text-xl font-bold">
                                    {parameters.length}
                                </div>
                                <div className="text-xs opacity-80">Total</div>
                            </div>
                            <div className="bg-white/10 rounded-lg p-3">
                                <div className="text-xl font-bold text-green-300">
                                    {selectedParameters.length}
                                </div>
                                <div className="text-xs opacity-80">
                                    Selected
                                </div>
                            </div>
                            <div className="bg-white/10 rounded-lg p-3">
                                <div className="text-xl font-bold text-blue-300">
                                    {debouncedSearchTerm
                                        ? filteredParametersCount
                                        : parameters.length}
                                </div>
                                <div className="text-xs opacity-80">
                                    Visible
                                </div>
                            </div>
                            <div className="bg-white/10 rounded-lg p-3">
                                <div className="text-xl font-bold text-orange-300">
                                    {
                                        selectedParameters.filter((p) =>
                                            hasSparsityIssues(data, p),
                                        ).length
                                    }
                                </div>
                                <div className="text-xs opacity-80">Sparse</div>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg
                                    className="h-5 w-5 text-gray-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search parameters..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                            />
                            {searchTerm && (
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <button
                                        onClick={clearSearch}
                                        className="text-gray-400 hover:text-gray-600 focus:outline-none p-1 rounded-md hover:bg-gray-100 transition-colors"
                                    >
                                        <svg
                                            className="h-4 w-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Search Results Info */}
                        {searchTerm && (
                            <div className="mt-3 text-xs">
                                {debouncedSearchTerm === searchTerm ? (
                                    filteredParametersCount === 0 ? (
                                        <div className="text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                                            No parameters found matching "
                                            {searchTerm}"
                                        </div>
                                    ) : (
                                        <div className="text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                                            Found {filteredParametersCount}{' '}
                                            parameter
                                            {filteredParametersCount !== 1
                                                ? 's'
                                                : ''}
                                        </div>
                                    )
                                ) : (
                                    <div className="text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 animate-pulse">
                                        Searching...
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Parameter Groups */}
                    <div className="flex-1 overflow-y-scroll p-4 space-y-4">
                        {Object.keys(parameterGroups).length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                                    <svg
                                        className="w-8 h-8 text-gray-400"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={1}
                                            d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.44-1.01-5.879-2.621M3 18.5A2.5 2.5 0 015.5 21h13a2.5 2.5 0 002.5-2.5 0 00-2.5-2.5h-13A2.5 2.5 0 003 18.5z"
                                        />
                                    </svg>
                                </div>
                                <p className="text-lg font-medium mb-2">
                                    No parameters found
                                </p>
                                <p className="text-sm">
                                    Try adjusting your search criteria
                                </p>
                                {searchTerm && (
                                    <button
                                        onClick={clearSearch}
                                        className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        Clear search
                                    </button>
                                )}
                            </div>
                        ) : (
                            Object.entries(parameterGroups).map(
                                ([groupName, groupParams]) => {
                                    const allSelected = groupParams.every(
                                        (param) =>
                                            selectedParameters.includes(param),
                                    )
                                    const someSelected = groupParams.some(
                                        (param) =>
                                            selectedParameters.includes(param),
                                    )

                                    return (
                                        <div
                                            key={groupName}
                                            className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                                        >
                                            {/* Group Header */}
                                            <div
                                                className="p-4 bg-white border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                                                onClick={() =>
                                                    handleGroupToggle(
                                                        groupParams,
                                                    )
                                                }
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                allSelected
                                                            }
                                                            ref={(input) => {
                                                                if (input)
                                                                    input.indeterminate =
                                                                        someSelected &&
                                                                        !allSelected
                                                            }}
                                                            onChange={() =>
                                                                handleGroupToggle(
                                                                    groupParams,
                                                                )
                                                            }
                                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 transition-colors"
                                                        />
                                                        <div>
                                                            <span className="font-semibold text-gray-900">
                                                                {groupName}
                                                                {debouncedSearchTerm && (
                                                                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                                                        {
                                                                            groupParams.length
                                                                        }
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                                                            {
                                                                groupParams.filter(
                                                                    (p) =>
                                                                        selectedParameters.includes(
                                                                            p,
                                                                        ),
                                                                ).length
                                                            }
                                                            /
                                                            {groupParams.length}
                                                        </span>
                                                        <svg
                                                            className="w-4 h-4 text-gray-400"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M19 9l-7 7-7-7"
                                                            />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Group Parameters */}
                                            <div className="p-2 space-y-1">
                                                {groupParams.map(
                                                    (param, paramIndex) => {
                                                        const isSelected =
                                                            selectedParameters.includes(
                                                                param,
                                                            )
                                                        const paramColor =
                                                            getParameterColor(
                                                                param,
                                                            )
                                                        const unit =
                                                            units[
                                                                parameters.indexOf(
                                                                    param,
                                                                ) + 1
                                                            ] || ''
                                                        const isNumeric =
                                                            isNumericParameter(
                                                                param,
                                                            )
                                                        const isSparse =
                                                            hasSparsityIssues(
                                                                data,
                                                                param,
                                                            )

                                                        return (
                                                            <div
                                                                key={`${groupName}-${param}-${paramIndex}`}
                                                                className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all ${
                                                                    isSelected
                                                                        ? 'bg-blue-50 border-2 border-blue-200 shadow-sm'
                                                                        : 'hover:bg-white border-2 border-transparent'
                                                                }`}
                                                                onClick={() =>
                                                                    handleParameterToggle(
                                                                        param,
                                                                    )
                                                                }
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        isSelected
                                                                    }
                                                                    onChange={() =>
                                                                        handleParameterToggle(
                                                                            param,
                                                                        )
                                                                    }
                                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 transition-colors"
                                                                />

                                                                {/* Color Indicator */}
                                                                {isSelected && (
                                                                    <div
                                                                        className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                                                                        style={{
                                                                            backgroundColor:
                                                                                paramColor,
                                                                        }}
                                                                    />
                                                                )}

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <div className="text-sm font-medium text-gray-900 truncate">
                                                                            {getHighlightedName(
                                                                                param,
                                                                                debouncedSearchTerm,
                                                                            )}
                                                                        </div>
                                                                        {!isNumeric && (
                                                                            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                                                                                CAT
                                                                            </span>
                                                                        )}
                                                                        {isSparse && (
                                                                            <span
                                                                                className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-medium cursor-help"
                                                                                title="Sparse data - missing values filled with last recorded value"
                                                                            >
                                                                                SPARSE
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {unit && (
                                                                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md inline-block">
                                                                            {
                                                                                unit
                                                                            }
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )
                                                    },
                                                )}
                                            </div>
                                        </div>
                                    )
                                },
                            )
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3">
                        {debouncedSearchTerm ? (
                            <>
                                <button
                                    onClick={() => {
                                        const searchLower =
                                            debouncedSearchTerm.toLowerCase()
                                        const filteredParams =
                                            parameters.filter((param) =>
                                                param
                                                    .toLowerCase()
                                                    .includes(searchLower),
                                            )
                                        setSelectedParameters((prev) => [
                                            ...new Set([
                                                ...prev,
                                                ...filteredParams,
                                            ]),
                                        ])
                                    }}
                                    className="w-full px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 border border-transparent rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={
                                        isLoading ||
                                        filteredParametersCount === 0
                                    }
                                >
                                    Select Filtered ({filteredParametersCount})
                                </button>
                                <button
                                    onClick={() => {
                                        const searchLower =
                                            debouncedSearchTerm.toLowerCase()
                                        const filteredParams =
                                            parameters.filter((param) =>
                                                param
                                                    .toLowerCase()
                                                    .includes(searchLower),
                                            )
                                        setSelectedParameters((prev) =>
                                            prev.filter(
                                                (p) =>
                                                    !filteredParams.includes(p),
                                            ),
                                        )
                                    }}
                                    className="w-full px-4 py-3 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={
                                        isLoading ||
                                        filteredParametersCount === 0
                                    }
                                >
                                    Deselect Filtered
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() =>
                                        setSelectedParameters(parameters)
                                    }
                                    className="w-full px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 border border-transparent rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isLoading}
                                >
                                    Select All Parameters
                                </button>
                                <button
                                    onClick={() => setSelectedParameters([])}
                                    className="w-full px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isLoading}
                                >
                                    Clear Selection
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}