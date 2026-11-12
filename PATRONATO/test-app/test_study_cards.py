# -*- coding: utf-8 -*-
"""
Tests unitarios deterministas para la generación de Fichas de Estudio y Tips de Examen.
Valida el contrato de datos, estructura de sheets, y riqueza de contenido para el examen.
"""

import os
import sys
import json
import re
import unittest

# Asegurar que el directorio local de test-app esté en sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

class TestStudyCardsGeneration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base_dir = os.path.dirname(os.path.abspath(__file__))
        cls.patronato_dir = os.path.abspath(os.path.join(cls.base_dir, ".."))
        cls.js_dir = os.path.join(cls.base_dir, "js")
        cls.output_file = os.path.join(cls.js_dir, "study-cards-data.js")

    def test_01_builder_module_exists(self):
        """Verifica que el módulo study_cards_builder existe y se puede importar."""
        import study_cards_builder
        self.assertTrue(hasattr(study_cards_builder, "build_study_cards"))

    def test_02_generation_creates_valid_js(self):
        """Verifica que la función genera el archivo study-cards-data.js con sintaxis válida."""
        import study_cards_builder
        result = study_cards_builder.build_study_cards(self.patronato_dir, self.js_dir)
        self.assertTrue(os.path.exists(self.output_file), f"No existe {self.output_file}")
        
        with open(self.output_file, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("window.STUDY_DATA =", content)
        match = re.search(r'window\.STUDY_DATA\s*=\s*(\{.*?\});?\s*$', content, re.DOTALL)
        self.assertIsNotNone(match, "No se encontró el objeto JSON en window.STUDY_DATA")
        
        data = json.loads(match.group(1))
        self.assertIn("metadata", data)
        self.assertIn("sheets", data)
        self.assertGreaterEqual(data["metadata"]["totalSheets"], 12)

    def test_03_contract_schema_and_richness(self):
        """Verifica que cada ficha cumple el esquema exacto y contiene tips pedagógicos orientados al examen."""
        import study_cards_builder
        study_cards_builder.build_study_cards(self.patronato_dir, self.js_dir)
        
        with open(self.output_file, "r", encoding="utf-8") as f:
            content = f.read()
        match = re.search(r'window\.STUDY_DATA\s*=\s*(\{.*?\});?\s*$', content, re.DOTALL)
        data = json.loads(match.group(1))
        sheets = data["sheets"]

        expected_topics = [f"tema_{i}" for i in range(1, 14)]
        for tid in expected_topics:
            self.assertIn(tid, sheets, f"Falta ficha para {tid}")
            sheet = sheets[tid]
            
            # Campos obligatorios
            self.assertEqual(sheet["topicId"], tid)
            self.assertTrue(sheet["title"])
            self.assertTrue(sheet["badge"])
            self.assertTrue(sheet["summary"])
            
            # Reglas de oro (mínimo 2)
            self.assertGreaterEqual(len(sheet.get("goldenRules", [])), 2, f"Pocas reglas de oro en {tid}")
            for rule in sheet["goldenRules"]:
                self.assertTrue(rule.get("title"))
                self.assertTrue(rule.get("content"))
            
            # Trampas del examen (mínimo 2 comparativas)
            self.assertGreaterEqual(len(sheet.get("examTraps", [])), 2, f"Pocas trampas en {tid}")
            for trap in sheet["examTraps"]:
                self.assertTrue(trap.get("trap"))
                self.assertTrue(trap.get("exampleBad"))
                self.assertTrue(trap.get("exampleGood"))
                self.assertTrue(trap.get("explanation"))
            
            # Tips de descarte rápido para el examen (mínimo 2)
            self.assertGreaterEqual(len(sheet.get("examTips", [])), 2, f"Pocos tips en {tid}")
            for tip in sheet["examTips"]:
                self.assertTrue(tip.get("rule"))
                self.assertTrue(tip.get("tip"))

            # Flashcards interactivas (mínimo 4 por tema)
            self.assertGreaterEqual(len(sheet.get("flashcards", [])), 4, f"Pocas flashcards en {tid}")
            for card in sheet["flashcards"]:
                self.assertTrue(card.get("front"))
                self.assertTrue(card.get("back"))

    def test_04_specific_pedagogical_content(self):
        """Verifica que las fichas contienen las trampas y reglas específicas de Patronato."""
        with open(self.output_file, "r", encoding="utf-8") as f:
            content = f.read()
        data = json.loads(re.search(r'window\.STUDY_DATA\s*=\s*(\{.*?\});?\s*$', content, re.DOTALL).group(1))
        sheets = data["sheets"]

        # Tema 1: Presente simple y To Be
        t1 = json.dumps(sheets["tema_1"], ensure_ascii=False)
        self.assertTrue("Does" in t1 or "does" in t1)
        self.assertTrue("base" in t1.lower())

        # Tema 2: Stative Verbs
        t2 = json.dumps(sheets["tema_2"], ensure_ascii=False)
        self.assertTrue("stative" in t2.lower() or "estado" in t2.lower())

        # Tema 8: Conectores
        t8 = json.dumps(sheets["tema_8"], ensure_ascii=False)
        self.assertTrue("although" in t8.lower() or "despite" in t8.lower() or "however" in t8.lower())

        # Tema 10: In, On, At
        t10 = json.dumps(sheets["tema_10"], ensure_ascii=False)
        self.assertTrue("at" in t10.lower() and "in" in t10.lower() and "on" in t10.lower())

        # Tema 13: Comparatives & Superlatives
        t13 = json.dumps(sheets["tema_13"], ensure_ascii=False)
        self.assertTrue("comparative" in t13.lower() or "superlative" in t13.lower() or "than" in t13.lower())
        self.assertIn("tema_13_f1", sheets)
        self.assertIn("tema_13_f2", sheets)

if __name__ == "__main__":
    unittest.main()
