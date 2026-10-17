import fs from 'fs';
import os from 'os';
import path from 'path';

const tempDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'merchantiq-c01-'));
process.env.MERCHANTIQ_DATA_DIR = tempDataDir;

try {
  const testModule = await import('./c01_checks.ts');
  await testModule.testRun;
} finally {
  fs.rmSync(tempDataDir, { recursive: true, force: true });
}
