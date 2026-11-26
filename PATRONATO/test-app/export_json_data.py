"""Exporta los datasets JS generados a archivos JSON estáticos en public/data/ para Vite/React."""

import json
import os
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JS_DIR = os.path.join(BASE_DIR, "js")
REPO_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))
PUBLIC_DATA_DIR = os.path.join(REPO_ROOT, "public", "data")

EXPORTS = [
    ("questions-data.js", "window.TEST_DATA", "questions.json"),
    ("study-cards-data.js", "window.STUDY_DATA", "study-cards.json"),
    ("exam-data.js", "window.EXAM_DATA", "exam-data.json"),
]


def export_all_json(public_data_dir: str = PUBLIC_DATA_DIR) -> dict[str, str]:
    """Convierte los archivos window.* de js/ en JSON minificados en public/data/."""
    os.makedirs(public_data_dir, exist_ok=True)
    decoder = json.JSONDecoder()
    generated: dict[str, str] = {}

    for js_name, global_var, json_name in EXPORTS:
        js_path = os.path.join(JS_DIR, js_name)
        if not os.path.exists(js_path):
            continue
        with open(js_path, "r", encoding="utf-8") as fh:
            content = fh.read()
        pattern = re.escape(global_var) + r"\s*=\s*"
        match = re.search(pattern, content)
        if not match:
            raise ValueError(f"No se encontró {global_var} en {js_name}")
        data, _ = decoder.raw_decode(content, match.end())
        out_path = os.path.join(public_data_dir, json_name)
        with open(out_path, "w", encoding="utf-8") as out:
            json.dump(data, out, ensure_ascii=False, separators=(",", ":"))
        generated[json_name] = out_path
        print(f"[JSON] Exportado {out_path} ({os.path.getsize(out_path):,} bytes)")

    return generated


if __name__ == "__main__":
    export_all_json()
