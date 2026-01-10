import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function globalTeardown() {
  const pidFile = path.join(__dirname, '.emulator-pid');

  if (!fs.existsSync(pidFile)) {
    console.log('No emulator PID file found, skipping teardown');
    return;
  }

  const pid = parseInt(fs.readFileSync(pidFile, 'utf8'), 10);

  if (isNaN(pid)) {
    console.log('Invalid PID in file, skipping teardown');
    fs.unlinkSync(pidFile);
    return;
  }

  try {
    // プロセスグループ全体を終了
    process.kill(-pid, 'SIGTERM');
    console.log(`Stopped Firebase Emulators (PID: ${pid})`);
  } catch (error) {
    // プロセスが既に終了している場合は無視
    console.log('Emulator process already stopped or not found');
  }

  // PID ファイルを削除
  fs.unlinkSync(pidFile);
}

export default globalTeardown;
