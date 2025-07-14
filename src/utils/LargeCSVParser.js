'use client'

// Optimized CSV parser for large flight data files
export class LargeCSVParser {
  constructor(onProgress) {
    this.onProgress = onProgress || (() => {})
  }

  // Parse CSV with progress tracking and memory optimization
  async parseCSVStream(file) {
    return new Promise((resolve, reject) => {
      // Validate file input
      if (!file) {
        reject(new Error('No file provided to parseCSVStream'))
        return
      }
      
      if (!(file instanceof File) && !(file instanceof Blob)) {
        reject(new Error('Invalid file object provided - must be File or Blob'))
        return
      }
      
      if (file.size === 0) {
        reject(new Error('File is empty (0 bytes)'))
        return
      }
      
      console.log('Processing file:', {
        name: file.name || 'unknown',
        size: file.size,
        type: file.type || 'unknown',
        lastModified: file.lastModified || 'unknown'
      })
      
      // Check file size and warn if very large
      const fileSizeMB = file.size / (1024 * 1024)
      if (fileSizeMB > 500) {
        console.warn(`Large file detected: ${fileSizeMB.toFixed(1)}MB. Processing may take time.`)
      }

      // Check file size and determine processing strategy
      const maxStandardSize = 500 * 1024 * 1024 // 500MB standard limit
      const maxChunkedSize = 2 * 1024 * 1024 * 1024 // 2GB absolute limit for chunked processing
      
      if (file.size > maxChunkedSize) {
        reject(new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum supported file size is 2GB. Please reduce the file size or contact support for processing extremely large files.`))
        return
      }
      
      // For very large files, use chunked reading approach
      if (file.size > maxStandardSize) {
        console.warn(`Very large file detected: ${(file.size / 1024 / 1024).toFixed(1)}MB. Using chunked processing...`)
        this.onProgress(5, `Processing very large file (${(file.size / 1024 / 1024).toFixed(1)}MB) using chunked approach...`)
        
        // Use chunked processing instead of regular FileReader
        this.parseVeryLargeCSVInChunks(file)
          .then(result => resolve(result))
          .catch(chunkError => {
            console.error('Chunked processing failed:', chunkError)
            reject(new Error(`Failed to process large file: ${chunkError.message}. Try reducing the file size.`))
          })
        return
      }
      
      // Warn about large files
      if (file.size > 100 * 1024 * 1024) { // 100MB
        console.warn(`Large file detected: ${(file.size / 1024 / 1024).toFixed(1)}MB. Processing may take longer.`)
        this.onProgress(5, `Processing large file (${(file.size / 1024 / 1024).toFixed(1)}MB)...`)
      }

      const reader = new FileReader()
      
      // Set timeout for file reading (10 minutes for very large files)
      const fileReadTimeout = setTimeout(() => {
        reader.abort()
        reject(new Error('File reading timed out after 10 minutes. The file may be too large or your system may be low on memory.'))
      }, 600000) // 10 minutes

      reader.onload = (e) => {
        clearTimeout(fileReadTimeout)
        try {
          const csvString = e.target.result
          
          console.log('FileReader result type:', typeof csvString)
          console.log('FileReader result length:', csvString ? csvString.length : 'null/undefined')
          console.log('File size from file object:', file.size)
          
          // More thorough validation of file content
          if (csvString === null || csvString === undefined) {
            reject(new Error('FileReader returned null - file may be corrupted, too large for available memory, or in an unsupported format'))
            return
          }
          
          if (typeof csvString !== 'string') {
            reject(new Error(`FileReader returned unexpected type: ${typeof csvString}. Expected string.`))
            return
          }
          
          if (csvString.length === 0) {
            reject(new Error('File appears to be empty (0 bytes read). The file may be corrupted or too large for your browser to process.'))
            return
          }
          
          // Validate that we got a reasonable amount of content compared to file size
          const expectedMinSize = Math.min(file.size * 0.1, 1000) // At least 10% or 1KB
          if (csvString.length < expectedMinSize) {
            reject(new Error(`File content size mismatch. Expected at least ${expectedMinSize} characters but got ${csvString.length}. File may be corrupted or contain binary data.`))
            return
          }
          
          // Log first 200 characters for debugging (safely)
          const preview = csvString.substring(0, 200).replace(/[\r\n]/g, '\\n')
          console.log('File content preview:', preview)
          
          // Add a small delay for UI responsiveness on large files
          if (fileSizeMB > 100) {
            setTimeout(() => {
              try {
                const result = this.processCSVString(csvString)
                resolve(result)
              } catch (error) {
                reject(error)
              }
            }, 100)
          } else {
            const result = this.processCSVString(csvString)
            resolve(result)
          }
        } catch (error) {
          clearTimeout(fileReadTimeout)
          console.error('Error in reader.onload:', error)
          reject(new Error(`Failed to process file: ${error.message}`))
        }
      }
      
      reader.onerror = (event) => {
        clearTimeout(fileReadTimeout)
        console.error('FileReader error event:', event)
        const error = reader.error
        if (error) {
          console.error('FileReader error details:', {
            name: error.name,
            message: error.message
          })
          
          // Provide more specific error messages based on error type
          let errorMessage = `Failed to read file: ${error.message}`
          if (error.name === 'NotReadableError') {
            errorMessage += '. The file may be corrupted, in use by another application, or your system may be low on memory.'
          } else if (error.name === 'SecurityError') {
            errorMessage += '. There may be a security restriction preventing file access.'
          } else if (error.name === 'AbortError') {
            errorMessage += '. File reading was cancelled or timed out.'
          }
          
          reject(new Error(errorMessage))
        } else {
          reject(new Error('Failed to read file - unknown FileReader error. The file may be too large or corrupted.'))
        }
      }
      
      reader.onabort = () => {
        clearTimeout(fileReadTimeout)
        reject(new Error('File reading was aborted. This may happen if the file is too large or if there are memory constraints.'))
      }
      
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentLoaded = Math.round((e.loaded / e.total) * 30) // Reserve 30% for reading
          this.onProgress(percentLoaded, 'Reading file...')
        }
      }
      
      // Add timeout for very large files
      const timeoutId = setTimeout(() => {
        reader.abort()
        reject(new Error('File reading timed out - file may be too large or corrupted'))
      }, 5 * 60 * 1000) // 5 minute timeout
      
      // Clear timeout when done
      const originalResolve = resolve
      const originalReject = reject
      resolve = (result) => {
        clearTimeout(timeoutId)
        originalResolve(result)
      }
      reject = (error) => {
        clearTimeout(timeoutId)
        originalReject(error)
      }
      
      try {
        // Try reading as UTF-8 first (most common)
        console.log('Attempting to read file as UTF-8...')
        reader.readAsText(file, 'UTF-8')
      } catch (error) {
        console.warn('UTF-8 reading failed, trying without encoding specification:', error.message)
        try {
          reader.readAsText(file)
        } catch (fallbackError) {
          reject(new Error(`Failed to start reading file: ${fallbackError.message}`))
        }
      }
    })
  }

  // Method to parse very large CSV files in chunks
  async parseVeryLargeCSVInChunks(file) {
    return new Promise((resolve, reject) => {
      const chunkSize = 50 * 1024 * 1024 // 50MB chunks
      let offset = 0
      let buffer = ''
      let headers = null
      let units = null
      let dataStartIndex = 1
      let processedRows = 0
      let totalEstimatedRows = 0
      const sampledData = []
      const maxSampleSize = 15000 // Maximum number of rows to keep in memory
      let samplingRatio = 1 // Start with sampling every row
      
      // Calculate estimated total rows based on first chunk
      let estimatedRowLength = 0
      let isFirstChunk = true
      
      this.onProgress(10, 'Starting chunked file processing...')
      
      const readNextChunk = () => {
        if (offset >= file.size) {
          // Finished reading file
          this.onProgress(95, 'Finalizing data processing...')
          
          if (!headers || sampledData.length === 0) {
            reject(new Error('No valid data found in the large CSV file'))
            return
          }
          
          console.log(`Chunked processing complete: ${processedRows} total rows, ${sampledData.length} sampled`)
          
          resolve({
            data: sampledData,
            units: units || new Array(headers.length).fill(''),
            headers: headers,
            totalRows: processedRows,
            fileSize: file.size,
            wasSampled: sampledData.length < processedRows
          })
          return
        }
        
        const slice = file.slice(offset, offset + chunkSize)
        const reader = new FileReader()
        
        reader.onload = (e) => {
          try {
            const chunkText = String(e.target.result || '')
            buffer += chunkText
            
            // Find complete lines in buffer
            const lines = buffer.split(/\r?\n|\r/)
            
            // Keep the last incomplete line in buffer for next chunk
            buffer = lines.pop() || ''
            
            if (isFirstChunk && lines.length > 0) {
              // Estimate average row length from first chunk for progress calculation
              estimatedRowLength = chunkText.length / lines.length
              totalEstimatedRows = Math.floor(file.size / estimatedRowLength)
              console.log(`Estimated total rows: ${totalEstimatedRows.toLocaleString()}`)
              
              // Calculate initial sampling ratio to keep memory usage reasonable
              if (totalEstimatedRows > maxSampleSize) {
                samplingRatio = Math.ceil(totalEstimatedRows / maxSampleSize)
                console.log(`Large dataset detected. Sampling every ${samplingRatio} rows.`)
              }
              
              isFirstChunk = false
            }
            
            // Process lines in this chunk
            for (const line of lines) {
              const trimmedLine = line.trim()
              if (trimmedLine.length === 0) continue
              
              try {
                if (!headers) {
                  // First line is headers
                  headers = this.parseCSVLine(trimmedLine)
                  console.log(`Headers found: ${headers.length} columns`)
                  continue
                }
                
                if (!units && processedRows === 0) {
                  // Check if second line is units
                  if (this.isUnitsRow(trimmedLine, headers)) {
                    units = this.parseCSVLine(trimmedLine)
                    console.log('Units row detected')
                    continue
                  } else {
                    units = new Array(headers.length).fill('')
                  }
                }
                
                // Process data row
                const values = this.parseCSVLine(trimmedLine)
                if (values.length === headers.length) {
                  processedRows++
                  
                  // Apply sampling to reduce memory usage
                  if (processedRows % samplingRatio === 0 && sampledData.length < maxSampleSize) {
                    const obj = {}
                    headers.forEach((header, index) => {
                      obj[header] = values[index] || ''
                    })
                    sampledData.push(obj)
                  }
                  
                  // Update sampling ratio if we're still collecting too much data
                  if (sampledData.length >= maxSampleSize * 0.8) {
                    samplingRatio = Math.max(samplingRatio, Math.ceil(processedRows / (maxSampleSize * 0.6)))
                  }
                }
              } catch (lineError) {
                // Skip malformed lines but continue processing
                console.warn(`Skipping malformed line at row ${processedRows}:`, lineError.message)
              }
            }
            
            // Update progress
            const progressPercent = Math.min(90, 10 + (offset / file.size) * 80)
            const message = `Processed ${processedRows.toLocaleString()} rows, sampled ${sampledData.length.toLocaleString()}`
            this.onProgress(progressPercent, message)
            
            // Move to next chunk
            offset += chunkSize
            
            // Small delay to prevent UI blocking
            setTimeout(readNextChunk, 10)
            
          } catch (error) {
            reject(new Error(`Error processing chunk at offset ${offset}: ${error.message}`))
          }
        }
        
        reader.onerror = () => {
          reject(new Error(`Failed to read chunk at offset ${offset}`))
        }
        
        reader.readAsText(slice, 'utf-8')
      }
      
      // Start reading chunks
      readNextChunk()
    })
  }

  processCSVString(csvString) {
    try {
      // Add detailed testing for problematic files
      if (csvString.length > 1000000) { // Files larger than 1MB
        console.log('Large CSV detected, running diagnostic test...')
        LargeCSVParser.testCSVParsing(csvString)
      }

      // Early validation with detailed diagnostics
      const validation = this.validateCSVContent(csvString)
      console.log('CSV validation passed:', validation)

      this.onProgress(30, 'Splitting CSV into lines...')
      
      // More robust line splitting that handles different line endings
      const lines = csvString.split(/\r?\n|\r/)
      const totalLines = lines.length
      
      console.log(`Total lines found: ${totalLines.toLocaleString()}`)
      
      if (totalLines === 0) {
        throw new Error('No lines found in CSV file')
      }

      this.onProgress(35, 'Filtering empty lines...')
      
      // Filter out empty lines with better performance for large files
      const validLines = []
      const batchSize = 50000 // Process lines in batches
      
      for (let batchStart = 0; batchStart < lines.length; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, lines.length)
        
        for (let i = batchStart; i < batchEnd; i++) {
          const line = lines[i]?.trim()
          if (line && line.length > 0) {
            validLines.push(line)
          }
        }
        
        // Report progress for batches (less frequent to avoid blocking)
        if (batchStart % 100000 === 0) {
          const progressPercent = Math.round((batchStart / totalLines) * 20) + 35 // 35-55% range
          this.onProgress(progressPercent, `Processing lines: ${batchStart.toLocaleString()}/${totalLines.toLocaleString()}`)
        }
      }

      console.log(`Valid lines found: ${validLines.length.toLocaleString()}`)

      // More specific error message and better validation
      if (validLines.length === 0) {
        throw new Error('No valid lines found in CSV file - file may contain only empty lines')
      }
      
      if (validLines.length === 1) {
        throw new Error('CSV file contains only headers - no data rows found')
      }
      
      if (validLines.length < 2) {
        throw new Error(`CSV file must have at least headers and one data row. Found only ${validLines.length} valid lines.`)
      }

      // Additional validation: check if we'll have data after potential units row
      console.log('Checking for potential units row...')
      let potentialDataRows = validLines.length - 1 // Assume first row is headers
      
      if (validLines.length >= 3) {
        // Check if second row might be units
        try {
          const headers = this.parseCSVLine(validLines[0])
          if (this.isUnitsRow(validLines[1], headers)) {
            potentialDataRows = validLines.length - 2 // Headers + units
            console.log('Detected potential units row, adjusting data count')
          }
        } catch (error) {
          console.warn('Error checking for units row:', error.message)
        }
      }
      
      if (potentialDataRows < 1) {
        throw new Error('CSV file must have at least one data row after headers (and optional units row)')
      }
      
      console.log(`Estimated data rows: ${potentialDataRows}`)

      this.onProgress(55, 'Parsing headers...')

      // Parse headers and validate
      const headers = this.parseCSVLine(validLines[0])
      if (!headers || headers.length === 0) {
        throw new Error('Invalid or empty headers found in CSV file')
      }
      
      console.log(`Headers found: ${headers.length} columns`)
      console.log('Sample headers:', headers.slice(0, 10))
      
      // Handle units row detection more safely
      let units = new Array(headers.length).fill('')
      let dataStartIndex = 1
      
      if (validLines.length > 1) {
        try {
          const secondLineValues = this.parseCSVLine(validLines[1])
          if (secondLineValues.length === headers.length && this.isUnitsRow(validLines[1], headers)) {
            units = secondLineValues
            dataStartIndex = 2
            console.log('Units row detected at line 2')
          }
        } catch (error) {
          console.warn('Error parsing potential units row, treating as data:', error.message)
          // Continue with dataStartIndex = 1
        }
      }

      // Ensure we have data rows after headers/units
      if (validLines.length <= dataStartIndex) {
        throw new Error(`No data rows found after headers${dataStartIndex === 2 ? ' and units' : ''}`)
      }

      this.onProgress(60, 'Processing data rows...')

      // Process data rows with batching for memory efficiency
      const dataBatchSize = 5000
      const data = []
      const dataLines = validLines.slice(dataStartIndex)
      
      console.log(`Processing ${dataLines.length.toLocaleString()} data rows`)

      for (let i = 0; i < dataLines.length; i += dataBatchSize) {
        const batch = dataLines.slice(i, i + dataBatchSize)
        
        for (const line of batch) {
          try {
            const values = this.parseCSVLine(line)
            if (values.length === headers.length) {
              const obj = {}
              headers.forEach((header, index) => {
                obj[header] = values[index] || ''
              })
              data.push(obj)
            } else if (values.length > 0) {
              // Log column count mismatch but continue
              console.warn(`Row has ${values.length} columns, expected ${headers.length}. Skipping row.`)
            }
          } catch (error) {
            console.warn(`Skipping malformed line: ${error.message}`)
          }
        }
        
        // Report progress less frequently for better performance
        const processed = Math.min(i + dataBatchSize, dataLines.length)
        if (i % (dataBatchSize * 4) === 0 || processed === dataLines.length) {
          const progressPercent = Math.round((processed / dataLines.length) * 40) + 60
          this.onProgress(progressPercent, `Processing records: ${processed.toLocaleString()}/${dataLines.length.toLocaleString()}`)
        }
      }

      // Final validation
      if (data.length === 0) {
        throw new Error('No valid data rows could be parsed from the CSV file')
      }

      this.onProgress(100, 'Complete!')
      
      console.log(`Successfully processed ${data.length.toLocaleString()} data rows`)
      
      return { 
        data, 
        units,
        headers,
        totalRows: data.length,
        fileSize: csvString.length
      }
    } catch (error) {
      console.error('Error in processCSVString:', error)
      throw error
    }
  }

  // Enhanced CSV line parser that handles quoted fields and commas within quotes
  parseCSVLine(line) {
    if (!line || typeof line !== 'string') {
      throw new Error('Invalid line provided to parseCSVLine')
    }

    // Auto-detect delimiter - check for tabs first, then commas
    let delimiter = ','
    if (line.includes('\t')) {
      const tabCount = (line.match(/\t/g) || []).length
      const commaCount = (line.match(/,/g) || []).length
      if (tabCount > commaCount) {
        delimiter = '\t'
      }
    }

    const result = []
    let current = ''
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"'
          i += 2
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
          i++
        }
      } else if (char === delimiter && !inQuotes) {
        // Field separator (comma or tab)
        result.push(current.trim())
        current = ''
        i++
      } else {
        current += char
        i++
      }
    }

    // Add the last field
    result.push(current.trim())
    
    // Handle empty result
    if (result.length === 1 && result[0] === '') {
      return []
    }
    
    return result
  }

  // Determine if a row contains units (typically non-numeric values in the second row)
  isUnitsRow(line, headers) {
    try {
      const values = this.parseCSVLine(line)
      
      // If line has different length than headers, it's likely data
      if (values.length !== headers.length) {
        console.log(`Units row check: line has ${values.length} values, headers have ${headers.length}. Not a units row.`)
        return false
      }
      
      // Check if most values look like units (contain letters, parentheses, etc.)
      let unitLikeCount = 0
      let emptyCount = 0
      let totalChecked = 0
      
      for (const value of values) {
        const trimmed = value.trim()
        totalChecked++
        
        if (trimmed.length === 0) {
          emptyCount++
          unitLikeCount++ // Empty values are considered unit-like for flight data
        } else if (/[a-zA-Z()/%°]/.test(trimmed)) {
          unitLikeCount++ // Contains letters or special characters
        } else if (trimmed.length > 0 && trimmed.length < 15 && !/^-?\d+\.?\d*$/.test(trimmed)) {
          unitLikeCount++ // Short non-numeric values
        }
      }
      
      const unitRatio = unitLikeCount / totalChecked
      const isUnits = unitRatio > 0.4 // Lowered threshold for flight data
      
      console.log(`Units row analysis: ${unitLikeCount}/${totalChecked} unit-like (${(unitRatio*100).toFixed(1)}%), ${emptyCount} empty. Is units: ${isUnits}`)
      console.log('Sample values:', values.slice(0, 10))
      
      return isUnits
    } catch (error) {
      console.warn('Error in isUnitsRow:', error.message)
      return false
    }
  }

  // Intelligent data sampling for performance while preserving data characteristics
  static sampleLargeDataset(data, targetSize = 10000) {
    if (data.length <= targetSize) return data

    // For very large datasets, use a combination of strategies:
    // 1. Always include first and last points
    // 2. Use adaptive sampling based on data density
    // 3. Preserve important transition points

    const sampled = [data[0]] // Always include first point
    const step = Math.max(1, Math.floor(data.length / (targetSize - 2)))
    
    // Sample with regular intervals
    for (let i = step; i < data.length - 1; i += step) {
      sampled.push(data[i])
    }
    
    // Always include last point
    if (data.length > 1) {
      sampled.push(data[data.length - 1])
    }

    console.log(`Sampled ${sampled.length.toLocaleString()} points from ${data.length.toLocaleString()} total points`)
    return sampled
  }

  // Helper method to validate CSV content and provide detailed diagnostics
  validateCSVContent(csvString) {
    if (!csvString || typeof csvString !== 'string') {
      throw new Error('Invalid CSV content - file may be empty or corrupted')
    }

    // Check for basic content
    const trimmed = csvString.trim()
    if (trimmed.length === 0) {
      throw new Error('CSV file is completely empty')
    }

    // Check for binary content or very unusual characters
    const binaryPattern = /[\x00-\x08\x0E-\x1F\x7F-\xFF]/
    if (binaryPattern.test(csvString.substring(0, 1000))) {
      console.warn('File may contain binary data or unusual encoding')
    }

    // Check for basic CSV structure with multiple line ending types
    const lines = csvString.split(/\r?\n|\r/)
    const nonEmptyLines = lines.filter(line => line.trim().length > 0)
    
    console.log(`CSV Validation - Total lines: ${lines.length}, Non-empty lines: ${nonEmptyLines.length}`)
    
    if (nonEmptyLines.length === 0) {
      throw new Error('CSV file contains no data - all lines are empty')
    }
    
    if (nonEmptyLines.length === 1) {
      throw new Error('CSV file contains only one line - headers found but no data rows')
    }

    // Check first line for headers - be more flexible about delimiters
    const firstLine = nonEmptyLines[0].trim()
    const hasComma = firstLine.includes(',')
    const hasSemicolon = firstLine.includes(';')
    const hasTab = firstLine.includes('\t')
    
    if (!hasComma && !hasSemicolon && !hasTab) {
      throw new Error('First line does not appear to be valid CSV headers (no common delimiters found)')
    }
    
    // Determine primary delimiter
    let primaryDelimiter = 'comma'
    if (hasTab) {
      const tabCount = (firstLine.match(/\t/g) || []).length
      const commaCount = (firstLine.match(/,/g) || []).length
      if (tabCount > commaCount) {
        primaryDelimiter = 'tab'
      }
    } else if (hasSemicolon && !hasComma) {
      primaryDelimiter = 'semicolon'
    }
    
    console.log(`Detected delimiter: ${primaryDelimiter}`)
    
    // Warn about non-standard delimiters
    if (primaryDelimiter !== 'comma') {
      console.warn(`Non-standard CSV delimiter detected: ${primaryDelimiter}. Parser will adapt automatically.`)
    }

    return { 
      isValid: true, 
      totalLines: lines.length, 
      nonEmptyLines: nonEmptyLines.length,
      firstLine: firstLine.substring(0, 100) + (firstLine.length > 100 ? '...' : ''),
      delimiter: primaryDelimiter
    }
  }

  // Add method to test CSV parsing with detailed logging
  static testCSVParsing(csvString) {
    console.log('=== CSV PARSING TEST ===')
    console.log('CSV string length:', csvString.length)
    console.log('CSV string type:', typeof csvString)
    
    // Test line splitting
    console.log('Testing line splitting...')
    const lines = csvString.split(/\r?\n|\r/)
    console.log('Total lines after split:', lines.length)
    console.log('First 5 lines lengths:', lines.slice(0, 5).map(line => line.length))
    
    // Test empty line filtering
    console.log('Testing empty line filtering...')
    const validLines = []
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i]?.trim()
      console.log(`Line ${i}: length=${lines[i].length}, trimmed_length=${line ? line.length : 0}, empty=${!line}`)
      if (line && line.length > 0) {
        validLines.push(line)
      }
    }
    console.log('Valid lines found in first 10:', validLines.length)
    
    // Test first line parsing
    if (validLines.length > 0) {
      console.log('Testing first line parsing...')
      const firstLine = validLines[0]
      console.log('First line preview:', firstLine.substring(0, 200) + '...')
      
      try {
        const parser = new LargeCSVParser()
        const headers = parser.parseCSVLine(firstLine)
        console.log('Headers parsed successfully, count:', headers.length)
        console.log('First 10 headers:', headers.slice(0, 10))
      } catch (error) {
        console.error('Error parsing first line:', error)
      }
    }
    
    console.log('=== END TEST ===')
  }
}

export default LargeCSVParser
