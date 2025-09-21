# Qubion - AI-Powered Code Assistant

A powerful cross-platform Electron desktop application that combines local AI inference with an intuitive code editor. Built with **QVAC SDK** for offline AI capabilities, React + Vite for the UI, and an embedded Express server for script management. Generate, edit, and run scripts with the help of a locally-running AI assistant.

## 🚀 Key Features

### 🤖 **Local AI with QVAC Integration**

- **Offline AI inference** using QVAC SDK - no internet required for AI features
- **Fast, local model loading** with Qwen 3 4B Q4 quantized model
- **Real-time code generation** and transformation
- **Privacy-first approach** - your code never leaves your machine

### 📝 **Intelligent Script Management**

- **AI-powered script generation**: Describe what you want; get runnable code instantly
- **Smart code editing** with syntax highlighting and auto-completion
- **Contextual AI assistance** for code refactoring and improvements
- **Multi-language support**: Python, JavaScript, TypeScript, Bash, Go, Rust, and more

### ⚡ **Advanced Execution Environment**

- **Integrated terminal** with command history and auto-completion
- **Smart dependency detection** and auto-installation for missing packages
- **Real-time output streaming** with error handling and suggestions
- **Cross-platform script execution** with runtime detection

### 🔍 **Powerful Search & Organization**

- **Semantic search** across code, comments, and explanations
- **Tag-based organization** with auto-tagging
- **File system integration** with your chosen storage directory

### **Technical Benefits**

- **🔒 Zero Data Leakage**: Your proprietary code and sensitive information never leave your local environment
- **⚡ Ultra-Low Latency**: Direct model inference without network round-trips
- **💰 Cost Effective**: No per-request charges or subscription fees
- **🛡️ Enterprise Ready**: Perfect for organizations with strict data governance policies
- **🔧 Customizable**: Adjust model parameters (temperature, top-p, context size) for your specific needs
- **📱 Resource Efficient**: Optimized quantized models that run efficiently on consumer hardware

---

## 🚀 Getting Started

### System Requirements

#### **Minimum Requirements**

- **OS**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **RAM**: 8GB (4GB for QVAC model + 4GB for system/app)
- **Storage**: 5GB free space (3GB for model + 2GB for app)
- **CPU**: x64 processor with AVX support

#### **Recommended Requirements**

- **RAM**: 16GB+ for optimal performance
- **Storage**: SSD for faster model loading and file operations
- **CPU**: Modern multi-core processor (Intel i5/AMD Ryzen 5 or better)

### Prerequisites

- **Node.js 20+** and npm  
  [Install Node.js](https://nodejs.org/en/download/) | [Node.js Setup Guide](https://nodejs.org/en/docs/guides/)

- **Optional Runtimes**: Install languages you plan to use:
  - **Python 3.8+ for `.py` scripts**  
    [Install Python](https://www.python.org/downloads/) | [Python Setup Guide](https://docs.python.org/3/using/index.html)
  - **Node.js for `.js`/`.ts` scripts**  
    [Install Node.js](https://nodejs.org/en/download/) | [Node.js Setup Guide](https://nodejs.org/en/docs/guides/)
  - **Bash/Zsh for shell scripts**  
    [Bash Installation](https://www.gnu.org/software/bash/) | [Zsh Installation](https://www.zsh.org/) | [Shell Setup Guide](https://wiki.archlinux.org/title/Shell)
  - **Go, Rust, Java, etc. for respective file types**  
    [Install Go](https://go.dev/doc/install) | [Go Setup Guide](https://go.dev/doc/tutorial/getting-started)  
    [Install Rust](https://www.rust-lang.org/tools/install) | [Rust Setup Guide](https://doc.rust-lang.org/book/ch01-01-installation.html)  
    [Install Java](https://adoptium.net/) | [Java Setup Guide](https://docs.oracle.com/en/java/javase/17/install/overview-jdk-installation.html)

### Install dependencies

- Root dependencies:

```bash
npm install
```

- Renderer dependencies:

```bash
cd renderer && npm install
```

### Development

Go back to the parent forlder:

```bash
cd ..
```

Start the React dev server and Electron together:

```bash
npm run dev
```

This runs:

- `renderer`: Vite dev server at `http://localhost:5173`
- `electron`: Electron with live reload, waiting for the renderer

### Build a production app

```bash
npm run build
```

This will:

- Build the renderer UI
- Package the Electron app with electron‑builder into `dist/`

Artifacts will be generated per platform (e.g., macOS `.dmg`, Windows `nsis`, Linux `AppImage`). App icons are in `assets/`.

---

## 📁 Storage Management

1. Open the app
2. Click to select a storage directory from the sidebar
3. New scripts and the index will be saved under that folder

The app reads/writes files directly to your chosen directory and maintains a small JSON index for metadata.
---

### **Building for Production**

The app uses `electron-builder` for cross-platform packaging:

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build -- --mac
npm run build -- --win
npm run build -- --linux

# Build specific Linux formats
npm run build:deb      # Debian packages only
npm run build:linux    # All Linux formats
```

### **Performance Considerations**

- **First Launch**: Initial model download may take 5-10 minutes
- **Subsequent Launches**: Model loads from cache in 10-30 seconds
- **Memory Usage**: ~4GB RAM during active AI operations
- **Storage**: Model files cached in user data directory

---

## Acknowledgments

- **QVAC SDK** - For providing excellent local AI inference capabilities
- **Electron** - For enabling cross-platform desktop development
- **React & Vite** - For the modern, fast frontend development experience
- **Monaco Editor** - For the powerful code editing experience

## 📄 License

## MIT License - See [LICENSE](LICENSE) file for details
