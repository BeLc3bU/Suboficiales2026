# -*- coding: utf-8 -*-
"""
Enriquecedor determinista de explicaciones gramaticales para el banco de preguntas de Patronato.
Sustituye explicaciones de plantilla ('Opción correcta: X') por explicaciones pedagógicas
que citan la respuesta correcta, la regla gramatical aplicada y el motivo de descarte.
"""

import re

GENERIC_EXPLANATION_RE = re.compile(
    r"(Opción correcta:|Solución correcta: opción|Respuesta correcta:)\s*['\"]?[A-Za-z0-9'\s\-]+['\"]?\.?$",
    re.IGNORECASE,
)


def is_generic_explanation(explanation: str) -> bool:
    """Devuelve True si la explicación es vacía, muy corta o de plantilla genérica."""
    text = (explanation or "").strip()
    if not text or len(text) < 40:
        return True
    if GENERIC_EXPLANATION_RE.search(text) and len(text) < 115:
        return True
    return False


def _get_correct_text(q: dict) -> str:
    ans = str(q.get("answer", "")).strip()
    opts = q.get("options") or {}
    if isinstance(opts, dict) and ans in opts:
        return str(opts[ans]).strip()
    return ans


def _explain_topic_1_present_tobe(q_lower: str, ans_text: str, ans_lower: str, opts_lower: list[str]) -> str | None:
    if ans_lower in ("has", "have", "hasn't", "haven't") and "got" in q_lower:
        plural_hint = "sujeto plural/I/you/we/they" if ans_lower.startswith("have") else "3.ª persona del singular (he/she/it)"
        return f"'{ans_text}' es correcto porque 'have/has got' concuerda con {plural_hint} y no admite el auxiliar 'do/does'."
    if ans_lower in ("am", "is", "are", "'m", "'s", "'re", "am not", "isn't", "aren't"):
        return f"'{ans_text}' es la forma correcta del verbo 'To Be' en concordancia con el sujeto de la oración (no se usa auxiliar 'do' con To Be)."
    if ans_lower in ("do", "does", "don't", "doesn't"):
        return f"'{ans_text}' es el auxiliar correcto en Present Simple para concordar con el sujeto en interrogativa o negativa."
    if any(w in q_lower for w in ("does ", "doesn't", "do ", "don't")) and re.match(r"^[a-z]+$", ans_lower):
        return f"'{ans_text}' (forma base) es obligatorio porque el auxiliar 'do/does' ya marca el tiempo y la persona; el verbo principal nunca lleva '-s'."
    if any(p in q_lower for p in ("children", "women", "men", "people", "they ", "we ", "you ")) or re.search(r"\b[a-z]+s\s+_{2,}", q_lower):
        return f"'{ans_text}' concuerda con un sujeto plural en Present Simple (el verbo permanece en forma base sin '-s')."
    if ans_lower.endswith("s") and not ans_lower.endswith("ss"):
        return f"'{ans_text}' lleva la terminación '-s/-es' de 3.ª persona del singular en Present Simple afirmativo."
    return None


def _explain_topic_2_continuous_stative(q_lower: str, ans_text: str, ans_lower: str, opts_lower: list[str]) -> str | None:
    statives = ("know", "want", "like", "love", "believe", "understand", "belong", "need", "remember", "prefer", "hate", "mean", "seem")
    if any(v in ans_lower for v in statives) and "ing" not in ans_lower:
        return f"'{ans_text}' en Present Simple es correcto: es un verbo de estado (stative verb) y no suele emplearse en forma continua (-ing), aunque haya marcadores de ahora."
    if re.search(r"\b(am|is|are|'m|'s|'re)\s+[a-z]+ing\b", ans_lower) or ("ing" in ans_lower and any(m in q_lower for m in ("now", "moment", "currently", "look!", "listen!"))):
        return f"'{ans_text}' expresa una acción en progreso en este momento mediante Present Continuous (am/is/are + gerundio -ing)."
    return None


