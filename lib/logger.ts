import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs', 'debug');
const UI_LOG = path.join(LOG_DIR, 'ui-flicker.log');

function ensureLogDir() {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch {}
}

export function logDebug(scope: string, data: unknown) {
  try {
    ensureLogDir();
    const now = new Date();
    const line1 = `[${now.toISOString()}] [${scope}]\n`;
    const body = JSON.stringify(data, null, 2) + '\n';
    fs.appendFileSync(UI_LOG, line1 + body);
    // Console mirror (no external color lib to avoid deps)
    // Scope in blue-ish, time in gray
    // eslint-disable-next-line no-console
    console.log(`%c${now.toLocaleTimeString()} %c[${scope}]`, 'color:#94a3b8', 'color:#60a5fa', data);
  } catch {
    // ignore logging errors
  }
}
