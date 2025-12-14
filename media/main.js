// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
  const vscode = acquireVsCodeApi();

  let totalTokens = 0;
  let chart = null;
  let tokenHistory = [];
  let labels = [];

  const resetBtn = document.getElementById("resetBtn");
  const lastCountSpan = document.getElementById("lastCount");
  const totalCountSpan = document.getElementById("totalCount");
  const liveStatus = document.getElementById("liveStatus");

  // Initialize Chart
  const ctx = document.getElementById("tokenChart").getContext("2d");

  // Check if Chart is defined (loaded from CDN)
  if (typeof Chart !== "undefined") {
    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Token Usage",
            data: tokenHistory,
            borderColor: "rgb(75, 192, 192)",
            tension: 0.1,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: false,
            min: function(context) {
              const data = context.chart.data.datasets[0].data;
              if (!data || data.length === 0) return 0;
              const minValue = Math.min(...data);
              const maxValue = Math.max(...data);
              const range = maxValue - minValue;
              // If range is less than 10% of max, or values are small, start from 0
              if (range < maxValue * 0.1 || minValue < 10000) {
                return 0;
              }
              // Otherwise, start from 90% of min value (rounded down)
              return Math.floor(minValue * 0.9);
            },
          },
        },
      },
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      vscode.postMessage({
        type: "reset-session",
      });
    });
  }

  // Handle messages sent from the extension to the webview
  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.type) {
      case "init-state": {
        // Restore state from backend
        totalTokens = message.sessionTotal || 0;
        tokenHistory.length = 0;
        labels.length = 0;

        if (message.tokenHistory && message.labels) {
          message.tokenHistory.forEach((v) => tokenHistory.push(v));
          message.labels.forEach((l) => labels.push(l));
        }

        totalCountSpan.innerText = totalTokens;
        lastCountSpan.innerText =
          (message.lastDelta >= 0 ? "+" : "") + (message.lastDelta || 0);

        if (totalTokens > 0) {
          liveStatus.style.display = "inline";
        }

        if (chart) {
          chart.update();
        }
        break;
      }
      case "state-reset": {
        // Clear everything
        totalTokens = 0;
        tokenHistory.length = 0;
        labels.length = 0;
        totalCountSpan.innerText = "0";
        lastCountSpan.innerText = "0";
        if (chart) {
          chart.update();
        }
        break;
      }
      case "token-update-auto": {
        const tokens = message.value;
        const delta = message.delta || 0;
        const timestamp = message.timestamp;

        // Update UI
        lastCountSpan.innerText = (delta >= 0 ? "+" : "") + delta;
        totalTokens = tokens;
        totalCountSpan.innerText = tokens;
        liveStatus.style.display = "inline";

        // Update Chart data (backend already manages history, but we sync here)
        labels.push(timestamp);
        tokenHistory.push(tokens);

        // Limit history to last 20 points
        if (labels.length > 20) {
          labels.shift();
          tokenHistory.shift();
        }

        if (chart) {
          chart.update();
        }
        break;
      }
      case "error": {
        lastCountSpan.innerText = "Error";
        break;
      }
    }
  });

  // Notify backend that webview is ready
  vscode.postMessage({ type: "webview-ready" });
})();
