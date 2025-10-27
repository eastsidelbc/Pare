let writeToFile: ((head: string, body: string) => void) | null = null;

if (typeof window === 'undefined') {
  // Lazy require to avoid bundling 'fs'/'path' in client
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs') as typeof import('fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path') as typeof import('path');
  const LOG_DIR = path.join(process.cwd(), 'logs', 'debug');
  const UI_LOG = path.join(LOG_DIR, 'ui-flicker.log');
  writeToFile = (head: string, body: string) => {
    try {
      fs.mkdirSync(LOG_DIR, { recursive: true });
      fs.appendFileSync(UI_LOG, head + body);
    } catch {
      // ignore file write errors in dev
    }
  };
}

export function logDebug(scope: string, data: unknown) {
  const now = new Date();
  const head = `[${now.toISOString()}] [${scope}]\n`;
  const body = JSON.stringify(data, null, 2) + '\n';

  if (writeToFile) {
    writeToFile(head, body);
  }

  try {
    // Console mirror (colored in browser, plain on server if CSS unsupported)
    // eslint-disable-next-line no-console
    console.log(`%c${now.toLocaleTimeString()} %c[${scope}]`, 'color:#94a3b8', 'color:#60a5fa', data);
  } catch {
    // eslint-disable-next-line no-console
    console.log(`[${now.toLocaleTimeString()}] [${scope}]`, data);
  }
}
