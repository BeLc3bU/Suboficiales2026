# -*- coding: utf-8 -*-
"""
Script de extracción y actualización automática de ejercicios de PATRONATO.
Escanea la carpeta de PATRONATO en busca de PDFs de ejercicios, extrae preguntas,
opciones, respuestas y textos de lectura, y genera el archivo js/questions-data.js.
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
    t = re.sub(r'PATRONATOENCASA\.COM[^\n]*', ' ', t, flags=re.IGNORECASE)
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
            "explanation": f"Tema 5: {section_name}. Opcion correcta: {answer_key.get(q_num, '')}."
        })
        
    return {
        "id": "tema_5",
        "title": "Tema 5: Adjectives, Adverbs and Word Formation",
        "badge": "Tema 5",
        "description": "Adjetivos y adverbios, adjetivos en -ed/-ing, formación de palabras (sufijos) y prefijos de significado.",
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
            "explanation": f"{title}. Opcion correcta: {answer_key.get(q_num, '')}."
        })

    return {
        "id": topic_id,
        "title": title,
        "badge": title[:10],
        "description": f"Ejercicios extraidos automaticamente de {filename}",
        "questions": questions
    }

def main():
    print("=== INICIANDO EXTRACCION DE EJERCICIOS ===")
    topics = []
    
    files = sorted(os.listdir(PATRONATO_DIR))
    processed_known = set()
    
    for f in files:
        f_lower = f.lower()
        full_path = os.path.join(PATRONATO_DIR, f)
        if not f.endswith('.pdf'):
            continue
            
        if 'ejercicios tema 1.pdf' in f_lower or ('ejercicios' in f_lower and 'tema 1' in f_lower):
            print(f"-> Procesando Tema 1: {f}")
            topics.append(parse_tema_1(full_path))
            processed_known.add(f)
        elif 'ejercicios tema 2.pdf' in f_lower or ('ejercicios' in f_lower and 'tema 2' in f_lower):
            print(f"-> Procesando Tema 2: {f}")
            topics.append(parse_tema_2(full_path))
            processed_known.add(f)
        elif 'ejercicios 3- pronouns and possession - extra.pdf' in f_lower or ('extra' in f_lower and 'pronouns' in f_lower):
            print(f"-> Procesando Tema 3 Extra: {f}")
            topics.append(parse_tema_3_extra(full_path))
            processed_known.add(f)
        elif 'ejercicios 3- pronouns and possession.pdf' in f_lower or ('ejercicios 3' in f_lower):
            print(f"-> Procesando Tema 3: {f}")
            topics.append(parse_tema_3(full_path))
            processed_known.add(f)
        elif 'ejercicios 4 - plural nouns and demonstratives.pdf' in f_lower or ('ejercicios 4' in f_lower):
            print(f"-> Procesando Tema 4: {f}")
            topics.append(parse_tema_4(full_path))
            processed_known.add(f)
        elif 'ejercicios 5' in f_lower or ('tema 5' in f_lower and 'ejercicios' in f_lower):
            print(f"-> Procesando Tema 5: {f}")
            topics.append(parse_tema_5(full_path))
            processed_known.add(f)

    for f in files:
        if f.endswith('.pdf') and ('ejercicio' in f.lower() or 'test' in f.lower() or 'examen' in f.lower()) and f not in processed_known:
            print(f"-> Procesando nuevo PDF detectado: {f}")
            topic_data = parse_generic_pdf(os.path.join(PATRONATO_DIR, f))
            if topic_data["questions"]:
                topics.append(topic_data)
                print(f"   [OK] Extraidas {len(topic_data['questions'])} preguntas de {f}")
            else:
                print(f"   [AVISO] No se pudieron extraer preguntas estructuradas de {f}")

    # Dynamic sorting
    def get_sort_key(t):
        tid = t["id"].lower()
        m = re.search(r'tema_?(\d+)', tid)
        if m:
            n = int(m.group(1))
            if 'extra' in tid:
                return n * 10 + 1
            return n * 10
        return 999

    topics.sort(key=get_sort_key)
    total_questions = sum(len(t["questions"]) for t in topics)
    print(f"\nTotal de temas procesados: {len(topics)}")
    print(f"Total de preguntas extraidas: {total_questions}")
    for t in topics:
        print(f"  * {t['title']}: {len(t['questions'])} preguntas")

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

    print(f"\n[EXITO] Archivo generado en: {JS_OUTPUT_FILE}")

if __name__ == "__main__":
    main()
