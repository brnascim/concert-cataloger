import { execSync } from 'child_process';

try {
  console.log('Running npm install to regenerate package-lock.json...');
  execSync('npm install --package-lock-only', {
    cwd: '/vercel/share/v0-project',
    stdio: 'inherit',
  });
  console.log('package-lock.json has been regenerated successfully.');
} catch (error) {
  console.error('Failed to regenerate package-lock.json:', error.message);
  process.exit(1);
}
