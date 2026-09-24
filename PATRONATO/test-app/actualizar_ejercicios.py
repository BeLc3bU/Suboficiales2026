# -*- coding: utf-8 -*-
"""
Script de extracción y actualización automática de ejercicios de PATRONATO.
Escanea la carpeta de PATRONATO (incluyendo subcarpetas como Bloque 1, Repaso Bloque 1, etc.)
en busca de PDFs de ejercicios, extrae preguntas, opciones, respuestas y textos de lectura,
y genera el archivo js/questions-data.js.
"""

import os
import re
import json
import sys
from datetime import datetime

# Safe encoding for Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

try:
    import pypdf
except ImportError:
    print("Instalando pypdf...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pypdf"])
    import pypdf

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PATRONATO_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
JS_OUTPUT_DIR = os.path.join(BASE_DIR, "js")
os.makedirs(JS_OUTPUT_DIR, exist_ok=True)
JS_OUTPUT_FILE = os.path.join(JS_OUTPUT_DIR, "questions-data.js")

print(f"Buscando archivos de ejercicios en: {PATRONATO_DIR}")

def extract_text_from_pdf(pdf_path):
    reader = pypdf.PdfReader(pdf_path)
    full_text = ""
    for page in reader.pages:
        page_text = page.extract_text() or ""
        full_text += page_text + "\n"
    return full_text

def clean_text(t):
    t = t.replace('\r', ' ')
    t = re.sub(r'Patronato en casa \| English with Niusan\s+©\s*\d+\s*Todos los derechos reservados\.\s*\d*', ' ', t)
    t = re.sub(r'INGLÉS:\s*EJERCICIOS[^\n]*', ' ', t, flags=re.IGNORECASE)
    t = re.sub(r'INGLÉS:\s*TEST BLOQUE 1[^\n]*', ' ', t, flags=re.IGNORECASE)
    t = re.sub(r'PATRONATOENCASA\.COM[^\n]*', ' ', t, flags=re.IGNORECASE)
    t = re.sub(r'Elpatronatoencasa\.com[^\n]*', ' ', t, flags=re.IGNORECASE)
    return t

def parse_answer_key(text):
    answers = {}
    key_idx = text.find("ANSWER KEY")
    if key_idx == -1:
        key_idx = text.find("CLAVE DE RESPUESTAS")
    if key_idx != -1:
        key_section = text[key_idx:]
        pairs = re.findall(r'(\d+)\s*[\.\)]?\s*([A-Da-d])\b', key_section)
        for num, ans in pairs:
            n = int(num)
            if n not in answers:
                answers[n] = ans.upper()
    return answers

# ==========================================
# PARSERS: BLOQUE 1 (TEMAS 1 A 5)
# ==========================================

def parse_tema_1(pdf_path):
    raw_text = extract_text_from_pdf(pdf_path)
    text = clean_text(raw_text)
    answer_key = parse_answer_key(text)
    
    t1_match = re.search(r'TEXT 1\s*–\s*RIVERSIDE SPORTS CENTRE(.*?)(?=TEXT 2|$)', text, re.DOTALL)
    t1_text = ""
    if t1_match:
        t1_full = t1_match.group(1).strip()
        t1_parts = re.split(r'\n(?=31\.)', t1_full, maxsplit=1)
        t1_text = t1_parts[0].strip()

    t2_match = re.search(r'TEXT 2\s*–\s*THE BAY FERRY SERVICE(.*?)(?=TEXT 3|$)', text, re.DOTALL)
    t2_text = ""
    if t2_match:
        t2_full = t2_match.group(1).strip()
        t2_parts = re.split(r'\n(?=36\.)', t2_full, maxsplit=1)
        t2_text = t2_parts[0].strip()

    t3_match = re.search(r'TEXT 3\s*–\s*HARBOUR MARKET(.*?)(?=ANSWER KEY|$)', text, re.DOTALL)
    t3_text = ""
    if t3_match:
        t3_full = t3_match.group(1).strip()
        t3_parts = re.split(r'\n(?=41\.)', t3_full, maxsplit=1)
        t3_text = t3_parts[0].strip()

    grammar_questions = []
    q_pattern = re.compile(r'(\d+)\.\s*(.*?)\s*a\)\s*(.*?)\s*b\)\s*(.*?)\s*c\)\s*(.*?)\s*d\)\s*(.*?)(?=\n\s*\d+\.|\n\s*B\.|\Z)', re.DOTALL)
    
    grammar_text = text[:text.find("B. Find the mistake")] if "B. Find the mistake" in text else text
    for m in q_pattern.finditer(grammar_text):
        q_num = int(m.group(1))
        if 1 <= q_num <= 20:
            prompt = m.group(2).strip().replace('\n', ' ')
            opt_a = m.group(3).strip().replace('\n', ' ')
            opt_b = m.group(4).strip().replace('\n', ' ')
            opt_c = m.group(5).strip().replace('\n', ' ')
            opt_d = m.group(6).strip().replace('\n', ' ')
            grammar_questions.append({
                "id": f"T1_Q{q_num}",
                "number": q_num,
                "type": "choice",
                "section": "Grammar (Presente Simple y To Be)",
                "question": prompt,
                "options": {
                    "A": opt_a,
                    "B": opt_b,
                    "C": opt_c,
                    "D": opt_d
                },
                "answer": answer_key.get(q_num, "A"),
                "explanation": f"Tema 1: Present Simple / To Be / Have got. Solución correcta: opción {answer_key.get(q_num, '')}."
            })
            
    corrections = [
        {"num": 21, "wrong": "People in this area speaks two languages.", "correct": "People in this area speak two languages.", "explanation": "'People' es sustantivo plural, el verbo en Present Simple va sin -s (speak)."},
        {"num": 22, "wrong": "My cousins doesn't eat breakfast at home.", "correct": "My cousins don't eat breakfast at home.", "explanation": "'My cousins' es plural (they), requiere el auxiliar negativo 'don't'."},
        {"num": 23, "wrong": "Do your parents on holiday this week?", "correct": "Are your parents on holiday this week?", "explanation": "Para preguntar por estado o ubicación con adjetivo/preposición usamos el verbo To Be ('Are your parents...')."},
        {"num": 24, "wrong": "She have got a small apartment near the beach.", "correct": "She has got a small apartment near the beach.", "explanation": "3ª persona singular (She) con have got exige 'has got'."},
        {"num": 25, "wrong": "Do the train leave from platform four?", "correct": "Does the train leave from platform four?", "explanation": "'The train' es 3ª persona singular (it), requiere auxiliar interrogativo 'Does'."},
        {"num": 26, "wrong": "I has got a meeting this afternoon.", "correct": "I have got a meeting this afternoon.", "explanation": "1ª persona singular (I) forma 'I have got'."},
        {"num": 27, "wrong": "The shop close at nine o'clock every evening.", "correct": "The shop closes at nine o'clock every evening.", "explanation": "'The shop' (it) en Present Simple afirmativo añade -s al verbo (closes)."},
        {"num": 28, "wrong": "We isn't interested in that course.", "correct": "We aren't interested in that course.", "explanation": "Sujeto 'We' concuerda con 'aren't' en To Be."},
        {"num": 29, "wrong": "Does your neighbours have a dog?", "correct": "Do your neighbours have a dog?", "explanation": "'Your neighbours' es plural (they), el auxiliar debe ser 'Do'."},
        {"num": 30, "wrong": "The woman carrys a large bag to work every day.", "correct": "The woman carries a large bag to work every day.", "explanation": "Verbos terminados en consonante + y cambian a -ies en 3ª persona singular (carries)."}
    ]
    correction_questions = []
    for c in corrections:
        correction_questions.append({
            "id": f"T1_Q{c['num']}",
            "number": c["num"],
            "type": "correction",
            "section": "Find the Mistake (Corrección de errores)",
            "question": f"Corrige el error en la siguiente frase:\n\"{c['wrong']}\"",
            "wrongSentence": c["wrong"],
            "answer": c["correct"],
            "explanation": c["explanation"]
        })

    reading_questions = []
    reading_items = [
        (31, "Riverside Sports Centre (31) ____ near a large residential area.", {"A": "are", "B": "do", "C": "is", "D": "has"}, t1_text, "Texto 1: Riverside Sports Centre"),
        (32, "On most weekdays, the centre (32) ____ opens at seven, but it opens later on Sundays.", {"A": "usually", "B": "never", "C": "seldom", "D": "every"}, t1_text, "Texto 1: Riverside Sports Centre"),
        (33, "The children in the local swimming club (33) ____ got training sessions twice a week.", {"A": "are", "B": "haves", "C": "has", "D": "have"}, t1_text, "Texto 1: Riverside Sports Centre"),
        (34, "Their coach (34) ____ the equipment to the pool before each lesson, and the staff check the safety equipment (35) ____ Friday.", {"A": "carrys", "B": "carries", "C": "carry", "D": "carryes"}, t1_text, "Texto 1: Riverside Sports Centre"),
        (35, "...and the staff check the safety equipment (35) ____ Friday.", {"A": "daily", "B": "always", "C": "every", "D": "twice"}, t1_text, "Texto 1: Riverside Sports Centre"),
        
        (36, "The ferries (36) ____ operate after midnight, so passengers must use another form of transport...", {"A": "doesn't", "B": "don't", "C": "aren't", "D": "isn't"}, t2_text, "Texto 2: The Bay Ferry Service"),
        (37, "Services (37) ____ leave on time, although bad weather can cause delays.", {"A": "never", "B": "seldom", "C": "every", "D": "usually"}, t2_text, "Texto 2: The Bay Ferry Service"),
        (38, "The company checks each boat once a day, so inspections take place (38) ____.", {"A": "daily", "B": "every", "C": "monthly", "D": "twice"}, t2_text, "Texto 2: The Bay Ferry Service"),
        (39, "Some people (39) ____ got a monthly travel card.", {"A": "has", "B": "haves", "C": "have", "D": "are"}, t2_text, "Texto 2: The Bay Ferry Service"),
        (40, "(40) ____ the service busy in summer? Yes, especially in July and August.", {"A": "Does", "B": "Is", "C": "Are", "D": "Has"}, t2_text, "Texto 2: The Bay Ferry Service"),
        
        (41, "Several men and women (41) ____ there six days a week.", {"A": "works", "B": "workes", "C": "working", "D": "work"}, t3_text, "Texto 3: Harbour Market"),
        (42, "The market (42) ____ at nine in the morning and closes at six.", {"A": "open", "B": "openes", "C": "opens", "D": "opening"}, t3_text, "Texto 3: Harbour Market"),
        (43, "Customers (43) ____ complain about the prices because most products are affordable.", {"A": "rarely", "B": "always", "C": "frequently", "D": "constantly"}, t3_text, "Texto 3: Harbour Market"),
        (44, "One food stall (44) ____ got tables for customers, but the others only sell takeaway food.", {"A": "have", "B": "haves", "C": "is", "D": "has"}, t3_text, "Texto 3: Harbour Market"),
        (45, "The market is (45) ____ closed on Mondays, so traders use that day to prepare for the week.", {"A": "every", "B": "always", "C": "seldom", "D": "sometimes"}, t3_text, "Texto 3: Harbour Market"),
    ]
    for q_num, prompt, opts, text_content, section_title in reading_items:
        reading_questions.append({
            "id": f"T1_Q{q_num}",
            "number": q_num,
            "type": "choice",
            "section": section_title,
            "readingText": text_content,
            "question": prompt,
            "options": opts,
            "answer": answer_key.get(q_num, "A"),
            "explanation": f"Comprensión lectora / cloze. Opción correcta: {answer_key.get(q_num, '')}."
        })

    return {
        "id": "tema_1",
        "title": "Tema 1: Formas verbales, To be y Presente simple",
        "badge": "Tema 1",
        "description": "Formas de To be, Presente Simple, Have Got, corrección de errores y textos de comprensión.",
        "questions": grammar_questions + correction_questions + reading_questions
    }