def _explain_topic_3_pronouns(q_lower: str, ans_text: str, ans_lower: str, opts_lower: list[str]) -> str | None:
    poss_adj = {"my", "your", "his", "her", "its", "our", "their"}
    poss_pron = {"mine", "yours", "his", "hers", "ours", "theirs"}
    refl = {"myself", "yourself", "himself", "herself", "itself", "ourselves", "yourselves", "themselves"}
    subj = {"i", "you", "he", "she", "it", "we", "they"}
    obj = {"me", "him", "her", "us", "them"}

    if ans_lower in refl:
        return f"'{ans_text}' es el pronombre reflexivo correcto porque la acción recae sobre el mismo sujeto de la oración."
    if ans_lower in poss_pron and ans_lower not in poss_adj:
        return f"'{ans_text}' es pronombre posesivo (sustituye al sustantivo y va sin nombre detrás; evita repetir el objeto)."
    if ans_lower in poss_adj:
        return f"'{ans_text}' es el adjetivo posesivo adecuado delante del sustantivo para concordar en persona y número con el poseedor."
    if "'s" in ans_lower or "s'" in ans_lower:
        return f"'{ans_text}' aplica correctamente el genitivo sajón ('s tras singular o plural irregular; solo apóstrofo ' tras plural acabado en -s)."
    if ans_lower in subj:
        return f"'{ans_text}' actúa como pronombre sujeto antes del verbo (no confundir con pronombres objeto ni posesivos)."
    if ans_lower in obj:
        return f"'{ans_text}' es pronombre objeto porque aparece detrás del verbo o de una preposición."
    return None


def _explain_topic_4_plurals_demonstratives(q_lower: str, ans_text: str, ans_lower: str, opts_lower: list[str]) -> str | None:
    if ans_lower in ("this", "that", "these", "those"):
        num = "singular" if ans_lower in ("this", "that") else "plural"
        dist = "cercanía" if ans_lower in ("this", "these") else "lejanía"
        return f"'{ans_text}' es el demostrativo correcto para {num} y {dist}, concordando en número con el sustantivo y el verbo."
    irregulars = {"children", "men", "women", "teeth", "feet", "mice", "people", "geese", "sheep", "fish"}
    if ans_lower in irregulars:
        return f"'{ans_text}' es un plural irregular obligatorio en inglés (no admite añadir '-s' regular)."
    return f"'{ans_text}' sigue las reglas de pluralización del inglés (-s, -es tras s/sh/ch/x/o, -ies tras consonante+y, o plural irregular)."


def _explain_topic_5_adj_adv(q_lower: str, ans_text: str, ans_lower: str, opts_lower: list[str]) -> str | None:
    if ans_lower.endswith("ly") or ans_lower in ("well", "fast", "hard"):
        return f"'{ans_text}' funciona aquí como adverbio modificando a un verbo, adjetivo u oración (recuerda excepciones como 'well' para 'good')."
    if ans_lower.endswith(("ed", "ing")):
        sense = "sentimiento/estado de una persona" if ans_lower.endswith("ed") else "cualidad de la cosa o situación que provoca la sensación"
        return f"'{ans_text}' es correcto: los adjetivos acabados en '-ed' describen {sense}, mientras que '-ing' describe lo que causa el efecto."
    return f"'{ans_text}' cumple la categoría gramatical (adjetivo/adverbio/formación de palabra) exigida por la posición en la frase."


def _explain_topic_6_future(q_lower: str, ans_text: str, ans_lower: str, opts_lower: list[str]) -> str | None:
    if "going to" in ans_lower:
        return f"'{ans_text}' expresa un plan/intención previa o una predicción basada en una evidencia presente clara."
    if "will" in ans_lower or "won't" in ans_lower or "'ll" in ans_lower:
        return f"'{ans_text}' es correcto para decisiones espontáneas, promesas, ofrecimientos o predicciones de futuro sin evidencia inmediata (y tras 'will' va forma base)."
    if "ing" in ans_lower:
        return f"'{ans_text}' usa Present Continuous con valor de futuro para citas o planes personales ya concertados (arrangements) con fecha/hora."
    return f"'{ans_text}' expresa la referencia futura adecuada según el grado de planificación, horario fijo o decisión espontánea del contexto."


def _explain_topic_7_there_be(q_lower: str, ans_text: str, ans_lower: str, opts_lower: list[str]) -> str | None:
    if "is" in ans_lower or "was" in ans_lower or "'s" in ans_lower:
        return f"'{ans_text}' concuerda en singular (o con sustantivo incontable) en la estructura impersonal 'There + be' (en inglés no se usa 'have' para 'haber')."
    if "are" in ans_lower or "were" in ans_lower:
        return f"'{ans_text}' concuerda en plural con el sustantivo real que aparece detrás de 'There + be'."
    return f"'{ans_text}' completa correctamente la construcción existencial 'There + be' respetando número y tiempo verbal."


