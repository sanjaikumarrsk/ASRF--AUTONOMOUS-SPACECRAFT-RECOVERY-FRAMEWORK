#!/usr/bin/env python3
"""
AUTONOMOUS SPACECRAFT RECOVERY FRAMEWORK Unified Full-Stack Launcher (Python)
NASA / JPL & ESA Mission Science Interface Platform
"""

import os
import signal
import socket
import subprocess
import sys
import time

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "celestial-x")
POSTGRES_DATA = os.path.join(BACKEND_DIR, ".postgres-data")

def find_python():
    venv_py = os.path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe")
    if os.path.exists(venv_py):
        return venv_py
    return sys.executable

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0

def main():
    print("\n" + "=" * 70)
    print("   AUTONOMOUS SPACECRAFT RECOVERY FRAMEWORK")
    print("   NASA / JPL & ESA Mission Science Interface Platform")
    print("=" * 70 + "\n")

    py_exe = find_python()
    processes = []

    # 1. Check or Start PostgreSQL on Port 55432
    print("[1/4] Checking PostgreSQL database on port 55432...")
    if not is_port_in_use(55432):
        print("      Starting isolated local PostgreSQL cluster on port 55432...")
        pg_bin = r"C:\Program Files\PostgreSQL\18\bin\postgres.exe"
        if not os.path.exists(pg_bin):
            pg_bin = "postgres"
        pg_proc = subprocess.Popen([pg_bin, "-D", POSTGRES_DATA, "-p", "55432"])
        processes.append(("PostgreSQL", pg_proc))
        time.sleep(3)
        print(f"      PostgreSQL daemon active (PID: {pg_proc.pid}).")
    else:
        print("      PostgreSQL is already active on port 55432.")

    # 2. Database Seeder
    print("[2/4] Verifying database schema and seeding 50 components / 14 reports...")
    subprocess.run([py_exe, "-m", "app.seeder"], cwd=BACKEND_DIR)

    # 3. Start FastAPI Backend
    print("[3/4] Launching CELESTIAL-X FastAPI backend on http://127.0.0.1:8000...")
    backend_proc = subprocess.Popen(
        [py_exe, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=BACKEND_DIR
    )
    processes.append(("FastAPI Backend", backend_proc))
    time.sleep(2)

    # 4. Start Vite Frontend
    print("[4/4] Launching Vite Frontend on http://localhost:5173...")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev", "--", "--host", "127.0.0.1"],
        cwd=FRONTEND_DIR
    )
    processes.append(("Vite Frontend", frontend_proc))
    time.sleep(2)

    print("\n" + "=" * 70)
    print("   CELESTIAL-X PLATFORM OPERATIONAL")
    print("=" * 70)
    print("   Frontend Mission Portal  : http://localhost:5173")
    print("   Operations Dashboard     : http://localhost:5173/dashboard")
    print("   System Architecture      : http://localhost:5173/system")
    print("   Audit & Documents Vault  : http://localhost:5173/records")
    print("   Backend API Docs         : http://127.0.0.1:8000/docs")
    print("   Live WebSocket Stream    : ws://127.0.0.1:8000/api/telemetry/ws")
    print("   Default Credentials      : rsk / rsk  or  flight_director / SafeFlight2026!")
    print("=" * 70)
    print("Press [CTRL+C] to cleanly terminate all processes.\n")

    def shutdown(signum=None, frame=None):
        print("\nShutting down CELESTIAL-X processes...")
        for name, proc in reversed(processes):
            try:
                proc.terminate()
                proc.wait(timeout=3)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
        print("Shutdown complete.")
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    while True:
        time.sleep(1)
        for name, proc in processes:
            if proc.poll() is not None:
                print(f"{name} exited unexpectedly.")
                shutdown()

if __name__ == "__main__":
    main()

