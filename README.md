# Aeroplot - Advanced Flight Data Visualization Platform

[![Next.js](https://img.shields.io/badge/Next.js-15.3.1-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![ECharts](https://img.shields.io/badge/ECharts-5.6.0-red?style=flat-square&logo=apache-echarts)](https://echarts.apache.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

**Aeroplot** is a modern, high-performance web application designed for comprehensive flight data analysis and visualization. Built specifically for aviation professionals, engineers, and analysts who need to process, analyze, and visualize large-scale flight data in an intuitive and professional manner.

## ✈️ Key Features

### 📊 **Advanced Data Visualization**
- **Multi-Parameter Charts**: Visualize multiple flight parameters simultaneously with optimized rendering
- **Real-time Interactive Charts**: Powered by Apache ECharts with smooth zoom, pan, and selection capabilities
- **Smart Data Interpolation**: Automatic handling of sparse data with multiple interpolation methods (linear, forward fill, backward fill)
- **Categorical & Numeric Support**: Seamless visualization of both categorical states and numeric sensor data

### 🚀 **Performance Optimized**
- **Large Dataset Support**: Efficiently handle CSV files with millions of data points through intelligent sampling
- **Lazy Loading**: Progressive data loading with real-time progress indicators
- **Memory Efficient**: Optimized rendering for 15,000+ data points without performance degradation
- **Background Processing**: Non-blocking file processing with detailed progress feedback

### 🔍 **Smart Parameter Management**
- **Intelligent Grouping**: Automatic parameter categorization based on naming conventions
- **Advanced Search**: Real-time parameter search with highlighting and filtering
- **Sparsity Detection**: Automatic identification and handling of sparse data parameters
- **Color-Coded Visualization**: Unique colors for each parameter with consistent mapping

### 📋 **Professional Reporting**
- **Print-Ready Charts**: High-quality print output with professional headers and metadata
- **Multi-Page Reports**: Automatic pagination for large parameter sets
- **Analyst Information**: Comprehensive metadata including analyst details, aircraft info, and file tracking
- **Focus Parameter**: Configurable focus parameter display across all report pages

### 🛠️ **Advanced Configuration**
- **Parameter-Specific Settings**: Individual chart configuration for each parameter
- **Global Configuration**: System-wide settings for consistent behavior
- **Custom Interpolation**: Choose interpolation methods per parameter
- **Range Limiting**: Set custom value ranges and outlier filtering

## 🏗️ Technology Stack

### **Frontend Framework**
- **Next.js 15.3.1** - React framework with App Router and Server-Side Rendering
- **React 19.0.0** - Latest React with concurrent features and optimizations
- **TypeScript Support** - Full type safety and better development experience

### **Visualization & UI**
- **Apache ECharts 5.6.0** - Professional-grade charting library with SVG rendering
- **Tailwind CSS 4.0.4** - Utility-first CSS framework for responsive design
- **Framer Motion** - Smooth animations and micro-interactions
- **React Icons** - Comprehensive icon library

### **Data Processing**
- **Custom CSV Parser** - Optimized large file processing with streaming support
- **D3.js Utilities** - Data manipulation and scale functions
- **Lodash** - Utility functions for data transformation

### **Authentication & Security**
- **NextAuth.js 5.0** - Secure authentication with multiple providers
- **Protected Routes** - Role-based access control

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (Latest LTS recommended)
- **npm** or **yarn** package manager
- **Modern web browser** with JavaScript enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/aeroplot.git
   cd aeroplot
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Configure the following variables:
   ```env
   NEXTAUTH_SECRET=your-secret-key
   NEXTAUTH_URL=http://localhost:3000
   # Add your authentication providers
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Production Deployment

1. **Build the application**
   ```bash
   npm run build
   npm start
   ```

2. **Google Cloud Platform** (Optimized build command included)
   ```bash
   npm run gcp-build
   ```

## 📖 Usage Guide

### 1. **File Upload**
- Drag and drop CSV files or click to browse
- Supported format: CSV with headers and optional units row
- Real-time processing progress with detailed status updates
- Automatic data validation and optimization

### 2. **Parameter Selection**
- Browse parameters organized by intelligent grouping
- Use search functionality to quickly find specific parameters
- Toggle individual parameters or entire groups
- View parameter metadata (type, units, sparsity status)

### 3. **Chart Interaction**
- **Zoom**: Mouse wheel or zoom controls
- **Pan**: Click and drag on chart area
- **Reset**: Double-click to reset zoom
- **Tooltip**: Hover over data points for detailed information

### 4. **Advanced Configuration**
- Click "Configure Charts" to access parameter-specific settings
- Set custom value ranges and interpolation methods
- Enable/disable outlier filtering
- Configure global focus parameters

### 5. **Professional Printing**
- Click "Print Chart" for high-quality report generation
- Automatic multi-page layout (6 charts per page)
- Professional headers with analyst information
- Focus parameter repetition across pages (configurable)

## 📁 Project Structure

```
aeroplot/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth-pages)/      # Authentication pages
│   │   ├── (protected-pages)/ # Protected application pages
│   │   │   └── home/          # Main application page
│   │   ├── (public-pages)/    # Public pages
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   ├── auth/              # Authentication components
│   │   ├── layouts/           # Layout components
│   │   ├── shared/            # Shared/reusable components
│   │   ├── template/          # Template components
│   │   └── ui/                # UI components
│   ├── configs/               # Configuration files
│   ├── constants/             # Application constants
│   ├── i18n/                  # Internationalization
│   ├── mock/                  # Mock data
│   ├── server/                # Server actions
│   ├── services/              # API services
│   └── utils/                 # Utility functions
├── public/                    # Static assets
│   ├── img/                   # Images
│   │   ├── countries/         # Country flags
│   │   ├── logo/              # Logos
│   │   └── others/            # Other images
├── tailwind.config.js         # Tailwind CSS configuration
├── next.config.mjs           # Next.js configuration
└── package.json              # Project dependencies
```

## ⚙️ Configuration

### Environment Variables
```env
# Authentication
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# Database (if applicable)
DATABASE_URL=your-database-url

# Other API keys as needed
```

### Chart Configuration
The application supports extensive chart customization:

- **Global Settings**: Focus parameters, default interpolation methods
- **Parameter-Specific**: Custom ranges, interpolation methods, outlier filtering
- **Print Settings**: Page layout, header information, focus parameter behavior

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run prettier     # Check code formatting
npm run prettier:fix # Fix code formatting

# Specialized builds
npm run gcp-build    # Google Cloud Platform optimized build
```

### Code Quality
- **ESLint** with Next.js configuration
- **Prettier** for consistent code formatting
- **TypeScript** support for type safety
- **Component optimization** with React.memo and useMemo

### Performance Optimizations
- **Memoized components** for parameter rendering
- **Debounced search** for responsive filtering
- **Virtual scrolling** for large parameter lists
- **Chart instance management** with proper cleanup
- **Optimized data processing** with batch operations

## 🔧 Customization

### Adding New Chart Types
1. Extend the chart configuration in `chartOption` useMemo
2. Add new interpolation methods in utility functions
3. Update the parameter metadata structure as needed

### Custom Styling
The application uses Tailwind CSS for styling. Customize:
- Colors and themes in `tailwind.config.js`
- Component styles in respective component files
- Print styles in the print CSS section

### Data Processing
Customize data processing by modifying:
- `LargeCSVParser.js` for file parsing
- Interpolation functions for sparse data handling
- Parameter analysis functions for metadata generation

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines
- Follow the existing code style and conventions
- Write meaningful commit messages
- Add tests for new functionality
- Update documentation as needed
- Ensure all linting and formatting checks pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, questions, or feature requests:

- **Documentation**: Check this README and inline code comments
- **Issues**: Open an issue on GitHub
- **Discussions**: Use GitHub Discussions for general questions

## 🚀 Roadmap

### Upcoming Features
- [ ] **Real-time data streaming** support
- [ ] **Advanced statistical analysis** tools
- [ ] **Machine learning integration** for anomaly detection
- [ ] **Multiple file comparison** capabilities
- [ ] **Custom dashboard creation** tools
- [ ] **Export to multiple formats** (PDF, Excel, etc.)
- [ ] **Collaborative analysis** features
- [ ] **Mobile responsive** improvements

### Performance Improvements
- [ ] **WebWorker integration** for background processing
- [ ] **Progressive Web App** (PWA) capabilities
- [ ] **Offline mode** support
- [ ] **Advanced caching** strategies

---

**Built with ❤️ for the aviation community**

*Aeroplot - Making flight data analysis accessible, powerful, and professional.* 