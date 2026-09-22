/**
 * PATRONATO 2026 - Plataforma de Tests de Inglés (Suboficiales)
 * Lógica de la aplicación: navegación, modos práctica y examen,
 * sin penalización de fallos, exigencia del 70% para Aprobado (Apto).
 */

(function () {
  'use strict';

  // --- STATE ---
  let state = {
    theme: localStorage.getItem('patronato_theme') || 'light',
    favorites: JSON.parse(localStorage.getItem('patronato_favorites') || '[]'),
    errors: JSON.parse(localStorage.getItem('patronato_errors') || '[]'),
    history: JSON.parse(localStorage.getItem('patronato_history') || '[]'),
    currentQuiz: null,
    timerInterval: null
  };

  // --- INIT ---
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(state.theme);
    initDashboard();
    setupGlobalEvents();
    registerServiceWorker();
    checkInitialCloudSync();
  });

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && (window.location.protocol.startsWith('http') || window.location.protocol.startsWith('https'))) {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.log('Nota: Service Worker offline no registrado:', err);
      });
    }
  }

  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('patronato_theme', theme);
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.innerHTML = theme === 'dark' ? '☀️ Claro' : '🌙 Modo';
    }
  }

  function setupGlobalEvents() {
    const brand = document.getElementById('brand-logo');
    if (brand) brand.addEventListener('click', showDashboard);

    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        applyTheme(state.theme === 'dark' ? 'light' : 'dark');
      });
    }

    const syncBtn = document.getElementById('btn-cloud-sync');
    if (syncBtn) {
      syncBtn.addEventListener('click', openSyncModal);
    }

    const updateInfoBtn = document.getElementById('btn-update-info');
    if (updateInfoBtn) {
      updateInfoBtn.addEventListener('click', ejecutarActualizacionDesdeWeb);
    }
  }

  async function ejecutarActualizacionDesdeWeb() {
    const btn = document.getElementById('btn-update-info');
    const originalText = btn ? btn.innerHTML : '📥 Actualizar Temas';
    
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '🔄 Actualizando...';
    }

    const endpoints = [
      '/api/actualizar',
      'http://127.0.0.1:8080/api/actualizar'
    ];

    let success = false;
    let data = null;

    for (const url of endpoints) {
      try {
        const response = await fetch(url, { method: 'POST', cache: 'no-cache' });
        if (response.ok) {
          data = await response.json();
          success = true;
          break;
        }
      } catch (err) {
        // Continue to next endpoint
      }
    }

    if (success && data && data.success) {
      await reloadQuestionsDataScript();
      updateStatsBar();
      renderTopics();
      showToast(`✅ ¡Banco de preguntas actualizado! Se han cargado ${data.totalQuestions} preguntas.`);
    } else {
      document.getElementById('modal-update').classList.add('show');
    }

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  function reloadQuestionsDataScript() {
    return new Promise((resolve) => {
      const oldScript = document.querySelector('script[src*="questions-data.js"]');
      const newScript = document.createElement('script');
      newScript.src = `js/questions-data.js?t=${Date.now()}`;
      newScript.onload = () => {
        if (oldScript && oldScript.parentNode) {
          oldScript.parentNode.removeChild(oldScript);
        }
        resolve();
      };
      newScript.onerror = () => resolve();
      document.body.appendChild(newScript);
    });
  }

  function showToast(msg) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.style.position = 'fixed';
      toast.style.bottom = '2rem';
      toast.style.right = '2rem';
      toast.style.background = '#059669';
      toast.style.color = 'white';
      toast.style.padding = '0.85rem 1.4rem';
      toast.style.borderRadius = '10px';
      toast.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.2)';
      toast.style.zIndex = '9999';
      toast.style.fontWeight = '600';
      toast.style.fontSize = '0.92rem';
      toast.style.transition = 'all 0.3s ease';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
    }, 4500);
  }

  window.closeUpdateModal = function () {
    document.getElementById('modal-update').classList.remove('show');
  };

  // --- DASHBOARD ---
  function initDashboard() {
    showView('view-dashboard');
    updateStatsBar();
    renderTopics();
  }

  window.showDashboard = function () {
    if (state.currentQuiz && !state.currentQuiz.isFinished) {
      if (!confirm('¿Seguro que deseas salir del test actual? El progreso se perderá.')) {
        return;
      }
      clearInterval(state.timerInterval);
    }
    showView('view-dashboard');
    updateStatsBar();
    renderTopics();
  };

  function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function updateStatsBar() {
    const data = window.TEST_DATA || { topics: [] };
    const allQuestions = getAllQuestions();
    
    // Total questions
    const totalQEl = document.getElementById('total-questions-stat');
    if (totalQEl) totalQEl.textContent = allQuestions.length;

    // Tests completed
    const testsCountEl = document.getElementById('tests-completed-stat');
    if (testsCountEl) testsCountEl.textContent = state.history.length;

    // Global accuracy
    const accuracyEl = document.getElementById('user-accuracy-stat');
    if (accuracyEl) {
      if (state.history.length === 0) {
        accuracyEl.textContent = '0%';
      } else {
        const totalCorrect = state.history.reduce((acc, h) => acc + h.correct, 0);
        const totalAttempted = state.history.reduce((acc, h) => acc + h.total, 0);
        const pct = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
        accuracyEl.textContent = `${pct}%`;
      }
    }

    // Counts for special modes
    const errorsCountEl = document.getElementById('count-errors');
    if (errorsCountEl) errorsCountEl.textContent = state.errors.length;

    const favsCountEl = document.getElementById('count-favs');
    if (favsCountEl) favsCountEl.textContent = state.favorites.length;
  }

  function getAllQuestions() {
    const data = window.TEST_DATA || { topics: [] };
    const list = [];
    data.topics.forEach(t => {
      (t.questions || []).forEach(q => list.push({ ...q, topicTitle: t.title, topicBadge: t.badge }));
    });
    return list;
  }

  function renderTopics() {
    const container = document.getElementById('topics-container');
    if (!container) return;
    container.innerHTML = '';

    const data = window.TEST_DATA || { topics: [] };
    if (!data.topics || data.topics.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted)">No se han encontrado temas cargados.</p>';
      return;
    }

    data.topics.forEach(topic => {
      const card = document.createElement('div');
      card.className = 'topic-card';
      const qCount = (topic.questions || []).length;
      
      card.innerHTML = `
        <div class="card-header">
          <span class="card-badge">${escapeHtml(topic.badge || 'Tema')}</span>
          <span class="card-count">${qCount} preguntas</span>
        </div>
        <h3 class="card-title">${escapeHtml(topic.title)}</h3>
        <p class="card-desc">${escapeHtml(topic.description || '')}</p>
        <div class="card-actions">
          <button class="btn btn-secondary btn-sm" onclick="startTopicQuiz('${topic.id}', 'practice')">
            📖 Práctica
          </button>
          <button class="btn btn-primary btn-sm" onclick="startTopicQuiz('${topic.id}', 'exam')">
            ⏱️ Examen
          </button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // --- QUIZ STARTING ---
  window.startTopicQuiz = function (topicId, mode) {
    const data = window.TEST_DATA || { topics: [] };
    const topic = data.topics.find(t => t.id === topicId);
    if (!topic || !topic.questions || topic.questions.length === 0) {
      alert('Este tema no contiene preguntas disponibles.');
      return;
    }

    startQuizSession({
      title: topic.title,
      badge: topic.badge || 'Tema',
      mode: mode,
      questions: topic.questions.map(q => ({ ...q, topicTitle: topic.title, topicBadge: topic.badge }))
    });
  };

  window.startGlobalExam = function (count) {
    const all = getAllQuestions();
    if (all.length === 0) {
      alert('No hay preguntas disponibles.');
      return;
    }
    // Shuffle
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));

    startQuizSession({
      title: `Simulacro General de Oposición (${selected.length} preguntas)`,
      badge: 'Simulacro',
      mode: 'exam',
      questions: selected
    });
  };

  window.startErrorsQuiz = function () {
    if (state.errors.length === 0) {
      alert('¡Excelente! No tienes fallos pendientes en tu banco de errores.');
      return;
    }
    const all = getAllQuestions();
    const errorQuestions = all.filter(q => state.errors.includes(q.id));
    if (errorQuestions.length === 0) {
      alert('No se encontraron preguntas de errores.');
      return;
    }

    startQuizSession({
      title: `Repaso de Fallos (${errorQuestions.length} preguntas)`,
      badge: 'Fallos',
      mode: 'practice',
      questions: errorQuestions
    });
  };

  window.startFavsQuiz = function () {
    if (state.favorites.length === 0) {
      alert('Aún no has marcado preguntas con estrella como favoritas.');
      return;
    }
    const all = getAllQuestions();
    const favQuestions = all.filter(q => state.favorites.includes(q.id));
    if (favQuestions.length === 0) {
      alert('No se encontraron preguntas favoritas.');
      return;
    }

    startQuizSession({
      title: `Preguntas Guardadas (${favQuestions.length} preguntas)`,
      badge: 'Favoritas',
      mode: 'practice',
      questions: favQuestions
    });
  };

  function startQuizSession({ title, badge, mode, questions }) {
    clearInterval(state.timerInterval);

    state.currentQuiz = {
      title,
      badge,
      mode, // 'practice' | 'exam'
      questions,
      currentIndex: 0,
      userAnswers: {}, // { [qId]: optionLetter or text }
      interactiveChecked: {}, // { [qId]: true/false }
      isFinished: false,
      startTime: Date.now(),
      elapsedSeconds: 0
    };

    // Update UI headers
    document.getElementById('quiz-title').textContent = title;
    document.getElementById('quiz-badge').textContent = badge;
    const modeDesc = mode === 'practice'
      ? 'Modo Práctica • Corrección inmediata y explicación'
      : 'Modo Examen • Sin corrección hasta finalizar (Corte: 70% Apto)';
    document.getElementById('quiz-mode-desc').textContent = modeDesc;

    // Timer setup
    const timerEl = document.getElementById('quiz-timer');
    if (mode === 'exam') {
      timerEl.style.display = 'inline-flex';
      updateTimerDisplay(0);
      state.timerInterval = setInterval(() => {
        state.currentQuiz.elapsedSeconds++;
        updateTimerDisplay(state.currentQuiz.elapsedSeconds);
      }, 1000);
    } else {
      timerEl.style.display = 'none';
    }

    showView('view-quiz');
    renderCurrentQuestion();
    renderSidebarGrid();
  }

  function updateTimerDisplay(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const valEl = document.getElementById('timer-val');
    if (valEl) {
      valEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
  }

  window.confirmExitQuiz = function () {
    if (confirm('¿Deseas salir del test? El progreso actual no se guardará.')) {
      clearInterval(state.timerInterval);
      state.currentQuiz = null;
      showDashboard();
    }
  };

  // --- QUESTION RENDERING ---
  function renderCurrentQuestion() {
    const qz = state.currentQuiz;
    if (!qz) return;
    const q = qz.questions[qz.currentIndex];
    const total = qz.questions.length;
    const idx = qz.currentIndex;

    // Progress bar
    const progressPct = ((idx + 1) / total) * 100;
    document.getElementById('quiz-progress-fill').style.width = `${progressPct}%`;

    // Badges & Counter
    document.getElementById('q-counter-badge').textContent = `Pregunta ${idx + 1} de ${total}`;
    document.getElementById('q-section-name').textContent = q.section || '';

    // Star / Favorite
    const favBtn = document.getElementById('q-fav-btn');
    const isFav = state.favorites.includes(q.id);
    favBtn.className = isFav ? 'q-fav-btn active' : 'q-fav-btn';

    // Reading Box
    const readingBox = document.getElementById('reading-box');
    if (q.readingText) {
      readingBox.style.display = 'block';
      document.getElementById('reading-content').textContent = q.readingText;
    } else {
      readingBox.style.display = 'none';
    }

    // Question Prompt
    document.getElementById('q-prompt-text').innerHTML = formatPromptText(q.question);

    // Question Type Controls
    const optionsContainer = document.getElementById('q-options-container');
    const inputWrap = document.getElementById('q-input-wrap');
    const feedbackBox = document.getElementById('q-feedback-box');
    feedbackBox.className = 'feedback-box'; // reset

    if (q.type === 'choice' && q.options) {
      optionsContainer.style.display = 'flex';
      inputWrap.style.display = 'none';
      renderChoiceOptions(q);
    } else {
      // Interactive text input (completion / error correction)
      optionsContainer.style.display = 'none';
      inputWrap.style.display = 'flex';
      renderInteractiveInput(q);
    }

    // Previous / Next buttons
    document.getElementById('btn-prev-q').disabled = idx === 0;
    const nextBtn = document.getElementById('btn-next-q');
    if (idx === total - 1) {
      nextBtn.style.display = 'none';
    } else {
      nextBtn.style.display = 'inline-flex';
    }

    // Update navigator grid
    updateSidebarGridActive();
  }

  function formatPromptText(txt) {
    if (!txt) return '';
    return escapeHtml(txt).replace(/\n/g, '<br>');
  }

  function renderChoiceOptions(q) {
    const qz = state.currentQuiz;
    const container = document.getElementById('q-options-container');
    container.innerHTML = '';

    const letters = ['A', 'B', 'C', 'D'];
    const userSelected = qz.userAnswers[q.id];
    const isPractice = qz.mode === 'practice';
    const isAnswered = userSelected !== undefined;

    letters.forEach(letter => {
      if (!q.options[letter]) return;

      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.type = 'button';

      let stateClass = '';
      if (isPractice && isAnswered) {
        btn.classList.add('disabled');
        if (letter === q.answer) {
          stateClass = 'correct';
        } else if (letter === userSelected) {
          stateClass = 'incorrect';
        }
      } else if (!isPractice && userSelected === letter) {
        stateClass = 'selected';
      }

      if (stateClass) btn.classList.add(stateClass);

      btn.innerHTML = `
        <span class="option-letter">${letter}</span>
        <span class="option-text">${escapeHtml(q.options[letter])}</span>
      `;

      btn.onclick = () => {
        if (isPractice && isAnswered) return; // cannot re-answer in practice mode
        selectChoiceOption(q, letter);
      };

      container.appendChild(btn);
    });

    // Feedback in practice mode
    if (isPractice && isAnswered) {
      showPracticeFeedback(q, userSelected === q.answer);
    }
  }

  function selectChoiceOption(q, letter) {
    const qz = state.currentQuiz;
    qz.userAnswers[q.id] = letter;

    if (qz.mode === 'practice') {
      const isCorrect = letter === q.answer;
      updateErrorsState(q.id, isCorrect);
      renderCurrentQuestion();
      renderSidebarGrid();
    } else {
      // Exam mode: update selection highlight and sidebar
      renderCurrentQuestion();
      renderSidebarGrid();
    }
  }

  function renderInteractiveInput(q) {
    const qz = state.currentQuiz;
    const input = document.getElementById('q-text-input');
    input.value = qz.userAnswers[q.id] || '';

    const isPractice = qz.mode === 'practice';
    const isChecked = qz.interactiveChecked[q.id];

    if (isPractice && isChecked) {
      const userVal = (qz.userAnswers[q.id] || '').trim();
      const isCorrect = checkTextAnswer(userVal, q.answer);
      showPracticeFeedback(q, isCorrect);
    }
  }

  window.checkInteractiveAnswer = function () {
    const qz = state.currentQuiz;
    const q = qz.questions[qz.currentIndex];
    const input = document.getElementById('q-text-input');
    const val = input.value.trim();
    if (!val) {
      alert('Escribe una respuesta antes de comprobar.');
      return;
    }

    qz.userAnswers[q.id] = val;
    qz.interactiveChecked[q.id] = true;

    const isCorrect = checkTextAnswer(val, q.answer);
    updateErrorsState(q.id, isCorrect);
    showPracticeFeedback(q, isCorrect);
    renderSidebarGrid();
  };

  window.revealInteractiveAnswer = function () {
    const qz = state.currentQuiz;
    const q = qz.questions[qz.currentIndex];
    qz.interactiveChecked[q.id] = true;
    showPracticeFeedback(q, false, true);
  };

  function checkTextAnswer(userVal, correctVal) {
    if (!userVal || !correctVal) return false;
    const cleanUser = userVal.toLowerCase().replace(/['".,!?;]/g, '').trim();
    
    // Check if multiple alternatives (e.g. 'each other / one another')
    const options = correctVal.split('/').map(s => s.toLowerCase().replace(/['".,!?;]/g, '').trim());
    return options.includes(cleanUser);
  }

  function showPracticeFeedback(q, isCorrect, isForcedReveal = false) {
    const box = document.getElementById('q-feedback-box');
    const header = document.getElementById('feedback-header');
    const text = document.getElementById('feedback-explanation');

    box.className = 'feedback-box show';
    if (isCorrect) {
      box.classList.add('correct-box');
      header.innerHTML = '✓ ¡Correcto!';
    } else {
      box.classList.add('incorrect-box');
      header.innerHTML = isForcedReveal ? 'ℹ️ Solución oficial' : '✕ Respuesta incorrecta';
    }

    let explanationText = q.explanation || '';
    if (q.type === 'choice' && q.options) {
      explanationText = `<strong>Opción correcta: ${q.answer}) ${escapeHtml(q.options[q.answer] || '')}</strong><br>${escapeHtml(explanationText)}`;
    } else {
      explanationText = `<strong>Respuesta correcta: ${escapeHtml(q.answer)}</strong><br>${escapeHtml(explanationText)}`;
    }

    text.innerHTML = explanationText;
  }

  function updateErrorsState(qId, isCorrect) {
    if (isCorrect) {
      state.errors = state.errors.filter(id => id !== qId);
    } else {
      if (!state.errors.includes(qId)) {
        state.errors.push(qId);
      }
    }
    localStorage.setItem('patronato_errors', JSON.stringify(state.errors));
    triggerBackgroundCloudSync();
  }

  // --- NAVIGATION ---
  window.navigateQuestion = function (step) {
    const qz = state.currentQuiz;
    if (!qz) return;
    const newIdx = qz.currentIndex + step;
    if (newIdx >= 0 && newIdx < qz.questions.length) {
      qz.currentIndex = newIdx;
      renderCurrentQuestion();
    }
  };

  window.toggleCurrentFav = function () {
    const qz = state.currentQuiz;
    if (!qz) return;
    const q = qz.questions[qz.currentIndex];
    if (state.favorites.includes(q.id)) {
      state.favorites = state.favorites.filter(id => id !== q.id);
    } else {
      state.favorites.push(q.id);
    }
    localStorage.setItem('patronato_favorites', JSON.stringify(state.favorites));
    triggerBackgroundCloudSync();
    renderCurrentQuestion();
  };

  // --- SIDEBAR NAVIGATOR ---
  function renderSidebarGrid() {
    const qz = state.currentQuiz;
    const grid = document.getElementById('questions-grid');
    if (!qz || !grid) return;
    grid.innerHTML = '';

    const isPractice = qz.mode === 'practice';
    let answeredCount = 0;

    qz.questions.forEach((q, i) => {
      const btn = document.createElement('button');
      btn.className = 'q-grid-btn';
      btn.textContent = i + 1;

      const userAns = qz.userAnswers[q.id];
      const hasAnswer = userAns !== undefined && userAns !== '';
      if (hasAnswer) answeredCount++;

      if (i === qz.currentIndex) {
        btn.classList.add('current');
      }

      if (hasAnswer) {
        if (isPractice) {
          const isCorrect = q.type === 'choice' ? userAns === q.answer : checkTextAnswer(userAns, q.answer);
          btn.classList.add(isCorrect ? 'correct-grid' : 'incorrect-grid');
        } else {
          btn.classList.add('answered');
        }
      }

      btn.onclick = () => {
        qz.currentIndex = i;
        renderCurrentQuestion();
        closeQuestionsDrawer();
      };

      grid.appendChild(btn);
    });

    const countText = `${answeredCount} / ${qz.questions.length}`;
    const sidebarCount = document.getElementById('sidebar-answered-count');
    if (sidebarCount) sidebarCount.textContent = countText;
    const mobileCount = document.getElementById('mobile-grid-count');
    if (mobileCount) mobileCount.textContent = countText;
  }

  function updateSidebarGridActive() {
    const qz = state.currentQuiz;
    const btns = document.querySelectorAll('.q-grid-btn');
    btns.forEach((btn, i) => {
      if (i === qz.currentIndex) {
        btn.classList.add('current');
      } else {
        btn.classList.remove('current');
      }
    });
  }

  // --- FINISH & GRADING ---
  window.finishQuiz = function () {
    const qz = state.currentQuiz;
    if (!qz) return;

    // Check unanswered questions in exam mode
    const total = qz.questions.length;
    const answeredCount = Object.keys(qz.userAnswers).length;
    if (answeredCount < total && qz.mode === 'exam') {
      const diff = total - answeredCount;
      if (!confirm(`Tienes ${diff} pregunta(s) sin responder. ¿Deseas entregar el examen de todas formas?`)) {
        return;
      }
    }

    clearInterval(state.timerInterval);
    qz.isFinished = true;

    // Evaluate
    let correct = 0;
    let wrong = 0;
    let blank = 0;

    qz.questions.forEach(q => {
      const userAns = qz.userAnswers[q.id];
      if (userAns === undefined || userAns === '') {
        blank++;
      } else {
        let isRight = false;
        if (q.type === 'choice') {
          isRight = (userAns === q.answer);
        } else {
          isRight = checkTextAnswer(userAns, q.answer);
        }

        if (isRight) {
          correct++;
          updateErrorsState(q.id, true);
        } else {
          wrong++;
          updateErrorsState(q.id, false);
        }
      }
    });

    // Score without penalization:
    // Puntuación sobre 10
    const scoreVal = total > 0 ? ((correct / total) * 10).toFixed(1) : 0;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    
    // Passing criterion: 70%
    const isPassed = pct >= 70;

    // Save to history
    state.history.push({
      date: new Date().toISOString(),
      title: qz.title,
      total,
      correct,
      wrong,
      blank,
      score: parseFloat(scoreVal),
      passed: isPassed,
      timeSeconds: qz.elapsedSeconds
    });
    localStorage.setItem('patronato_history', JSON.stringify(state.history));
    triggerBackgroundCloudSync();

    renderResultsScreen({
      total,
      correct,
      wrong,
      blank,
      scoreVal,
      pct,
      isPassed,
      timeSeconds: qz.elapsedSeconds,
      questions: qz.questions,
      userAnswers: qz.userAnswers
    });
  };

  function renderResultsScreen(res) {
    showView('view-results');

    // Badge APTO / NO APTO
    const badgeContainer = document.getElementById('result-badge-container');
    if (res.isPassed) {
      badgeContainer.innerHTML = '<div class="result-badge-huge badge-apto">🎖️ APTO (APROBADO)</div>';
    } else {
      badgeContainer.innerHTML = '<div class="result-badge-huge badge-no-apto">❌ NO APTO (SUSPENSO)</div>';
    }

    // Score
    document.getElementById('result-score-val').textContent = `${res.scoreVal} / 10`;
    
    // Subtitle
    const subEl = document.getElementById('result-score-subtitle');
    const neededForPass = Math.ceil(res.total * 0.70);
    if (res.isPassed) {
      subEl.innerHTML = `Has acertado <strong>${res.correct}</strong> de <strong>${res.total}</strong> preguntas (<strong>${res.pct}%</strong>). ¡Has superado el <strong>70% de corte exigido</strong>!`;
    } else {
      const missing = neededForPass - res.correct;
      subEl.innerHTML = `Has acertado <strong>${res.correct}</strong> de <strong>${res.total}</strong> preguntas (<strong>${res.pct}%</strong>). Se exige un mínimo del <strong>70% (${neededForPass} aciertos)</strong>. Te han faltado <strong>${missing}</strong> acierto(s) para el Apto.`;
    }

    // Stats
    document.getElementById('r-stat-correct').textContent = res.correct;
    document.getElementById('r-stat-wrong').textContent = res.wrong;
    document.getElementById('r-stat-blank').textContent = res.blank;

    const m = Math.floor(res.timeSeconds / 60);
    const s = res.timeSeconds % 60;
    document.getElementById('r-stat-time').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    // Show/hide Retry Failed button
    const retryFailedBtn = document.getElementById('btn-retry-failed');
    if (res.wrong > 0) {
      retryFailedBtn.style.display = 'inline-flex';
    } else {
      retryFailedBtn.style.display = 'none';
    }

    // Detailed review list
    renderReviewList(res.questions, res.userAnswers);
  }

  function renderReviewList(questions, userAnswers) {
    const listEl = document.getElementById('review-questions-list');
    listEl.innerHTML = '';

    questions.forEach((q, idx) => {
      const userAns = userAnswers[q.id];
      const hasAns = userAns !== undefined && userAns !== '';
      let isCorrect = false;

      if (hasAns) {
        isCorrect = q.type === 'choice' ? userAns === q.answer : checkTextAnswer(userAns, q.answer);
      }

      const item = document.createElement('div');
      item.className = 'question-card';
      item.style.marginBottom = '1rem';
      item.style.borderLeft = isCorrect ? '5px solid var(--accent)' : '5px solid var(--danger)';

      let userAnsText = '<em>Sin contestar</em>';
      if (hasAns) {
        if (q.type === 'choice' && q.options) {
          userAnsText = `<strong>${userAns})</strong> ${escapeHtml(q.options[userAns] || '')}`;
        } else {
          userAnsText = `<strong>${escapeHtml(userAns)}</strong>`;
        }
      }

      let correctAnsText = '';
      if (q.type === 'choice' && q.options) {
        correctAnsText = `<strong>${q.answer})</strong> ${escapeHtml(q.options[q.answer] || '')}`;
      } else {
        correctAnsText = `<strong>${escapeHtml(q.answer)}</strong>`;
      }

      item.innerHTML = `
        <div class="question-header-row">
          <span class="q-badge">Pregunta ${idx + 1}</span>
          <span style="font-weight:700; color:${isCorrect ? 'var(--accent)' : 'var(--danger)'}">
            ${isCorrect ? '✓ Acierto' : '✕ Fallo'}
          </span>
        </div>
        <div style="font-weight:600; margin-bottom:0.75rem;">${formatPromptText(q.question)}</div>
        <div style="font-size:0.9rem; margin-bottom:0.4rem;">
          Tu respuesta: ${userAnsText}
        </div>
        <div style="font-size:0.9rem; color:var(--accent); margin-bottom:0.75rem;">
          Solución correcta: ${correctAnsText}
        </div>
        <div style="font-size:0.85rem; color:var(--text-muted); background:var(--bg-alt); padding:0.5rem 0.75rem; border-radius:var(--radius-sm);">
          💡 ${escapeHtml(q.explanation || '')}
        </div>
      `;
      listEl.appendChild(item);
    });
  }

  // --- RETRY CONTROLS ---
  window.retryCurrentQuiz = function (onlyFailed) {
    const qz = state.currentQuiz;
    if (!qz) return;

    let targetQuestions = qz.questions;
    if (onlyFailed) {
      targetQuestions = qz.questions.filter(q => {
        const userAns = qz.userAnswers[q.id];
        if (!userAns) return true; // failed or blank
        return q.type === 'choice' ? userAns !== q.answer : !checkTextAnswer(userAns, q.answer);
      });
    }

    if (targetQuestions.length === 0) {
      alert('No hay preguntas para repetir.');
      return;
    }

    startQuizSession({
      title: onlyFailed ? `Repetición de Fallos (${targetQuestions.length})` : qz.title,
      badge: qz.badge,
      mode: qz.mode,
      questions: targetQuestions
    });
  };

  // --- MOBILE DRAWER CONTROLS ---
  window.toggleQuestionsDrawer = function () {
    const sidebar = document.getElementById('quiz-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar && backdrop) {
      sidebar.classList.toggle('drawer-open');
      backdrop.classList.toggle('drawer-open');
    }
  };

  window.closeQuestionsDrawer = function () {
    const sidebar = document.getElementById('quiz-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('drawer-open');
    if (backdrop) backdrop.classList.remove('drawer-open');
  };

  // --- CLOUD SYNC & PERSISTENCE ---
  let syncDebounceTimer = null;
  function triggerBackgroundCloudSync() {
    if (!window.SyncService || !window.SyncService.isConfigured()) return;

    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(async () => {
      setCloudIndicatorStatus('syncing');
      try {
        await window.SyncService.pushToSupabase(window.SyncService.collectLocalData());
        setCloudIndicatorStatus('synced');
      } catch (err) {
        console.warn('Sincronización en segundo plano:', err);
        setCloudIndicatorStatus('offline');
      }
    }, 1500);
  }

  function setCloudIndicatorStatus(status) {
    const dot = document.getElementById('cloud-status-dot');
    if (!dot) return;
    dot.className = 'cloud-status-dot';
    if (status === 'synced') {
      dot.classList.add('synced');
      dot.title = 'Sincronizado con la nube';
    } else if (status === 'syncing') {
      dot.classList.add('syncing');
      dot.title = 'Sincronizando...';
    } else {
      dot.title = 'Modo local (Sin nube configurada)';
    }
  }

  async function checkInitialCloudSync() {
    if (!window.SyncService) return;
    if (window.SyncService.isConfigured()) {
      setCloudIndicatorStatus('syncing');
      try {
        const res = await window.SyncService.pullFromSupabase();
        if (res.success && res.data) {
          state.favorites = JSON.parse(localStorage.getItem('patronato_favorites') || '[]');
          state.errors = JSON.parse(localStorage.getItem('patronato_errors') || '[]');
          state.history = JSON.parse(localStorage.getItem('patronato_history') || '[]');
          updateStatsBar();
        }
        setCloudIndicatorStatus('synced');
      } catch (e) {
        console.warn('Verificación inicial de nube:', e);
        setCloudIndicatorStatus('offline');
      }
    } else {
      setCloudIndicatorStatus('offline');
    }
  }

  window.openSyncModal = function () {
    if (!window.SyncService) return;
    const modal = document.getElementById('modal-sync');
    if (!modal) return;
    const cfg = window.SyncService.getConfig();
    const codeInput = document.getElementById('sync-code-input');
    const urlInput = document.getElementById('sync-supabase-url');
    const keyInput = document.getElementById('sync-supabase-key');
    if (codeInput) codeInput.value = cfg.syncCode || '';
    if (urlInput) urlInput.value = cfg.supabaseUrl || '';
    if (keyInput) keyInput.value = cfg.supabaseKey || '';
    updateSyncModalStatus();
    modal.classList.add('show');
  };

  window.closeSyncModal = function () {
    const modal = document.getElementById('modal-sync');
    if (modal) modal.classList.remove('show');
  };

  window.saveUserSyncCode = async function () {
    const input = document.getElementById('sync-code-input');
    const val = input ? input.value.trim() : '';
    if (!val) {
      alert('Por favor, introduce un código de usuario (ejemplo: Pedro2026).');
      return;
    }
    window.SyncService.saveConfig({ syncCode: val });
    showToast(`✅ Código "${val}" guardado.`);
    updateSyncModalStatus();
    if (window.SyncService.isConfigured()) {
      await performCloudSyncAction();
    }
  };

  window.saveSupabaseSettings = async function () {
    const url = (document.getElementById('sync-supabase-url')?.value || '').trim();
    const key = (document.getElementById('sync-supabase-key')?.value || '').trim();
    window.SyncService.saveConfig({ supabaseUrl: url, supabaseKey: key });
    showToast('✅ Credenciales de Supabase guardadas.');
    updateSyncModalStatus();
    if (window.SyncService.isConfigured()) {
      await performCloudSyncAction();
    }
  };

  window.performCloudSyncAction = async function () {
    const btn = document.getElementById('btn-run-cloud-sync');
    const ind = document.getElementById('sync-status-indicator');
    if (!window.SyncService.isConfigured()) {
      alert('Para sincronizar con Supabase, introduce tu Código, la URL de tu proyecto y la Anon Key.');
      return;
    }
    if (btn) btn.disabled = true;
    if (ind) ind.textContent = 'Sincronizando...';
    setCloudIndicatorStatus('syncing');

    try {
      await window.SyncService.pullFromSupabase();
      state.favorites = JSON.parse(localStorage.getItem('patronato_favorites') || '[]');
      state.errors = JSON.parse(localStorage.getItem('patronato_errors') || '[]');
      state.history = JSON.parse(localStorage.getItem('patronato_history') || '[]');
      updateStatsBar();
      setCloudIndicatorStatus('synced');
      if (ind) ind.textContent = '✓ Conectado y sincronizado';
      showToast('☁️ ¡Progreso sincronizado con éxito!');
    } catch (err) {
      setCloudIndicatorStatus('offline');
      if (ind) ind.textContent = '✕ Error de conexión';
      alert(`Error al sincronizar: ${err.message}`);
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  function updateSyncModalStatus() {
    const ind = document.getElementById('sync-status-indicator');
    if (!ind) return;
    if (window.SyncService && window.SyncService.isConfigured()) {
      ind.textContent = '🟢 Conexión activa';
      ind.style.color = 'var(--accent)';
    } else {
      ind.textContent = '⚪ Modo local (sin nube)';
      ind.style.color = 'var(--text-muted)';
    }
  }

  window.exportTransferCode = function () {
    const pkg = window.SyncService.exportSyncPackage();
    navigator.clipboard.writeText(pkg).then(() => {
      showToast('📋 ¡Código de progreso copiado!');
      alert('Código copiado al portapapeles. Pégalo en tu móvil o compártelo para transferir tu progreso de inmediato.');
    }).catch(() => {
      prompt('Copia este código de progreso:', pkg);
    });
  };

  window.importTransferCode = function () {
    const code = prompt('Pega aquí el código de progreso para este dispositivo:');
    if (!code) return;
    const res = window.SyncService.importSyncPackage(code);
    if (res.success) {
      state.favorites = JSON.parse(localStorage.getItem('patronato_favorites') || '[]');
      state.errors = JSON.parse(localStorage.getItem('patronato_errors') || '[]');
      state.history = JSON.parse(localStorage.getItem('patronato_history') || '[]');
      updateStatsBar();
      showToast('✅ ¡Progreso restaurado en este dispositivo!');
      closeSyncModal();
    } else {
      alert(`Error al importar: ${res.error || 'Código no válido'}`);
    }
  };

  // --- UTILS ---
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
