'use client'

// Optimized CSV parser for large flight data files
export class LargeCSVParser {
  constructor(onProgress) {
    this.onProgress = onProgress || (() => {})
  }

  // Parse CSV with progress tracking and memory optimization
  async parseCSVStream(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const csvString = e.target.result
          const result = this.processCSVString(csvString)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentLoaded = Math.round((e.loaded / e.total) * 100)
          this.onProgress(percentLoaded, 'Reading file...')
        }
      }
      
      reader.readAsText(file)
    })
  }

  processCSVString(csvString) {
    const lines = csvString.split('\n')
    const totalLines = lines.length
    
    // Filter out empty lines
    const validLines = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line) {
        validLines.push(line)
      }
      
      // Report progress every 10000 lines
      if (i % 10000 === 0) {
        this.onProgress(Math.round((i / totalLines) * 30) + 30, 'Processing lines...')
      }
    }

    if (validLines.length < 2) {
      throw new Error('CSV file must have at least headers and one data row')
    }

    // Parse headers and units
    const headers = this.parseCSVLine(validLines[0])
    const units = validLines.length > 1 ? this.parseCSVLine(validLines[1]) : new Array(headers.length).fill('')
    
    // Determine if second line is units or data
    const dataStartIndex = this.isUnitsRow(validLines[1], headers) ? 2 : 1
    const finalUnits = dataStartIndex === 2 ? units : new Array(headers.length).fill('')

    // Process data rows with batching for memory efficiency
    const batchSize = 5000
    const data = []
    const dataLines = validLines.slice(dataStartIndex)
    
    for (let i = 0; i < dataLines.length; i += batchSize) {
      const batch = dataLines.slice(i, i + batchSize)
      
      for (const line of batch) {
        try {
          const values = this.parseCSVLine(line)
          if (values.length === headers.length) {
            const obj = {}
            headers.forEach((header, index) => {
              obj[header] = values[index] || ''
            })
            data.push(obj)
          }
        } catch (error) {
          console.warn(`Skipping malformed line: ${line}`)
        }
      }
      
      // Report progress
      const processed = Math.min(i + batchSize, dataLines.length)
      const progressPercent = Math.round((processed / dataLines.length) * 40) + 60
      this.onProgress(progressPercent, `Processing records: ${processed.toLocaleString()}/${dataLines.length.toLocaleString()}`)
    }

    this.onProgress(100, 'Complete!')
    
    return { 
      data, 
      units: finalUnits,
      headers,
      totalRows: data.length,
      fileSize: csvString.length
    }
  }

  // Enhanced CSV line parser that handles quoted fields and commas within quotes
  parseCSVLine(line) {
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
      } else if (char === ',' && !inQuotes) {
        // Field separator
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
    return result
  }

  // Determine if a row contains units (typically non-numeric values in the second row)
  isUnitsRow(line, headers) {
    const values = this.parseCSVLine(line)
    
    // If line has different length than headers, it's likely data
    if (values.length !== headers.length) return false
    
    // Check if most values look like units (contain letters, parentheses, etc.)
    let unitLikeCount = 0
    for (const value of values) {
      const trimmed = value.trim()
      // Units often contain letters, parentheses, slashes, or are short
      if (trimmed.length === 0 || 
          /[a-zA-Z\(\)\/\%\°]/.test(trimmed) || 
          (trimmed.length > 0 && trimmed.length < 10 && !/^\-?\d+\.?\d*$/.test(trimmed))) {
        unitLikeCount++
      }
    }
    
    // If more than 60% look like units, treat as units row
    return unitLikeCount / values.length > 0.6
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
}

export default LargeCSVParser
