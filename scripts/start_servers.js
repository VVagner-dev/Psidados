#!/usr/bin/env node
/**
 * Start backend and frontend for PsiDados (Node.js script)
 * Usage: node scripts/start_servers.js [--no-new-console] [--wait]
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

const ROOT = path.resolve(__dirname, '..');
const SERVER_DIR = path.join(ROOT, 'server');
const CLIENT_DIR = path.join(ROOT, 'client');
const LOG_DIR = path.join(ROOT, 'logs');

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const args = process.argv.slice(2);
const noNewConsole = args.includes('--no-new-console');
const waitFlag = args.includes('--wait');

function isPortOpen(port, host = '127.0.0.1', timeout = 500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let called = false;
    const onResult = (open) => {
      if (called) return; called = true; try { socket.destroy(); } catch (e) {}
      resolve(open);
    };
    socket.setTimeout(timeout);
    socket.once('connect', () => onResult(true));
    socket.once('timeout', () => onResult(false));
    socket.once('error', () => onResult(false));
    socket.connect(port, host);
  });
}

function startDetached(command, args, cwd, logFile) {
  const out = fs.openSync(logFile, 'a');
  const err = fs.openSync(logFile, 'a');
  const child = spawn(command, args, {
    cwd,
    detached: true,
    stdio: ['ignore', out, err]
  });
  child.unref();
  return child.pid;
}

async function main() {
  console.log('Repo root:', ROOT);
  console.log('Server dir:', SERVER_DIR);
  console.log('Client dir:', CLIENT_DIR);

  const backendPortOpen = await isPortOpen(3001);
  const frontendPortOpen = await isPortOpen(5173);

  let backendPid = null;
  let frontendPid = null;

  if (backendPortOpen) {
    console.log('Port 3001 already open — skipping backend start.');
  } else {
    // Start node server.js in server dir
    const log = path.join(LOG_DIR, 'backend.log');
    // On Windows you could use cmd /c start to open a new console but we keep it detached
    backendPid = startDetached(process.platform === 'win32' ? 'node' : 'node', ['server.js'], SERVER_DIR, log);
    console.log('Started backend, PID=', backendPid, 'logs->', log);
  }

  if (frontendPortOpen) {
    console.log('Port 5173 already open — skipping frontend start.');
  } else {
    const log = path.join(LOG_DIR, 'frontend.log');
    // Use npm to run dev script
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    try {
      frontendPid = startDetached(npmCmd, ['run', 'dev'], CLIENT_DIR, log);
      console.log('Started frontend, PID=', frontendPid, 'logs->', log);
    } catch (err) {
      console.error('Failed to start frontend (detached):', err && err.message);
      // Fallback on Windows: open a new cmd window with start so user can see logs
      if (process.platform === 'win32' && !noNewConsole) {
        try {
          spawn('cmd', ['/c', 'start', 'cmd', '/k', 'npm run dev'], { cwd: CLIENT_DIR, detached: true, stdio: 'ignore' }).unref();
          console.log('Fallback: opened new cmd window for frontend (npm run dev)');
        } catch (e) {
          console.error('Fallback failed:', e && e.message);
        }
      }
    }
  }

  if (waitFlag) {
    // Wait a bit and re-check ports
    await new Promise(r => setTimeout(r, 1500));
    console.log('Port 3001 open:', await isPortOpen(3001));
    console.log('Port 5173 open:', await isPortOpen(5173));
  }

  console.log('\nSummary:');
  console.log(' backend PID:', backendPid || '(skipped)');
  console.log(' frontend PID:', frontendPid || '(skipped)');
  console.log('\nLogs are in', LOG_DIR);
  console.log('To stop: use Task Manager or `taskkill /PID <pid> /F` on Windows, or `kill <pid>` on Unix-like.');
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
