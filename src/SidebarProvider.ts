import * as vscode from "vscode";
import { getEncoding } from "js-tiktoken";

export class TokenSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "token-sidebar";
  private _view?: vscode.WebviewView;

  // Persisted state (survives webview hide/show)
  private _sessionTotal: number = 0;
  private _lastFilePath: string | null = null;
  private _lastFileTokens: number = 0;
  private _tokenHistory: number[] = [];
  private _labels: string[] = [];
  private _lastDelta: number = 0;

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
        case "webview-ready": {
          // Webview is ready, send current state
          this._view?.webview.postMessage({
            type: "init-state",
            sessionTotal: this._sessionTotal,
            tokenHistory: this._tokenHistory,
            labels: this._labels,
            lastDelta: this._lastDelta
          });
          break;
        }
        case "reset-session": {
          this._sessionTotal = 0;
          this._tokenHistory = [];
          this._labels = [];
          this._lastDelta = 0;
          if (this._view) {
            this._view.webview.postMessage({
              type: "state-reset",
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
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      this._view.webview.postMessage({
        type: "error",
        value: "Token calculation failed",
      });
    }
  }

  // Note: State members moved to top of class for persistence

  public updateTokenCount(filePath: string, text: string) {
    try {
      const enc = getEncoding("cl100k_base");
      const currentTokens = enc.encode(text).length;

      // Accumulation Logic
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

      // Store history in backend
      const timestamp = new Date().toLocaleTimeString();
      this._tokenHistory.push(this._sessionTotal);
      this._labels.push(timestamp);
      this._lastDelta = delta;

      // Limit history to last 20 points
      if (this._tokenHistory.length > 20) {
        this._tokenHistory.shift();
        this._labels.shift();
      }

      // Only send to webview if it exists
      if (this._view) {
        this._view.webview.postMessage({
          type: "token-update-auto",
          value: this._sessionTotal,
          delta: delta,
          timestamp: timestamp,
        });
      }
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