def parse_tema_2(pdf_path):
    raw_text = extract_text_from_pdf(pdf_path)
    text = clean_text(raw_text)
    answer_key = parse_answer_key(text)
    
    questions = []
    pattern = re.compile(r'(\d+)\.\s*(.*?)\s*a\)\s*(.*?)\s*b\)\s*(.*?)\s*c\)\s*(.*?)\s*d\)\s*(.*?)(?=\n\s*\d+\.|\n\s*ANSWER KEY|\Z)', re.DOTALL)
    
    q_section = text[:text.find("ANSWER KEY")] if "ANSWER KEY" in text else text
    for m in pattern.finditer(q_section):
        q_num = int(m.group(1))
        prompt = m.group(2).strip().replace('\n', ' ')
        opt_a = m.group(3).strip().replace('\n', ' ')
        opt_b = m.group(4).strip().replace('\n', ' ')
        opt_c = m.group(5).strip().replace('\n', ' ')
        opt_d = m.group(6).strip().replace('\n', ' ')
        questions.append({
            "id": f"T2_Q{q_num}",
            "number": q_num,
            "type": "choice",
            "section": "Present Continuous & Stative Verbs",
            "question": prompt,
            "options": {
                "A": opt_a,
                "B": opt_b,
                "C": opt_c,
                "D": opt_d
            },
            "answer": answer_key.get(q_num, "A"),
            "explanation": f"Tema 2: Present Continuous / Stative Verbs / Reglas ortográficas del gerundio (-ing). Respuesta correcta: {answer_key.get(q_num, '')}."
        })
        
    return {
        "id": "tema_2",
        "title": "Tema 2: Present Continuous & Stative Verbs",
        "badge": "Tema 2",
        "description": "Uso del presente continuo, ortografía de -ing, verbos de estado (stative verbs) y valor de futuro arreglado.",
        "questions": questions
    }

def parse_tema_3(pdf_path):
    raw_text = extract_text_from_pdf(pdf_path)
    text = clean_text(raw_text)
    answer_key = parse_answer_key(text)
    
    questions = []
    pattern = re.compile(r'(\d+)\.\s*(.*?)\s*a\)\s*(.*?)\s*b\)\s*(.*?)\s*c\)\s*(.*?)\s*d\)\s*(.*?)(?=\n\s*\d+\.|\n\s*SAXON|\n\s*REFLEXIVE|\n\s*ANSWER KEY|\Z)', re.DOTALL)
    
    q_section = text[:text.find("ANSWER KEY")] if "ANSWER KEY" in text else text
    for m in pattern.finditer(q_section):
        q_num = int(m.group(1))
        prompt = m.group(2).strip().replace('\n', ' ')
        opt_a = m.group(3).strip().replace('\n', ' ')
        opt_b = m.group(4).strip().replace('\n', ' ')
        opt_c = m.group(5).strip().replace('\n', ' ')
        opt_d = m.group(6).strip().replace('\n', ' ')
        
        section_name = "Pronouns"
        if 26 <= q_num <= 35:
            section_name = "Saxon Genitive & Possession"
        elif 36 <= q_num <= 50:
            section_name = "Reflexive & Reciprocal Pronouns"

        questions.append({
            "id": f"T3_Q{q_num}",
            "number": q_num,
            "type": "choice",
            "section": section_name,
            "question": prompt,
            "options": {
                "A": opt_a,
                "B": opt_b,
                "C": opt_c,
                "D": opt_d
            },
            "answer": answer_key.get(q_num, "A"),
            "explanation": f"Tema 3: {section_name}. Opción correcta: {answer_key.get(q_num, '')}."
        })
        
    return {
        "id": "tema_3",
        "title": "Tema 3: Pronombres y Genitivo Sajón",
        "badge": "Tema 3",
        "description": "Pronombres sujeto/objeto, adjetivos y pronombres posesivos, genitivo sajón ('s) y reflexivos/recíprocos.",
        "questions": questions
    }

