# Development Guide

## Prerequisites

- Node.js (v16+)
- VS Code (1.80.0+)
- Antigravity Extension installed (to generate the logs this extension monitors)

## Setup

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

## Running the Extension

1.  Open the project in VS Code.
2.  Press `F5` to start debugging.
3.  A new "Extension Development Host" window will open.
4.  In the new window, check the "Activity Bar" for the "Token Viz" icon (Activity Bar is the left-most vertical bar).

## Building parts

- **Compile TS**: `npm run compile`
- **Watch Mode**: `npm run watch` (Useful for dev)

## Packaging

To create a `.vsix` for installation:

```bash
npm run package
# or
npx vsce package
```

## Testing

```bash
npm test
```

## Project Structure

- `src/extension.ts`: Main entry point.
- `src/LogMonitor.ts`: File watcher logic for `.gemini/` folder.
- `src/SidebarProvider.ts`: Webview controller and token calculation logic.
- `media/`: CSS, Icons, and frontend `main.js` for the webview.
