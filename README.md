# ChatGPT Audio Hijacker

A Chrome extension that supercharges ChatGPT's Read Aloud feature with a beautiful floating media controller and one-click access.

![Extension Icon](icons/icon128.png)

## ✨ Features

- 🎯 **One-Click Access** - Blue speaker button injected into every message's action row (no more digging through menus!)
- 🎛️ **Floating Media Controller** - Sleek, draggable panel with full playback controls
- ⚡ **Smart Audio Hijacking** - Intercepts OpenAI's native audio stream for seamless control
- 🎚️ **Playback Speed Control** - Choose from 1x, 1.25x, 1.5x, 1.75x, or 2x speed (persists across sessions)
- 📍 **Position Memory** - Panel remembers where you dragged it (even after page reload)
- 🎨 **Modern UI** - Clean, glassmorphic design with consistent blue theming
- 🔄 **Auto-Hide** - Panel only appears when audio is playing, hides when finished

## 📸 Screenshots

### Injected Speaker Button
The blue speaker button appears as the first item in every message's action row:

```
[🔵] [Copy] [Dislike] [⋮]
```

### Floating Media Controller
Beautiful floating panel with all controls:

```
┌─────────────────────────┐
│ ⠿ ChatGPT Audio      × │
│ 0:00 ━━━━━●━━━━━━ 0:00 │
│ ⏪10  ⏯  ⏩10  1.5x   │
└─────────────────────────┘
```

## 🚀 Installation

### Method 1: Chrome Web Store (Coming Soon)
*Will be available on the Chrome Web Store once published*

### Method 2: Manual Installation
1. Download this repository as a ZIP file
2. Extract the ZIP to a folder (e.g., `chatgpt-audio-hijacker`)
3. Open Chrome and navigate to `chrome://extensions`
4. Enable **Developer mode** (toggle in top-right)
5. Click **Load unpacked** and select the extracted folder
6. Navigate to `https://chatgpt.com` and enjoy!

## 🎮 Usage

1. **Play Audio** - Click the blue speaker button under any ChatGPT message
2. **Control Playback** - Use the floating panel to play/pause, skip, or seek
3. **Adjust Speed** - Select your preferred playback speed from the dropdown
4. **Reposition Panel** - Drag the panel by its header to your preferred location
5. **Hide Panel** - Click the × button or let it auto-hide when audio ends

## 🔧 Technical Details

### How It Works
- **Button Injection**: Uses `MutationObserver` to detect new messages and inject speaker buttons
- **Audio Hijacking**: Intercepts OpenAI's native `<audio>` elements and routes control to custom UI
- **Detached Audio Support**: Patches `HTMLMediaElement.play()` to capture audio objects that never enter the DOM
- **Storage**: Uses `chrome.storage.local` to persist speed preferences and panel position
- **Pointer Events**: Emulates real user interactions for compatibility with ChatGPT's Radix UI components

### Compatibility
- ✅ Chrome 88+ (Manifest V3)
- ✅ ChatGPT (chatgpt.com)
- ✅ All OpenAI voice models
- ✅ Desktop and laptop browsers

## 🛠️ Development

### Building from Source
```bash
# Clone the repository
git clone https://github.com/yourusername/chatgpt-audio-hijacker.git
cd chatgpt-audio-hijacker

# Load in Chrome
# 1. Open chrome://extensions
# 2. Enable Developer mode
# 3. Click "Load unpacked" and select this folder
```

### Project Structure
```
chatgpt-audio-hijacker/
├── manifest.json          # Extension manifest
├── content.js             # Main content script
├── injector.js            # MAIN-world audio patch
├── styles.css             # UI styles
├── icons/                 # Extension icons
│   ├── icon.svg
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # This file
```

## 🐛 Troubleshooting

### Audio Not Playing
- **Check Console**: Open DevTools (F12) and look for errors
- **Refresh Page**: Sometimes ChatGPT's UI changes require a page reload
- **Disable Conflicts**: Try disabling other ChatGPT extensions temporarily

### Button Not Appearing
- **Wait for Load**: Give the page a moment to fully load
- **Check Messages**: Only assistant messages have the speaker button
- **Refresh**: Try refreshing the page if buttons don't appear

### Panel Not Showing
- **Start Audio**: The panel only appears when audio is actively playing
- **Check Position**: The panel might be off-screen - drag it back into view

### Extension Not Loading
- **Verify Installation**: Ensure the extension is enabled in `chrome://extensions`
- **Check Permissions**: Make sure it has access to `chatgpt.com`
- **Reload Extension**: Click the reload button in `chrome://extensions`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

### How to Contribute
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for the amazing ChatGPT platform
- The Chrome extension community for inspiration and tools
- Radix UI for the accessible component library that ChatGPT uses

## 📞 Support

If you encounter any issues or have questions:
- 🐛 [Report an Issue](https://github.com/yourusername/chatgpt-audio-hijacker/issues)
- 💬 [Discussions](https://github.com/yourusername/chatgpt-audio-hijacker/discussions)
- 📧 [Email Support](mailto:support@example.com)

---

**Made with ❤️ for the ChatGPT community**
