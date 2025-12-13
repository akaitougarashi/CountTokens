// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    const vscode = acquireVsCodeApi();
    
    let totalTokens = 0;
    let chart = null;
    const tokenHistory = [];
    const labels = [];

    const resetBtn = document.getElementById('resetBtn');
    // const inputText = document.getElementById('inputText'); // Removed
    const lastCountSpan = document.getElementById('lastCount');
    const totalCountSpan = document.getElementById('totalCount');

    // Initialize Chart
    const ctx = document.getElementById('tokenChart').getContext('2d');
    
    // Check if Chart is defined (loaded from CDN)
    if (typeof Chart !== 'undefined') {
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Token Usage',
                    data: tokenHistory,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
             vscode.postMessage({
                type: 'reset-session'
            });
        });
    }

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            case 'token-result':
            case 'token-update-auto':
                {
                    const isAuto = message.type === 'token-update-auto';
                    const tokens = message.value;
                    const delta = message.delta || 0; // Receive delta
                    const timestamp = new Date(message.timestamp).toLocaleTimeString();
                    
                    // Update UI
                    if(isAuto) {
                         // Show delta for Last Count
                         lastCountSpan.innerText = (delta >= 0 ? '+' : '') + delta;
                    } else {
                        lastCountSpan.innerText = tokens;
                    }
                    totalTokens += tokens; // Should we accumulate or replace? 
                    // If it's a log update, it might be cumulative or new messages?
                    // The log file reading reads the *whole* file or newly added part?
                    // LogMonitor.ts reads the whole file (or checks diff).
                    // LogMonitor.ts extracts text from *entire* file currently.
                    // So the token count is for the *entire* conversation.
                    
                    // Use case correction:
                    // If LogMonitor passes the *entire* text of conversation, then 'tokens' is the total count.
                    // The chart tracks *history* of counts.
                    // If we get "100 tokens", then "120 tokens", then "150 tokens" (growing conversation).
                    // We probably want to plot the total size over time.
                    
                    if (isAuto) {
                        document.getElementById('liveStatus').style.display = 'inline';
                        totalCountSpan.innerText = tokens; 
                        
                        if (tokens === 0) {
                            // Reset Chart
                            labels.length = 0;
                            tokenHistory.length = 0;
                            totalTokens = 0;
                             if (chart) {
                                chart.update();
                            }
                            lastCountSpan.innerText = '0';
                            return;
                        }
                    } else {
                         // Manual calc
                         totalTokens += tokens; // Accumulate manually checked chunks
                         totalCountSpan.innerText = totalTokens;
                    }

                    
                    // Update Chart
                    if (chart) {
                        labels.push(timestamp);
                        tokenHistory.push(tokens);
                        
                        // Limit history to last 20 points
                        if (labels.length > 20) {
                            labels.shift();
                            tokenHistory.shift();
                        }
                        
                        chart.update();
                    }
                    
                    if (!isAuto) {
                        inputText.value = ''; // Clear input only for manual
                    }
                    break;
                }
            case 'error':
                {
                    lastCountSpan.innerText = "Error";
                    break;
                }
        }
    });
}());
