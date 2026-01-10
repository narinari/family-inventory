import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForEmulator(
  host: string,
  port: number,
  maxRetries = 30
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`http://${host}:${port}`);
      if (response.ok || response.status === 404 || response.status === 400) {
        return true;
      }
    } catch {
      // Emulator が起動していない場合はリトライ
    }
    await sleep(1000);
  }
  return false;
}

async function globalSetup() {
  console.log('Checking Firebase Emulators...');

  // 既存の Emulator が起動しているかチェック
  const authReady = await waitForEmulator('localhost', 9099, 3);
  const firestoreReady = await waitForEmulator('localhost', 8080, 3);

  if (authReady && firestoreReady) {
    console.log('Firebase Emulators are already running');
    return;
  }

  console.log('Starting Firebase Emulators...');

  const projectRoot = path.resolve(__dirname, '../..');
  const emulatorProcess: ChildProcess = spawn(
    'npx',
    [
      'firebase',
      'emulators:start',
      '--project',
      'demo-family-inventory',
      '--only',
      'auth,firestore',
    ],
    {
      cwd: projectRoot,
      stdio: 'pipe',
      shell: true,
      detached: true,
    }
  );

  // プロセスをバックグラウンドで実行
  emulatorProcess.unref();

  // PID をファイルに保存（ティアダウンで使用）
  const fs = await import('fs');
  fs.writeFileSync(
    path.join(__dirname, '.emulator-pid'),
    String(emulatorProcess.pid)
  );

  // Emulator が起動するまで待機
  const authStarted = await waitForEmulator('localhost', 9099);
  const firestoreStarted = await waitForEmulator('localhost', 8080);

  if (!authStarted || !firestoreStarted) {
    throw new Error('Firebase Emulators failed to start');
  }

  console.log('Firebase Emulators started successfully');
}

export default globalSetup;
