# -*- coding: utf-8 -*-
"""
Tests unitarios deterministas para el Generador Procedural de Simulacro Oficial (60 Preguntas).
Valida:
1. Existencia y sintaxis de los archivos exam-data.js y exam-generator.js.
2. Contrato de datos: banco de lecturas y clozes de 10 preguntas.
3. Estructura exacta del examen generado:
   - Exactamente 60 preguntas.
   - Preguntas 1 a 30: Comprensión Escrita (Reading) con textos íntegros.
   - Preguntas 31 a 60: Gramática y Vocabulario (3 textos Cloze de 10 preguntas).
   - Numeración continua 1 a 60.
   - 0 preguntas huérfanas.
4. Variabilidad procedural (generación de exámenes distintos en diferentes llamadas).
5. Baremo militar oficial: 70% APTO (42/60), sin penalización de fallos, 90 minutos (5400s).
"""

import os
import sys
import json
import re
import subprocess
import unittest

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JS_DIR = os.path.join(BASE_DIR, "js")
DATA_FILE = os.path.join(JS_DIR, "exam-data.js")
GENERATOR_FILE = os.path.join(JS_DIR, "exam-generator.js")

class TestExamGenerator(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base_dir = BASE_DIR
        cls.js_dir = JS_DIR
        cls.data_file = DATA_FILE
        cls.generator_file = GENERATOR_FILE

    def test_01_files_exist(self):
        """Verifica que existen los ficheros exam-data.js y exam-generator.js."""
        self.assertTrue(os.path.exists(self.data_file), f"No existe {self.data_file}")
        self.assertTrue(os.path.exists(self.generator_file), f"No existe {self.generator_file}")

    def test_02_exam_data_contract(self):
        """Verifica la validez y riqueza del contrato window.EXAM_DATA."""
        with open(self.data_file, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("window.EXAM_DATA =", content)
        match = re.search(r'window\.EXAM_DATA\s*=\s*(\{.*?\});?\s*$', content, re.DOTALL)
        self.assertIsNotNone(match, "No se encontró el objeto JSON en window.EXAM_DATA")

        data = json.loads(match.group(1))
        self.assertIn("readingUnits", data)
        self.assertIn("clozeUnits", data)

        # Verificar que clozeUnits tiene al menos 8 textos de 10 preguntas cada uno
        clozes = data["clozeUnits"]
        self.assertGreaterEqual(len(clozes), 8, "Debe haber al menos 8 textos cloze para garantizar variabilidad")
        for i, c in enumerate(clozes):
            self.assertIn("id", c)
            self.assertIn("title", c)
            self.assertIn("text", c)
            self.assertIn("questions", c)
            self.assertEqual(len(c["questions"]), 10, f"El cloze {c.get('id', i)} debe tener exactamente 10 preguntas")
            for q in c["questions"]:
                self.assertIn("options", q)
                self.assertEqual(len(q["options"]), 4, "Cada pregunta debe tener 4 opciones (A, B, C, D)")
                self.assertIn(q["answer"], ["A", "B", "C", "D"], f"Respuesta inválida en {q}")

        # Verificar que readingUnits suma al menos 35 preguntas
        readings = data["readingUnits"]
        total_reading_qs = sum(len(r["questions"]) for r in readings)
        self.assertGreaterEqual(total_reading_qs, 35, "Debe haber al menos 35 preguntas de reading en el pool")
        for r in readings:
            self.assertIn("text", r)
            self.assertGreater(len(r["questions"]), 0)
            for q in r["questions"]:
                self.assertIn("options", q)
                self.assertEqual(len(q["options"]), 4)
                self.assertIn(q["answer"], ["A", "B", "C", "D"])

    def test_03_procedural_generation_via_node(self):
        """Ejecuta el generador procedural en Node.js y valida la estructura de 60 preguntas."""
        node_script = f"""
        const fs = require('fs');
        const vm = require('vm');

        const context = {{ window: {{}}, Math: Math, console: console }};
        vm.createContext(context);

        const dataCode = fs.readFileSync('{self.data_file.replace(os.sep, '/')}', 'utf8');
        vm.runInContext(dataCode, context);

        const genCode = fs.readFileSync('{self.generator_file.replace(os.sep, '/')}', 'utf8');
        vm.runInContext(genCode, context);

        const exam = context.window.EXAM_GENERATOR.generateOfficialExam();
        console.log(JSON.stringify(exam));
        """

        result = subprocess.run(
            ["node", "-e", node_script],
            capture_output=True,
            text=True,
            encoding="utf-8"
        )
        self.assertEqual(result.returncode, 0, f"Error ejecutando Node.js: {result.stderr}")

        exam = json.loads(result.stdout)
        self.assertEqual(len(exam["questions"]), 60, "El examen generado debe tener exactamente 60 preguntas")
        self.assertEqual(exam["mode"], "exam")
        self.assertEqual(exam["timeLimitMinutes"], 90)
        self.assertEqual(exam["passPercentage"], 70)
        self.assertEqual(exam["passMinCorrect"], 42)

        # Validar Parte I: preguntas 1 a 30
        part1 = exam["questions"][:30]
        for i, q in enumerate(part1):
            self.assertEqual(q["number"], i + 1, f"Pregunta {i+1} debe tener número correlativo {i+1}")
            self.assertEqual(q["part"], 1, f"Pregunta {i+1} debe pertenecer a la Parte 1 (Reading)")
            self.assertTrue(bool(q.get("readingText")), f"Pregunta {i+1} debe tener texto de lectura")

        # Validar Parte II: preguntas 31 a 60
        part2 = exam["questions"][30:]
        cloze_texts = set()
        for i, q in enumerate(part2):
            expected_num = 31 + i
            self.assertEqual(q["number"], expected_num, f"Pregunta {expected_num} debe tener número {expected_num}")
            self.assertEqual(q["part"], 2, f"Pregunta {expected_num} debe pertenecer a la Parte 2 (Cloze)")
            self.assertTrue(bool(q.get("readingText")), f"Pregunta {expected_num} debe tener texto cloze")
            cloze_texts.add(q["readingText"].strip()[:50])

        self.assertEqual(len(cloze_texts), 3, f"Parte 2 debe tener exactamente 3 textos cloze distintos, encontrados: {len(cloze_texts)}")

    def test_04_procedural_randomness(self):
        """Verifica que dos generaciones consecutivas producen exámenes diferentes."""
        node_script = f"""
        const fs = require('fs');
        const vm = require('vm');

        const context = {{ window: {{}}, Math: Math, console: console }};
        vm.createContext(context);
        vm.runInContext(fs.readFileSync('{self.data_file.replace(os.sep, '/')}', 'utf8'), context);
        vm.runInContext(fs.readFileSync('{self.generator_file.replace(os.sep, '/')}', 'utf8'), context);

        const exam1 = context.window.EXAM_GENERATOR.generateOfficialExam();
        const exam2 = context.window.EXAM_GENERATOR.generateOfficialExam();

        const ids1 = exam1.questions.map(q => q.id).join(',');
        const ids2 = exam2.questions.map(q => q.id).join(',');

        console.log(JSON.stringify({{ same: ids1 === ids2 }}));
        """

        result = subprocess.run(
            ["node", "-e", node_script],
            capture_output=True,
            text=True,
            encoding="utf-8"
        )
        self.assertEqual(result.returncode, 0, f"Error ejecutando Node.js: {result.stderr}")
        data = json.loads(result.stdout)
        self.assertFalse(data["same"], "Dos exámenes generados consecutivamente no deben ser idénticos")

    def test_05_corte_and_scoring_logic(self):
        """Verifica la lógica de evaluación oficial del 70% (42/60 = APTO)."""
        node_script = f"""
        const fs = require('fs');
        const vm = require('vm');

        const context = {{ window: {{}}, Math: Math, console: console }};
        vm.createContext(context);
        vm.runInContext(fs.readFileSync('{self.data_file.replace(os.sep, '/')}', 'utf8'), context);
        vm.runInContext(fs.readFileSync('{self.generator_file.replace(os.sep, '/')}', 'utf8'), context);

        const exam = context.window.EXAM_GENERATOR.generateOfficialExam();

        // Caso 1: 42 aciertos exactos (21 en Reading + 21 en Cloze) -> Debe ser APTO
        const answersApto = exam.questions.map((q, idx) => idx < 42 ? q.answer : 'X');
        const resApto = context.window.EXAM_GENERATOR.evaluateOfficialExamResults(answersApto, exam.questions);

        // Caso 2: 41 aciertos exactos -> Debe ser NO APTO
        const answersNoApto = exam.questions.map((q, idx) => idx < 41 ? q.answer : 'X');
        const resNoApto = context.window.EXAM_GENERATOR.evaluateOfficialExamResults(answersNoApto, exam.questions);

        console.log(JSON.stringify({{ resApto, resNoApto }}));
        """

        result = subprocess.run(
            ["node", "-e", node_script],
            capture_output=True,
            text=True,
            encoding="utf-8"
        )
        self.assertEqual(result.returncode, 0, f"Error ejecutando Node.js: {result.stderr}")
        eval_data = json.loads(result.stdout)
        
        res_apto = eval_data["resApto"]
        self.assertTrue(res_apto["isApto"])
        self.assertEqual(res_apto["statusLabel"], "APTO")
        self.assertEqual(res_apto["totalCorrect"], 42)
        self.assertEqual(res_apto["percentage"], 70)

        res_no_apto = eval_data["resNoApto"]
        self.assertFalse(res_no_apto["isApto"])
        self.assertEqual(res_no_apto["statusLabel"], "NO APTO")
        self.assertEqual(res_no_apto["totalCorrect"], 41)

if __name__ == "__main__":
    unittest.main()
