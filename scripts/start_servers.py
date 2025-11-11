"""Start both backend and frontend for the PsiDados project.

Usage:
  python scripts/start_servers.py        # starts both services
  python scripts/start_servers.py --no-new-console  # start in background in same console (stream logs)

This script attempts to be cross-platform. On Windows it will create two new console windows (recommended).
It returns the PIDs of the launched processes.

Note: It expects to be placed at the repository root under `scripts/` and the project structure to have `server/` and `client/` folders.
"""

from pathlib import Path
import subprocess
import platform
import shutil
import time
import argparse
import os

ROOT = Path(__file__).resolve().parent.parent
SERVER_DIR = ROOT / 'server'
CLIENT_DIR = ROOT / 'client'

parser = argparse.ArgumentParser()
parser.add_argument('--no-new-console', action='store_true', help='Do not open new console windows; run processes detached and stream PIDs')
parser.add_argument('--wait', action='store_true', help='Wait a short moment after starting and attempt to show if ports are listening')
args = parser.parse_args()

is_windows = platform.system().lower().startswith('win')

def ensure_tool(name):
    if shutil.which(name) is None:
        raise SystemExit(f"Required tool '{name}' not found in PATH. Install it or adjust PATH.")

# Ensure basic tools exist
ensure_tool('node')
ensure_tool('npm')

print(f"Repo root: {ROOT}")
print(f"Server dir: {SERVER_DIR}")
print(f"Client dir: {CLIENT_DIR}")

procs = []

# Directory to store logs when running detached (avoids PIPE blocking)
LOG_DIR = ROOT / 'logs'
LOG_DIR.mkdir(parents=True, exist_ok=True)

def is_port_open(port: int) -> bool:
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.5)
        s.connect(('127.0.0.1', port))
        s.close()
        return True
    except Exception:
        return False


def start_process(cmd, cwd, name):
    """Start a subprocess for 'name'. If running with new consoles on Windows, open a new console.
    Otherwise, detach the process and redirect stdout/stderr to a log file under LOG_DIR to avoid blocking pipes."""
    print(f"Starting {name}: {cmd} (cwd={cwd})")
    logfile = LOG_DIR / f"{name}.log"
    # When asked, open in a new console on Windows so user can see logs live
    if is_windows and not args.no_new_console:
        creationflags = subprocess.CREATE_NEW_CONSOLE
        # Use cmd /k form already provided in cmd argument when calling
        p = subprocess.Popen(cmd, cwd=str(cwd), creationflags=creationflags)
        print(f"Launched {name} in new console, PID={p.pid}")
        return p
    else:
        # Detached launch: redirect stdout/stderr to logfile (append)
        f = open(str(logfile), 'a', buffering=1, encoding='utf-8', errors='replace')
        if is_windows:
            # On Windows without new console, start normally and write output to file
            p = subprocess.Popen(cmd, cwd=str(cwd), stdout=f, stderr=subprocess.STDOUT, shell=False)
        else:
            # On Unix-like, detach with setsid and redirect output to file
            p = subprocess.Popen(cmd, cwd=str(cwd), stdout=f, stderr=subprocess.STDOUT, preexec_fn=os.setsid)
        print(f"Launched {name}, PID={p.pid} (logs -> {logfile})")
        return p

try:
    # Start backend: node server.js (skip if port 3001 already in use)
    if is_port_open(3001):
        print('Port 3001 appears to be in use; skipping backend start.')
    else:
        if is_windows and not args.no_new_console:
            backend_cmd = ['cmd', '/k', 'node server.js']
        else:
            backend_cmd = ['node', 'server.js']
        p_backend = start_process(backend_cmd, SERVER_DIR, 'backend')
        procs.append(('backend', p_backend))

    # Small delay to avoid race when both try to bind ports at same time
    time.sleep(0.5)

    # Start frontend: npm run dev (skip if port 5173 already in use)
    if is_port_open(5173):
        print('Port 5173 appears to be in use; skipping frontend start.')
    else:
        if is_windows and not args.no_new_console:
            # Use cmd /k so the console stays open and the dev server output is visible
            frontend_cmd = ['cmd', '/k', 'npm run dev']
        else:
            frontend_cmd = ['npm', 'run', 'dev']
        p_frontend = start_process(frontend_cmd, CLIENT_DIR, 'frontend')
        procs.append(('frontend', p_frontend))

    if args.wait:
        time.sleep(2)
        # Try to detect common ports
        try:
            import socket
            def is_port_open(port):
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(0.5)
                try:
                    s.connect(('127.0.0.1', port))
                    s.close()
                    return True
                except Exception:
                    return False
            print('Port 3001 (backend) open:', is_port_open(3001))
            print('Port 5173 (frontend) open:', is_port_open(5173))
        except Exception as e:
            print('Could not check ports:', e)

    print('\nSummary of launched processes:')
    for name, p in procs:
        print(f" - {name}: PID={p.pid} running={p.poll() is None}")

    print('\nIf consoles were opened, check those windows for logs. If not, you can use the PIDs above to inspect logs or kill the processes.')
    print('To stop them: use Task Manager or `taskkill /PID <pid> /F` on Windows or `kill <pid>` on Unix.')

except Exception as e:
    print('Error while starting services:', e)
    for name, p in procs:
        try:
            p.kill()
        except Exception:
            pass
    raise
