# -*- coding: utf-8 -*-
"""
Constructor del dataset para el Generador Procedural de Simulacro Oficial.
Extrae los textos de lectura y clozes existentes en questions-data.js y los
complementa con unidades pedagógicas curadas según el temario de Patronato Militar (Temas 1 a 13).
Genera el archivo js/exam-data.js (window.EXAM_DATA).
"""

import os
import json
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JS_DIR = os.path.join(BASE_DIR, "js")
QUESTIONS_DATA_PATH = os.path.join(JS_DIR, "questions-data.js")
OUTPUT_EXAM_DATA_PATH = os.path.join(JS_DIR, "exam-data.js")

def load_existing_questions():
    """Lee questions-data.js y extrae el JSON."""
    if not os.path.exists(QUESTIONS_DATA_PATH):
        return []
    with open(QUESTIONS_DATA_PATH, "r", encoding="utf-8") as f:
        content = f.read()
    match = re.search(r'window\.TEST_DATA\s*=\s*(\{.*?\});?\s*$', content, re.DOTALL)
    if not match:
        return []
    data = json.loads(match.group(1))
    return data.get("topics", [])

def extract_units_from_topics(topics):
    """Extrae bloques de lectura y clozes de opción múltiple existentes."""
    reading_units = []
    existing_cloze_candidates = {}

    for t in topics:
        tid = t.get("id", "")
        texts_map = {}
        for q in t.get("questions", []):
            rt = q.get("readingText")
            if rt:
                texts_map.setdefault(rt.strip(), []).append(q)

        for rt, qs in texts_map.items():
            sec = qs[0].get("section", "")
            is_cloze = (
                "use of english" in sec.lower() or 
                "completa el hueco" in qs[0].get("question", "").lower() or
                "cloze" in sec.lower() or
                bool(re.search(r'\(\d+\)\s*_{2,}', rt))
            )
            
            clean_qs = []
            for q in qs:
                opts = q.get("options", {})
                ans = q.get("answer", "")
                # Solo aceptar preguntas de opción múltiple estándar (A, B, C, D)
                if len(opts) == 4 and ans in ["A", "B", "C", "D"]:
                    clean_qs.append({
                        "id": q.get("id", ""),
                        "question": q.get("question", ""),
                        "options": opts,
                        "answer": ans,
                        "explanation": q.get("explanation", "")
                    })

            if is_cloze:
                # Solo guardamos como cloze unit directo si tiene exactamente 10 preguntas válidas
                if len(clean_qs) == 10:
                    cloze_id = f"cloze_{tid}_{len(existing_cloze_candidates) + 1}"
                    title = sec.replace("Use of English - ", "").strip()
                    if not title or title.startswith("Texto"):
                        first_line = rt.split("\n")[0].strip()
                        title = first_line[:40]
                    existing_cloze_candidates[cloze_id] = {
                        "id": cloze_id,
                        "title": title,
                        "text": rt,
                        "questions": clean_qs
                    }
            else:
                # Unidad de comprensión lectora (solo si tiene preguntas válidas de opción múltiple)
                if len(clean_qs) > 0:
                    r_id = f"reading_{tid}_{len(reading_units) + 1}"
                    first_line = rt.split("\n")[0].strip()
                    title = sec if sec else first_line[:40]
                    reading_units.append({
                        "id": r_id,
                        "title": title,
                        "text": rt,
                        "questions": clean_qs
                    })

    return reading_units, list(existing_cloze_candidates.values())