def parse_tema_3_extra(pdf_path):
    raw_text = extract_text_from_pdf(pdf_path)
    text = clean_text(raw_text)
    answer_key = parse_answer_key(text)
    
    questions = []
    pattern = re.compile(r'(\d+)\.\s*(.*?)\s*a\)\s*(.*?)\s*b\)\s*(.*?)\s*c\)\s*(.*?)\s*d\)\s*(.*?)(?=\n\s*\d+\.|\n\s*ADJETIVOS|\n\s*ANSWER KEY|\Z)', re.DOTALL)
    
    cloze_1 = "The house isn't (1) __________, it is (2) __________. She is a girl, (3) __________ name is Helen. She goes (4) __________ every morning. She (5) __________ a lot of friends in the town. Peter and Helen are doctors. (6) __________ friends are doctors too. Is that (7) __________ new house? No, (8) __________ isn't. A sister of (9) __________ is in the restaurant now. (10) __________ name is George."
    cloze_2 = "How long did it take (1) __________ to finish (2) __________ exercises? A friend of (3) __________ told me [...] because it takes (10) __________ one hour to get to the centre of the town."
    cloze_3 = "George [...] is packing his clothes in (6) __________ bedroom. [...] Mary, (9) __________ sister [...] with him too."

    q_section = text[:text.find("ADJETIVOS POSESIVOS — COMPLETION")] if "ADJETIVOS POSESIVOS — COMPLETION" in text else text
    for m in pattern.finditer(q_section):
        q_num = int(m.group(1))
        prompt = m.group(2).strip().replace('\n', ' ')
        opt_a = m.group(3).strip().replace('\n', ' ')
        opt_b = m.group(4).strip().replace('\n', ' ')
        opt_c = m.group(5).strip().replace('\n', ' ')
        opt_d = m.group(6).strip().replace('\n', ' ')
        
        reading_text = None
        if 56 <= q_num <= 63:
            reading_text = cloze_1
        elif 64 <= q_num <= 67:
            reading_text = cloze_2
        elif 68 <= q_num <= 69:
            reading_text = cloze_3

        questions.append({
            "id": f"T3E_Q{q_num}",
            "number": q_num,
            "type": "choice",
            "section": "Pronouns & Possession Extra (Test)",
            "readingText": reading_text,
            "question": prompt,
            "options": {
                "A": opt_a,
                "B": opt_b,
                "C": opt_c,
                "D": opt_d
            },
            "answer": answer_key.get(q_num, "A"),
            "explanation": f"Tema 3 Extra: Opción correcta: {answer_key.get(q_num, '')}."
        })
        
    completion_keys = {
        70: "My", 71: "Their", 72: "Its", 73: "His", 74: "His",
        75: "his", 76: "mine", 77: "his", 78: "ours", 79: "her",
        80: "them", 81: "him", 82: "them", 83: "her", 84: "him", 85: "them", 86: "her",
        87: "them", 88: "him", 89: "it", 90: "it", 91: "her", 92: "them", 93: "her",
        94: "him", 95: "them", 96: "they", 97: "us", 98: "She", 99: "them", 100: "me",
        101: "her", 102: "He / it", 103: "yourself", 104: "herself", 105: "each other / one another",
        106: "each other", 107: "yourself", 108: "himself", 109: "themselves", 110: "each other / one another",
        111: "each other", 112: "herself", 113: "each other", 114: "them", 115: "each other",
        116: "yourselves", 117: "us", 118: "ourselves", 119: "each other", 120: "each other",
        121: "them", 122: "themselves", 123: "himself", 124: "myself", 125: "herself",
        126: "themselves", 127: "myself", 128: "himself", 129: "yourself", 130: "yourselves"
    }
    
    comp_section = text[text.find("ADJETIVOS POSESIVOS — COMPLETION"):text.find("ANSWER KEY")]
    comp_lines = re.findall(r'(\d+)\.\s+(.*?)(?=\n\s*\d+\.|\Z)', comp_section, re.DOTALL)
    for q_num_str, prompt in comp_lines:
        q_num = int(q_num_str)
        if q_num in completion_keys:
            prompt_clean = prompt.strip().replace('\n', ' ')
            subsec = "Completion - Posesivos"
            if 80 <= q_num <= 86:
                subsec = "Completion - him / her / them"
            elif 87 <= q_num <= 92:
                subsec = "Completion - Pronombres objeto"
            elif 93 <= q_num <= 102:
                subsec = "Completion - Sujeto u objeto"
            elif 103 <= q_num <= 112:
                subsec = "Completion - Reflexivo o recíproco"
            elif 113 <= q_num <= 122:
                subsec = "Completion - Reflexivo / Recíproco / Objeto"
            elif 123 <= q_num <= 130:
                subsec = "Completion - Pronombres reflexivos"

            questions.append({
                "id": f"T3E_Q{q_num}",
                "number": q_num,
                "type": "completion",
                "section": subsec,
                "question": prompt_clean,
                "answer": completion_keys[q_num],
                "explanation": f"Respuesta correcta: '{completion_keys[q_num]}'."
            })

    return {
        "id": "tema_3_extra",
        "title": "Tema 3 (Extra): Pronombres y Posesión Ampliado",
        "badge": "Tema 3 Extra",
        "description": "Batería intensiva de 130 ejercicios: test de opciones múltiples y ejercicios de completar huecos.",
        "questions": questions
    }

def parse_tema_4(pdf_path):
    raw_text = extract_text_from_pdf(pdf_path)
    text = clean_text(raw_text)
    answer_key = parse_answer_key(text)
    
    questions = []
    pattern = re.compile(r'(\d+)\.\s*(.*?)\s*a\)\s*(.*?)\s*b\)\s*(.*?)\s*c\)\s*(.*?)\s*d\)\s*(.*?)(?=\n\s*\d+\.|\n\s*B\.|\n\s*ANSWER KEY|\Z)', re.DOTALL)
    
    q_section = text[:text.find("ANSWER KEY")] if "ANSWER KEY" in text else text
    for m in pattern.finditer(q_section):
        q_num = int(m.group(1))
        prompt = m.group(2).strip().replace('\n', ' ')
        opt_a = m.group(3).strip().replace('\n', ' ')
        opt_b = m.group(4).strip().replace('\n', ' ')
        opt_c = m.group(5).strip().replace('\n', ' ')
        opt_d = m.group(6).strip().replace('\n', ' ')
        
        section_name = "Plural Nouns" if q_num <= 25 else "Demonstratives"
        questions.append({
            "id": f"T4_Q{q_num}",
            "number": q_num,
            "type": "choice",
            "section": f"Tema 4 - {section_name}",
            "question": prompt,
            "options": {
                "A": opt_a,
                "B": opt_b,
                "C": opt_c,
                "D": opt_d
            },
            "answer": answer_key.get(q_num, "A"),
            "explanation": f"Tema 4: {section_name}. Opción correcta: {answer_key.get(q_num, '')}."
        })
        
    return {
        "id": "tema_4",
        "title": "Tema 4: Plurales de Sustantivos y Demostrativos",
        "badge": "Tema 4",
        "description": "Plurales regulares e irregulares, sustantivos de dos partes, nombres incontables/singulares en -s y demostrativos (this/that/these/those).",
        "questions": questions
    }

