#!/usr/bin/env bash
# Run the local image generator with the project-local Python and model cache.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
export HF_HOME="$HERE/.hf" HF_HUB_OFFLINE=1 PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True
exec "$HERE/.venv/bin/python" "$HERE/generate.py" "$@"
