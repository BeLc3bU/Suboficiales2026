# -*- coding: utf-8 -*-
"""
Tests unitarios deterministas para el enriquecedor de explicaciones gramaticales (explanation_enricher.py).
Garantiza que ninguna pregunta del banco conserve una explicación vacía o meramente plantilla
('Opción correcta: X') y que las explicaciones citen la regla gramatical y la respuesta correcta.
"""

import os
import sys
import json
import re
import unittest

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)


class TestExplanationEnricher(unittest.TestCase):
    def test_01_module_and_api_exist(self):
        """Verifica que explanation_enricher existe y expone enrich_question_explanation y enrich_topics."""
        import explanation_enricher
        self.assertTrue(hasattr(explanation_enricher, "enrich_question_explanation"))
        self.assertTrue(hasattr(explanation_enricher, "enrich_topics"))

    def test_02_enriches_representative_grammar_cases(self):
        """Verifica explicaciones reales para casos clave de Patronato (Temas 1, 8, 10, 14, 15, 16)."""
        import explanation_enricher

        cases = [
            (
                "tema_1",
                {
                    "id": "T1_Q1",
                    "type": "choice",
                    "section": "Grammar (Presente Simple y To Be)",
                    "question": "The children ____ near the sports centre.",
                    "options": {"A": "lives", "B": "live", "C": "living", "D": "are live"},
                    "answer": "B",
                    "explanation": "Tema 1: Present Simple / To Be / Have got. Solución correcta: opción B.",
                },
                ["live", "plural", "children"],
            ),
            (
                "tema_10",
                {
                    "id": "T10_Q1",
                    "type": "choice",
                    "section": "Preposiciones IN / ON / AT",
                    "question": "The briefing starts ____ 08:30.",
                    "options": {"A": "in", "B": "on", "C": "at", "D": "to"},
                    "answer": "C",
                    "explanation": "Tema 10. Opción correcta: C.",
                },
                ["at", "hora"],
            ),
            (
                "tema_14_f1",
                {
                    "id": "T14_Q1",
                    "type": "choice",
                    "section": "Present Perfect",
                    "question": "We have lived here ____ 2018.",
                    "options": {"A": "for", "B": "since", "C": "ago", "D": "yet"},
                    "answer": "B",
                    "explanation": "Tema 14 (Ficha 1). Opción correcta: B.",
                },
                ["since", "punto"],
            ),
            (
                "tema_15_f1",
                {
                    "id": "T15_Q1",
                    "type": "choice",
                    "section": "Quantifiers",
                    "question": "We don't have ____ time to finish the inspection.",
                    "options": {"A": "many", "B": "much", "C": "few", "D": "a few"},
                    "answer": "B",
                    "explanation": "Tema 15. Opción correcta: B.",
                },
                ["much", "incontable"],
            ),
            (
                "tema_16_f1",
                {
                    "id": "T16F1_Q1",
                    "type": "choice",
                    "section": "Tema 16 (Ficha 1): TO vs FOR y finalidad",
                    "question": "We went to London _______ improve our English.",
                    "options": {"A": "for", "B": "to", "C": "so that to", "D": "in order"},
                    "answer": "B",
                    "explanation": "Tema 16 (Ficha 1): TO vs FOR y finalidad. Opción correcta: B.",
                },
                ["to", "finalidad", "forma base"],
            ),
        ]

        for topic_id, q, expected_keywords in cases:
            exp = explanation_enricher.enrich_question_explanation(topic_id, q)
            self.assertGreaterEqual(len(exp), 45, f"Explicación demasiado corta para {q['id']}: {exp}")
            self.assertNotRegex(exp, r"^.{0,80}(Opción correcta|Solución correcta):\s*[A-D]\.?$")
            exp_lower = exp.lower()
            self.assertTrue(
                any(kw in exp_lower for kw in expected_keywords),
                f"Faltan palabras clave {expected_keywords} en: {exp}",
            )

    def test_03_all_questions_in_questions_data_non_generic(self):
        """Aplica enrich_topics sobre el questions-data.js real en memoria y valida 0 explicaciones genéricas."""
        import explanation_enricher

        q_path = os.path.join(BASE_DIR, "js", "questions-data.js")
        with open(q_path, "r", encoding="utf-8") as f:
            content = f.read()
        match = re.search(r"window\.TEST_DATA\s*=\s*(\{.*?\});?\s*$", content, re.DOTALL)
        self.assertIsNotNone(match)
        data = json.loads(match.group(1))
        topics = data["topics"]

        explanation_enricher.enrich_topics(topics)

        generic_pattern = re.compile(r"(Opción correcta:|Solución correcta: opción|Respuesta correcta:)\s*['\"]?[A-Za-z0-9'\s]+['\"]?\.?$", re.IGNORECASE)
        bad = []
        for t in topics:
            for q in t.get("questions", []):
                exp = (q.get("explanation") or "").strip()
                if len(exp) < 40 or generic_pattern.search(exp):
                    bad.append((t["id"], q.get("id"), exp))

        self.assertEqual(bad, [], f"Quedaron {len(bad)} preguntas sin explicación enriquecida. Ejemplos: {bad[:5]}")


if __name__ == "__main__":
    unittest.main()
