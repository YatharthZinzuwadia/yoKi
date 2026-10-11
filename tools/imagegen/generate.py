"""Batch image generation for yoKi (local, offline, free).

Usage (from the project root):
    tools/imagegen/run.sh tools/imagegen/prompts/p1.json          # generate missing images
    tools/imagegen/run.sh tools/imagegen/prompts/p1.json --force  # regenerate all
    tools/imagegen/run.sh tools/imagegen/prompts/p1.json --only p1/smile

Each prompt file is a JSON list of {name, prompt, negative?, width?, height?, seed?, steps?, cfg?}.
Output: public/images/<name>.webp (+ a log line in public/CREDITS.md).
"""

import argparse
import datetime
import json
import os
import sys
from pathlib import Path

import torch
from diffusers import DPMSolverMultistepScheduler, StableDiffusionXLPipeline
from huggingface_hub import snapshot_download

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "images"
CREDITS = ROOT / "public" / "CREDITS.md"
MODEL = "SG161222/RealVisXL_V5.0"

NEG = (
    "text, watermark, logo, signature, letters, words, caption, frame border, deformed, disfigured, "
    "extra fingers, extra limbs, mutated hands, lowres, jpeg artifacts, cartoon, 3d render, cgi"
)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("prompts")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--only", default=None)
    a = ap.parse_args()

    items = json.loads(Path(a.prompts).read_text())
    if a.only:
        items = [i for i in items if i["name"] == a.only]
    todo = [i for i in items if a.force or not (OUT / f"{i['name']}.webp").exists()]
    if not todo:
        print("nothing to do")
        return

    snaps = sorted((Path(os.environ["HF_HOME"]) / "hub" / ("models--" + MODEL.replace("/", "--")) / "snapshots").glob("*"))
    path = str(snaps[-1]) if snaps else snapshot_download(MODEL)
    pipe = StableDiffusionXLPipeline.from_pretrained(path, torch_dtype=torch.float16, variant="fp16", use_safetensors=True)
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, use_karras_sigmas=True)
    pipe.enable_model_cpu_offload()
    pipe.vae.enable_tiling()
    pipe.set_progress_bar_config(disable=True)

    CREDITS.parent.mkdir(parents=True, exist_ok=True)
    if not CREDITS.exists():
        CREDITS.write_text("# Credits & asset ledger\n\n| file | source | licence | tool / prompt | date |\n|---|---|---|---|---|\n")

    for it in todo:
        name = it["name"]
        w, h = it.get("width", 832), it.get("height", 1216)
        seed = it.get("seed", 1234)
        g = torch.Generator("cuda").manual_seed(seed)
        img = pipe(
            prompt=it["prompt"],
            negative_prompt=it.get("negative", NEG),
            width=w,
            height=h,
            num_inference_steps=it.get("steps", 30),
            guidance_scale=it.get("cfg", 5.0),
            generator=g,
        ).images[0]
        dst = OUT / f"{name}.webp"
        dst.parent.mkdir(parents=True, exist_ok=True)
        img.save(dst, "WEBP", quality=88, method=6)
        with CREDITS.open("a") as f:
            p = it["prompt"].replace("|", "/")[:160]
            f.write(f"| images/{name}.webp | generated | CreativeML OpenRAIL++-M ({MODEL}) | sdxl seed {seed}: {p}… | {datetime.date.today()} |\n")
        print("wrote", dst.relative_to(ROOT), flush=True)


if __name__ == "__main__":
    sys.exit(main())
