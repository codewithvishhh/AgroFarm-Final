"""Root entrypoint proxy for AgroFarm backend.
Allows deployment both from repository root and from the backend subdirectory.
"""

import importlib.util
import os
import sys

backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

backend_main_path = os.path.join(backend_dir, "main.py")
spec = importlib.util.spec_from_file_location("backend_main", backend_main_path)
backend_main = importlib.util.module_from_spec(spec)
sys.modules["backend_main"] = backend_main
spec.loader.exec_module(backend_main)

app = backend_main.app