def get_curated_reading_units():
    """Unidades adicionales de comprensión lectora basadas estrictamente en el temario militar y general de Patronato."""
    return [
        {
            "id": "reading_curated_01",
            "title": "Military Communications Protocol",
            "text": "All military radio operators must use standardized phonetic alphabet and concise phraseology during transmissions. Messages must be clear, concise, and acknowledged immediately by the receiving station. In situations of heavy interference, operators are required to repeat grid coordinates twice and verify reception before closing the frequency.",
            "questions": [
                {
                    "id": "RC_CUR_01_Q1",
                    "question": "According to the protocol, what should radio operators do when there is heavy interference?",
                    "options": {
                        "A": "Change the frequency immediately without informing",
                        "B": "Repeat grid coordinates two times and confirm reception",
                        "C": "Wait for thirty minutes before speaking again",
                        "D": "Speak louder using civilian vocabulary"
                    },
                    "answer": "B",
                    "explanation": "El texto indica expresamente: 'operators are required to repeat grid coordinates twice and verify reception'."
                }
            ]
        },
        {
            "id": "reading_curated_02",
            "title": "Base Security and Identification Badges",
            "text": "Security personnel at the main gate inspect all vehicle permits and military ID cards 24 hours a day. Visitors without a permanent access card must leave their identification at the security office and receive a temporary visitor badge. Escorts are mandatory for visitors entering restricted technical zones.",
            "questions": [
                {
                    "id": "RC_CUR_02_Q1",
                    "question": "What is required for visitors entering restricted technical zones?",
                    "options": {
                        "A": "They must have an official escort with them",
                        "B": "They can walk alone if they have their passport",
                        "C": "They must purchase an entrance ticket",
                        "D": "They can only visit after 20:00"
                    },
                    "answer": "A",
                    "explanation": "El texto establece: 'Escorts are mandatory for visitors entering restricted technical zones'."
                }
            ]
        },
        {
            "id": "reading_curated_03",
            "title": "Mountain Search and Rescue Training",
            "text": "The military mountain rescue brigade conducted an alpine exercise last weekend. Temperatures dropped below minus five degrees Celsius, and visibility was severely reduced by heavy fog. The search team successfully located two lost civilian hikers using thermal cameras and brought them safely to the evacuation shelter.",
            "questions": [
                {
                    "id": "RC_CUR_03_Q1",
                    "question": "How did the rescue team find the lost hikers?",
                    "options": {
                        "A": "By following their mobile phone signals",
                        "B": "With the assistance of thermal cameras",
                        "C": "By asking local residents in the village",
                        "D": "By flying an airplane over the valley"
                    },
                    "answer": "B",
                    "explanation": "El texto indica que el equipo localizó a los excursionistas 'using thermal cameras'."
                }
            ]
        },
        {
            "id": "reading_curated_04",
            "title": "Airfield Maintenance Routine",
            "text": "Runway inspection teams check the runway tarmac for foreign objects (FOD) three times every day: before morning flight operations, at noon, and after sunset. Any metal debris, stones, or wildlife sightings must be reported to the air traffic control tower immediately to prevent engine damage.",
            "questions": [
                {
                    "id": "RC_CUR_04_Q1",
                    "question": "Why is it essential to report debris on the runway immediately?",
                    "options": {
                        "A": "To keep the tarmac completely clean for visitors",
                        "B": "To prevent damage to aircraft engines",
                        "C": "To allow civilian cars to drive safely",
                        "D": "To prepare the runway for night parking"
                    },
                    "answer": "B",
                    "explanation": "El texto señala: 'must be reported to the air traffic control tower immediately to prevent engine damage'."
                }
            ]
        },
        {
            "id": "reading_curated_05",
            "title": "Field Navigation and Orienteering",
            "text": "Cadets on field navigation training must rely strictly on topographical maps and magnetic compasses. Electronic GPS receivers are deactivated during the daytime march to ensure that officers master traditional cartography and contour line interpretation under demanding weather conditions.",
            "questions": [
                {
                    "id": "RC_CUR_05_Q1",
                    "question": "What is prohibited or deactivated for cadets during the daytime march?",
                    "options": {
                        "A": "Paper topographical maps",
                        "B": "Magnetic compasses",
                        "C": "Electronic GPS devices",
                        "D": "Protective military boots"
                    },
                    "answer": "C",
                    "explanation": "El texto dice textualmente: 'Electronic GPS receivers are deactivated during the daytime march'."
                }
            ]
        },
        {
            "id": "reading_curated_06",
            "title": "Naval Patrol and Coastal Surveillance",
            "text": "The offshore patrol vessel departed the naval base at 06:00 to conduct maritime sovereignty patrols along the southern coast. During the patrol, the crew monitored commercial fishing vessels and assisted a private sailboat experiencing mechanical engine failure in rough sea conditions.",
            "questions": [
                {
                    "id": "RC_CUR_06_Q1",
                    "question": "What assistance did the patrol vessel provide during its mission?",
                    "options": {
                        "A": "It delivered fresh fuel to a commercial cargo ship",
                        "B": "It helped a sailboat with mechanical problems in rough seas",
                        "C": "It inspected all civilian ports along the coast",
                        "D": "It trained new submarine officers"
                    },
                    "answer": "B",
                    "explanation": "El texto explica: 'assisted a private sailboat experiencing mechanical engine failure in rough sea conditions'."
                }
            ]
        },
        {
            "id": "reading_curated_07",
            "title": "Physical Fitness Standards",
            "text": "The annual military physical fitness evaluation comprises three mandatory events: a 1,000-metre timed run, maximum push-ups in two minutes, and a 50-metre swimming test. Candidates must achieve at least the minimum passing score in every single event; failing one event results in an overall failure of the test.",
            "questions": [
                {
                    "id": "RC_CUR_07_Q1",
                    "question": "What happens if a candidate fails only one of the three physical events?",
                    "options": {
                        "A": "They can repeat the failed event the next morning",
                        "B": "Their score is averaged with the other two events",
                        "C": "They fail the entire physical evaluation overall",
                        "D": "They receive a passing grade with a penalty"
                    },
                    "answer": "C",
                    "explanation": "El texto indica claramente: 'failing one event results in an overall failure of the test'."
                }
            ]
        },
        {
            "id": "reading_curated_08",
            "title": "First Aid in Field Exercises",
            "text": "During tactical exercises, each soldier carries an Individual First Aid Kit (IFAK) containing a tourniquet, pressure bandages, and sterile gauze. In case of severe limb bleeding, the immediate application of the tourniquet high and tight on the extremity is the primary measure to prevent life-threatening shock.",
            "questions": [
                {
                    "id": "RC_CUR_08_Q1",
                    "question": "What is the primary action for severe limb bleeding according to the text?",
                    "options": {
                        "A": "Applying a tourniquet high and tight on the affected limb",
                        "B": "Washing the wound with cold water",
                        "C": "Giving hot drinks to the wounded soldier",
                        "D": "Waiting for a medical doctor before touching the limb"
                    },
                    "answer": "A",
                    "explanation": "El texto afirma: 'immediate application of the tourniquet high and tight on the extremity is the primary measure'."
                }
            ]
        },
        {
            "id": "reading_curated_09",
            "title": "Drone Surveillance in Border Monitoring",
            "text": "Modern border surveillance units operate lightweight unmanned aerial vehicles (UAVs) equipped with electro-optical and infrared sensors. These drones can fly continuously for up to six hours and transmit live video feeds directly to the command post, significantly improving situational awareness in inaccessible mountainous terrain.",
            "questions": [
                {
                    "id": "RC_CUR_09_Q1",
                    "question": "How long can these surveillance drones fly continuously?",
                    "options": {
                        "A": "Up to twenty-four hours",
                        "B": "Up to six hours",
                        "C": "Only forty-five minutes",
                        "D": "Two entire days"
                    },
                    "answer": "B",
                    "explanation": "El texto menciona: 'These drones can fly continuously for up to six hours'."
                }
            ]
        },
        {
            "id": "reading_curated_10",
            "title": "Logistics and Equipment Maintenance",
            "text": "Preventive maintenance on tactical transport trucks is scheduled every 5,000 kilometres. Mechanics check engine oil levels, tyre pressure, brake fluid, and the winch system. Regular preventative service has reduced vehicle breakdown rates during deployment by over forty percent.",
            "questions": [
                {
                    "id": "RC_CUR_10_Q1",
                    "question": "What effect has regular preventive maintenance had on military transport trucks?",
                    "options": {
                        "A": "It has doubled fuel consumption during exercises",
                        "B": "It has decreased deployment breakdown rates by more than 40%",
                        "C": "It has replaced mechanics with computerized robots",
                        "D": "It has increased tyre wear by twenty percent"
                    },
                    "answer": "B",
                    "explanation": "El texto indica: 'reduced vehicle breakdown rates during deployment by over forty percent'."
                }
            ]
        }
    ]

