'use client'
import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react'
import PropTypes from 'prop-types'
import * as echarts from 'echarts'
import FileUpload from '@/components/shared/FileUpload'
import FlightInfo from '@/components/shared/FlightInfo'
import ProcessingProgress from '@/components/shared/ProcessingProgress'
import ChartConfig from '@/components/shared/ChartConfig'
import LargeCSVParser from '@/utils/LargeCSVParser'
import Spinner from '@/components/ui/Spinner'

// Memoized components for better performance
const ParameterGroupHeader = memo(({ groupName, groupParams, selectedParameters, onGroupToggle, isLoading }) => {
    const allSelected = groupParams.every((param) => selectedParameters.includes(param))
    const someSelected = groupParams.some((param) => selectedParameters.includes(param))
    
    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center space-x-3">
                <button
                    onClick={() => onGroupToggle(groupParams)}
                    disabled={isLoading}
                    className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                        allSelected
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            : someSelected
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                >
                    <div
                        className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                            allSelected
                                ? 'bg-blue-600 border-blue-600'
                                : someSelected
                                    ? 'bg-yellow-500 border-yellow-500'
                                    : 'border-gray-300'
                        }`}
                    >
                        {allSelected && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        )}
                        {someSelected && !allSelected && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                            </svg>
                        )}
                    </div>
                    <span className="font-medium">{groupName}</span>
                    <span className="text-xs opacity-75">({groupParams.length})</span>
                </button>
            </div>
        </div>
    )
})

ParameterGroupHeader.displayName = 'ParameterGroupHeader'
ParameterGroupHeader.propTypes = {
    groupName: PropTypes.string.isRequired,
    groupParams: PropTypes.arrayOf(PropTypes.string).isRequired,
    selectedParameters: PropTypes.arrayOf(PropTypes.string).isRequired,
    onGroupToggle: PropTypes.func.isRequired,
    isLoading: PropTypes.bool.isRequired
}

const ParameterItem = memo(({ 
    param, 
    index, 
    isSelected, 
    isNumeric, 
    isSparse, 
    paramColor, 
    unit, 
    debouncedSearchTerm, 
    onToggle, 
    getHighlightedName 
}) => {
    return (
        <div
            className={`flex items-center space-x-3 p-3 rounded-lg transition-all cursor-pointer ${
                isSelected
                    ? 'bg-blue-50 border-2 border-blue-200 shadow-sm'
                    : 'hover:bg-white border-2 border-transparent'
            }`}
            onClick={() => onToggle(param)}
        >
            <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(param)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 transition-colors"
            />

            {/* Color Indicator */}
            {isSelected && (
                <div
                    className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: paramColor }}
                />
            )}

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <div className="text-sm font-medium text-gray-900 truncate">
                        {getHighlightedName(param, debouncedSearchTerm)}
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
                        {unit}
                    </div>
                )}
            </div>
        </div>
    )
})

ParameterItem.displayName = 'ParameterItem'
ParameterItem.propTypes = {
    param: PropTypes.string.isRequired,
    index: PropTypes.number.isRequired,
    isSelected: PropTypes.bool.isRequired,
    isNumeric: PropTypes.bool.isRequired,
    isSparse: PropTypes.bool.isRequired,
    paramColor: PropTypes.string.isRequired,
    unit: PropTypes.string,
    debouncedSearchTerm: PropTypes.string,
    onToggle: PropTypes.func.isRequired,
    getHighlightedName: PropTypes.func.isRequired
}

export default function FlightChart() {
    // Performance optimization: Use refs for values that don't need to trigger re-renders
    const chartRef = useRef(null)
    const chartInstanceRef = useRef(null)
    const searchTimeoutRef = useRef(null)
    const saveTimeoutRef = useRef(null)
    
    // Core state
    const [data, setData] = useState([])
    const [parameters, setParameters] = useState([])
    const [selectedParameters, setSelectedParameters] = useState([])
    const [units, setUnits] = useState({})
    const [isLoading, setIsLoading] = useState(false)
    
    // Performance state: Cache heavy computations
    const [parameterMetadata, setParameterMetadata] = useState({}) // Cache for parameter analysis
    const [searchTerm, setSearchTerm] = useState('') // Search functionality
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('') // Debounced search
    
    // UI state
    const [flightData, setFlightData] = useState(null) // Store file information
    const [hasFile, setHasFile] = useState(false) // Track if file is uploaded
    const [processingProgress, setProcessingProgress] = useState(0) // File processing progress
    const [processingMessage, setProcessingMessage] = useState('') // Processing status message
    const [showProgress, setShowProgress] = useState(false) // Show progress modal
    const [chartConfig, setChartConfig] = useState({}) // Custom chart configuration per parameter
    const [showChartConfig, setShowChartConfig] = useState(false) // Show chart config panel
    
    // Global configuration
    const [globalConfig, setGlobalConfig] = useState({
        enableFocusParameter: false,
        focusParameter: 'Airspeed_Comp_Vtd' // Default focus parameter
    }) // Global chart configuration
    
    const [analystInfo, setAnalystInfo] = useState({
        name: '',
        aircraft: '',
        partNumber: '',
        serialNumber: '',
        fileId: '',
    })

    // Load analyst info from localStorage on component mount
    useEffect(() => {
        const savedAnalystInfo = localStorage.getItem('aeroplot-analyst-info')
        if (savedAnalystInfo) {
            try {
                const parsed = JSON.parse(savedAnalystInfo)
                setAnalystInfo(prev => ({
                    ...prev,
                    ...parsed,
                    fileId: '' // Always start with empty file ID for new sessions
                }))
            } catch (error) {
                console.error('Error loading saved analyst info:', error)
            }
        }
        
        // Load global config from localStorage
        const savedGlobalConfig = localStorage.getItem('aeroplot-global-config')
        if (savedGlobalConfig) {
            try {
                setGlobalConfig(JSON.parse(savedGlobalConfig))
            } catch (error) {
                console.error('Error loading global config:', error)
            }
        }
    }, [])

    // Performance optimization: Save analyst info with timeout cleanup
    useEffect(() => {
        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }
        
        saveTimeoutRef.current = setTimeout(() => {
            const infoToSave = {
                name: analystInfo.name,
                aircraft: analystInfo.aircraft,
                partNumber: analystInfo.partNumber,
                serialNumber: analystInfo.serialNumber,
                // Don't save fileId as it should be unique per session
            }
            localStorage.setItem('aeroplot-analyst-info', JSON.stringify(infoToSave))
        }, 300) // Reduced delay

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
        }
    }, [analystInfo.name, analystInfo.aircraft, analystInfo.partNumber, analystInfo.serialNumber])

    // Save global config to localStorage with performance optimization
    useEffect(() => {
        const timer = setTimeout(() => {
            localStorage.setItem('aeroplot-global-config', JSON.stringify(globalConfig))
        }, 100) // Small delay to batch updates
        
        return () => clearTimeout(timer)
    }, [globalConfig])

    // Component cleanup for performance
    useEffect(() => {
        return () => {
            // Clean up all timeouts on unmount
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
        }
    }, [])

    // Optimized analyst info update handler
    const handleAnalystInfoChange = useCallback((key, value) => {
        setAnalystInfo(prev => ({
            ...prev,
            [key]: value
        }))
    }, [])

    // Generate unique file ID based on current date/time and random number
    const generateFileId = (fileName) => {
        const date = new Date()
        const year = date.getFullYear().toString().slice(-2)
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        
        // Generate random 3-digit number
        const randomNum = Math.floor(Math.random() * 900) + 100
        
        // Get file extension or default to FDT
        const extension = fileName ? fileName.split('.').pop().toUpperCase() : 'FDT'
        const fileExt = extension === 'CSV' ? 'FDT' : extension
        
        return `${year}${month}${day}${hours}${minutes}${randomNum}.${fileExt}`
    }

    // Remove the automatic fetch effect since we're now using file upload
    // useEffect(() => {
    //   fetchCSVData(flight.file)
    // }, [flight.file])

    // Performance optimization: Debounce search with timeout cleanup
    useEffect(() => {
        // Clear existing timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
        }
        
        searchTimeoutRef.current = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm)
        }, 200) // Reduced delay for better responsiveness

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
        }
    }, [searchTerm])

    // Sparse-aware sampling function for large datasets
    const sparseAwareSampling = (data, headers, targetSize) => {
        if (data.length <= targetSize) return data

        // First, analyze sparsity of each parameter
        const parameterSparsity = {}
        const relevantHeaders = headers.filter(h => h !== 'time' && h !== 'Sample' && h !== 'Phase')
        
        relevantHeaders.forEach(param => {
            let nonEmptyCount = 0
            const validIndices = []
            
            for (let i = 0; i < data.length; i++) {
                const val = data[i][param]
                if (val !== '' && val !== null && val !== undefined) {
                    nonEmptyCount++
                    validIndices.push(i)
                }
            }
            
            parameterSparsity[param] = {
                sparsityRatio: (data.length - nonEmptyCount) / data.length,
                validIndices: validIndices,
                validCount: nonEmptyCount
            }
        })

        // Identify highly sparse parameters (>80% missing)
        const sparseParams = Object.entries(parameterSparsity)
            .filter(([param, info]) => info.sparsityRatio > 0.8)
            .map(([param, info]) => param)

        console.log('Sparse parameters detected:', {
            totalParams: relevantHeaders.length,
            sparseParams: sparseParams.length,
            sparseParamNames: sparseParams.slice(0, 5) // Show first 5
        })

        // Collect all indices that contain sparse data
        const sparseDataIndices = new Set()
        sparseParams.forEach(param => {
            parameterSparsity[param].validIndices.forEach(idx => {
                sparseDataIndices.add(idx)
            })
        })

        // Calculate how many sparse data points we want to preserve
        const maxSparsePoints = Math.min(sparseDataIndices.size, Math.floor(targetSize * 0.3)) // Reserve 30% for sparse data
        const remainingBudget = targetSize - maxSparsePoints

        // Convert sparse indices to array and sample them if too many
        let selectedSparseIndices = Array.from(sparseDataIndices)
        if (selectedSparseIndices.length > maxSparsePoints) {
            // Randomly sample sparse indices to fit budget
            selectedSparseIndices = selectedSparseIndices
                .sort(() => Math.random() - 0.5)
                .slice(0, maxSparsePoints)
        }

        // For remaining budget, use uniform sampling from non-sparse indices
        const nonSparseIndices = []
        for (let i = 0; i < data.length; i++) {
            if (!sparseDataIndices.has(i)) {
                nonSparseIndices.push(i)
            }
        }

        // Sample remaining indices uniformly
        const step = Math.max(1, Math.floor(nonSparseIndices.length / remainingBudget))
        const selectedNonSparseIndices = []
        for (let i = 0; i < nonSparseIndices.length; i += step) {
            selectedNonSparseIndices.push(nonSparseIndices[i])
        }

        // Combine all selected indices and sort them
        const allSelectedIndices = [...selectedSparseIndices, ...selectedNonSparseIndices]
            .sort((a, b) => a - b)

        // Create sampled dataset
        const sampledData = allSelectedIndices.map(idx => data[idx])

        console.log('Sparse-aware sampling results:', {
            sparsePointsPreserved: selectedSparseIndices.length,
            uniformPointsSelected: selectedNonSparseIndices.length,
            totalSampled: sampledData.length,
            sparsePreservationRatio: sparseDataIndices.size > 0 ? 
                (selectedSparseIndices.length / sparseDataIndices.size * 100).toFixed(1) + '%' : 'N/A'
        })

        return sampledData
    }

    const handleFileUpload = async (file) => {
        setIsLoading(true)
        setShowProgress(true)
        setProcessingProgress(0)
        setProcessingMessage('Starting file processing...')

        try {
            // Validate file before processing
            if (!file) {
                throw new Error('No file provided')
            }
            
            if (file.size === 0) {
                throw new Error('File is empty')
            }
            
            // Warn about very large files and set expectations
            const fileSizeMB = file.size / (1024 * 1024)
            if (fileSizeMB > 500) {
                console.warn(`Very large file detected: ${fileSizeMB.toFixed(1)}MB`)
                setProcessingMessage(`Processing very large file (${fileSizeMB.toFixed(1)}MB) - this will use chunked processing and may take several minutes...`)
            } else if (fileSizeMB > 100) {
                console.warn(`Large file detected: ${fileSizeMB.toFixed(1)}MB`)
                setProcessingMessage(`Processing large file (${fileSizeMB.toFixed(1)}MB) - this may take a while...`)
            }

            // Create parser with progress callback
            const parser = new LargeCSVParser((progress, message) => {
                setProcessingProgress(progress)
                setProcessingMessage(message)
            })

            // Parse the CSV file with progress tracking
            setProcessingMessage('Reading and parsing CSV file...')
            const { data, units, headers, totalRows, fileSize } =
                await parser.parseCSVStream(file)

            setProcessingMessage('Optimizing data for visualization...')

            // Validate parsed data
            if (!data || data.length === 0) {
                throw new Error('No valid data found in CSV file')
            }
            
            if (!headers || headers.length === 0) {
                throw new Error('No headers found in CSV file')
            }

            // Use intelligent sampling for large datasets with sparse data awareness
            let sampledData
            if (data.length > 15000) {
                // For large datasets, use sparse-aware sampling
                sampledData = sparseAwareSampling(data, headers, 15000)
                console.log('Applied sparse-aware sampling:', {
                    originalSize: data.length,
                    sampledSize: sampledData.length,
                    compressionRatio: (sampledData.length / data.length * 100).toFixed(1) + '%'
                })
            } else {
                // For smaller datasets, use all data
                sampledData = data
            }

            setData(sampledData)
            
            // Create proper parameter-to-unit mapping
            const parameterUnitsMap = {}
            headers.forEach((header, index) => {
                if (header !== 'time' && header !== 'Sample' && header !== 'Phase') {
                    parameterUnitsMap[header] = units[index] || ''
                }
            })
            
            // Debug: Log the mapping to console for verification
            console.log('Parameters to Units Mapping:', {
                totalHeaders: headers.length,
                totalUnits: units.length,
                mappedParameters: Object.keys(parameterUnitsMap).length,
                sampleMapping: Object.entries(parameterUnitsMap).slice(0, 5) // Show first 5 mappings
            })
            
            setUnits(parameterUnitsMap) // Store as object mapping instead of array
            const paramList = [...new Set(headers.filter(
                (key) => key !== 'time' && key !== 'Sample' && key !== 'Phase',
            ))]
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
            
            // Auto-generate file ID if not already set
            if (!analystInfo.fileId) {
                const generatedFileId = generateFileId(file.name)
                setAnalystInfo(prev => ({
                    ...prev,
                    fileId: generatedFileId
                }))
            }
            
            setHasFile(true)

            setProcessingMessage('Complete!')
            setTimeout(() => setShowProgress(false), 1000) // Hide progress after 1 second
        } catch (error) {
            console.error('Error processing file:', error)
            
            // Provide more detailed error messages based on error type
            let errorMessage = 'Error processing file: '
            if (error.message.includes('too large')) {
                errorMessage += error.message // Use the specific file size error message
            } else if (error.message.includes('at least headers and one data row')) {
                errorMessage += 'The CSV file appears to be malformed or extremely large. Please check that the file contains valid CSV data with headers and data rows.'
            } else if (error.message.includes('Failed to read file') || error.message.includes('FileReader')) {
                errorMessage += 'Unable to read the file. This may be due to file corruption, insufficient memory, or the file being too large. Try closing other browser tabs or reducing the file size.'
            } else if (error.message.includes('No valid data')) {
                errorMessage += 'No valid data rows found in the file. Please check the CSV format.'
            } else if (error.message.includes('timed out')) {
                errorMessage += 'File processing timed out. The file may be too large for your system to process. Please try with a smaller file or contact support.'
            } else if (error.message.includes('memory') || error.message.includes('corrupted')) {
                errorMessage += error.message + ' Try closing other browser tabs or restarting your browser.'
            } else {
                errorMessage += error.message
            }
            
            setProcessingMessage(errorMessage)
            
            // Show error longer for user to read, with different timeouts based on error type
            const errorTimeout = error.message.includes('too large') ? 8000 : 5000
            setTimeout(() => {
                setShowProgress(false)
                setIsLoading(false)
            }, errorTimeout)
            
            // Don't re-throw the error to prevent additional error handling
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
        setUnits({})
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
        // Reset analyst info to empty values
        setAnalystInfo({
            name: '',
            aircraft: '',
            partNumber: '',
            serialNumber: '',
            fileId: '',
        })
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

    // Pre-analyze parameters once to avoid repeated calculations - optimized for performance
    const analyzeParameters = useCallback((data, paramList) => {
        const metadata = {}
        
        // Batch process all parameters for better performance
        paramList.forEach((param) => {
            const values = []
            const numericValues = []
            const nonNumericValues = []
            let nonEmptyCount = 0
            
            // Single pass through data for efficiency
            for (let i = 0; i < data.length; i++) {
                const val = data[i][param]
                if (val !== '' && val !== null && val !== undefined) {
                    values.push(val)
                    nonEmptyCount++
                    
                    const numVal = parseFloat(val)
                    if (!isNaN(numVal)) {
                        numericValues.push(numVal)
                    } else {
                        nonNumericValues.push(val)
                    }
                }
            }

            // Improved numeric detection logic for sparse data
            let isNumeric = false
            
            if (nonEmptyCount === 0) {
                // No data at all - treat as numeric by default
                isNumeric = true
            } else if (numericValues.length === 0) {
                // No numeric values found - definitely categorical
                isNumeric = false
            } else if (nonNumericValues.length === 0) {
                // All non-empty values are numeric - definitely numeric
                isNumeric = true
            } else {
                // Mixed data - use improved heuristics
                const numericRatio = numericValues.length / nonEmptyCount
                const uniqueNonNumeric = [...new Set(nonNumericValues)]
                
                // If most values are numeric (>80%) and there are few unique non-numeric values,
                // treat as numeric (the non-numeric values might be error codes or special values)
                if (numericRatio > 0.8 && uniqueNonNumeric.length <= 5) {
                    isNumeric = true
                } else if (numericRatio > 0.95) {
                    // If 95%+ are numeric, definitely treat as numeric
                    isNumeric = true
                } else if (numericRatio < 0.5) {
                    // If less than 50% are numeric, treat as categorical
                    isNumeric = false
                } else {
                    // Edge case: check if non-numeric values look like error codes/special values
                    const commonErrorPatterns = /^(error|err|fault|fail|invalid|n\/a|na|null|undefined|#)$/i
                    const hasErrorPatterns = uniqueNonNumeric.some(val => 
                        commonErrorPatterns.test(String(val).trim())
                    )
                    
                    // If non-numeric values look like errors and we have significant numeric data, treat as numeric
                    isNumeric = hasErrorPatterns && numericRatio > 0.6
                }
            }
            
            const uniqueValues = isNumeric ? [] : [...new Set(values)].sort()
            const sparsityRatio = (data.length - nonEmptyCount) / data.length
            
            const minValue = numericValues.length > 0 ? Math.min(...numericValues) : 0
            const maxValue = numericValues.length > 0 ? Math.max(...numericValues) : 1
            
            metadata[param] = {
                isNumeric,
                states: uniqueValues,
                uniqueValues: uniqueValues,
                min: minValue,
                max: maxValue,
                valueCount: nonEmptyCount,
                totalCount: data.length,
                sparsityRatio: sparsityRatio,
                numericValueCount: numericValues.length,
                nonNumericValueCount: nonNumericValues.length,
                numericRatio: nonEmptyCount > 0 ? numericValues.length / nonEmptyCount : 0,
                hasConstantValue: minValue === maxValue, // Flag for constant values
                // Add suggested interpolation method based on sparsity
                suggestedInterpolation: sparsityRatio > 0.8 ? 'forward' : 
                                      sparsityRatio > 0.5 ? 'linear' : 'none'
            }
        })
        
        // Debug logging to help track parameter classification
        console.log('Parameter Analysis Summary:', {
            totalParameters: paramList.length,
            numericParameters: Object.values(metadata).filter(m => m.isNumeric).length,
            categoricalParameters: Object.values(metadata).filter(m => !m.isNumeric).length,
            sparseParameters: Object.values(metadata).filter(m => m.sparsityRatio > 0.2).length,
            verySparseParameters: Object.values(metadata).filter(m => m.sparsityRatio > 0.8).length,
            extremelySparseParameters: Object.values(metadata).filter(m => m.sparsityRatio > 0.95).length,
            groupBreakdown: {
                'Numeric (Dense)': Object.values(metadata).filter(m => m.isNumeric && m.sparsityRatio <= 0.2).length,
                'Numeric (Sparse)': Object.values(metadata).filter(m => m.isNumeric && m.sparsityRatio > 0.2).length,
                'Categorical (Dense)': Object.values(metadata).filter(m => !m.isNumeric && m.sparsityRatio <= 0.2).length,
                'Categorical (Sparse)': Object.values(metadata).filter(m => !m.isNumeric && m.sparsityRatio > 0.2).length
            },
            detailedBreakdown: Object.entries(metadata).map(([param, meta]) => ({
                parameter: param,
                isNumeric: meta.isNumeric,
                sparsityRatio: (meta.sparsityRatio * 100).toFixed(1) + '%',
                numericRatio: (meta.numericRatio * 100).toFixed(1) + '%',
                totalValues: meta.totalCount,
                nonEmptyValues: meta.valueCount,
                numericValues: meta.numericValueCount,
                nonNumericValues: meta.nonNumericValueCount,
                suggestedInterpolation: meta.suggestedInterpolation,
                groupAssignment: meta.isNumeric ? 
                    (meta.sparsityRatio > 0.2 ? 'Numeric (Sparse)' : 'Numeric (Dense)') : 
                    (meta.sparsityRatio > 0.2 ? 'Categorical (Sparse)' : 'Categorical (Dense)')
            })).slice(0, 10) // Show first 10 for debugging
        })
        
        // Check for parameters that might have lost data during sampling
        const potentiallyLostDataParams = Object.entries(metadata)
            .filter(([param, meta]) => meta.isNumeric && meta.sparsityRatio > 0.9 && meta.valueCount < 10)
            .map(([param, meta]) => param)
            
        if (potentiallyLostDataParams.length > 0) {
            console.warn('Parameters with potentially lost sparse data:', potentiallyLostDataParams)
            console.warn('These parameters had very few data points and may not display properly due to data sampling.')
        }
        
        setParameterMetadata(metadata)
    }, [])

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
                if (val === '' || val === null || val === undefined) {
                    return null
                }
                
                const numVal = parseFloat(val)
                // Only return the numeric value if it's valid, otherwise null
                return !isNaN(numVal) ? numVal : null
            })

            // Find valid (non-null) data points
            const validPoints = []
            values.forEach((val, index) => {
                if (val !== null && !isNaN(val)) {
                    validPoints.push({ index, value: val })
                }
            })

            if (validPoints.length === 0) {
                console.warn(`No valid data points found for parameter ${param}`)
                return values
            }

            // For extremely sparse data with very few points, consider different strategies
            if (validPoints.length < 3 && values.length > 1000) {
                console.log(`Extremely sparse parameter ${param} with only ${validPoints.length} valid points out of ${values.length}`)
                
                // For extremely sparse data, use a more aggressive interpolation
                if (validPoints.length === 1) {
                    // Only one valid point - fill everything with that value
                    const singleValue = validPoints[0].value
                    return values.map(() => singleValue)
                } else if (validPoints.length === 2) {
                    // Two points - use linear interpolation across entire range
                    const firstPoint = validPoints[0]
                    const lastPoint = validPoints[validPoints.length - 1]
                    const slope = (lastPoint.value - firstPoint.value) / (lastPoint.index - firstPoint.index)
                    
                    return values.map((val, idx) => {
                        if (val !== null && !isNaN(val)) return val // Keep original valid values
                        return firstPoint.value + slope * (idx - firstPoint.index)
                    })
                }
            }

            // Debug log for very sparse data
            const sparsityRatio = (values.length - validPoints.length) / values.length
            if (sparsityRatio > 0.8) {
                console.log(`Interpolating very sparse parameter ${param}:`, {
                    totalPoints: values.length,
                    validPoints: validPoints.length,
                    sparsityRatio: (sparsityRatio * 100).toFixed(1) + '%',
                    method: method,
                    firstValidPoint: validPoints[0],
                    lastValidPoint: validPoints[validPoints.length - 1]
                })
            }

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

            // Summary for debugging very sparse data
            if (sparsityRatio > 0.8) {
                const finalValidCount = interpolated.filter(val => val !== null && !isNaN(val)).length
                console.log(`Interpolation complete for ${param}:`, {
                    before: validPoints.length,
                    after: finalValidCount,
                    improvement: ((finalValidCount - validPoints.length) / values.length * 100).toFixed(1) + '%'
                })
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

    // Check if a parameter has sparse data (significant missing values) - optimized
    const hasSparsityIssues = useCallback((data, param) => {
        const metadata = parameterMetadata[param]
        if (metadata && metadata.sparsityRatio !== undefined) {
            return metadata.sparsityRatio > 0.2 // Use cached sparsity ratio
        }
        
        // Fallback for missing metadata
        const totalRows = data.length
        let validRows = 0
        for (let i = 0; i < totalRows; i++) {
            const val = data[i][param]
            if (val !== '' && val !== null && val !== undefined) {
                validRows++
            }
        }
        return (totalRows - validRows) / totalRows > 0.2
    }, [parameterMetadata])

    // Performance optimized parameter checking using cached metadata
    const isNumericParameter = useCallback(
        (param) => {
            const metadata = parameterMetadata[param]
            return metadata ? metadata.isNumeric : true
        },
        [parameterMetadata],
    )

    // Performance optimized categorical states retrieval using cached metadata
    const getCategoricalStates = useCallback(
        (param) => {
            const metadata = parameterMetadata[param]
            return metadata ? metadata.states : []
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

    // Memoize parameter grouping by data characteristics - group by type and sparsity
    const parameterGroups = useMemo(() => {
        const groups = {
            'Numeric (Dense)': [],
            'Numeric (Sparse)': [],
            'Categorical (Dense)': [],
            'Categorical (Sparse)': []
        }
        
        // Early return for empty parameters
        if (parameters.length === 0) return groups
        
        // Get the parameters to process (filtered or all)
        const paramsToProcess = debouncedSearchTerm
            ? parameters.filter((param) => {
                  const searchLower = debouncedSearchTerm.toLowerCase()
                  return param.toLowerCase().includes(searchLower)
              })
            : parameters

        // Process parameters into groups based on their data characteristics
        for (let i = 0; i < paramsToProcess.length; i++) {
            const param = paramsToProcess[i]
            const metadata = parameterMetadata[param]
            
            if (metadata) {
                if (metadata.isNumeric) {
                    // Group numeric parameters by sparsity
                    if (metadata.sparsityRatio > 0.2) {
                        groups['Numeric (Sparse)'].push(param)
                    } else {
                        groups['Numeric (Dense)'].push(param)
                    }
                } else {
                    // Group categorical parameters by sparsity
                    if (metadata.sparsityRatio > 0.2) {
                        groups['Categorical (Sparse)'].push(param)
                    } else {
                        groups['Categorical (Dense)'].push(param)
                    }
                }
            } else {
                // If no metadata available, default to dense numeric
                groups['Numeric (Dense)'].push(param)
            }
        }

        // Remove empty groups
        Object.keys(groups).forEach(groupName => {
            if (groups[groupName].length === 0) {
                delete groups[groupName]
            }
        })

        return groups
    }, [parameters, debouncedSearchTerm, parameterMetadata])

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

    // Global configuration functions
    const updateGlobalConfig = useCallback((config) => {
        setGlobalConfig((prev) => ({
            ...prev,
            ...config,
        }))
    }, [])

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

    // Performance optimized chart configuration memoization
    const chartOption = useMemo(() => {
        if (selectedParameters.length === 0 || data.length === 0) return null

        // Cache frequently used values
        const colorPalette = ['#4CAF50', '#3F51B5', '#FF9800', '#F44336', '#9C27B0']
        const generateLineColor = (index) => colorPalette[index % colorPalette.length]
        const totalParams = selectedParameters.length
        const dataLength = data.length

        // Optimized grid calculation
        const titleHeight = 8
        const toolboxHeight = 6  
        const zoomHeight = 8
        const availableHeight = 100 - titleHeight - toolboxHeight - zoomHeight
        const minChartHeight = 15
        const gridGap = 6
        const gridHeight = Math.max(minChartHeight, Math.floor(availableHeight / totalParams) - gridGap)

        // Dynamic container height calculation
        const calculatedContainerHeight = Math.max(600, totalParams * (minChartHeight * 8 + gridGap * 8) + 300)

        // Pre-calculate grids for better performance
        const grids = selectedParameters.map((param, index) => {
            if (totalParams > 6) {
                const chartHeight = Math.max(120, Math.floor((calculatedContainerHeight - 200) / totalParams) - 20)
                const gapBetweenCharts = 25
                return {
                    left: '8%',
                    right: '4%',
                    top: `${100 + index * (chartHeight + gapBetweenCharts)}px`,
                    height: `${chartHeight}px`,
                    containLabel: false,
                }
            } else {
                return {
                    left: '8%',
                    right: '4%',
                    top: `${titleHeight + toolboxHeight + index * (gridHeight + gridGap)}%`,
                    height: `${gridHeight - 1}%`,
                    containLabel: false,
                }
            }
        })

        // Performance optimized series generation
        const series = []
        for (let i = 0; i < selectedParameters.length; i++) {
            const param = selectedParameters[i]
            const metadata = parameterMetadata[param]
            if (!metadata) continue

            const config = chartConfig[param] || {}
            
            if (metadata.isNumeric) {
                // Optimized numeric processing
                let processedData = data
                if (config.enableFiltering) {
                    processedData = applyParameterFiltering(data, param, config)
                }

                const needsInterpolation = metadata.sparsityRatio > 0.2 || config.forceInterpolation
                const interpolationMethod = config.interpolationMethod || metadata.suggestedInterpolation || 'forward'

                let numericData
                if (needsInterpolation && interpolationMethod !== 'none') {
                    numericData = interpolateSparseData(processedData, param, interpolationMethod)
                    
                    // Debug: Log interpolation results for very sparse data
                    if (metadata.sparsityRatio > 0.8) {
                        const nonNullCount = numericData.filter(val => val !== null && !isNaN(val)).length
                        console.log(`Interpolation results for ${param}:`, {
                            originalSparsity: (metadata.sparsityRatio * 100).toFixed(1) + '%',
                            originalNonEmpty: metadata.valueCount,
                            afterInterpolation: nonNullCount,
                            interpolationMethod: interpolationMethod,
                            sampleValues: numericData.slice(0, 10),
                            improvementRatio: metadata.valueCount > 0 ? (nonNullCount / metadata.valueCount).toFixed(2) + 'x' : 'N/A'
                        })
                        
                        // If interpolation didn't help much, try a different approach
                        if (nonNullCount < metadata.valueCount * 2 && metadata.valueCount < 10) {
                            console.log(`Applying fallback strategy for extremely sparse ${param}`)
                            // Create a constant line at the mean of available values
                            const validValues = numericData.filter(val => val !== null && !isNaN(val))
                            if (validValues.length > 0) {
                                const meanValue = validValues.reduce((sum, val) => sum + val, 0) / validValues.length
                                numericData = numericData.map(val => meanValue)
                                console.log(`Applied mean fallback (${meanValue.toFixed(2)}) for ${param}`)
                            }
                        }
                    }
                } else {
                    // Optimized standard processing with improved handling for mixed data types
                    numericData = new Array(dataLength)
                    for (let j = 0; j < dataLength; j++) {
                        const val = processedData[j][param]
                        
                        // Handle empty/null values
                        if (val === '' || val === null || val === undefined) {
                            numericData[j] = null
                            continue
                        }
                        
                        // Try to parse as number
                        const numVal = parseFloat(val)
                        if (!isNaN(numVal)) {
                            numericData[j] = numVal
                        } else {
                            // For non-numeric values in numeric parameters (error codes, etc.)
                            // Set to null to maintain chart continuity
                            numericData[j] = null
                        }
                    }
                }

                // Check if we have constant values (all the same value, including all zeros)
                const nonNullValues = numericData.filter(val => val !== null && !isNaN(val))
                const hasConstantValues = nonNullValues.length > 0 && nonNullValues.every(val => val === nonNullValues[0])
                
                // For very sparse data, ensure we connect nulls and show interpolated data
                const shouldConnectNulls = needsInterpolation || metadata.sparsityRatio > 0.5 || hasConstantValues
                const isExtremelySparse = metadata.sparsityRatio > 0.9
                
                // For extremely sparse data, consider showing as scatter plot with interpolated line
                if (isExtremelySparse && metadata.valueCount < 50) {
                    // Add scatter plot for actual data points
                    series.push({
                        name: param + '_actual',
                        type: 'scatter',
                        showSymbol: true,
                        symbolSize: 6,
                        itemStyle: { color: generateLineColor(i), opacity: 1 },
                        xAxisIndex: i,
                        yAxisIndex: i,
                        data: numericData.map((val, idx) => {
                            // Only show actual data points, not interpolated ones
                            const originalVal = processedData[idx][param]
                            const parsedOriginal = parseFloat(originalVal)
                            return (!isNaN(parsedOriginal) && originalVal !== '' && originalVal !== null && originalVal !== undefined) ? val : null
                        }),
                        tooltip: {
                            formatter: function(params) {
                                return `${param} (Actual): ${params.value !== null ? params.value.toFixed(2) : 'No Data'}`
                            }
                        }
                    })
                }
                
                series.push({
                    name: param,
                    type: 'line',
                    showSymbol: metadata.sparsityRatio > 0.5 || hasConstantValues, // Show symbols for sparse data or constant values
                    symbolSize: metadata.sparsityRatio > 0.5 || hasConstantValues ? 4 : 0,
                    lineStyle: { 
                        width: metadata.sparsityRatio > 0.5 || hasConstantValues ? 2 : 1.5, 
                        color: generateLineColor(i),
                        type: metadata.sparsityRatio > 0.8 ? 'dashed' : 'solid', // Dashed line for very sparse data
                        opacity: isExtremelySparse ? 0.6 : 1 // Slightly transparent for extremely sparse interpolated lines
                    },
                    smooth: needsInterpolation && interpolationMethod === 'linear' && config.smoothInterpolated !== false && !hasConstantValues, // Don't smooth constant values
                    xAxisIndex: i,
                    yAxisIndex: i,
                    data: numericData,
                    connectNulls: shouldConnectNulls,
                    large: dataLength > 1000,
                    largeThreshold: 1000,
                })
                
                // Debug log for constant values
                if (hasConstantValues) {
                    console.log(`Constant value detected for ${param}:`, {
                        value: nonNullValues[0],
                        count: nonNullValues.length,
                        totalDataPoints: numericData.length,
                        yAxisRange: `${metadata.min} to ${metadata.max}`
                    })
                }
            } else {
                // Optimized categorical processing
                const states = metadata.states
                const hasSparseCategoricalData = metadata.sparsityRatio > 0.2

                let categoricalValues
                if (hasSparseCategoricalData) {
                    categoricalValues = fillSparseCategoricalData(data, param)
                } else {
                    categoricalValues = new Array(dataLength)
                    for (let j = 0; j < dataLength; j++) {
                        const val = data[j][param]
                        categoricalValues[j] = (val === '' || val === null || val === undefined) ? null : val
                    }
                }

                // Pre-build state index map for faster lookup
                const stateMap = new Map()
                states.forEach((state, idx) => stateMap.set(state, idx))

                // Convert categorical data to numeric indices
                const stepData = new Array(dataLength)
                for (let j = 0; j < dataLength; j++) {
                    const stateIndex = stateMap.get(categoricalValues[j])
                    stepData[j] = stateIndex !== undefined ? stateIndex : null
                }

                series.push({
                    name: param,
                    type: 'line',
                    step: 'end',
                    showSymbol: false,
                    lineStyle: { width: 2, color: generateLineColor(i) },
                    xAxisIndex: i,
                    yAxisIndex: i,
                    data: stepData,
                    connectNulls: false,
                    large: dataLength > 1000,
                    largeThreshold: 1000,
                })
            }
        }

        // Optimized x-axis generation
        const interval = Math.max(1, Math.floor(dataLength / 10))
        const xAxisData = new Array(dataLength)
        for (let i = 0; i < dataLength; i++) {
            xAxisData[i] = i
        }
        
        const xAxis = selectedParameters.map((param, index) => ({
            type: 'category',
            data: xAxisData,
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
        }))

        // Optimized y-axis generation  
        const yAxis = selectedParameters.map((param, index) => {
            const metadata = parameterMetadata[param]
            if (!metadata) return null

            const paramColor = generateLineColor(index)

            if (metadata.isNumeric) {
                const config = chartConfig[param] || {}
                const useCustomRange = config.customRange && config.useCustomRange
                let minValue = useCustomRange ? config.customRange.min : metadata.min
                let maxValue = useCustomRange ? config.customRange.max : metadata.max

                // Handle edge case where all values are zero (min === max === 0)
                if (minValue === maxValue) {
                    if (minValue === 0) {
                        // For all-zero data, create a small range around zero to show the line
                        minValue = 0
                        maxValue = 1
                    } else {
                        // For other constant values, create a small range around the value
                        //const offset = Math.abs(minValue) * 0.1 || 0.1
                        minValue = 0
                        maxValue = maxValue
                    }
                }

                return {
                    type: 'value',
                    name: param,
                    gridIndex: index,
                    nameLocation: 'end',
                    nameRotate: 0,
                    nameGap: 10,
                    nameTextStyle: { color: paramColor, fontSize: 10, fontWeight: 'bold', align: 'left' },
                    min: minValue,
                    max: maxValue,
                    splitNumber: metadata.hasConstantValue ? 1 : 2, // More tick marks for constant values
                    axisLabel: {
                        fontSize: 9,
                        color: paramColor,
                        formatter: (value) => {
                            // For constant values, ensure the actual constant value is prominently displayed
                            if (metadata.hasConstantValue) {
                                // Show the original constant value clearly when we're at the center of the range
                                const centerValue = (minValue + maxValue) / 2
                                if (Math.abs(value - centerValue) < (maxValue - minValue) * 0.1) {
                                    return metadata.min.toString() // Show the exact constant value
                                }
                                // For edge values, show them normally but less prominently
                                return Math.abs(value) >= 1000 ? (value / 1000).toFixed(1) + 'k' : value.toFixed(2)
                            }
                            // Normal formatting for non-constant values
                            return Math.abs(value) >= 1000 ? (value / 1000).toFixed(1) + 'k' : value.toFixed(2)
                        },
                        showMinLabel: true,
                        showMaxLabel: true,
                    },
                    axisLine: { show: true, lineStyle: { color: paramColor } },
                    axisTick: { 
                        show: true, 
                        length: metadata.hasConstantValue ? 5 : 3, // Longer ticks for constant values
                        lineStyle: { color: paramColor }, 
                        interval: 0 
                    },
                    splitLine: { 
                        show: true, 
                        lineStyle: { 
                            type: metadata.hasConstantValue ? 'solid' : 'solid', 
                            color: paramColor, 
                            opacity: metadata.hasConstantValue ? 0.4 : 0.2,
                            width: metadata.hasConstantValue ? 1.5 : 1
                        }, 
                        interval: 0 
                    },
                }
            } else {
                const states = metadata.states
                return {
                    type: 'value',
                    name: param,
                    gridIndex: index,
                    nameLocation: 'end', 
                    nameRotate: 0,
                    nameGap: 10,
                    nameTextStyle: { color: paramColor, fontSize: 10, fontWeight: 'bold', align: 'left' },
                    min: 0,
                    max: states.length - 1,
                    interval: 1,
                    splitNumber: states.length,
                    axisLabel: {
                        fontSize: 9,
                        color: paramColor,
                        formatter: (value) => {
                            const stateIndex = Math.round(value)
                            return (stateIndex >= 0 && stateIndex < states.length) ? states[stateIndex] : ''
                        },
                    },
                    axisLine: { show: true, lineStyle: { color: paramColor } },
                    axisTick: { show: true, length: 3, lineStyle: { color: paramColor }, interval: 0, alignWithLabel: true },
                    splitLine: { show: true, lineStyle: { type: 'dashed', color: paramColor, opacity: 0.3 }, interval: 0 },
                }
            }
        }).filter(Boolean)

        return {
            backgroundColor: '#fff',
            animation: false, // Disable animation for better performance
            title: { text: ``, left: 'center', top: '1%', textStyle: { fontSize: 16, fontWeight: 'bold', color: '#333' } },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'line', link: { xAxisIndex: 'all' }, lineStyle: { color: '#666', type: 'dashed' } },
                backgroundColor: 'rgba(0,0,0,0.8)',
                textStyle: { color: '#fff', fontSize: 12 },
                formatter: function (params) {
                    if (!params || params.length === 0) return ''

                    let tooltipContent = `<div><strong>Sample: ${params[0].dataIndex}</strong></div>`

                    params.forEach((param) => {
                        const paramName = param.seriesName
                        const metadata = parameterMetadata[paramName]
                        const selectedParamIndex = selectedParameters.indexOf(paramName)
                        const paramColor = colorPalette[selectedParamIndex % colorPalette.length]

                        if (metadata && !metadata.isNumeric) {
                            const stateIndex = Math.round(param.value)
                            const stateName = metadata.states[stateIndex] || 'Unknown'
                            tooltipContent += `<div>${paramName}: <span style="color:${paramColor}">${stateName}</span></div>`
                        } else {
                            // Handle numeric parameters (including sparse numeric data)
                            if (param.value !== null && param.value !== undefined && !isNaN(param.value)) {
                                const value = param.value.toFixed(2)
                                const unit = units[paramName] || ''
                                const unitDisplay = unit ? ` ${unit}` : ''
                                tooltipContent += `<div>${paramName}: <span style="color:${paramColor}">${value}${unitDisplay}</span></div>`
                            } else {
                                // For sparse data points with no value
                                tooltipContent += `<div>${paramName}: <span style="color:${paramColor}">No Data</span></div>`
                            }
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
                    dataZoom: { yAxisIndex: 'none', title: { zoom: 'Zoom', back: 'Reset Zoom' } },
                    restore: { title: 'Restore' },
                    saveAsImage: {
                        name: `Flight_Data_${flightData?.fileName?.replace(/\.[^/.]+$/, '') || 'Chart'}`,
                        title: 'Save as Image',
                        pixelRatio: 2,
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
        applyParameterFiltering,
        interpolateSparseData,
        fillSparseCategoricalData,
    ])

    // Performance optimized chart effect with proper cleanup
    useEffect(() => {
        if (!chartOption) return

        const chartDom = document.getElementById('main')
        if (!chartDom) return

        // Dispose previous chart instance
        if (chartInstanceRef.current) {
            chartInstanceRef.current.dispose()
        }

        // Create new chart instance with performance optimizations
        const myChart = echarts.init(chartDom, null, {
            renderer: 'svg', // Use SVG for better print quality
            useDirtyRect: true, // Enable dirty rectangle optimization
            devicePixelRatio: 1, // Optimize for performance
        })

        chartInstanceRef.current = myChart
        myChart.setOption(chartOption, {
            notMerge: true, // Don't merge with previous option for better performance
            lazyUpdate: true, // Batch updates for better performance
        })

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
            
            // Get focus parameter from global config
            const focusParam = globalConfig.focusParameter || 'Airspeed_Comp_Vtd'
                
            const hasFocusInData = parameters.includes(focusParam) // Check if focus parameter exists in the data
            const hasFocusSelected = selectedParameters.includes(focusParam)
            const shouldUseFocusParameter = globalConfig.enableFocusParameter && hasFocusInData
            
            // Simple approach: reorganize parameters to put focus parameter at the end of each page
            let finalPageParams = []
            let totalPages = 0
            
            if (shouldUseFocusParameter) {
                // Remove focus parameter from selected parameters first (if it's selected)
                const otherParams = selectedParameters.filter(param => param !== focusParam)
                
                // Calculate pages based on other parameters (5 per page to leave room for focus parameter)
                const paramsPerPage = chartsPerPage - 1 // 5 params per page
                totalPages = Math.max(1, Math.ceil(otherParams.length / paramsPerPage)) // Ensure at least 1 page
                
                // Distribute parameters across pages, adding focus parameter as last on each page
                for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
                    const startIndex = pageIndex * paramsPerPage
                    const endIndex = Math.min(startIndex + paramsPerPage, otherParams.length)
                    const pageOtherParams = otherParams.slice(startIndex, endIndex)
                    
                    // Always add focus parameter as the last parameter on every page
                    finalPageParams.push([...pageOtherParams, focusParam])
                }
            } else {
                // No focus parameter or not enabled, use normal pagination
                totalPages = Math.ceil(selectedParameters.length / chartsPerPage)
                for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
                    const startIndex = pageIndex * chartsPerPage
                    const endIndex = Math.min(startIndex + chartsPerPage, selectedParameters.length)
                    finalPageParams.push(selectedParameters.slice(startIndex, endIndex))
                }
            }

            // Generate chart pages with optimizations
            const chartPages = []

            for (let pageIndex = 0; pageIndex < finalPageParams.length; pageIndex++) {
                const pageParams = finalPageParams[pageIndex]
                const chartsOnThisPage = pageParams.length
                
                // Create an extended selectedParameters array that includes focus parameter if it's in the data
                const extendedSelectedParams = [...selectedParameters]
                if (shouldUseFocusParameter && !hasFocusSelected) {
                    extendedSelectedParams.push(focusParam)
                }
                
                // Map page parameters back to their indices in the extended selected parameters
                const pageParamIndices = pageParams.map(param => extendedSelectedParams.indexOf(param))

                // Create extended chart options that include focus parameter if needed
                let extendedChartOption = chartOption
                if (shouldUseFocusParameter && !hasFocusSelected) {
                    // We need to create chart configuration for focus parameter
                    const focusMetadata = parameterMetadata[focusParam]
                    if (focusMetadata) {
                        const colorPalette = ['#4CAF50', '#3F51B5', '#FF9800', '#F44336', '#9C27B0']
                        const focusIndex = extendedSelectedParams.length - 1
                        const generateLineColor = (index) => colorPalette[index % colorPalette.length]
                        const focusColor = generateLineColor(focusIndex)
                        
                        // Create series data for focus parameter
                        const focusData = data.map((row) => {
                            const value = parseFloat(row[focusParam])
                            return isNaN(value) ? null : value
                        })
                        
                        // Create additional series entry
                        const focusSeries = {
                            name: focusParam,
                            type: 'line',
                            showSymbol: false,
                            lineStyle: { width: 1.5, color: focusColor },
                            xAxisIndex: focusIndex,
                            yAxisIndex: focusIndex,
                            data: focusData,
                            large: data.length > 1000,
                            largeThreshold: 1000,
                        }
                        
                        // Create additional xAxis entry
                        const interval = Math.max(1, Math.floor(data.length / 10))
                        const focusXAxis = {
                            type: 'category',
                            data: data.map((row, idx) => idx),
                            gridIndex: focusIndex,
                            axisLabel: { show: true, fontSize: 10, color: '#666', interval: interval },
                            axisTick: { show: true, length: 3, interval: interval },
                            axisLine: { show: true, lineStyle: { color: '#ddd' } },
                            splitLine: { show: false },
                        }
                        
                        // Create additional yAxis entry
                        const focusYAxis = {
                            type: 'value',
                            name: focusParam,
                            gridIndex: focusIndex,
                            nameLocation: 'end',
                            nameRotate: 0,
                            nameGap: 10,
                            nameTextStyle: { color: focusColor, fontSize: 10, fontWeight: 'bold', align: 'left' },
                            min: focusMetadata.min,
                            max: focusMetadata.max,
                            splitNumber: 2,
                            interval: (focusMetadata.max - focusMetadata.min),
                            axisLabel: { fontSize: 9, color: focusColor, formatter: (value) => value.toFixed(1) },
                            axisLine: { show: true, lineStyle: { color: focusColor } },
                            axisTick: { show: true, length: 3, lineStyle: { color: focusColor }, interval: 0 },
                            splitLine: { show: true, lineStyle: { type: 'solid', color: focusColor, opacity: 0.2 }, interval: 0 },
                        }
                        
                        // Create additional grid entry
                        const focusGrid = {
                            left: '8%',
                            right: '8%',
                            top: `${10 + focusIndex * 25}%`,
                            height: '20%',
                            containLabel: false,
                        }
                        
                        // Extend the chart option
                        extendedChartOption = {
                            ...chartOption,
                            series: [...(chartOption.series || []), focusSeries],
                            xAxis: [...(chartOption.xAxis || []), focusXAxis],
                            yAxis: [...(chartOption.yAxis || []), focusYAxis],
                            grid: [...(chartOption.grid || []), focusGrid],
                        }
                    }
                }

                // Create a print-specific chart configuration for this page
                const printChartOption = {
                    ...extendedChartOption,
                    // Remove toolbox and dataZoom for print
                    toolbox: null,
                    dataZoom: null,
                    title: null,
                    // Show parameters for this page only with adjusted indices
                    series: extendedChartOption.series
                        ? pageParamIndices.map((originalIndex, newIndex) => ({
                                  ...extendedChartOption.series[originalIndex],
                                  xAxisIndex: newIndex,
                                  yAxisIndex: newIndex,
                                  gridIndex: newIndex,
                              }))
                        : [],
                    // Slice and reset the xAxis and yAxis to match the grid indices
                    xAxis: extendedChartOption.xAxis
                        ? pageParamIndices.map((originalIndex, newIndex) => ({
                                  ...extendedChartOption.xAxis[originalIndex],
                                  gridIndex: newIndex,
                                  axisLabel: {
                                      ...extendedChartOption.xAxis[originalIndex].axisLabel,
                                      show: newIndex === chartsOnThisPage - 1,
                                  },
                                  axisTick: {
                                      ...extendedChartOption.xAxis[originalIndex].axisTick,
                                      show: newIndex === chartsOnThisPage - 1,
                                  },
                                  axisLine: {
                                      ...extendedChartOption.xAxis[originalIndex].axisLine,
                                      show: newIndex === chartsOnThisPage - 1,
                                  },
                              }))
                        : [],
                    yAxis: extendedChartOption.yAxis
                        ? pageParamIndices.map((originalIndex, newIndex) => ({
                                  ...extendedChartOption.yAxis[originalIndex],
                                  gridIndex: newIndex,
                              }))
                        : [],
                    // Recalculate grid positions for print
                    grid: pageParams.map((param, index) => {
                        const topMargin = 8
                        const availablePrintHeight = 88
                        const printGridHeight = Math.floor(availablePrintHeight / chartsOnThisPage) - 2.5
                        const printGapBetweenCharts = 4

                        return {
                            left: '2%',
                            right: '1%',
                            top: `${topMargin + index * (printGridHeight + printGapBetweenCharts)}%`,
                            height: `${printGridHeight}%`,
                            containLabel: false,
                        }
                    }),
                }

                // Create a temporary chart for print rendering - optimized
                const printChartDom = document.createElement('div')
                printChartDom.style.width = '1200px'
                printChartDom.style.height = '850px'
                printChartDom.style.position = 'absolute'
                printChartDom.style.left = '-9999px'
                document.body.appendChild(printChartDom)

                const printChart = echarts.init(printChartDom, null, {
                    renderer: 'svg',
                    useDirtyRect: false,
                    devicePixelRatio: 1,
                })

                printChart.setOption(printChartOption, {
                    notMerge: true,
                    lazyUpdate: false,
                })

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
                })
            }

            // Rest of print logic remains the same...
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
    * { box-sizing: border-box; }
    @page { size: A4 landscape; margin: 8mm; }
    html, body { margin: 0; padding: 0; font-family: 'Arial', sans-serif; background: white; color: #000; line-height: 1.2; font-size: 11px; }
    .print-container { width: 100%; max-width: 100%; padding: 0; margin: 0; }
    .chart-page { page-break-before: always; page-break-after: always; page-break-inside: avoid; height: 100vh; position: relative; }
    .chart-page:first-child { page-break-before: auto; }
    .professional-header { width: 100%; padding-bottom: 3px; margin-bottom: 8px; font-size: 11px; font-weight: normal; display: flex; justify-content: space-between; align-items: center; }
    .header-left { text-align: left; flex: 1; }
    .header-center { text-align: center; flex: 1; font-weight: normal; }
    .header-right { text-align: right; flex: 1; }
    .chart-container { width: 100%; text-align: center; page-break-inside: avoid; page-break-before: auto; page-break-after: avoid; height: 88vh; max-height: 88vh; margin-top: 0; }
    .chart-container svg { max-width: 100%; height: 100%; max-height: 100%; display: block; margin: 0 auto; page-break-inside: avoid; }
    @media print {
      html, body { background: white !important; -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
      .print-container { padding: 0 !important; margin: 0 !important; }
      .chart-page { page-break-before: always !important; page-break-after: always !important; page-break-inside: avoid !important; height: 100vh !important; }
      .chart-page:first-child { page-break-before: auto !important; }
      .chart-container { page-break-inside: avoid !important; page-break-before: auto !important; page-break-after: avoid !important; height: 88vh !important; max-height: 88vh !important; margin-top: 0 !important; }
      @page { margin: 8mm !important; size: A4 landscape !important; }
      .chart-container svg { height: 100% !important; max-height: 100% !important; }
    }
  </style>
</head>
<body>
  <div class="print-container">
    ${chartPages.map((page, pageIndex) => `
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
    `).join('')}
  </div>
  
  <script>
    function initiatePrint() {
      setTimeout(() => {
        window.focus();
        window.print();
        setTimeout(() => { window.close(); }, 2000);
      }, 1000);
    }
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initiatePrint);
    } else {
      initiatePrint();
    }
    
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

        // Performance optimized resize handler
        const handleResize = () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.resize()
            }
        }
        
        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            // Clean up print function
            if (window.printChart) {
                delete window.printChart
            }
            if (chartInstanceRef.current) {
                chartInstanceRef.current.dispose()
                chartInstanceRef.current = null
            }
        }
    }, [
        chartOption,
        flightData,
        data.length,
        selectedParameters,
        units,
        parameters,
        parameterMetadata,
        globalConfig,
        analystInfo,
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
        setSelectedParameters((prev) => {
            const newParams = prev.includes(param)
                ? prev.filter((p) => p !== param)
                : [...prev, param]
            
            // Ensure uniqueness
            return [...new Set(newParams)]
        })
    }, [])

    const handleGroupToggle = useCallback((groupParams) => {
        setSelectedParameters((prev) => {
            const allSelected = groupParams.every((param) =>
                prev.includes(param),
            )
            let newParams
            if (allSelected) {
                newParams = prev.filter((p) => !groupParams.includes(p))
            } else {
                newParams = [...prev, ...groupParams]
            }
            
            // Ensure uniqueness
            return [...new Set(newParams)]
        })
    }, [])

    // Performance optimized parameter color function with memoization
    const getParameterColor = useMemo(() => {
        const colorPalette = ['#4CAF50', '#3F51B5', '#FF9800', '#F44336', '#9C27B0']
        
        return (param) => {
            const index = parameters.indexOf(param)
            return colorPalette[index % colorPalette.length]
        }
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

    // Optimized highlight function with unique keys
    const getHighlightedName = useCallback((param, searchTerm) => {
        if (!searchTerm) return param

        const parts = param.split(new RegExp(`(${searchTerm})`, 'gi'))
        return parts
            .filter(part => part.length > 0) // Filter out empty parts
            .map((part, index) => {
                const isHighlight = part.toLowerCase() === searchTerm.toLowerCase()
                const uniqueKey = `${param}-${index}-${isHighlight ? 'h' : 'n'}-${part.length}-${part.slice(0, 3)}`
                
                return isHighlight ? (
                    <span
                        key={uniqueKey}
                        className="bg-yellow-200 text-yellow-800"
                    >
                        {part}
                    </span>
                ) : (
                    <span key={uniqueKey}>{part}</span>
                )
            })
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
                selectedParameters={[...new Set(selectedParameters)]}
                parameterMetadata={parameterMetadata}
                chartConfig={chartConfig}
                updateParameterConfig={updateParameterConfig}
                resetParameterConfig={resetParameterConfig}
                isVisible={showChartConfig}
                onClose={() => setShowChartConfig(false)}
                parameters={[...new Set(parameters)]}
                globalConfig={globalConfig}
                updateGlobalConfig={updateGlobalConfig}
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
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-semibold text-gray-800">
                                        Print Header Information
                                    </h4>
                                    <button
                                        onClick={() => {
                                            const newFileId = generateFileId(flightData?.fileName)
                                            setAnalystInfo(prev => ({
                                                ...prev,
                                                fileId: newFileId
                                            }))
                                        }}
                                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                                        title="Generate new File ID"
                                    >
                                        Generate New File ID
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                    {[
                                        {
                                            label: 'Analyst Name',
                                            value: analystInfo.name,
                                            key: 'name',
                                            placeholder: 'Enter analyst name',
                                            required: true,
                                        },
                                        {
                                            label: 'Aircraft',
                                            value: analystInfo.aircraft,
                                            key: 'aircraft',
                                            placeholder: 'e.g., 5Y-CHH',
                                            required: true,
                                        },
                                        {
                                            label: 'Part Number',
                                            value: analystInfo.partNumber,
                                            key: 'partNumber',
                                            placeholder: 'e.g., 5703-1000-00',
                                            required: false,
                                        },
                                        {
                                            label: 'Serial Number',
                                            value: analystInfo.serialNumber,
                                            key: 'serialNumber',
                                            placeholder: 'e.g., 02221',
                                            required: false,
                                        },
                                        {
                                            label: 'File ID',
                                            value: analystInfo.fileId,
                                            key: 'fileId',
                                            placeholder: 'Auto-generated',
                                            required: false,
                                            readonly: false,
                                        },
                                    ].map(
                                        ({
                                            label,
                                            value,
                                            key,
                                            placeholder,
                                            required,
                                            readonly,
                                        }) => (
                                            <div key={key}>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    {label}
                                                    {required && <span className="text-red-500 ml-1">*</span>}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={value}
                                                    onChange={(e) =>
                                                        handleAnalystInfoChange(key, e.target.value)
                                                    }
                                                    placeholder={placeholder}
                                                    readOnly={readonly}
                                                    className={`w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                                                        readonly ? 'bg-gray-100 cursor-not-allowed' : ''
                                                    } ${
                                                        required && !value ? 'border-red-300 bg-red-50' : ''
                                                    }`}
                                                />
                                                {required && !value && (
                                                    <p className="text-xs text-red-500 mt-1">
                                                        This field is required for professional reports
                                                    </p>
                                                )}
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
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
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
                                                        const unit = units[param] || ''
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
                                                                key={param}
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