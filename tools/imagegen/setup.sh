#!/usr/bin/env bash
# One-time setup of the local, offline image generator (free & open source).
# Everything lands inside tools/imagegen/ — delete that folder to uninstall.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
BIN="$HERE/.bin"; mkdir -p "$BIN"
export UV_HTTP_TIMEOUT=600 UV_HTTP_RETRIES=8 UV_CACHE_DIR="$HERE/.uv-cache" UV_PYTHON_INSTALL_DIR="$HERE/.python" HF_HOME="$HERE/.hf"

if [ ! -x "$BIN/uv" ]; then
  echo "[1/4] downloading uv (Python package manager)…"
  curl -LsSf https://github.com/astral-sh/uv/releases/latest/download/uv-x86_64-unknown-linux-gnu.tar.gz \
    | tar -xz -C "$BIN" --strip-components=1
fi
UV="$BIN/uv"

echo "[2/4] creating Python 3.12 venv…"
[ -d "$HERE/.venv" ] || "$UV" venv "$HERE/.venv" --python 3.12

echo "[3/4] installing PyTorch (CUDA 12.8, supports RTX 50xx) + diffusers…"
"$UV" pip install --python "$HERE/.venv/bin/python" torch torchvision --index-url https://download.pytorch.org/whl/cu128
"$UV" pip install --python "$HERE/.venv/bin/python" diffusers transformers accelerate safetensors huggingface_hub pillow

echo "[4/4] downloading model weights (RealVisXL V5.0, CreativeML OpenRAIL++-M)…"
"$HERE/.venv/bin/python" - <<'PY'
from huggingface_hub import snapshot_download
p = snapshot_download("SG161222/RealVisXL_V5.0", allow_patterns=["*.json","*.txt","*fp16*.safetensors","**/*fp16*.safetensors","tokenizer*/*","scheduler/*"])
print("model at", p)
PY
"$HERE/.venv/bin/python" -c "import torch;print('torch',torch.__version__,'cuda',torch.cuda.is_available(),torch.cuda.get_device_name(0) if torch.cuda.is_available() else '')"
echo "DONE"
