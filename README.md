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

---

## How Token Counting Works

This extension estimates token usage by parsing Antigravity's conversation logs (`.pb` files). The displayed count includes:

| Component | Description |
|-----------|-------------|
| **System Prompt** | Instructions that tell the AI how to behave (~tens of thousands of tokens) |
| **Conversation History** | All previous messages in the current session |
| **Tool Definitions** | Specifications for available tools (file editing, search, etc.) |
| **Your Messages** | The actual text you type |
| **AI Responses** | Antigravity's replies |

### Important Notes

- **System tokens are included**: A large portion of token consumption comes from the system prompt, not your messages. This is normal.
- **This is an estimate**: The `.pb` files are binary Protocol Buffers without a public schema, so extraction is heuristic-based. The absolute count may not be exact, but the **trend** is accurate.
- **Useful for monitoring**: Watch for sudden spikes when reading large files or when conversations get long.

### When Does It Reset?

| Event | Behavior |
|-------|----------|
| **Reset button pressed** | Clears session total and graph |
| **Switching sidebar tabs** | State is **preserved** (returns when you come back) |
| **Sidebar never opened** | Tokens are still tracked in the background ✓ |
| **Antigravity restarts** | Session resets (extension reloads) |
| **New conversation started** | Tracked as continuation (no auto-reset) |

> **Tip**: Press the Reset button when starting a new task to track token consumption for that specific work session.