def parse_tema_5(pdf_path):
    raw_text = extract_text_from_pdf(pdf_path)
    text = clean_text(raw_text)
    answer_key = parse_answer_key(text)
    
    questions = []
    pattern = re.compile(r'(\d+)\.\s*(.*?)\s*a\)\s*(.*?)\s*b\)\s*(.*?)\s*c\)\s*(.*?)\s*d\)\s*(.*?)(?=\n\s*\d+\.|\n\s*ADJECTIVES|\n\s*WORD FORMATION|\n\s*PREFIXES|\n\s*ANSWER KEY|\Z)', re.DOTALL)
    
    q_section = text[:text.find("ANSWER KEY")] if "ANSWER KEY" in text else text
    for m in pattern.finditer(q_section):
        q_num = int(m.group(1))
        prompt = m.group(2).strip().replace('\n', ' ')
        opt_a = m.group(3).strip().replace('\n', ' ')
        opt_b = m.group(4).strip().replace('\n', ' ')
        opt_c = m.group(5).strip().replace('\n', ' ')
        opt_d = m.group(6).strip().replace('\n', ' ')
        
        section_name = "Adjectives and Adverbs"
        if 16 <= q_num <= 26:
            section_name = "Adjectives in -ed and -ing"
        elif 27 <= q_num <= 40:
            section_name = "Word Formation / Suffixes"
        elif 41 <= q_num <= 45:
            section_name = "Prefixes and Meaning"

        questions.append({
            "id": f"T5_Q{q_num}",
            "number": q_num,
            "type": "choice",
            "section": f"Tema 5 - {section_name}",
            "question": prompt,
            "options": {
                "A": opt_a,
                "B": opt_b,
                "C": opt_c,
                "D": opt_d
            },
            "answer": answer_key.get(q_num, "A"),
            "explanation": f"Tema 5: {section_name}. Opción correcta: {answer_key.get(q_num, '')}."
        })
        
    return {
        "id": "tema_5",
        "title": "Tema 5: Adjectives, Adverbs and Word Formation",
        "badge": "Tema 5",
        "description": "Adjetivos y adverbios, adjetivos en -ed/-ing, formación de palabras (sufijos) y prefijos de significado.",
        "questions": questions
    }

# ==========================================
# PARSERS: REPASO BLOQUE 1
# ==========================================

def parse_test_bloque_1(pdf_path):
    raw_text = extract_text_from_pdf(pdf_path)
    text = clean_text(raw_text)
    
    key_idx = text.find('ANSWER KEY')
    key_section = text[key_idx:]
    key_pairs = re.findall(r'(\d+)\s+([A-D])\b', key_section)
    answers = {int(num): ans.upper() for num, ans in key_pairs}
    
    questions = []
    
    # 1. Reading part: 1 to 30
    reading_part = text[:text.find('GRAMMAR / USE OF ENGLISH')]
    sections = re.split(r'\bTEXT\s+(\d+)\b', reading_part)
    for i in range(1, len(sections), 2):
        t_num = int(sections[i])
        content = sections[i+1].strip()
        pat = re.compile(r'(?:^|\n)\s*' + str(t_num) + r'\.\s*(.*?)\s*a\)\s*(.*?)\s*b\)\s*(.*?)\s*c\)\s*(.*?)\s*d\)\s*(.*?)\Z', re.DOTALL)
        m = pat.search(content)
        if m:
            r_text = content[:m.start()].strip()
            prompt = m.group(1).strip().replace('\n', ' ')
            opts = {
                'A': m.group(2).strip().replace('\n', ' '),
                'B': m.group(3).strip().replace('\n', ' '),
                'C': m.group(4).strip().replace('\n', ' '),
                'D': m.group(5).strip().replace('\n', ' ')
            }
            ans = answers.get(t_num, 'A')
            questions.append({
                "id": f"B1_EX_Q{t_num}",
                "number": t_num,
                "type": "choice",
                "section": f"Reading Comprehension (Texto {t_num})",
                "readingText": r_text,
                "question": prompt,
                "options": opts,
                "answer": ans,
                "explanation": f"Simulacro Bloque 1 - Reading Texto {t_num}. Solución oficial: {ans}."
            })
            
    # 2. Grammar part: 31 to 60
    grammar_part = text[text.find('GRAMMAR / USE OF ENGLISH'):key_idx]
    g_texts = re.split(r'\bTEXT\s+(\d+)\s*[-–]\s*(.*?)\n', grammar_part)
    for i in range(1, len(g_texts), 3):
        t_num = g_texts[i]
        t_title = g_texts[i+1].strip()
        t_body = g_texts[i+2].strip()
        first_q = 31 if t_num == '1' else (41 if t_num == '2' else 51)
        q_start = re.search(r'(?:^|\n)\s*' + str(first_q) + r'\.\s*', t_body)
        if q_start:
            passage = t_body[:q_start.start()].strip()
            q_section = t_body[q_start.start():].strip()
            q_pat = re.compile(r'(\d+)\.\s*a\)\s*(.*?)\s*b\)\s*(.*?)\s*c\)\s*(.*?)\s*d\)\s*(.*?)(?=\n\s*\d+\.|\Z)', re.DOTALL)
            for m in q_pat.finditer(q_section):
                q_num = int(m.group(1))
                opts = {
                    'A': m.group(2).strip().replace('\n', ' '),
                    'B': m.group(3).strip().replace('\n', ' '),
                    'C': m.group(4).strip().replace('\n', ' '),
                    'D': m.group(5).strip().replace('\n', ' ')
                }
                ans = answers.get(q_num, 'A')
                questions.append({
                    "id": f"B1_EX_Q{q_num}",
                    "number": q_num,
                    "type": "choice",
                    "section": f"Use of English - {t_title}",
                    "readingText": passage,
                    "question": f"Completa el hueco ({q_num}) del texto:",
                    "options": opts,
                    "answer": ans,
                    "explanation": f"Simulacro Bloque 1 - {t_title}. Solución oficial ({q_num}): {ans}."
                })
                
    return {
        "id": "bloque_1_examen",
        "title": "Bloque 1: Simulacro Oficial Formato Examen (60 preguntas)",
        "badge": "Simulacro B1",
        "description": "Examen oficial de 60 preguntas: 30 de Reading comprehension con textos reales y 30 de Grammar & Use of English (cloze texts).",
        "questions": questions
    }

def parse_repaso_reading(pdf_path):
    questions = [
        {
            "id": "B1_READ_Q1",
            "number": 1,
            "type": "choice",
            "section": "Reading 1: Bob in London",
            "readingText": "Bob lives in a small flat in London. In the mornings, he wakes up and has a shower. Then he makes breakfast. He usually has a typical English breakfast with eggs and bacon. After that, he goes to work. He works in an office in the center of London. He sits in front of the computer all day and writes emails. He doesn't like his job very much, but he likes earning money. At 12 o'clock he goes to lunch and has a sandwich. After lunch, he comes back to work and writes more emails. At 5 o'clock he leaves work.",
            "question": "Select the true statement:",
            "options": {
                "A": "Bob usually has breakfast at the office.",
                "B": "After lunch Bob comes back home.",
                "C": "Bob loves his job.",
                "D": "Bob writes emails as part of his job."
            },
            "answer": "D",
            "explanation": "El texto indica: 'He sits in front of the computer all day and writes emails... writes more emails', por lo que redactar emails forma parte de su trabajo (opción D)."
        },
        {
            "id": "B1_READ_Q2",
            "number": 2,
            "type": "choice",
            "section": "Reading 2: Blueberries",
            "readingText": "Do you know how blueberries grow? They grow on bushes. Each blueberry is small and round. At first, the blueberries are green. The green berries are not ready to eat yet. They need a lot of sun and rain to help them become fat and sweet. When the berries turn blue, they are ripe and ready to be picked.",
            "question": "What color are blueberries when they are ready to be picked?",
            "options": {
                "A": "blue",
                "B": "feel",
                "C": "green",
                "D": "brown"
            },
            "answer": "A",
            "explanation": "El texto especifica: 'When the berries turn blue, they are ripe and ready to be picked' (opción A)."
        },
        {
            "id": "B1_READ_Q3",
            "number": 3,
            "type": "choice",
            "section": "Reading 3: Clarkson",
            "readingText": "Clarkson is a large town. It has more than fifty thousand people living there. It sits next to a large river, the Clark River. Every day, people take the ferry from North Clarkson to South Clarkson to go to work.",
            "question": "What is there near Clarkson?",
            "options": {
                "A": "Mountains",
                "B": "A river",
                "C": "The sea",
                "D": "A pond"
            },
            "answer": "B",
            "explanation": "El texto dice textualmente: 'It sits next to a large river, the Clark River' (opción B)."
        },
        {
            "id": "B1_READ_Q4",
            "number": 4,
            "type": "choice",
            "section": "Reading 4: Frisian language",
            "readingText": "Most people in the Netherlands speak Dutch. In Friesland, about 200,000 people speak Frisian which is the language with the most similarities to English. Some Dutch people speak dialects. The Saxon dialects spoken in the north-eastern part of the Netherlands are similar to Low German.",
            "question": "Frisian ...",
            "options": {
                "A": "is a dialect of English",
                "B": "is the most similar language to English",
                "C": "is a difficult language",
                "D": "is a language spoken in Saxony"
            },
            "answer": "B",
            "explanation": "El texto afirma: '...about 200,000 people speak Frisian which is the language with the most similarities to English' (opción B)."
        }
    ]
    return {
        "id": "repaso_b1_reading",
        "title": "Repaso Bloque 1: Comprensión Lectora (Reading)",
        "badge": "Reading B1",
        "description": "Textos breves de lectura con preguntas tipo test sobre información directa e inferencias.",
        "questions": questions
    }

