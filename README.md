# Antigravity Token Visualizer

A VS Code extension that visualizes token consumption in real-time during conversations with Antigravity (Google's AI coding assistant).

## Features

- **Live Tracking**: Monitors logs in the `.gemini` folder and automatically graphs token count increases during conversations.
- **Delta Display**: Shows how many tokens were consumed in the most recent exchange (e.g., "+300").
- **Session Reset**: Provides a button to reset the session token count.

## Usage

1. Click the Token Viz icon in the Activity Bar to open the sidebar.
2. Start a conversation with Antigravity — the graph updates automatically.
3. Press the "Reset" button to restart the count.

## Requirements

- This extension is designed specifically for **Antigravity** users.
- It monitors the `.gemini` folder in your user directory, which is created by Antigravity.

## Installation

### From Marketplace (Open VSX)
Search for "Antigravity Token Visualizer" and install.

### Manual Installation
1. Download the `.vsix` file from the [GitHub Releases](https://github.com/akaitougarashi/CountTokens/releases).
2. In VS Code/Antigravity, press `Ctrl+Shift+P` and select "Extensions: Install from VSIX...".
3. Select the downloaded `.vsix` file.

## License

MIT
