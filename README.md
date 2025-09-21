# Qubion - AI-Powered Code Assistant

A powerful cross-platform Electron desktop application that combines local AI inference with an intuitive code editor. Built with **QVAC SDK** for offline AI capabilities, React + Vite for the UI, and an embedded Express server for script management. Generate, edit, and run scripts with the help of a locally-running AI assistant.


## Getting Started

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

```bash
npm run setup
```

### Development

Start the React dev server and Electron together:

```bash
npm run dev
```

This runs:

- `renderer`: Vite dev server at `http://localhost:5173`
- `electron`: Electron with live reload, waiting for the renderer



## 🔧 Troubleshooting

### Common Issues

#### **AI Model Loading Issues**
- **Slow Loading**: First-time model download can take 5-10 minutes
- **Memory Errors**: Ensure at least 8GB RAM available
- **Model Not Found**: Delete `~/.qvac` folder and restart app

#### **Script Execution Problems**
- **Permission Denied**: Check file permissions in storage directory
- **Command Not Found**: Install missing dependencies (Python, Node.js, etc.)
- **Path Issues**: Ensure storage directory is accessible

---

## 📄 License

## MIT License - See [LICENSE](LICENSE) file for details