def parse_repaso_embed_test1(pdf_path):
    reader = pypdf.PdfReader(pdf_path)
    full_text = '\n'.join([p.extract_text() or '' for p in reader.pages])
    clean = clean_text(full_text)
    
    last_page = reader.pages[-1].extract_text() or ''
    ans_pairs = re.findall(r'(\d+)\s*-\s*([A-Za-z]+)', last_page)
    answers = {int(num): ans.strip() for num, ans in ans_pairs}
    
    questions = []
    for i in range(1, 31):
        next_i = i + 1
        pat_curr = re.compile(r'(?:^|\n)\s*' + str(i) + r'\s*[\.-]+\s*', re.DOTALL)
        m_curr = pat_curr.search(clean)
        if not m_curr:
            continue
        start_pos = m_curr.end()
        if i < 30:
            pat_next = re.compile(r'(?:^|\n)\s*' + str(next_i) + r'\s*[\.-]+\s*', re.DOTALL)
            m_next = pat_next.search(clean, start_pos)
            end_pos = m_next.start() if m_next else len(clean)
        else:
            pat_end = re.compile(r'\nA good boy|\nRespuestas|\Z')
            m_end = pat_end.search(clean, start_pos)
            end_pos = m_end.start() if m_end else len(clean)
            
        chunk = clean[start_pos:end_pos].strip()
        consejo = ""
        c_match = re.search(r'Consejo:\s*(.*?)(?=\n\s*[A-Da-d]\)|\Z)', chunk, re.DOTALL)
        if not c_match:
            c_match = re.search(r'Consejo:\s*(.*)', chunk, re.DOTALL)
        if c_match:
            consejo = c_match.group(1).strip().replace('\n', ' ')
            
        m_a = re.search(r'\b[aA]\)', chunk)
        if m_a:
            prompt = chunk[:m_a.start()].strip().replace('\n', ' ')
            opts_part = chunk[m_a.start():]
            opt_a = re.search(r'[aA]\)\s*(.*?)(?=\s+[bBcC]\)|\n\s*Consejo|\Z)', opts_part)
            opt_b = re.search(r'[bB]\)\s*(.*?)(?=\s+[aAcCdD]\)|\n\s*Consejo|\Z)', opts_part)
            opt_c = re.search(r'[cC]\)\s*(.*?)(?=\s+[aAbBdD]\)|\n\s*Consejo|\Z)', opts_part)
            opt_d = re.search(r'[dD]\)\s*(.*?)(?=\s+[aAbBcC]\)|\n\s*Consejo|\Z)', opts_part)
            
            ans = answers.get(i, 'A').upper()
            expl = f"Repaso Bloque 1 - Pronombres. Opción correcta: {ans}."
            if consejo:
                expl += f" Consejo: {consejo}"
                
            questions.append({
                "id": f"B1_PRON_Q{i}",
                "number": i,
                "type": "choice",
                "section": "Pronombres Personales y Posesivos",
                "question": prompt,
                "options": {
                    "A": opt_a.group(1).strip() if opt_a else "",
                    "B": opt_b.group(1).strip() if opt_b else "",
                    "C": opt_c.group(1).strip() if opt_c else "",
                    "D": opt_d.group(1).strip() if opt_d else ""
                },
                "answer": ans,
                "explanation": expl
            })
            
    # 31-40: Cloze text
    cloze_text = "Billy always listens to (31) ______ mother. He always does what (32) ______ says. If (33) ______ mother says, \"Brush your teeth,\" Billy brushes (34) ______ teeth. If his mother says, \"Go to bed,\" Billy goes to bed. Billy is a very good boy. (35) ______ has a friend. (36) ______ name is Chloe. Billy always helps Chloe to do (37) ______ homework. Chloe always tells Billy, 'you are (38) ______ best friend'. Of course Billy is (39) ______ best friend. (40) ______ grew up together."
    cloze_prompts = {
        31: "Billy always listens to (31) ______ mother.",
        32: "He always does what (32) ______ says.",
        33: "If (33) ______ mother says, 'Brush your teeth,'...",
        34: "...Billy brushes (34) ______ teeth.",
        35: "Billy is a very good boy. (35) ______ has a friend.",
        36: "(36) ______ name is Chloe.",
        37: "Billy always helps Chloe to do (37) ______ homework.",
        38: "Chloe always tells Billy, 'you are (38) ______ best friend'.",
        39: "Of course Billy is (39) ______ best friend.",
        40: "(40) ______ grew up together."
    }
    
    for q_num in range(31, 41):
        ans_word = answers.get(q_num, "")
        questions.append({
            "id": f"B1_PRON_Q{q_num}",
            "number": q_num,
            "type": "completion",
            "section": "Texto Cloze - A good boy (Pronombres)",
            "readingText": cloze_text,
            "question": f"Escribe el pronombre correcto para el hueco ({q_num}):\n\"{cloze_prompts.get(q_num, '')}\"",
            "answer": ans_word,
            "explanation": f"Respuesta correcta: '{ans_word}'."
        })
        
    return {
        "id": "repaso_b1_test1_pronombres",
        "title": "Repaso Bloque 1: Test 1 - Pronombres",
        "badge": "Extra: Pron",
        "description": "Batería de 40 ejercicios de refuerzo: 30 preguntas tipo test de pronombres personales y posesivos + 10 ejercicios cloze contextuales.",
        "questions": questions
    }

