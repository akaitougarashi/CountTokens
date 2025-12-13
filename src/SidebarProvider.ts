import * as vscode from "vscode";
import { getEncoding } from "js-tiktoken";

export class TokenSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "token-sidebar";
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case "onInfo": {
          if (!data.value) {
            return;
          }
          vscode.window.showInformationMessage(data.value);
          break;
        }
        case "onError": {
          if (!data.value) {
            return;
          }
          vscode.window.showErrorMessage(data.value);
          break;
        }
        case "reset-session": {
            this._sessionTotal = 0;
            if (this._view) {
                this._view.webview.postMessage({
                    type: "token-update-auto",
                    value: 0,
                    timestamp: new Date().toISOString()
                });
            }
            break;
        }
      }
    });
  }

  private calculateTokens(text: string) {
    if (!this._view) {
      return;
    }
    try {
      const enc = getEncoding("cl100k_base");
      const tokens = enc.encode(text).length;
      // enc.free(); // js-tiktoken does not need free()
      
      this._view.webview.postMessage({
        type: "token-result",
        value: tokens,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      this._view.webview.postMessage({
        type: "error",
        value: "Token calculation failed"
      });
    }
  }

  private _sessionTotal: number = 0;
  private _lastFilePath: string | null = null;
  private _lastFileTokens: number = 0;

  public updateTokenCount(filePath: string, text: string) {
    if (!this._view) {
        return;
    }
    try {
        const enc = getEncoding("cl100k_base");
        const currentTokens = enc.encode(text).length;
        // enc.free();

        // Accumulation Logic
        let displayTokens = this._sessionTotal;
        let delta = 0;

        if (this._lastFilePath !== filePath) {
            // Context switched or first run
            // We treat the current state of this new file as the baseline.
            // We don't add to session total yet.
            this._lastFilePath = filePath;
            this._lastFileTokens = currentTokens;
        } else {
            // Same file, check delta
            delta = currentTokens - this._lastFileTokens;
            if (delta > 0) {
                this._sessionTotal += delta;
            }
            // Update baseline
            this._lastFileTokens = currentTokens;
        }

        // displayTokens = this._sessionTotal; // No longer just sending total

        this._view.webview.postMessage({
            type: "token-update-auto",
            value: this._sessionTotal,
            delta: delta, // Send the delta as well
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error(err);
    }
  }

  public refresh() {
    if (this._view) {
      this._view.webview.postMessage({ type: "refresh" });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.js")
    );
    
    // Using a CDN for Chart.js for simplicity in this MVP.
    // In a production specific environment, we should bundle it.
    // However, since extensions might be offline, I will eventually download it.
    // For now, I'll use the CDN to get the structure working quickly.
    const chartJsUri = "https://cdn.jsdelivr.net/npm/chart.js";

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
        <script src="${chartJsUri}"></script>
				<title>Token Viz</title>
			</head>
			<body>
        <div class="container">
          <h2>Token Usage <span id="liveStatus" style="color: #4caf50; font-size: 0.6em; display: none;">● Live</span></h2>
          <canvas id="tokenChart" width="400" height="200"></canvas>
          
          <div class="controls" style="display: flex; justify-content: flex-end; margin-bottom: 10px;">
            <!-- Manual input removed as per user request -->
             <button id="resetBtn">↺ Reset</button>
          </div>
          
          <div class="stats">
             <p>Last Count: <span id="lastCount">0</span> tokens</p>
             <p>Total Session: <span id="totalCount">0</span> tokens</p>
          </div>
        </div>
				<script src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}