def _explain_topic_8_connectors(q_lower: str, ans_text: str, ans_lower: str, opts_lower: list[str]) -> str | None:
    if ans_lower in ("although", "though", "even though"):
        return f"'{ans_text}' introduce una oración completa (sujeto + verbo) expresando contraste; nunca va seguido solo de sustantivo o gerundio como 'despite'."
    if ans_lower in ("despite", "in spite of"):
        return f"'{ans_text}' es correcto porque delante hay que enlazar con un sustantivo, pronombre o gerundio (-ing), nunca directamente con sujeto + verbo sin 'the fact that'."
    if ans_lower in ("however", "nevertheless", "on the other hand"):
        return f"'{ans_text}' es un conector adverbial de contraste entre oraciones independientes (habitualmente entre puntos/punto y coma y seguido de coma)."
    if ans_lower in ("whereas", "while"):
        return f"'{ans_text}' contrasta directamente dos hechos o sujetos paralelos dentro de la misma oración."
    return f"'{ans_text}' respeta la relación lógica de contraste y la estructura sintáctica exigida tras el hueco."


def _explain_topic_9_questions(q_lower: str, ans_text: str, ans_lower: str, opts_lower: list[str]) -> str | None:
    if re.search(r"^(who|what|which)\b", q_lower) and not any(aux in ans_lower.split() for aux in ("do", "does", "did")):
        return f"'{ans_text}' responde a una Subject Question (el pronombre interrogativo es el sujeto, por lo que no lleva auxiliar do/does/did y el verbo va en 3.ª persona o pasado)."
    if any(aux in ans_lower.split() for aux in ("do", "does", "did", "are", "is", "was", "were", "can", "will")):
        return f"'{ans_text}' sigue el orden correcto de Object Question (Partícula + Auxiliar + Sujeto + Verbo) cuando la incógnita es el complemento."
    return f"'{ans_text}' aplica el orden sintáctico correcto de las preguntas de sujeto/objeto en inglés."


def _explain_topic_10_prepositions(q_lower: str, ans_text: str, ans_lower: str, opts_lower: list[str]) -> str | None:
    if ans_lower == "at":
        return "'at' es correcto para horas exactas, momentos puntuales (at night, at noon, at the weekend) o puntos concretos de ubicación."
    if ans_lower == "on":
        return "'on' es obligatorio para días de la semana, fechas completas (on Monday, on 5th May) y superficies o medios con plataforma."
    if ans_lower == "in":
        return "'in' se emplea para meses, años, estaciones, partes del día (in the morning) y espacios cerrados o áreas geográficas."
    return f"'{ans_text}' es la preposición correcta según la escala temporal o espacial de la expresión (IN/ON/AT o expresión fija)."


def _explain_topic_11_past(q_lower: str, ans_text: str, ans_lower: str, opts_lower: list[str]) -> str | None:
    if any(w in ans_lower.split() for w in ("was", "were")) and "ing" in ans_lower:
        return f"'{ans_text}' (Past Continuous) describe una acción en curso en el pasado, habitualmente interrumpida por una acción puntual en Past Simple."
    if "didn't" in ans_lower or "did " in ans_lower or "did" in q_lower:
        return f"'{ans_text}' sigue la regla del Past Simple en negativa/interrogativa: con 'did/didn't' el verbo principal regresa a forma base (sin '-ed')."
    return f"'{ans_text}' expresa una acción acabada en un tiempo pasado definido (Past Simple; verbo regular en '-ed' o forma irregular de 2.ª columna)."


def _explain_topic_12_articles(q_lower: str, ans_text: str, ans_lower: str, opts_lower: list[str]) -> str | None:
    if ans_lower in ("a", "an"):
        rule = "sonido vocálico inicial" if ans_lower == "an" else "sonido consonántico inicial (como 'university' /juː/ o 'euro')"
        return f"'{ans_text}' es el artículo indefinido correcto delante de sustantivo contable singular con {rule}."
    if ans_lower == "the":
        return "'the' es necesario porque se refiere a un elemento específico, único o ya conocido por el contexto."
    if ans_lower in ("-", "Ø", "no article", "nothing", "zero article") or ans_lower == "the information":
        return f"'{ans_text}' respeta las reglas de artículos en inglés: sin artículo (Ø) para generalizaciones en plural o incontables, y con 'the' si está especificado."
    return f"'{ans_text}' cumple la concordancia de artículo definido/indefinido/cero (a/an/the/Ø) según si el sustantivo es contable, específico o general."