def parse_repaso_embed_test2(pdf_path):
    reader = pypdf.PdfReader(pdf_path)
    full_text = '\n'.join([p.extract_text() or '' for p in reader.pages])
    clean = clean_text(full_text)
    
    last_page = reader.pages[-1].extract_text() or ''
    ans_pairs = re.findall(r'(\d+)\s*-\s*([A-Za-z]+)', last_page)
    answers = {int(num): ans.strip() for num, ans in ans_pairs}
    
    questions = []
    for i in range(1, 25):
        next_i = i + 1
        pat_curr = re.compile(r'(?:^|\n)\s*' + str(i) + r'\s*[\.-]+\s*', re.DOTALL)
        m_curr = pat_curr.search(clean)
        if not m_curr:
            continue
        start_pos = m_curr.end()
        if i < 24:
            pat_next = re.compile(r'(?:^|\n)\s*' + str(next_i) + r'\s*[\.-]+\s*', re.DOTALL)
            m_next = pat_next.search(clean, start_pos)
            end_pos = m_next.start() if m_next else len(clean)
        else:
            pat_end = re.compile(r'\nSimon|\n1-\n|\Z')
            m_end = pat_end.search(clean, start_pos)
            end_pos = m_end.start() if m_end else len(clean)
            
        chunk = clean[start_pos:end_pos].strip()
        m_a = re.search(r'\b[aA]\)', chunk)
        if m_a:
            prompt = chunk[:m_a.start()].strip().replace('\n', ' ')
            opts_part = chunk[m_a.start():]
            opt_a = re.search(r'[aA]\)\s*(.*?)(?=\s+[bBcC]\)|\n|\Z)', opts_part)
            opt_b = re.search(r'[bB]\)\s*(.*?)(?=\s+[aAcCdD]\)|\n|\Z)', opts_part)
            opt_c = re.search(r'[cC]\)\s*(.*?)(?=\s+[aAbBdD]\)|\n|\Z)', opts_part)
            opt_d = re.search(r'[dD]\)\s*(.*?)(?=\s+[aAbBcC]\)|\n|\Z)', opts_part)
            
            ans = answers.get(i, 'A').upper()
            questions.append({
                "id": f"B1_TOBE_Q{i}",
                "number": i,
                "type": "choice",
                "section": "Verbo To Be (Presente)",
                "question": prompt,
                "options": {
                    "A": opt_a.group(1).strip() if opt_a else "",
                    "B": opt_b.group(1).strip() if opt_b else "",
                    "C": opt_c.group(1).strip() if opt_c else "",
                    "D": opt_d.group(1).strip() if opt_d else ""
                },
                "answer": ans,
                "explanation": f"Verbo To Be. Opción correcta: {ans}."
            })
            
    # 25-30: Cloze text Simon and Susan
    simon_text = "Simon and Susan (25) _____ happily married, they have three children, Julia (26) _____ 5 years old, and the twin brothers (27) _____ 3. June (28) _____ a writer and Harry (29) _____ a lawyer. Their house (30) _____ big and comfortable, they bought it a year ago."
    simon_prompts = {
        25: "Simon and Susan (25) _____ happily married...",
        26: "...Julia (26) _____ 5 years old...",
        27: "...and the twin brothers (27) _____ 3.",
        28: "June (28) _____ a writer...",
        29: "...and Harry (29) _____ a lawyer.",
        30: "Their house (30) _____ big and comfortable..."
    }
    for q_num in range(25, 31):
        ans_word = answers.get(q_num, "")
        questions.append({
            "id": f"B1_TOBE_Q{q_num}",
            "number": q_num,
            "type": "completion",
            "section": "Texto Cloze - Simon & Susan (To Be)",
            "readingText": simon_text,
            "question": f"Escribe la forma correcta del verbo TO BE para el hueco ({q_num}):\n\"{simon_prompts.get(q_num, '')}\"",
            "answer": ans_word,
            "explanation": f"Respuesta correcta: '{ans_word}'."
        })
        
    return {
        "id": "repaso_b1_test2_tobe",
        "title": "Repaso Bloque 1: Test 2 - Verbo To Be (Presente)",
        "badge": "Extra: To Be",
        "description": "Batería de 30 ejercicios: 24 preguntas tipo test de conjugación de To Be + 6 huecos cloze de texto.",
        "questions": questions
    }

def parse_repaso_embed_test3(pdf_path):
    reader = pypdf.PdfReader(pdf_path)
    full_text = '\n'.join([p.extract_text() or '' for p in reader.pages])
    clean = clean_text(full_text)
    
    last_page = reader.pages[-1].extract_text() or ''
    ans_pairs = re.findall(r'(\d+)\s*-\s*([A-Za-z]+)', last_page)
    answers = {int(num): ans.strip() for num, ans in ans_pairs}
    
    monica_text = "Monica is an accountant. She (18) ______ at the Central Bank of Sydney. She always (19) ______ at 9 AM. She usually (20) ______ to work. Most of the times she (21) ______ a red blouse and a black skirt for work. Her husband (22) ______ the kids to school every day. She regularly (23) ______ to classical music on her way to work, but her children (24) ______ reggaeton; they (25) ______ that classical music is not as interesting and cool as reggaeton."
    
    questions = []
    for i in range(1, 26):
        next_i = i + 1
        pat_curr = re.compile(r'(?:^|\n)\s*' + str(i) + r'\s*[\.-]+\s*', re.DOTALL)
        m_curr = pat_curr.search(clean)
        if not m_curr:
            continue
        start_pos = m_curr.end()
        if i < 25:
            pat_next = re.compile(r'(?:^|\n)\s*' + str(next_i) + r'\s*[\.-]+\s*', re.DOTALL)
            m_next = pat_next.search(clean, start_pos)
            end_pos = m_next.start() if m_next else len(clean)
        else:
            pat_end = re.compile(r'\n1-\n|\Z')
            m_end = pat_end.search(clean, start_pos)
            end_pos = m_end.start() if m_end else len(clean)
            
        chunk = clean[start_pos:end_pos].strip()
        consejo = ""
        c_match = re.search(r'Consejo:\s*(.*?)(?=\n\s*[A-Da-d]\)|\Z)', chunk, re.DOTALL)
        if not c_match:
            c_match = re.search(r'Consejo:\s*(.*)', chunk, re.DOTALL)
        if c_match:
            consejo = c_match.group(1).strip().replace('\n', ' ')
            
        m_a = re.search(r'\b[aA]\)', chunk)
        if m_a:
            prompt_raw = chunk[:m_a.start()].strip().replace('\n', ' ')
            opts_part = chunk[m_a.start():]
            opt_a = re.search(r'[aA]\)\s*(.*?)(?=\s+[bBcC]\)|\n\s*Consejo|\Z)', opts_part)
            opt_b = re.search(r'[bB]\)\s*(.*?)(?=\s+[aAcCdD]\)|\n\s*Consejo|\Z)', opts_part)
            opt_c = re.search(r'[cC]\)\s*(.*?)(?=\s+[aAbBdD]\)|\n\s*Consejo|\Z)', opts_part)
            opt_d = re.search(r'[dD]\)\s*(.*?)(?=\s+[aAbBcC]\)|\n\s*Consejo|\Z)', opts_part)
            
            ans = answers.get(i, 'A').upper()
            expl = f"Present Simple. Opción correcta: {ans}."
            if consejo:
                expl += f" Consejo: {consejo}"
                
            is_cloze = i >= 18
            section_name = "Texto Cloze - Monica's day (Presente Simple)" if is_cloze else "Presente Simple (Resto de Verbos)"
            r_text = monica_text if is_cloze else None
            prompt = f"Completa el hueco ({i}) del texto sobre Monica:" if is_cloze else prompt_raw
            
            questions.append({
                "id": f"B1_PRES_Q{i}",
                "number": i,
                "type": "choice",
                "section": section_name,
                "readingText": r_text,
                "question": prompt,
                "options": {
                    "A": opt_a.group(1).strip() if opt_a else "",
                    "B": opt_b.group(1).strip() if opt_b else "",
                    "C": opt_c.group(1).strip() if opt_c else "",
                    "D": opt_d.group(1).strip() if opt_d else ""
                },
                "answer": ans,
                "explanation": expl
            })
            
    return {
        "id": "repaso_b1_test3_presente",
        "title": "Repaso Bloque 1: Test 3 - Presente Simple (Resto de Verbos)",
        "badge": "Extra: Pres.",
        "description": "Batería de 25 preguntas tipo test: oraciones de presente simple, terceras personas singular (-s/-es), auxiliares y texto cloze.",
        "questions": questions
    }

