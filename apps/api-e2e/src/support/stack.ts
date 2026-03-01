import { execSync } from 'node:child_process';
import { E2E_STACK_FILE } from './env';

function run(command: string): void {
  execSync(command, { stdio: 'inherit' });
}

export function startStack(): void {
  if (process.env['API_E2E_SKIP_STACK'] === '1') {
    return;
  }

  run(`docker compose -f ${E2E_STACK_FILE} up --build -d --wait`);
}

export function stopStack(): void {
  if (process.env['API_E2E_SKIP_STACK'] === '1' || process.env['API_E2E_KEEP_STACK'] === '1') {
    return;
  }

  run(`docker compose -f ${E2E_STACK_FILE} down --volumes --remove-orphans`);
}
