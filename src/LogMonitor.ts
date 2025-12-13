import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as chokidar from "chokidar";

export class LogMonitor {
  private _watcher: chokidar.FSWatcher | null = null;
  private _callback: ((filePath: string, text: string) => void) | null = null;
  private _conversationsDir: string;

  constructor() {
    const homeDir = os.homedir();
    this._conversationsDir = path.join(
      homeDir,
      ".gemini",
      "antigravity",
      "conversations"
    );
  }

  public startMonitoring(callback: (filePath: string, text: string) => void) {
    this._callback = callback;

    if (!fs.existsSync(this._conversationsDir)) {
      console.error(
        `Conversations directory not found: ${this._conversationsDir}`
      );
      return;
    }

    console.log(`Starting to monitor: ${this._conversationsDir}`);

    this._watcher = chokidar.watch(this._conversationsDir, {
      ignored: /^\./,
      persistent: true,
      ignoreInitial: true,
    });

    this._watcher
      .on("add", (filePath: string) => this.processFile(filePath))
      .on("change", (filePath: string) => this.processFile(filePath));

    // Initial process of the latest file
    this.processLatestFile();
  }

  public stopMonitoring() {
    if (this._watcher) {
      this._watcher.close();
      this._watcher = null;
    }
  }

  private async processLatestFile() {
    try {
      const files = await fs.promises.readdir(this._conversationsDir);
      const pbFiles = files.filter((f) => f.endsWith(".pb"));

      if (pbFiles.length === 0) {
        return;
      }

      // Find the most recently modified file
      let latestFile = "";
      let latestMtime = new Date(0);

      for (const file of pbFiles) {
        const filePath = path.join(this._conversationsDir, file);
        const stats = await fs.promises.stat(filePath);
        if (stats.mtime > latestMtime) {
          latestMtime = stats.mtime;
          latestFile = filePath;
        }
      }

      if (latestFile) {
        this.processFile(latestFile);
      }
    } catch (err) {
      console.error("Error finding latest file:", err);
    }
  }

  private async processFile(filePath: string) {
    if (!filePath.endsWith(".pb")) {
      return;
    }

    try {
      // Read file as binary
      const buffer = await fs.promises.readFile(filePath);

      // Extract text: simple filter for printable characters to approximate text content
      // Protocol buffers store strings as UTF-8, but interspersed with binary wire types.
      // We just want to get a rough sense of the "conversation text" for token counting.
      // A more robust solution would require the actual proto definition.
      const text = this.extractPrintableText(buffer);

      if (this._callback) {
        this._callback(filePath, text);
      }
    } catch (err) {
      console.error(`Error processing file ${filePath}:`, err);
    }
  }

  private extractPrintableText(buffer: Buffer): string {
    // Filter for printable characters and common whitespace
    // This is a heuristic.
    let text = "";
    const limit = buffer.length;

    // Optimize: process in chunks or use a more efficient encoding check if needed for large files
    // For now, simple loop is okay for typical log sizes.
    for (let i = 0; i < limit; i++) {
      const byte = buffer[i];
      // Printable ASCII (32-126), tabs (9), newline (10), carriage return (13)
      // Also include extended ASCII/UTF-8 bytes (128+) as they form part of multibyte characters
      // We will accumulate bytes and decode as UTF-8 at the end to handle multibyte chars correctly.
      // However, random binary bytes might look like invalid UTF-8.
      // Better approach: regex on the full string, but creating string from random binary is messy.

      // Alternative: replace binary control chars with spaces, then decode.
      // Wire types in proto are often small integers.
    }

    // Better approach for Node.js:
    // Convert to string using utf-8, telling it to replace invalid sequences?
    // No, binary data might be valid utf-8 locally but garbage globally.

    // Let's try: decode entire buffer as utf-8, ignoring errors, then filter the resulting string
    // to keep long sequences of "text-like" content.
    const rawString = buffer.toString("utf-8");

    // Regex to find sequences of alphanumeric, punctuation, distinct whitespace, and Japanese characters.
    // \p{L} matches unicode letters. \p{N} matches numbers. \p{P} punctuation.
    // We want to discard short noise which is likely binary artifacts.

    // Simple heuristic: just return the whole thing?
    // If we count tokens on binary garbage, it will be huge.
    // We want to strip out the proto wire tags.
    // Proto tags are usually single bytes or varints.

    // Let's use a regex to extract "meaningful" chunks.
    // Meaningful = sequence of 2+ valid text characters.

    // Refined approach:
    // 1. Replace control characters (0-8, 11-12, 14-31) with empty string.
    // 2. Keep the rest.

    // Note: This won't be perfect token count, but relative count will be useful.

    // Using a regex to match "printable" content.
    // ASCII printable: \x20-\x7E
    // Japanese ranges: \u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf

    // Actually, let's keep it simple: replace non-printable ascii characters with space.
    // But keep high-bit characters (likely UTF-8).

    const cleanBuffer = Buffer.alloc(buffer.length);
    let idx = 0;

    for (let i = 0; i < buffer.length; i++) {
      const b = buffer[i];
      if (
        (b >= 32 && b <= 126) || // ASCII printable
        b === 9 ||
        b === 10 ||
        b === 13 || // Tab, LF, CR
        b >= 128 // Multi-byte start or continuation (High bit set)
      ) {
        cleanBuffer[idx++] = b;
      } else {
        // Replace binary byte with space
        cleanBuffer[idx++] = 32;
      }
    }

    // Slice to actual length
    const resultBuffer = cleanBuffer.slice(0, idx);

    // Decode
    return resultBuffer.toString("utf-8");
  }
}
