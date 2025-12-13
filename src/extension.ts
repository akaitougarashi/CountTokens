import * as vscode from 'vscode';
import { TokenSidebarProvider } from './SidebarProvider';
import { LogMonitor } from './LogMonitor';

let logMonitor: LogMonitor | undefined;

export function activate(context: vscode.ExtensionContext) {
	console.log('Antigravity Token Viz is now active!');

	const provider = new TokenSidebarProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(TokenSidebarProvider.viewType, provider)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('antigravity-token-viz.refresh', () => {
			provider.refresh();
		})
	);

    // Initialize LogMonitor
    logMonitor = new LogMonitor();
    logMonitor.startMonitoring((filePath, text) => {
        provider.updateTokenCount(filePath, text);
    });
}

export function deactivate() {
    if (logMonitor) {
        logMonitor.stopMonitoring();
    }
}
