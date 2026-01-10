import { test as setup } from '@playwright/test';

setup('initialize test environment', async () => {
  // グローバルセットアップ処理
  // Firebase Emulator の初期化は global-setup.ts で行われる
  console.log('Test environment initialized');
});