def get_curated_cloze_units():
    """Textos con huecos curados de exactamente 10 preguntas cada uno (Temas 1 a 13 de Patronato)."""
    return [
        {
            "id": "cloze_curated_01",
            "title": "Military Base Guard Duty",
            "text": "Corporal Martinez (31) _____ on guard duty at the main military barracks tonight. He (32) _____ his post at 20:00 every evening. At the moment, two soldiers (33) _____ the perimeter fence because it is raining heavily. The sergeant asked (34) _____ to check the south gate. In this area, (35) _____ are several surveillance cameras connected to the control room. (36) _____ the severe weather conditions, the patrol completed their round on time. The guard house is (37) _____ comfortable than the observation tower. Corporal Martinez always arrives (38) _____ the guard post ten minutes early. If a visitor arrives, the guard (39) _____ inspect their identity documents. Yesterday, the night patrol (40) _____ a suspicious vehicle near the fuel depot.",
            "questions": [
                {
                    "id": "CC01_Q31",
                    "question": "Completa el hueco (31):",
                    "options": {"A": "is", "B": "are", "C": "be", "D": "am"},
                    "answer": "A",
                    "explanation": "Tercera persona singular con verbo To Be: 'Corporal Martinez is on guard duty'."
                },
                {
                    "id": "CC01_Q32",
                    "question": "Completa el hueco (32):",
                    "options": {"A": "starts", "B": "start", "C": "starting", "D": "is start"},
                    "answer": "A",
                    "explanation": "Presente Simple para rutina habitual con he: 'He starts'."
                },
                {
                    "id": "CC01_Q33",
                    "question": "Completa el hueco (33):",
                    "options": {"A": "are inspecting", "B": "inspects", "C": "inspected", "D": "is inspecting"},
                    "answer": "A",
                    "explanation": "Acción en progreso ('At the moment') con sujeto plural 'two soldiers': 'are inspecting'."
                },
                {
                    "id": "CC01_Q34",
                    "question": "Completa el hueco (34):",
                    "options": {"A": "them", "B": "they", "C": "their", "D": "theirs"},
                    "answer": "A",
                    "explanation": "Pronombre objeto tras el verbo transitivo asked: 'asked them to check'."
                },
                {
                    "id": "CC01_Q35",
                    "question": "Completa el hueco (35):",
                    "options": {"A": "there", "B": "their", "C": "they're", "D": "where"},
                    "answer": "A",
                    "explanation": "Estructura 'There are' (hay en plural): 'there are several surveillance cameras'."
                },
                {
                    "id": "CC01_Q36",
                    "question": "Completa el hueco (36):",
                    "options": {"A": "Despite", "B": "Although", "C": "However", "D": "Even though"},
                    "answer": "A",
                    "explanation": "Preposición de contraste seguida de sintagma nominal sin verbo: 'Despite the severe weather conditions'."
                },
                {
                    "id": "CC01_Q37",
                    "question": "Completa el hueco (37):",
                    "options": {"A": "more", "B": "most", "C": "much", "D": "as"},
                    "answer": "A",
                    "explanation": "Comparativo de superioridad con adjetivo largo comfortable + than: 'more comfortable than'."
                },
                {
                    "id": "CC01_Q38",
                    "question": "Completa el hueco (38):",
                    "options": {"A": "at", "B": "on", "C": "in", "D": "to"},
                    "answer": "A",
                    "explanation": "Preposición para lugares específicos o puntos funcionales: 'arrives at the guard post'."
                },
                {
                    "id": "CC01_Q39",
                    "question": "Completa el hueco (39):",
                    "options": {"A": "must", "B": "ought", "C": "have", "D": "is to"},
                    "answer": "A",
                    "explanation": "Modal de obligación seguido de infinitivo sin to: 'must inspect'."
                },
                {
                    "id": "CC01_Q40",
                    "question": "Completa el hueco (40):",
                    "options": {"A": "saw", "B": "see", "C": "seen", "D": "was seen"},
                    "answer": "A",
                    "explanation": "Pasado simple regular/irregular con indicador temporal 'Yesterday': 'saw a suspicious vehicle'."
                }
            ]
        },
        {
            "id": "cloze_curated_02",
            "title": "Tactical Vehicle Maintenance and Transport",
            "text": "Every morning, military drivers check (31) _____ transport trucks before driving out of the base. Private Evans (32) _____ responsible for maintenance in Section B. (33) _____ are ten armored vehicles parked in the main hangar. The mechanics (34) _____ repairing an engine right now. Last Tuesday, the convoy (35) _____ twenty kilometers through difficult terrain. The new transport vehicle is (36) _____ than the older model. Drivers must wear safety helmets (37) _____ duty. (38) _____ the heavy rainfall yesterday, the trucks arrived at the meeting point on time. Captain Rogers gave (39) _____ new instructions for the convoy. Tomorrow morning, the entire platoon (40) _____ travel to the mountain training range.",
            "questions": [
                {
                    "id": "CC02_Q31",
                    "question": "Completa el hueco (31):",
                    "options": {"A": "their", "B": "theirs", "C": "them", "D": "they"},
                    "answer": "A",
                    "explanation": "Adjetivo posesivo delante del sustantivo: 'check their transport trucks'."
                },
                {
                    "id": "CC02_Q32",
                    "question": "Completa el hueco (32):",
                    "options": {"A": "is", "B": "are", "C": "have", "D": "has"},
                    "answer": "A",
                    "explanation": "Expresión 'to be responsible for' en tercera persona singular: 'Private Evans is responsible'."
                },
                {
                    "id": "CC02_Q33",
                    "question": "Completa el hueco (33):",
                    "options": {"A": "There", "B": "Their", "C": "They", "D": "It"},
                    "answer": "A",
                    "explanation": "Estructura existencial de plural 'There are ten armored vehicles'."
                },
                {
                    "id": "CC02_Q34",
                    "question": "Completa el hueco (34):",
                    "options": {"A": "are", "B": "is", "C": "were", "D": "have"},
                    "answer": "A",
                    "explanation": "Present continuous con marcador temporal 'right now': 'The mechanics are repairing'."
                },
                {
                    "id": "CC02_Q35",
                    "question": "Completa el hueco (35):",
                    "options": {"A": "drove", "B": "drive", "C": "driven", "D": "was drive"},
                    "answer": "A",
                    "explanation": "Pasado simple con el marcador 'Last Tuesday': 'the convoy drove'."
                },
                {
                    "id": "CC02_Q36",
                    "question": "Completa el hueco (36):",
                    "options": {"A": "faster", "B": "fastest", "C": "more fast", "D": "fast"},
                    "answer": "A",
                    "explanation": "Comparativo regular de adjetivo corto fast + er + than: 'faster than'."
                },
                {
                    "id": "CC02_Q37",
                    "question": "Completa el hueco (37):",
                    "options": {"A": "on", "B": "in", "C": "at", "D": "by"},
                    "answer": "A",
                    "explanation": "Expresión fija con la preposición on: 'on duty' (de servicio)."
                },
                {
                    "id": "CC02_Q38",
                    "question": "Completa el hueco (38):",
                    "options": {"A": "In spite of", "B": "Although", "C": "However", "D": "Whereas"},
                    "answer": "A",
                    "explanation": "Conector de contraste con preposición seguido de sintagma nominal: 'In spite of the heavy rainfall'."
                },
                {
                    "id": "CC02_Q39",
                    "question": "Completa el hueco (39):",
                    "options": {"A": "him", "B": "he", "C": "his", "D": "himself"},
                    "answer": "A",
                    "explanation": "Pronombre objeto tras el verbo gave: 'gave him new instructions'."
                },
                {
                    "id": "CC02_Q40",
                    "question": "Completa el hueco (40):",
                    "options": {"A": "will", "B": "is", "C": "did", "D": "was"},
                    "answer": "A",
                    "explanation": "Futuro simple con indicador temporal 'Tomorrow morning': 'will travel'."
                }
            ]
        },
        {
            "id": "cloze_curated_03",
            "title": "Air Squadron Flight Operations",
            "text": "The military air squadron (31) _____ based near the northern coast. Flight Lieutenant Davis (32) _____ helicopters for seven years. He always (33) _____ the weather forecast before take-off. Right now, ground crew technicians (34) _____ fuel into the aircraft tanks. (35) _____ is a modern radar system installed at the control tower. The new reconnaissance drone flies (36) _____ than conventional transport planes. Pilots must report (37) _____ the briefing room at 07:30 every morning. (38) _____ the wind was very strong, the rescue helicopter landed safely on the flight deck. The squadron leader congratulated (39) _____ on their outstanding mission performance. Next week, the pilots (40) _____ participate in an international joint air exercise.",
            "questions": [
                {
                    "id": "CC03_Q31",
                    "question": "Completa el hueco (31):",
                    "options": {"A": "is", "B": "are", "C": "be", "D": "were"},
                    "answer": "A",
                    "explanation": "Sujeto singular 'squadron': 'The military air squadron is based'."
                },
                {
                    "id": "CC03_Q32",
                    "question": "Completa el hueco (32):",
                    "options": {"A": "has flown", "B": "fly", "C": "is fly", "D": "was fly"},
                    "answer": "A",
                    "explanation": "Present perfect con 'for seven years' indicando acción que comenzó en el pasado y continúa: 'has flown'."
                },
                {
                    "id": "CC03_Q33",
                    "question": "Completa el hueco (33):",
                    "options": {"A": "checks", "B": "check", "C": "checking", "D": "is checked"},
                    "answer": "A",
                    "explanation": "Presente simple en 3ª persona singular con adverbio de frecuencia 'always': 'always checks'."
                },
                {
                    "id": "CC03_Q34",
                    "question": "Completa el hueco (34):",
                    "options": {"A": "are pumping", "B": "pumps", "C": "pumped", "D": "is pumping"},
                    "answer": "A",
                    "explanation": "Present continuous con sujeto plural 'ground crew technicians' y marcador 'Right now': 'are pumping'."
                },
                {
                    "id": "CC03_Q35",
                    "question": "Completa el hueco (35):",
                    "options": {"A": "There", "B": "Their", "C": "They", "D": "It"},
                    "answer": "A",
                    "explanation": "Estructura existencial de singular 'There is a modern radar system'."
                },
                {
                    "id": "CC03_Q36",
                    "question": "Completa el hueco (36):",
                    "options": {"A": "higher", "B": "highest", "C": "more high", "D": "as high"},
                    "answer": "A",
                    "explanation": "Comparativo regular de superioridad de high: 'higher than'."
                },
                {
                    "id": "CC03_Q37",
                    "question": "Completa el hueco (37):",
                    "options": {"A": "to", "B": "in", "C": "at", "D": "on"},
                    "answer": "A",
                    "explanation": "Colocación verbal 'report to' (presentarse ante/en): 'report to the briefing room'."
                },
                {
                    "id": "CC03_Q38",
                    "question": "Completa el hueco (38):",
                    "options": {"A": "Although", "B": "Despite", "C": "In spite of", "D": "However"},
                    "answer": "A",
                    "explanation": "Conjunción de contraste seguida de cláusula con sujeto y verbo ('the wind was'): 'Although the wind was very strong'."
                },
                {
                    "id": "CC03_Q39",
                    "question": "Completa el hueco (39):",
                    "options": {"A": "them", "B": "their", "C": "they", "D": "theirs"},
                    "answer": "A",
                    "explanation": "Pronombre objeto tras el verbo congratulated: 'congratulated them'."
                },
                {
                    "id": "CC03_Q40",
                    "question": "Completa el hueco (40):",
                    "options": {"A": "will", "B": "did", "C": "were", "D": "are"},
                    "answer": "A",
                    "explanation": "Futuro simple con indicador temporal 'Next week': 'will participate'."
                }
            ]
        },
        {
            "id": "cloze_curated_04",
            "title": "Field Navigation and Map Reading",
            "text": "During orientation training, the cadet platoon (31) _____ in the forest area. Sergeant Miller (32) _____ them how to read topographic contour lines. At this moment, the students (33) _____ their compasses to find magnetic north. (34) _____ map belongs to Cadet Walker, but the compass is (35) _____. (36) _____ are many hidden obstacles along the mountain trail. The northern route is much (37) _____ than the valley road. The team must assemble (38) _____ checkpoint Charlie before 14:00. (39) _____ it was raining heavily, the cadets reached the summit without delays. The instructor told (40) _____ to rest for fifteen minutes before continuing the march.",
            "questions": [
                {
                    "id": "CC04_Q31",
                    "question": "Completa el hueco (31):",
                    "options": {"A": "is", "B": "are", "C": "be", "D": "were"},
                    "answer": "A",
                    "explanation": "Sujeto colectivo singular 'platoon': 'the cadet platoon is in the forest'."
                },
                {
                    "id": "CC04_Q32",
                    "question": "Completa el hueco (32):",
                    "options": {"A": "teaches", "B": "teach", "C": "teaching", "D": "is teach"},
                    "answer": "A",
                    "explanation": "Presente simple en tercera persona singular con terminación -es: 'teaches them'."
                },
                {
                    "id": "CC04_Q33",
                    "question": "Completa el hueco (33):",
                    "options": {"A": "are using", "B": "uses", "C": "used", "D": "is using"},
                    "answer": "A",
                    "explanation": "Present continuous con sujeto plural 'the students' y marcador 'At this moment': 'are using'."
                },
                {
                    "id": "CC04_Q34",
                    "question": "Completa el hueco (34):",
                    "options": {"A": "This", "B": "These", "C": "Those", "D": "There"},
                    "answer": "A",
                    "explanation": "Demostrativo singular para objeto cercano / en mano: 'This map belongs'."
                },
                {
                    "id": "CC04_Q35",
                    "question": "Completa el hueco (35):",
                    "options": {"A": "mine", "B": "my", "C": "me", "D": "I"},
                    "answer": "A",
                    "explanation": "Pronombre posesivo final sin sustantivo posterior: 'the compass is mine'."
                },
                {
                    "id": "CC04_Q36",
                    "question": "Completa el hueco (36):",
                    "options": {"A": "There", "B": "Their", "C": "They", "D": "Here"},
                    "answer": "A",
                    "explanation": "Estructura existencial de plural 'There are many hidden obstacles'."
                },
                {
                    "id": "CC04_Q37",
                    "question": "Completa el hueco (37):",
                    "options": {"A": "steeper", "B": "steepest", "C": "more steep", "D": "as steep"},
                    "answer": "A",
                    "explanation": "Comparativo regular de adjetivo corto steep + er: 'much steeper than'."
                },
                {
                    "id": "CC04_Q38",
                    "question": "Completa el hueco (38):",
                    "options": {"A": "at", "B": "on", "C": "in", "D": "to"},
                    "answer": "A",
                    "explanation": "Preposición para puntos geográficos y de control específicos: 'assemble at checkpoint Charlie'."
                },
                {
                    "id": "CC04_Q39",
                    "question": "Completa el hueco (39):",
                    "options": {"A": "Even though", "B": "Despite", "C": "In spite of", "D": "However"},
                    "answer": "A",
                    "explanation": "Conector de contraste subordinante con sujeto y verbo ('it was raining'): 'Even though it was raining'."
                },
                {
                    "id": "CC04_Q40",
                    "question": "Completa el hueco (40):",
                    "options": {"A": "them", "B": "they", "C": "their", "D": "theirs"},
                    "answer": "A",
                    "explanation": "Pronombre objeto tras verbo 'told': 'told them to rest'."
                }
            ]
        },
        {
            "id": "cloze_curated_05",
            "title": "International Peacekeeping Mission Logistics",
            "text": "The peacekeeping detachment (31) _____ situated in the eastern district. Captain Torres (32) _____ weekly logistics reports to brigade headquarters. Currently, humanitarian personnel (33) _____ medical supplies to local clinics. (34) _____ duties are clearly defined in the mission mandate. In the regional warehouse, (35) _____ are enough food reserves for three months. The humanitarian corridor is (36) _____ secure now than it was last month. Convoy escorts operate (37) _____ dawn to dusk. (38) _____ occasional road blocks, humanitarian deliveries proceeded without incident. The United Nations coordinator thanked (39) _____ for their cooperation. Next Friday, a replacement company (40) _____ arrive at the sector.",
            "questions": [
                {
                    "id": "CC05_Q31",
                    "question": "Completa el hueco (31):",
                    "options": {"A": "is", "B": "are", "C": "be", "D": "was"},
                    "answer": "A",
                    "explanation": "Sujeto singular 'detachment': 'is situated'."
                },
                {
                    "id": "CC05_Q32",
                    "question": "Completa el hueco (32):",
                    "options": {"A": "sends", "B": "send", "C": "sending", "D": "is send"},
                    "answer": "A",
                    "explanation": "Presente simple para hábito regular ('weekly'): 'Captain Torres sends'."
                },
                {
                    "id": "CC05_Q33",
                    "question": "Completa el hueco (33):",
                    "options": {"A": "are delivering", "B": "delivers", "C": "delivered", "D": "is delivering"},
                    "answer": "A",
                    "explanation": "Present continuous con sujeto plural 'personnel' y marcador 'Currently': 'are delivering'."
                },
                {
                    "id": "CC05_Q34",
                    "question": "Completa el hueco (34):",
                    "options": {"A": "Their", "B": "Theirs", "C": "Them", "D": "They"},
                    "answer": "A",
                    "explanation": "Adjetivo posesivo plural: 'Their duties are clearly defined'."
                },
                {
                    "id": "CC05_Q35",
                    "question": "Completa el hueco (35):",
                    "options": {"A": "there", "B": "their", "C": "they're", "D": "it"},
                    "answer": "A",
                    "explanation": "Estructura existencial 'there are enough food reserves'."
                },
                {
                    "id": "CC05_Q36",
                    "question": "Completa el hueco (36):",
                    "options": {"A": "more", "B": "most", "C": "much", "D": "as"},
                    "answer": "A",
                    "explanation": "Comparativo con adjetivo largo secure + than: 'more secure now than'."
                },
                {
                    "id": "CC05_Q37",
                    "question": "Completa el hueco (37):",
                    "options": {"A": "from", "B": "since", "C": "at", "D": "by"},
                    "answer": "A",
                    "explanation": "Correlación preposicional 'from dawn to dusk' (desde el amanecer hasta el anochecer)."
                },
                {
                    "id": "CC05_Q38",
                    "question": "Completa el hueco (38):",
                    "options": {"A": "Despite", "B": "Although", "C": "However", "D": "Whereas"},
                    "answer": "A",
                    "explanation": "Preposición de contraste seguida de sintagma nominal: 'Despite occasional road blocks'."
                },
                {
                    "id": "CC05_Q39",
                    "question": "Completa el hueco (39):",
                    "options": {"A": "them", "B": "they", "C": "their", "D": "theirs"},
                    "answer": "A",
                    "explanation": "Pronombre objeto tras el verbo thanked: 'thanked them'."
                },
                {
                    "id": "CC05_Q40",
                    "question": "Completa el hueco (40):",
                    "options": {"A": "will", "B": "did", "C": "was", "D": "is"},
                    "answer": "A",
                    "explanation": "Futuro simple con indicador 'Next Friday': 'will arrive'."
                }
            ]
        },
        {
            "id": "cloze_curated_06",
            "title": "Naval Patrol and Coastal Exercises",
            "text": "The navy patrol boat (31) _____ stationed in the southern bay. The commanding officer (32) _____ twenty years of naval experience. Right now, the radar operators (33) _____ commercial shipping traffic near the strait. Every crew member understands (34) _____ emergency station. In the engine compartment, (35) _____ are two powerful diesel turbines. Today's sea conditions are (36) _____ rough than yesterday. Routine patrols commence (37) _____ 08:00 every weekday. (38) _____ dense sea fog covered the harbour this morning, navigation radars guided the ship safely into port. The admiral praised (39) _____ for their exceptional seamanship. Next month, the vessel (40) _____ participate in combined naval manoeuvres.",
            "questions": [
                {
                    "id": "CC06_Q31",
                    "question": "Completa el hueco (31):",
                    "options": {"A": "is", "B": "are", "C": "be", "D": "was"},
                    "answer": "A",
                    "explanation": "Verbo To Be en singular: 'The navy patrol boat is stationed'."
                },
                {
                    "id": "CC06_Q32",
                    "question": "Completa el hueco (32):",
                    "options": {"A": "has", "B": "have", "C": "having", "D": "is have"},
                    "answer": "A",
                    "explanation": "Tercera persona singular de have: 'has twenty years of naval experience'."
                },
                {
                    "id": "CC06_Q33",
                    "question": "Completa el hueco (33):",
                    "options": {"A": "are tracking", "B": "tracks", "C": "tracked", "D": "is tracking"},
                    "answer": "A",
                    "explanation": "Present continuous con sujeto plural 'radar operators' y 'Right now': 'are tracking'."
                },
                {
                    "id": "CC06_Q34",
                    "question": "Completa el hueco (34):",
                    "options": {"A": "his or her", "B": "their", "C": "they", "D": "theirs"},
                    "answer": "A",
                    "explanation": "Posesivo distributivo tras 'Every crew member': 'understands his or her emergency station'."
                },
                {
                    "id": "CC06_Q35",
                    "question": "Completa el hueco (35):",
                    "options": {"A": "there", "B": "their", "C": "they're", "D": "where"},
                    "answer": "A",
                    "explanation": "Estructura existencial plural: 'there are two powerful diesel turbines'."
                },
                {
                    "id": "CC06_Q36",
                    "question": "Completa el hueco (36):",
                    "options": {"A": "more", "B": "most", "C": "much", "D": "as"},
                    "answer": "A",
                    "explanation": "Comparativo con adjetivo y than: 'more rough than'."
                },
                {
                    "id": "CC06_Q37",
                    "question": "Completa el hueco (37):",
                    "options": {"A": "at", "B": "on", "C": "in", "D": "by"},
                    "answer": "A",
                    "explanation": "Preposición para horas exactas: 'at 08:00'."
                },
                {
                    "id": "CC06_Q38",
                    "question": "Completa el hueco (38):",
                    "options": {"A": "Although", "B": "Despite", "C": "In spite of", "D": "However"},
                    "answer": "A",
                    "explanation": "Conector subordinante seguido de sujeto + verbo ('dense sea fog covered'): 'Although dense sea fog covered'."
                },
                {
                    "id": "CC06_Q39",
                    "question": "Completa el hueco (39):",
                    "options": {"A": "them", "B": "they", "C": "their", "D": "theirs"},
                    "answer": "A",
                    "explanation": "Pronombre objeto tras el verbo praised: 'praised them'."
                },
                {
                    "id": "CC06_Q40",
                    "question": "Completa el hueco (40):",
                    "options": {"A": "will", "B": "did", "C": "was", "D": "is"},
                    "answer": "A",
                    "explanation": "Futuro simple con marcador temporal 'Next month': 'will participate'."
                }
            ]
        }
    ]

