# -*- coding: utf-8 -*-
"""
Servidor local para la plataforma de tests de PATRONATO 2026.
Permite servir la web en http://127.0.0.1:8080 y procesar la petición
de actualización automática de ejercicios desde el botón del navegador.
"""

import http.server
import socketserver
import os
import sys
import json
import webbrowser
import socket

# Safe encoding
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

class AppRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path.startswith('/api/actualizar'):
            self.ejecutar_actualizacion()
        elif self.path.startswith('/api/progress'):
            self.guardar_progreso()
        else:
            self.send_error(404, "Ruta no encontrada")

    def do_GET(self):
        if self.path.startswith('/api/actualizar'):
            self.ejecutar_actualizacion()
        elif self.path.startswith('/api/progress'):
            self.obtener_progreso()
        elif self.path == '/api/ping':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')
        else:
            super().do_GET()

    def obtener_progreso(self):
        prog_file = os.path.join(BASE_DIR, "user_progress.json")
        data = None
        if os.path.exists(prog_file):
            try:
                with open(prog_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception:
                data = None
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        resp = {"success": True, "data": data}
        self.wfile.write(json.dumps(resp, ensure_ascii=False).encode('utf-8'))

    def guardar_progreso(self):
        content_len = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_len)
        try:
            parsed = json.loads(body.decode('utf-8'))
            prog_file = os.path.join(BASE_DIR, "user_progress.json")
            with open(prog_file, "w", encoding="utf-8") as f:
                json.dump(parsed, f, ensure_ascii=False, indent=2)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"success":true}')
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))

    def ejecutar_actualizacion(self):
        try:
            # Import and execute extractor script directly
            if BASE_DIR not in sys.path:
                sys.path.insert(0, BASE_DIR)
            import actualizar_ejercicios
            import importlib
            importlib.reload(actualizar_ejercicios)
            
            actualizar_ejercicios.main()

            # Read questions-data.js to obtain updated stats
            data_file = os.path.join(BASE_DIR, "js", "questions-data.js")
            total_questions = 0
            total_topics = 0
            if os.path.exists(data_file):
                with open(data_file, "r", encoding="utf-8") as f:
                    txt = f.read()
                    json_str = txt[txt.find('{'):txt.rfind('}')+1]
                    d = json.loads(json_str)
                    total_questions = d.get("metadata", {}).get("totalQuestions", 0)
                    total_topics = d.get("metadata", {}).get("totalTopics", 0)

            resp = {
                "success": True,
                "message": "Actualización realizada con éxito",
                "totalQuestions": total_questions,
                "totalTopics": total_topics
            }

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(resp, ensure_ascii=False).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode('utf-8'))

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def main():
    if is_port_in_use(PORT):
        print(f"El servidor ya está activo en http://127.0.0.1:{PORT}. Abriendo navegador...")
        webbrowser.open(f'http://127.0.0.1:{PORT}')
        sys.exit(0)

    # Enable address reuse
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('127.0.0.1', PORT), AppRequestHandler) as httpd:
        print(f"========================================================")
        print(f"  SERVIDOR ACTIVO: http://127.0.0.1:{PORT}")
        print(f"  Pulsa Ctrl+C para detener el servidor")
        print(f"========================================================")
        webbrowser.open(f'http://127.0.0.1:{PORT}')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")

if __name__ == '__main__':
    main()