def _explain_topic_13_comparatives(q_lower: str, ans_text: str, ans_lower: str, opts_lower: list[str]) -> str | None:
    if "than" in q_lower or "more " in ans_lower or "less " in ans_lower or ans_lower.endswith("er"):
        return f"'{ans_text}' es la forma comparativa correcta (no se combinan 'more' + '-er'; tras el comparativo aparece 'than')."
    if "the " in ans_lower or ans_lower.endswith("est") or "most " in ans_lower:
        return f"'{ans_text}' es la forma superlativa correcta (precedida de 'the' y usando '-est' en adjetivos cortos o 'most' en largos; recuerda irregulares como best/worst)."
    if "as " in ans_lower or " as " in q_lower:
        return f"'{ans_text}' forma la estructura de igualdad 'as + adjetivo/adverbio en grado positivo + as' (sin terminación comparativa)."
    return f"'{ans_text}' aplica correctamente el grado comparativo o superlativo del adjetivo/adverbio en la oración."


def _explain_topic_14_present_perfect(q_lower: str, ans_text: str, ans_lower: str, opts_lower: list[str]) -> str | None:
    if ans_lower == "since":
        return "'since' introduce el punto de inicio concreto en el pasado (since 2018, since Monday), a diferencia de 'for' que mide duración."
    if ans_lower == "for":
        return "'for' expresa la duración total de tiempo (for two hours, for years), mientras que 'since' indica el punto de comienzo."
    if ans_lower in ("yet", "already", "just", "still", "ever", "never"):
        pos = {
            "yet": "al final en negativas e interrogativas",
            "already": "entre 'have/has' y el participio en afirmativas",
            "just": "entre 'have/has' y el participio para acción recién terminada",
            "still": "delante del auxiliar negativo ('still hasn't')",
            "ever": "en preguntas o superlativos ('Have you ever...?')",
            "never": "con verbo en afirmativo para evitar doble negación",
        }[ans_lower]
        return f"'{ans_text}' es la partícula temporal correcta del Present Perfect y se sitúa {pos}."
    if "been" in ans_lower and "ing" in ans_lower:
        return f"'{ans_text}' (Present Perfect Continuous) enfatiza la duración o continuidad de la acción hasta el presente."
    if any(w in ans_lower.split() for w in ("have", "has", "haven't", "hasn't")):
        return f"'{ans_text}' usa Present Perfect (have/has + participio) para conectar el pasado con el presente o acciones sin tiempo pasado cerrado."
    return f"'{ans_text}' respeta el contraste entre Present Perfect (sin tiempo acabado) y Past Simple (tiempo pasado cerrado como yesterday/ago/in 2020)."


def _explain_topic_15_quantifiers(q_lower: str, ans_text: str, ans_lower: str, opts_lower: list[str]) -> str | None:
    if ans_lower in ("much", "little", "a little"):
        return f"'{ans_text}' se emplea obligatoriamente con sustantivos incontables (time, money, information, luggage, advice)."
    if ans_lower in ("many", "few", "a few", "several", "both"):
        return f"'{ans_text}' se utiliza exclusivamente con sustantivos contables en plural."
    if ans_lower in ("is", "was", "has", "does"):
        return f"'{ans_text}' (singular) es obligatorio en concordancia sujeto-verbo con indefinidos (everyone, nobody, each, every, neither) o incontables (news, information)."
    if ans_lower in ("are", "were", "have", "do"):
        return f"'{ans_text}' (plural) concuerda con un sujeto compuesto o cuantificador plural (both, several, many, police, people)."
    if ans_lower in ("some", "any", "no", "none", "either", "neither", "enough", "most", "all"):
        return f"'{ans_text}' cumple la regla de cuantificadores (sin doble negación con no/neither, 'enough' delante de sustantivo y detrás de adjetivo, y 'most' vs 'most of the')."
    return f"'{ans_text}' respeta las reglas de contabilidad del sustantivo y concordancia sujeto-verbo del Tema 15."


def _explain_topic_16_to_for(q_lower: str, ans_text: str, ans_lower: str, opts_lower: list[str]) -> str | None:
    if ans_lower in ("to", "in order to", "so as to"):
        return f"'{ans_text}' + forma base expresa la finalidad de una acción (nunca se usa 'for + forma base' para propósito)."
    if ans_lower in ("in order not to", "so as not to"):
        return f"'{ans_text}' es la estructura correcta de finalidad negativa, colocando 'not' siempre delante de 'to'."
    if ans_lower == "so that":
        return "'so that' es obligatorio cuando la finalidad introduce una oración completa con sujeto + verbo (can/could/will/would)."
    if ans_lower == "for":
        return "'for' es correcto para expresar utilidad de una cosa (+ sustantivo / -ing), duración, beneficiario o chunk fijo (wait/ask/look/responsible for)."
    if "ing" in ans_lower and any(c in q_lower for c in ("look forward to", "lead to", "contribute to", "used for", "responsible for", "apologize for")):
        return f"'{ans_text}' en gerundio (-ing) es obligatorio porque aquí la partícula anterior actúa como preposición, no como infinitivo."
    return f"'{ans_text}' aplica correctamente el contraste TO vs FOR (destinatario/opinión con TO frente a beneficiario/utilidad con FOR) y sus chunks fijos."