def build_exam_data():
    """Compila el dataset y escribe exam-data.js."""
    topics = load_existing_questions()
    extracted_readings, extracted_clozes = extract_units_from_topics(topics)
    curated_readings = get_curated_reading_units()
    curated_clozes = get_curated_cloze_units()

    all_readings = extracted_readings + curated_readings
    all_clozes = extracted_clozes + curated_clozes

    dataset = {
        "metadata": {
            "version": "1.0.0",
            "totalReadingUnits": len(all_readings),
            "totalReadingQuestions": sum(len(r["questions"]) for r in all_readings),
            "totalClozeUnits": len(all_clozes),
            "totalClozeQuestions": sum(len(c["questions"]) for c in all_clozes)
        },
        "readingUnits": all_readings,
        "clozeUnits": all_clozes
    }

    os.makedirs(JS_DIR, exist_ok=True)
    with open(OUTPUT_EXAM_DATA_PATH, "w", encoding="utf-8") as f:
        f.write("/**\n")
        f.write(" * Dataset de Unidades de Examen para el Generador Procedural Oficial.\n")
        f.write(f" * Lecturas disponibles: {dataset['metadata']['totalReadingUnits']} ({dataset['metadata']['totalReadingQuestions']} preguntas)\n")
        f.write(f" * Textos Cloze disponibles: {dataset['metadata']['totalClozeUnits']} ({dataset['metadata']['totalClozeQuestions']} preguntas)\n")
        f.write(" */\n")
        f.write("window.EXAM_DATA = ")
        json.dump(dataset, f, indent=2, ensure_ascii=False)
        f.write(";\n")

    print(f"Dataset generado con éxito en {OUTPUT_EXAM_DATA_PATH}")
    print(f"Lecturas: {len(all_readings)} bloques, {dataset['metadata']['totalReadingQuestions']} preguntas.")
    print(f"Clozes (10 preguntas): {len(all_clozes)} textos, {dataset['metadata']['totalClozeQuestions']} preguntas.")
    return dataset

if __name__ == "__main__":
    build_exam_data()