def parse_repaso_embed_test4(pdf_path):
    reader = pypdf.PdfReader(pdf_path)
    full_text = '\n'.join([p.extract_text() or '' for p in reader.pages])
    clean = clean_text(full_text)
    
    last_page = reader.pages[-1].extract_text() or ''
    ans_pairs = re.findall(r'(\d+)\s*-\s*([A-Za-z]+)', last_page)
    answers = {int(num): ans.strip() for num, ans in ans_pairs}
    
    questions = []
    for i in range(1, 26):
        next_i = i + 1
        pat_curr = re.compile(r'(?:^|\n)\s*' + str(i) + r'\s*[\.-]+\s*', re.DOTALL)
        m_curr = pat_curr.search(clean)
        if not m_curr:
            continue
        start_pos = m_curr.end()
        if i < 25:
            pat_next = re.compile(r'(?:^|\n)\s*' + str(next_i) + r'\s*[\.-]+\s*', re.DOTALL)
            m_next = pat_next.search(clean, start_pos)
            end_pos = m_next.start() if m_next else len(clean)
        else:
            pat_end = re.compile(r'\n1-\n|\Z')
            m_end = pat_end.search(clean, start_pos)
            end_pos = m_end.start() if m_end else len(clean)
            
        chunk = clean[start_pos:end_pos].strip()
        nota = ""
        n_match = re.search(r'Nota:\s*(.*?)(?=\n\s*[A-Da-d]\)|\Z)', chunk, re.DOTALL)
        if not n_match:
            n_match = re.search(r'Nota:\s*(.*)', chunk, re.DOTALL)
        if n_match:
            nota = n_match.group(1).strip().replace('\n', ' ')
            
        m_a = re.search(r'\b[aA]\)', chunk)
        if m_a:
            prompt = chunk[:m_a.start()].strip().replace('\n', ' ')
            opts_part = chunk[m_a.start():]
            opt_a = re.search(r'[aA]\)\s*(.*?)(?=\s+[bBcC]\)|\n\s*Nota|\Z)', opts_part)
            opt_b = re.search(r'[bB]\)\s*(.*?)(?=\s+[aAcCdD]\)|\n\s*Nota|\Z)', opts_part)
            opt_c = re.search(r'[cC]\)\s*(.*?)(?=\s+[aAbBdD]\)|\n\s*Nota|\Z)', opts_part)
            opt_d = re.search(r'[dD]\)\s*(.*?)(?=\s+[aAbBcC]\)|\n\s*Nota|\Z)', opts_part)
            
            ans = answers.get(i, 'A').upper()
            expl = f"Verbo To Have / Have Got / Have to. Opción correcta: {ans}."
            if nota:
                expl += f" Nota: {nota}"
                
            questions.append({
                "id": f"B1_HAVE_Q{i}",
                "number": i,
                "type": "choice",
                "section": "Verbo To Have / Have Got / Have To",
                "question": prompt,
                "options": {
                    "A": opt_a.group(1).strip() if opt_a else "",
                    "B": opt_b.group(1).strip() if opt_b else "",
                    "C": opt_c.group(1).strip() if opt_c else "",
                    "D": opt_d.group(1).strip() if opt_d else ""
                },
                "answer": ans,
                "explanation": expl
            })
            
    return {
        "id": "repaso_b1_test4_have",
        "title": "Repaso Bloque 1: Test 4 - To Have / Have Got / Have To",
        "badge": "Extra: Have",
        "description": "Batería de 25 preguntas tipo test sobre posesión, expresiones comunes con have y obligación con have to.",
        "questions": questions
    }

def parse_repaso_embed_test5(pdf_path):
    reader = pypdf.PdfReader(pdf_path)
    full_text = '\n'.join([p.extract_text() or '' for p in reader.pages])
    
    # Solutions
    sol1_idx = full_text.find('1. 1ER EJERCICIO SOLUCIONES.')
    sol1_text = full_text[sol1_idx:full_text.find('2. Elige el pronombre')]
    sol1_pairs = re.findall(r'(\d+)\s*([A-D])\b', sol1_text)
    sol1 = {int(num): ans for num, ans in sol1_pairs}
    
    sol2_idx = full_text.find('2. 2')
    sol2_text = full_text[sol2_idx:]
    sol2_pairs = re.findall(r'(\d+)\s*([A-D])\b', sol2_text)
    sol2 = {int(num): ans for num, ans in sol2_pairs}
    
    questions = []
    
    # Ejercicio 1: Plurales 1-30
    p1_text = full_text[:sol1_idx]
    chunks1 = re.split(r'\n\s*(\d+)-\.\s*', p1_text)
    for i in range(1, len(chunks1), 2):
        q_num = int(chunks1[i])
        chunk = chunks1[i+1].strip()
        m_opt = re.search(r'\bA\)', chunk)
        if m_opt:
            prompt = chunk[:m_opt.start()].strip().replace('\n', ' ')
            opts_part = chunk[m_opt.start():]
            opt_a = re.search(r'A\)\s*(.*?)(?=\s+[BCD]\)|\Z)', opts_part)
            opt_b = re.search(r'B\)\s*(.*?)(?=\s+[ACD]\)|\Z)', opts_part)
            opt_c = re.search(r'C\)\s*(.*?)(?=\s+[ABD]\)|\Z)', opts_part)
            opt_d = re.search(r'D\)\s*(.*?)(?=\s+[ABC]\)|\Z)', opts_part)
            ans = sol1.get(q_num, 'A')
            questions.append({
                "id": f"B1_PLUR_Q{q_num}",
                "number": q_num,
                "type": "choice",
                "section": "Plurales de Sustantivos (Refuerzo)",
                "question": f"Elige el plural correcto de: {prompt}",
                "options": {
                    "A": opt_a.group(1).strip() if opt_a else "",
                    "B": opt_b.group(1).strip() if opt_b else "",
                    "C": opt_c.group(1).strip() if opt_c else "",
                    "D": opt_d.group(1).strip() if opt_d else ""
                },
                "answer": ans,
                "explanation": f"Plurales en inglés. Solución correcta: opción {ans}."
            })
            
    # Ejercicio 2: Demostrativos 1-20
    p2_text = full_text[full_text.find('2. Elige el pronombre'):sol2_idx]
    for i in range(1, 21):
        next_i = i + 1
        pat_curr = re.compile(r'(?:^|\n)\s*' + str(i) + r'(?:\s+|_+)', re.DOTALL)
        m_curr = pat_curr.search(p2_text)
        if not m_curr:
            continue
        start_pos = m_curr.end()
        if i < 20:
            pat_next = re.compile(r'(?:^|\n)\s*' + str(next_i) + r'(?:\s+|_+)', re.DOTALL)
            m_next = pat_next.search(p2_text, start_pos)
            end_pos = m_next.start() if m_next else len(p2_text)
        else:
            end_pos = len(p2_text)
            
        chunk = p2_text[start_pos:end_pos].strip()
        m_opt = re.search(r'\bA\)', chunk)
        if m_opt:
            prompt_raw = chunk[:m_opt.start()].strip().replace('\n', ' ')
            full_match = m_curr.group(0).strip()
            unders = re.findall(r'_+', full_match)
            prompt = (unders[0] + ' ' + prompt_raw).strip() if unders else prompt_raw
            opts_part = chunk[m_opt.start():]
            opt_a = re.search(r'A\)\s*(.*?)(?=\s+[BCD]\)|\Z)', opts_part)
            opt_b = re.search(r'B\)\s*(.*?)(?=\s+[ACD]\)|\Z)', opts_part)
            opt_c = re.search(r'C\)\s*(.*?)(?=\s+[ABD]\)|\Z)', opts_part)
            opt_d = re.search(r'D\)\s*(.*?)(?=\s+[ABC]\)|\Z)', opts_part)
            ans = sol2.get(i, 'A')
            questions.append({
                "id": f"B1_DEMO_Q{i}",
                "number": 30 + i,
                "type": "choice",
                "section": "Pronombres Demostrativos (This / That / These / Those)",
                "question": prompt,
                "options": {
                    "A": opt_a.group(1).strip() if opt_a else "",
                    "B": opt_b.group(1).strip() if opt_b else "",
                    "C": opt_c.group(1).strip() if opt_c else "",
                    "D": opt_d.group(1).strip() if opt_d else ""
                },
                "answer": ans,
                "explanation": f"Demostrativos (cercanía vs lejanía / singular vs plural). Opción correcta: {ans}."
            })

    return {
        "id": "repaso_b1_plurales_demostrativos",
        "title": "Repaso Bloque 1: Plurales y Demostrativos Extra",
        "badge": "Extra: Plur.",
        "description": "Batería de 50 preguntas tipo test: 30 de plurales irregulares y 20 de demostrativos (this/that/these/those).",
        "questions": questions
    }