def _explain_reading_or_cloze(q: dict, ans_text: str, topic_id: str) -> str:
    sec = (q.get("section") or "").lower()
    q_text = (q.get("question") or "").lower()
    if "reading" in sec or "texto" in sec or "comprensi" in sec:
        if "hueco" in q_text or "____" in q_text or "cloze" in sec:
            return f"En el contexto del texto, '{ans_text}' es la única opción que encaja tanto gramaticalmente como por sentido en el hueco."
        return f"La opción '{ans_text}' es la que coincide fielmente con la información explícita del texto de lectura."
    return f"La respuesta '{ans_text}' completa correctamente el enunciado según la gramática y el vocabulario evaluados en {topic_id.replace('_', ' ')}."


TOPIC_EXPLAINERS = {
    1: _explain_topic_1_present_tobe,
    2: _explain_topic_2_continuous_stative,
    3: _explain_topic_3_pronouns,
    4: _explain_topic_4_plurals_demonstratives,
    5: _explain_topic_5_adj_adv,
    6: _explain_topic_6_future,
    7: _explain_topic_7_there_be,
    8: _explain_topic_8_connectors,
    9: _explain_topic_9_questions,
    10: _explain_topic_10_prepositions,
    11: _explain_topic_11_past,
    12: _explain_topic_12_articles,
    13: _explain_topic_13_comparatives,
    14: _explain_topic_14_present_perfect,
    15: _explain_topic_15_quantifiers,
    16: _explain_topic_16_to_for,
}


def _infer_topic_number(topic_id: str, section: str) -> int | None:
    m = re.search(r"tema_(\d+)", topic_id.lower())
    if m:
        return int(m.group(1))
    if "pronombres" in topic_id:
        return 3
    if "tobe" in topic_id or "presente" in topic_id or "have" in topic_id:
        return 1
    if "plurales" in topic_id or "demostrativos" in topic_id:
        return 4
    sec_l = section.lower()
    if "in / on / at" in sec_l:
        return 10
    if "present perfect" in sec_l:
        return 14
    if "quantifier" in sec_l:
        return 15
    if "to vs for" in sec_l:
        return 16
    return None


def enrich_question_explanation(topic_id: str, q: dict) -> str:
    """Devuelve una explicación pedagógica real para la pregunta q, preservando si ya es rica."""
    current = (q.get("explanation") or "").strip()
    if not is_generic_explanation(current):
        return current

    ans_text = _get_correct_text(q)
    ans_lower = ans_text.lower()
    q_text = q.get("question") or ""
    q_lower = q_text.lower()
    opts = q.get("options") or {}
    opts_lower = [str(v).strip().lower() for v in opts.values()] if isinstance(opts, dict) else []
    sec = q.get("section") or ""

    # 1. Intentar por número de tema o pista contextual explícita
    t_num = _infer_topic_number(topic_id, sec)
    if t_num in TOPIC_EXPLAINERS:
        res = TOPIC_EXPLAINERS[t_num](q_lower, ans_text, ans_lower, opts_lower)
        if res:
            return res

    # 2. Heurísticas transversales para bloques mixtos / simulacros / clozes
    for fn in (
        _explain_topic_16_to_for,
        _explain_topic_14_present_perfect,
        _explain_topic_15_quantifiers,
        _explain_topic_10_prepositions,
        _explain_topic_8_connectors,
        _explain_topic_3_pronouns,
        _explain_topic_1_present_tobe,
    ):
        if ans_lower in ("to", "for", "since", "yet", "already", "much", "many", "few", "little", "in", "on", "at", "although", "despite", "however"):
            res = fn(q_lower, ans_text, ans_lower, opts_lower)
            if res:
                return res

    # 3. Fallback contextual claro (lectura, cloze o gramática de sección)
    return _explain_reading_or_cloze(q, ans_text, topic_id)


def enrich_topics(topics: list[dict]) -> int:
    """Enriquece in-place todas las explicaciones genéricas en una lista de temas. Devuelve el número actualizado."""
    updated = 0
    for topic in topics:
        tid = topic.get("id", "")
        for q in topic.get("questions", []):
            old_exp = (q.get("explanation") or "").strip()
            if is_generic_explanation(old_exp):
                new_exp = enrich_question_explanation(tid, q)
                if new_exp and new_exp != old_exp:
                    q["explanation"] = new_exp
                    updated += 1
    return updated