def parse_generic_pdf(pdf_path):
    filename = os.path.basename(pdf_path)
    raw_text = extract_text_from_pdf(pdf_path)
    text = clean_text(raw_text)
    answer_key = parse_answer_key(text)
    
    questions = []
    pattern = re.compile(r'(\d+)\.\s*(.*?)\s*a\)\s*(.*?)\s*b\)\s*(.*?)\s*c\)\s*(.*?)\s*d\)\s*(.*?)(?=\n\s*\d+\.|\n\s*ANSWER KEY|\Z)', re.DOTALL)
    q_section = text[:text.find("ANSWER KEY")] if "ANSWER KEY" in text else text
    
    title_match = re.search(r'(TEMA\s*\d+[^–\n]*|EJERCICIOS\s*\d+[^–\n]*)', text, re.IGNORECASE)
    title = title_match.group(1).strip() if title_match else filename.replace('.pdf', '')
    topic_id = re.sub(r'[^a-zA-Z0-9_]', '_', filename.lower().replace('.pdf', ''))

    for m in pattern.finditer(q_section):
        q_num = int(m.group(1))
        prompt = m.group(2).strip().replace('\n', ' ')
        opt_a = m.group(3).strip().replace('\n', ' ')
        opt_b = m.group(4).strip().replace('\n', ' ')
        opt_c = m.group(5).strip().replace('\n', ' ')
        opt_d = m.group(6).strip().replace('\n', ' ')
        questions.append({
            "id": f"{topic_id}_Q{q_num}",
            "number": q_num,
            "type": "choice",
            "section": title,
            "question": prompt,
            "options": {
                "A": opt_a,
                "B": opt_b,
                "C": opt_c,
                "D": opt_d
            },
            "answer": answer_key.get(q_num, "A"),
            "explanation": f"{title}. Opción correcta: {answer_key.get(q_num, '')}."
        })

    return {
        "id": topic_id,
        "title": title,
        "badge": title[:10],
        "description": f"Ejercicios extraídos automáticamente de {filename}",
        "questions": questions
    }

def main():
    print("=== INICIANDO EXTRACCIÓN DE EJERCICIOS ===")
    topics = []
    processed_paths = set()
    
    # Recorrer todos los PDFs recursivamente en PATRONATO
    all_pdfs = []
    for root, dirs, files in os.walk(PATRONATO_DIR):
        for f in files:
            if f.lower().endswith('.pdf'):
                all_pdfs.append((f, os.path.join(root, f)))
                
    all_pdfs.sort(key=lambda x: x[0].lower())
    
    # 1. TEMAS OFICIALES BLOQUE 1
    for f, full_path in all_pdfs:
        f_lower = f.lower()
        if full_path in processed_paths:
            continue
            
        if 'ejercicios tema 1.pdf' in f_lower or ('ejercicios' in f_lower and 'tema 1' in f_lower):
            print(f"-> Procesando Tema 1: {f}")
            topics.append(parse_tema_1(full_path))
            processed_paths.add(full_path)
        elif 'ejercicios tema 2.pdf' in f_lower or ('ejercicios' in f_lower and 'tema 2' in f_lower):
            print(f"-> Procesando Tema 2: {f}")
            topics.append(parse_tema_2(full_path))
            processed_paths.add(full_path)
        elif 'ejercicios 3- pronouns and possession - extra.pdf' in f_lower or ('extra' in f_lower and 'pronouns' in f_lower):
            print(f"-> Procesando Tema 3 Extra: {f}")
            topics.append(parse_tema_3_extra(full_path))
            processed_paths.add(full_path)
        elif 'ejercicios 3- pronouns and possession.pdf' in f_lower or ('ejercicios 3' in f_lower):
            print(f"-> Procesando Tema 3: {f}")
            topics.append(parse_tema_3(full_path))
            processed_paths.add(full_path)
        elif 'ejercicios 4 - plural nouns and demonstratives.pdf' in f_lower or ('ejercicios 4' in f_lower):
            print(f"-> Procesando Tema 4: {f}")
            topics.append(parse_tema_4(full_path))
            processed_paths.add(full_path)
        elif 'ejercicios 5' in f_lower or ('tema 5' in f_lower and 'ejercicios' in f_lower):
            print(f"-> Procesando Tema 5: {f}")
            topics.append(parse_tema_5(full_path))
            processed_paths.add(full_path)
            
    # 2. REPASO BLOQUE 1
    for f, full_path in all_pdfs:
        f_lower = f.lower()
        if full_path in processed_paths:
            continue
            
        if 'test bloque 1.pdf' in f_lower:
            print(f"-> Procesando Examen Simulacro Bloque 1: {f}")
            topics.append(parse_test_bloque_1(full_path))
            processed_paths.add(full_path)
        elif 'reading.pdf' in f_lower:
            print(f"-> Procesando Reading Repaso Bloque 1: {f}")
            topics.append(parse_repaso_reading(full_path))
            processed_paths.add(full_path)
        elif f_lower == 'embed.pdf':
            print(f"-> Procesando Repaso Test 1 (Pronombres): {f}")
            topics.append(parse_repaso_embed_test1(full_path))
            processed_paths.add(full_path)
        elif 'embed (1).pdf' in f_lower:
            print(f"-> Procesando Repaso Test 2 (To Be): {f}")
            topics.append(parse_repaso_embed_test2(full_path))
            processed_paths.add(full_path)
        elif 'embed (2).pdf' in f_lower:
            print(f"-> Procesando Repaso Test 3 (Presente Simple): {f}")
            topics.append(parse_repaso_embed_test3(full_path))
            processed_paths.add(full_path)
        elif 'embed (3).pdf' in f_lower:
            print(f"-> Procesando Repaso Test 4 (Have / Have Got): {f}")
            topics.append(parse_repaso_embed_test4(full_path))
            processed_paths.add(full_path)
        elif 'embed (4).pdf' in f_lower:
            print(f"-> Procesando Repaso Plurales y Demostrativos: {f}")
            topics.append(parse_repaso_embed_test5(full_path))
            processed_paths.add(full_path)

    # 3. OTROS PDFs GENÉRICOS DE EJERCICIOS
    for f, full_path in all_pdfs:
        if full_path in processed_paths:
            continue
        if ('ejercicio' in f.lower() or 'test' in f.lower() or 'examen' in f.lower()) and not f.lower().startswith('vocabulario') and not f.lower().startswith('tema '):
            print(f"-> Procesando nuevo PDF detectado: {f}")
            topic_data = parse_generic_pdf(full_path)
            if topic_data["questions"]:
                topics.append(topic_data)
                processed_paths.add(full_path)
                print(f"   [OK] Extraídas {len(topic_data['questions'])} preguntas de {f}")
            else:
                print(f"   [AVISO] No se pudieron extraer preguntas estructuradas de {f}")

    # Ordenar temas: Temas 1 a 5 primero, luego Simulacro B1, luego Repaso B1
    def get_sort_key(t):
        tid = t["id"].lower()
        if tid == "tema_1": return 10
        if tid == "tema_2": return 20
        if tid == "tema_3": return 30
        if tid == "tema_3_extra": return 35
        if tid == "tema_4": return 40
        if tid == "tema_5": return 50
        if tid == "bloque_1_examen": return 60
        if tid == "repaso_b1_reading": return 70
        if tid == "repaso_b1_test1_pronombres": return 80
        if tid == "repaso_b1_test2_tobe": return 90
        if tid == "repaso_b1_test3_presente": return 100
        if tid == "repaso_b1_test4_have": return 110
        if tid == "repaso_b1_plurales_demostrativos": return 120
        return 999

    topics.sort(key=get_sort_key)
    total_questions = sum(len(t["questions"]) for t in topics)
    print(f"\n==========================================")
    print(f"Total de temas procesados: {len(topics)}")
    print(f"Total de preguntas extraídas: {total_questions}")
    print(f"==========================================")
    for t in topics:
        print(f"  * [{t['badge']}] {t['title']}: {len(t['questions'])} preguntas")

    metadata = {
        "generatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "totalTopics": len(topics),
        "totalQuestions": total_questions
    }

    payload = {
        "metadata": metadata,
        "topics": topics
    }
    
    js_content = f"/**\n * Generado automáticamente por actualizar_ejercicios.py\n * Fecha: {metadata['generatedAt']}\n * Total preguntas: {total_questions}\n */\nwindow.TEST_DATA = {json.dumps(payload, ensure_ascii=False, indent=2)};\n"
    
    with open(JS_OUTPUT_FILE, "w", encoding="utf-8") as out:
        out.write(js_content)

    print(f"\n[ÉXITO] Archivo generado en: {JS_OUTPUT_FILE}")

if __name__ == "__main__":
    main()
