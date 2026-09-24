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
    timerInterval: null,
    folderFilter: 'all'
  };

  // Asegurar que el Tema 1 en modo práctica figure como completado inicialmente
  ensureDefaultProgress();

  function ensureDefaultProgress() {
    // Si el usuario descartó explícitamente o borró su progreso, no forzarlo de nuevo
    if (localStorage.getItem('patronato_tema1_cleared') === 'true') {
      return;
    }

    const hasTema1Practice = state.history.some(h => 
      (h.topicId === 'tema_1' || (h.title && h.title.includes('Tema 1'))) && (h.mode === 'practice' || !h.mode)
    );

    if (!hasTema1Practice) {
      state.history.unshift({
        date: new Date().toISOString(),
        topicId: 'tema_1',
        mode: 'practice',
        title: 'Tema 1: Formas verbales, To be y Presente simple',
        total: 45,
        correct: 45,
        wrong: 0,
        blank: 0,
        score: 10.0,
        passed: true,
        timeSeconds: 720
      });
      localStorage.setItem('patronato_history', JSON.stringify(state.history));
      if (window.SyncService) window.SyncService.triggerAutoSave();
    }
  }

  // --- INIT ---
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(state.theme);
    initDashboard();
    setupGlobalEvents();
    registerServiceWorker();
    initAutoSave();
  });

  function initAutoSave() {
    if (window.SyncService) {
      window.SyncService.autoLoad((mergedData) => {
        state.favorites = mergedData.favorites || [];
        state.errors = mergedData.errors || [];
        state.history = mergedData.history || [];
        ensureDefaultProgress();
        updateStatsBar();
        renderTopics();
        renderPendingQuizBanner();
      });
    }
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator && (window.location.protocol.startsWith('http') || window.location.protocol.startsWith('https'))) {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.log('Nota: Service Worker offline no registrado:', err);
      });
    }
    setupPwaInstallPrompt();
  }

  // --- PWA INSTALL PROMPT ---
  let deferredPrompt = null;
  function setupPwaInstallPrompt() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) return; // Ya está instalada

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      showPwaBanner();
    });

    // En iOS Safari, mostrar cómo instalar si es móvil y no está instalada
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS && !isStandalone) {
      setTimeout(() => {
        const dismissed = localStorage.getItem('patronato_pwa_dismissed');
        if (!dismissed) {
          const desc = document.getElementById('pwa-banner-desc');
          if (desc) desc.textContent = 'En Safari: pulsa el botón Compartir (cuadrado con flecha) y "Añadir a pantalla de inicio".';
          const btn = document.getElementById('btn-pwa-install');
          if (btn) btn.textContent = 'ℹ️ Cómo instalar';
          showPwaBanner();
        }
      }, 3000);
    }
  }

  function showPwaBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (!banner) return;
    const dismissed = localStorage.getItem('patronato_pwa_dismissed');
    if (dismissed && Date.now() - parseInt(dismissed, 10) < 1000 * 60 * 60 * 24 * 7) {
      return; // No volver a molestar en 7 días si se cerró
    }
    banner.style.display = 'flex';

    const btnInstall = document.getElementById('btn-pwa-install');
    if (btnInstall) {
      btnInstall.onclick = async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            dismissPwaBanner();
          }
          deferredPrompt = null;
        } else {
          alert('Para instalar en iPhone/iPad:\n1. Pulsa el botón "Compartir" (cuadrado con flecha hacia arriba).\n2. Selecciona "Añadir a la pantalla de inicio".');
        }
      };
    }
  }

  window.dismissPwaBanner = function () {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.style.display = 'none';
    localStorage.setItem('patronato_pwa_dismissed', Date.now().toString());
  };

  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('patronato_theme', theme);
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.innerHTML = theme === 'dark'
        ? '☀️<span class="theme-text-hide"> Claro</span>'
        : '🌙<span class="theme-text-hide"> Modo</span>';
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
    renderPendingQuizBanner();
  }

  window.showDashboard = function () {
    if (state.currentQuiz && !state.currentQuiz.isFinished) {
      clearInterval(state.timerInterval);
      saveActiveQuizState();
      state.currentQuiz = null;
    }
    showView('view-dashboard');
    updateStatsBar();
    renderTopics();
    renderPendingQuizBanner();
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

  function getTopicProgress(topicId, topicTitle) {
    const practiceAttempts = state.history.filter(h => 
      (h.topicId === topicId || (topicTitle && h.title && h.title.includes(topicTitle))) && (h.mode === 'practice' || !h.mode)
    );
    const examAttempts = state.history.filter(h => 
      (h.topicId === topicId || (topicTitle && h.title && h.title.includes(topicTitle))) && h.mode === 'exam'
    );

    // Comprobar si hay un test activo pausado en localStorage
    let activeQuiz = null;
    try {
      const raw = localStorage.getItem('patronato_active_quiz');
      if (raw) activeQuiz = JSON.parse(raw);
    } catch (e) {}

    const isQuizPaused = (mode) => {
      if (!activeQuiz || activeQuiz.isFinished) return false;
      const matchTopic = (activeQuiz.topicId === topicId) || (topicTitle && activeQuiz.title && activeQuiz.title.includes(topicTitle));
      const matchMode = (activeQuiz.mode || 'practice') === mode;
      return matchTopic && matchMode;
    };

    let practiceStatus = { 
      completed: practiceAttempts.length > 0, 
      isPaused: isQuizPaused('practice'),
      count: practiceAttempts.length, 
      bestScore: null 
    };
    if (practiceAttempts.length > 0) {
      practiceStatus.bestScore = Math.max(...practiceAttempts.map(h => h.score !== undefined ? h.score : 0));
    }

    let examStatus = { 
      completed: examAttempts.length > 0, 
      isPaused: isQuizPaused('exam'),
      count: examAttempts.length, 
      passed: false, 
      bestScore: null 
    };
    if (examAttempts.length > 0) {
      examStatus.passed = examAttempts.some(h => h.passed);
      examStatus.bestScore = Math.max(...examAttempts.map(h => h.score !== undefined ? h.score : 0));
    }

    return { practice: practiceStatus, exam: examStatus };
  }

  window.setFolderFilter = function (filter) {
    state.folderFilter = filter;
    
    // Actualizar píldoras activas
    const pAll = document.getElementById('pill-all');
    const pBloque = document.getElementById('pill-bloque');
    const pRepaso = document.getElementById('pill-repaso');
    if (pAll) pAll.classList.toggle('active', filter === 'all');
    if (pBloque) pBloque.classList.toggle('active', filter === 'bloque');
    if (pRepaso) pRepaso.classList.toggle('active', filter === 'repaso');

    const gBloque = document.getElementById('folder-group-bloque');
    const gRepaso = document.getElementById('folder-group-repaso');

    if (gBloque) {
      gBloque.style.display = (filter === 'all' || filter === 'bloque') ? 'block' : 'none';
    }
    if (gRepaso) {
      gRepaso.style.display = (filter === 'all' || filter === 'repaso') ? 'block' : 'none';
    }
  };

  window.toggleFolder = function (folderId) {
    const group = document.getElementById('folder-group-' + folderId);
    if (!group) return;
    const isCollapsed = group.classList.toggle('collapsed');
    try {
      localStorage.setItem('patronato_folder_' + folderId, isCollapsed ? 'collapsed' : 'open');
    } catch (e) {}
  };

  function createTopicCard(topic) {
    const card = document.createElement('div');
    card.className = 'topic-card';
    const qCount = (topic.questions || []).length;
    const progress = getTopicProgress(topic.id, topic.title);

    // Etiqueta Práctica
    let practiceBadge = '';
    if (progress.practice.isPaused) {
      practiceBadge = `<span class="topic-badge-status paused" title="Test pausado a medias">⏸️ Pausado</span>`;
    } else if (progress.practice.completed) {
      practiceBadge = `<span class="topic-badge-status completed" title="Modo práctica completado ${progress.practice.count} vez/veces">✓ Completado</span>`;
    } else {
      practiceBadge = `<span class="topic-badge-status not-started">Pendiente</span>`;
    }

    // Etiqueta Examen
    let examBadge = '';
    if (progress.exam.isPaused) {
      examBadge = `<span class="topic-badge-status paused" title="Examen pausado a medias">⏸️ Pausado</span>`;
    } else if (progress.exam.completed) {
      if (progress.exam.passed) {
        examBadge = `<span class="topic-badge-status passed" title="Superado con APTO (Mejor nota: ${progress.exam.bestScore}/10)">🎖️ APTO (${progress.exam.bestScore}/10)</span>`;
      } else {
        examBadge = `<span class="topic-badge-status failed" title="Realizado (Mejor nota: ${progress.exam.bestScore}/10)">❌ No apto (${progress.exam.bestScore}/10)</span>`;
      }
    } else {
      examBadge = `<span class="topic-badge-status not-started">Sin realizar</span>`;
    }
    
    card.innerHTML = `
      <div class="card-header">
        <span class="card-badge">${escapeHtml(topic.badge || 'Tema')}</span>
        <span class="card-count">${qCount} preguntas</span>
      </div>
      <h3 class="card-title">${escapeHtml(topic.title)}</h3>
      <p class="card-desc">${escapeHtml(topic.description || '')}</p>
      
      <div class="topic-progress-box">
        <div class="topic-progress-row">
          <span class="topic-progress-label">📖 Práctica:</span>
          ${practiceBadge}
        </div>
        <div class="topic-progress-row">
          <span class="topic-progress-label">⏱️ Examen:</span>
          ${examBadge}
        </div>
      </div>

      <div class="card-actions">
        <button class="btn btn-secondary btn-sm" onclick="startTopicQuiz('${topic.id}', 'practice')">
          📖 Práctica
        </button>
        <button class="btn btn-primary btn-sm" onclick="startTopicQuiz('${topic.id}', 'exam')">
          ⏱️ Examen
        </button>
      </div>
    `;
    return card;
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

    // Clasificación de temas
    const bloqueTopics = [];
    const repasoExamenTopics = [];
    const repasoReadingTopics = [];
    const repasoExtraTopics = [];

    data.topics.forEach(topic => {
      const tid = topic.id.toLowerCase();
      if (tid.startsWith('tema_')) {
        bloqueTopics.push(topic);
      } else if (tid.includes('examen') || tid.includes('simulacro')) {
        repasoExamenTopics.push(topic);
      } else if (tid.includes('reading')) {
        repasoReadingTopics.push(topic);
      } else {
        repasoExtraTopics.push(topic);
      }
    });

    const totalBloqueQ = bloqueTopics.reduce((acc, t) => acc + (t.questions || []).length, 0);
    const totalRepasoTopicsCount = repasoExamenTopics.length + repasoReadingTopics.length + repasoExtraTopics.length;
    const totalRepasoQ = [...repasoExamenTopics, ...repasoReadingTopics, ...repasoExtraTopics]
      .reduce((acc, t) => acc + (t.questions || []).length, 0);

    // Actualizar píldoras de conteo
    const pAll = document.getElementById('count-pill-all');
    const pBloque = document.getElementById('count-pill-bloque');
    const pRepaso = document.getElementById('count-pill-repaso');
    if (pAll) pAll.textContent = data.topics.length;
    if (pBloque) pBloque.textContent = bloqueTopics.length;
    if (pRepaso) pRepaso.textContent = totalRepasoTopicsCount;

    // Estado de colapso guardado
    let isBloqueCollapsed = false;
    let isRepasoCollapsed = false;
    try {
      isBloqueCollapsed = localStorage.getItem('patronato_folder_bloque') === 'collapsed';
      isRepasoCollapsed = localStorage.getItem('patronato_folder_repaso') === 'collapsed';
    } catch (e) {}

    // --- CARPETA 1: BLOQUES (TEMARIO OFICIAL) ---
    const fBloque = document.createElement('div');
    fBloque.className = `folder-group ${isBloqueCollapsed ? 'collapsed' : ''}`;
    fBloque.id = 'folder-group-bloque';
    fBloque.innerHTML = `
      <div class="folder-header" onclick="toggleFolder('bloque')">
        <div class="folder-header-left">
          <span class="folder-icon">📁</span>
          <div>
            <div class="folder-title">Bloques (Temario Oficial)</div>
            <div class="folder-subtitle">${bloqueTopics.length} temas del temario • ${totalBloqueQ} preguntas</div>
          </div>
        </div>
        <div class="folder-header-right">
          <span class="folder-badge">${bloqueTopics.length} Temas</span>
          <span class="folder-arrow">▼</span>
        </div>
      </div>
      <div class="folder-content" id="folder-content-bloque">
        <div class="topics-grid" id="grid-bloque"></div>
      </div>
    `;
    const gridBloque = fBloque.querySelector('#grid-bloque');
    bloqueTopics.forEach(t => gridBloque.appendChild(createTopicCard(t)));
    container.appendChild(fBloque);

    // --- CARPETA 2: REPASO DE BLOQUES ---
    const fRepaso = document.createElement('div');
    fRepaso.className = `folder-group ${isRepasoCollapsed ? 'collapsed' : ''}`;
    fRepaso.id = 'folder-group-repaso';
    fRepaso.innerHTML = `
      <div class="folder-header" onclick="toggleFolder('repaso')">
        <div class="folder-header-left">
          <span class="folder-icon">📂</span>
          <div>
            <div class="folder-title">Repaso de Bloques</div>
            <div class="folder-subtitle">Simulacro oficial de examen, lectura y ejercicios extra • ${totalRepasoTopicsCount} tests • ${totalRepasoQ} preguntas</div>
          </div>
        </div>
        <div class="folder-header-right">
          <span class="folder-badge">${totalRepasoTopicsCount} Tests</span>
          <span class="folder-arrow">▼</span>
        </div>
      </div>
      <div class="folder-content" id="folder-content-repaso">
        ${repasoExamenTopics.length > 0 ? `
          <div class="folder-sub-header">
            <span>🎯 Simulacro Oficial Formato Examen (60 preguntas)</span>
          </div>
          <div class="topics-grid" id="grid-repaso-examen" style="margin-bottom: 1.5rem;"></div>
        ` : ''}

        ${repasoReadingTopics.length > 0 ? `
          <div class="folder-sub-header">
            <span>📖 Comprensión Lectora (Reading)</span>
          </div>
          <div class="topics-grid" id="grid-repaso-reading" style="margin-bottom: 1.5rem;"></div>
        ` : ''}

        ${repasoExtraTopics.length > 0 ? `
          <div class="folder-sub-header">
            <span>⚡ Ejercicios Extra de Refuerzo</span>
          </div>
          <div class="topics-grid" id="grid-repaso-extra"></div>
        ` : ''}
      </div>
    `;

    const gridExamen = fRepaso.querySelector('#grid-repaso-examen');
    if (gridExamen) repasoExamenTopics.forEach(t => gridExamen.appendChild(createTopicCard(t)));

    const gridReading = fRepaso.querySelector('#grid-repaso-reading');
    if (gridReading) repasoReadingTopics.forEach(t => gridReading.appendChild(createTopicCard(t)));

    const gridExtra = fRepaso.querySelector('#grid-repaso-extra');
    if (gridExtra) repasoExtraTopics.forEach(t => gridExtra.appendChild(createTopicCard(t)));

    container.appendChild(fRepaso);

    // Aplicar filtro activo actual
    if (state.folderFilter) {
      setFolderFilter(state.folderFilter);
    }
  }

  // --- QUIZ STARTING ---
  function checkPendingBeforeStarting() {
    const raw = localStorage.getItem('patronato_active_quiz');
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        if (saved && saved.questions && saved.questions.length > 0 && !saved.isFinished) {
          const userAns = saved.userAnswers || {};
          const answered = Object.keys(userAns).filter(k => userAns[k] !== undefined && userAns[k] !== '').length;
          return confirm(
            `Tienes un test guardado sin terminar:\n"${saved.title}" (${answered}/${saved.questions.length} respondidas).\n\n` +
            `Si comienzas un nuevo test, el test pendiente anterior se descartará.\n\n¿Deseas empezar este nuevo test de todas formas?`
          );
        }
      } catch (e) {}
    }
    return true;
  }

  window.startTopicQuiz = function (topicId, mode) {
    if (!checkPendingBeforeStarting()) return;
    const data = window.TEST_DATA || { topics: [] };
    const topic = data.topics.find(t => t.id === topicId);
    if (!topic || !topic.questions || topic.questions.length === 0) {
      alert('Este tema no contiene preguntas disponibles.');
      return;
    }

    startQuizSession({
      topicId: topic.id,
      title: topic.title,
      badge: topic.badge || 'Tema',
      mode: mode,
      questions: topic.questions.map(q => ({ ...q, topicTitle: topic.title, topicBadge: topic.badge }))
    });
  };

  window.startGlobalExam = function (count) {
    if (!checkPendingBeforeStarting()) return;
    const all = getAllQuestions();
    if (all.length === 0) {
      alert('No hay preguntas disponibles.');
      return;
    }
    // Shuffle
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));

    startQuizSession({
      topicId: 'global_exam',
      title: `Simulacro General de Oposición (${selected.length} preguntas)`,
      badge: 'Simulacro',
      mode: 'exam',
      questions: selected
    });
  };

  window.startErrorsQuiz = function () {
    if (!checkPendingBeforeStarting()) return;
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
      topicId: 'errors_quiz',
      title: `Repaso de Fallos (${errorQuestions.length} preguntas)`,
      badge: 'Fallos',
      mode: 'practice',
      questions: errorQuestions
    });
  };

  window.startFavsQuiz = function () {
    if (!checkPendingBeforeStarting()) return;
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
      topicId: 'favs_quiz',
      title: `Preguntas Guardadas (${favQuestions.length} preguntas)`,
      badge: 'Favoritas',
      mode: 'practice',
      questions: favQuestions
    });
  };

  function startQuizSession({ topicId, title, badge, mode, questions }) {
    clearInterval(state.timerInterval);

    state.currentQuiz = {
      topicId: topicId || null,
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

    saveActiveQuizState();

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
        if (state.currentQuiz.elapsedSeconds % 5 === 0) {
          saveActiveQuizState();
        }
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
    if (!state.currentQuiz) {
      showDashboard();
      return;
    }
    const modal = document.getElementById('modal-exit-quiz');
    if (modal) {
      modal.classList.add('show');
    } else {
      const shouldSave = confirm(
        '¿Deseas salir del test?\n\n' +
        '• Pulsa ACEPTAR para guardar tu progreso y dejarlo pausado.\n' +
        '• Pulsa CANCELAR para seguir en el test.'
      );
      if (shouldSave) {
        pauseAndSaveQuiz();
      }
    }
  };

  window.closeExitQuizModal = function () {
    const modal = document.getElementById('modal-exit-quiz');
    if (modal) modal.classList.remove('show');
  };

  window.handleExitQuizAction = function (action) {
    closeExitQuizModal();
    if (action === 'pause') {
      pauseAndSaveQuiz();
    } else if (action === 'discard') {
      discardCurrentActiveQuiz();
    }
  };

  function discardCurrentActiveQuiz() {
    clearInterval(state.timerInterval);
    state.currentQuiz = null;
    clearActiveQuizState();
    showDashboard();
    showToast('🗑️ Test cancelado y descartado sin completar.');
  }

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
    saveActiveQuizState();
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
    saveActiveQuizState();
  };

  window.revealInteractiveAnswer = function () {
    const qz = state.currentQuiz;
    const q = qz.questions[qz.currentIndex];
    qz.interactiveChecked[q.id] = true;
    showPracticeFeedback(q, false, true);
    saveActiveQuizState();
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
    if (window.SyncService) window.SyncService.triggerAutoSave();
  }

  // --- NAVIGATION ---
  window.navigateQuestion = function (step) {
    const qz = state.currentQuiz;
    if (!qz) return;
    const newIdx = qz.currentIndex + step;
    if (newIdx >= 0 && newIdx < qz.questions.length) {
      qz.currentIndex = newIdx;
      renderCurrentQuestion();
      saveActiveQuizState();
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
    if (window.SyncService) window.SyncService.triggerAutoSave();
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
        saveActiveQuizState();
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
    clearActiveQuizState();

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
      topicId: qz.topicId || null,
      mode: qz.mode || 'practice',
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
    if (window.SyncService) window.SyncService.triggerAutoSave();

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
      topicId: qz.topicId || null,
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

  // --- TEST PERSISTENCE & RESUME ---
  function saveActiveQuizState() {
    if (!state.currentQuiz || state.currentQuiz.isFinished) return;
    const qz = state.currentQuiz;
    const now = Date.now();
    const dataToSave = {
      topicId: qz.topicId || null,
      title: qz.title,
      badge: qz.badge,
      mode: qz.mode,
      questions: qz.questions,
      currentIndex: qz.currentIndex,
      userAnswers: qz.userAnswers || {},
      interactiveChecked: qz.interactiveChecked || {},
      isFinished: false,
      elapsedSeconds: qz.elapsedSeconds || 0,
      savedAt: now
    };
    try {
      localStorage.setItem('patronato_active_quiz', JSON.stringify(dataToSave));
      localStorage.setItem('patronato_active_quiz_updated_at', now.toString());
    } catch (e) {
      console.warn('No se pudo guardar el test activo en localStorage:', e);
    }
    if (window.SyncService) window.SyncService.triggerAutoSave();
  }

  function clearActiveQuizState() {
    const now = Date.now();
    try {
      localStorage.removeItem('patronato_active_quiz');
      localStorage.setItem('patronato_active_quiz_updated_at', now.toString());
    } catch (e) {}
    renderPendingQuizBanner();
    renderTopics();
    if (window.SyncService) window.SyncService.triggerAutoSave();
  }

  window.pauseAndSaveQuiz = function () {
    if (!state.currentQuiz || state.currentQuiz.isFinished) {
      showDashboard();
      return;
    }
    clearInterval(state.timerInterval);
    saveActiveQuizState();
    state.currentQuiz = null;
    showDashboard();
    showToast('⏸️ Test guardado. Podrás continuarlo cuando quieras desde el menú.');
  };

  function renderPendingQuizBanner() {
    const container = document.getElementById('resume-test-container');
    if (!container) return;

    const raw = localStorage.getItem('patronato_active_quiz');
    if (!raw) {
      container.innerHTML = '';
      return;
    }

    try {
      const saved = JSON.parse(raw);
      if (!saved || !saved.questions || saved.questions.length === 0 || saved.isFinished) {
        container.innerHTML = '';
        return;
      }

      const total = saved.questions.length;
      const userAnswers = saved.userAnswers || {};
      const answeredKeys = Object.keys(userAnswers).filter(k => userAnswers[k] !== undefined && userAnswers[k] !== '');
      const answeredCount = answeredKeys.length;
      const currentQNum = Math.min((saved.currentIndex || 0) + 1, total);
      const progressPct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
      
      const isExam = saved.mode === 'exam';
      const m = Math.floor((saved.elapsedSeconds || 0) / 60);
      const s = (saved.elapsedSeconds || 0) % 60;
      const formattedTime = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

      container.innerHTML = `
        <div class="resume-banner">
          <div class="resume-banner-top">
            <div class="resume-badges-row">
              <span class="resume-tag">⏸️ Test a medias</span>
              <span class="card-badge ${isExam ? 'badge-blue' : 'badge-amber'}">${isExam ? '⏱️ Modo Examen' : '📖 Modo Práctica'}</span>
              <span class="card-badge">${escapeHtml(saved.badge || 'Test')}</span>
            </div>
            <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-muted);">
              Progreso: <strong>${progressPct}%</strong>
            </div>
          </div>
          
          <h3 class="resume-title">${escapeHtml(saved.title)}</h3>
          
          <div class="resume-meta">
            <span class="resume-meta-item">📌 En la pregunta <strong>${currentQNum} de ${total}</strong></span>
            <span class="resume-meta-item">✏️ <strong>${answeredCount} de ${total}</strong> respondidas</span>
            ${isExam ? `<span class="resume-meta-item">⏱️ Tiempo: <strong>${formattedTime}</strong></span>` : ''}
          </div>

          <div class="resume-progress-bar-wrap" title="${progressPct}% respondido">
            <div class="resume-progress-fill" style="width: ${progressPct}%;"></div>
          </div>

          <div class="resume-actions">
            <button class="btn btn-primary" onclick="resumeActiveQuiz()">
              ▶ Continuar test (Pregunta ${currentQNum})
            </button>
            <button class="btn btn-outline btn-sm" onclick="discardActiveQuiz()">
              🗑️ Descartar test
            </button>
          </div>
        </div>
      `;
    } catch (e) {
      console.warn('Error leyendo test pendiente:', e);
      container.innerHTML = '';
    }
  }

  window.resumeActiveQuiz = function () {
    const raw = localStorage.getItem('patronato_active_quiz');
    if (!raw) return;

    try {
      const saved = JSON.parse(raw);
      if (!saved || !saved.questions || saved.questions.length === 0) return;

      clearInterval(state.timerInterval);

      state.currentQuiz = {
        topicId: saved.topicId || null,
        title: saved.title,
        badge: saved.badge || 'Tema',
        mode: saved.mode || 'practice',
        questions: saved.questions,
        currentIndex: Math.min(saved.currentIndex || 0, saved.questions.length - 1),
        userAnswers: saved.userAnswers || {},
        interactiveChecked: saved.interactiveChecked || {},
        isFinished: false,
        startTime: Date.now() - ((saved.elapsedSeconds || 0) * 1000),
        elapsedSeconds: saved.elapsedSeconds || 0
      };

      // Header labels
      document.getElementById('quiz-title').textContent = state.currentQuiz.title;
      document.getElementById('quiz-badge').textContent = state.currentQuiz.badge;
      const modeDesc = state.currentQuiz.mode === 'practice'
        ? 'Modo Práctica • Corrección inmediata y explicación'
        : 'Modo Examen • Sin corrección hasta finalizar (Corte: 70% Apto)';
      document.getElementById('quiz-mode-desc').textContent = modeDesc;

      // Timer
      const timerEl = document.getElementById('quiz-timer');
      if (state.currentQuiz.mode === 'exam') {
        timerEl.style.display = 'inline-flex';
        updateTimerDisplay(state.currentQuiz.elapsedSeconds);
        state.timerInterval = setInterval(() => {
          state.currentQuiz.elapsedSeconds++;
          updateTimerDisplay(state.currentQuiz.elapsedSeconds);
          if (state.currentQuiz.elapsedSeconds % 5 === 0) {
            saveActiveQuizState();
          }
        }, 1000);
      } else {
        timerEl.style.display = 'none';
      }

      showView('view-quiz');
      renderCurrentQuestion();
      renderSidebarGrid();
      showToast(`▶ Test reanudado en la pregunta ${state.currentQuiz.currentIndex + 1}`);
    } catch (e) {
      console.error('Error al reanudar test:', e);
      alert('No se pudo reanudar el test.');
    }
  };

  window.discardActiveQuiz = function () {
    if (confirm('¿Seguro que deseas descartar este test pendiente? Se borrará todo el progreso de este intento.')) {
      clearActiveQuizState();
      showToast('🗑️ Test pendiente descartado.');
    }
  };

  // Auto-guardado ante minimizado, cambio de pestaña o cierre
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveActiveQuizState();
    }
  });

  window.addEventListener('pagehide', () => {
    saveActiveQuizState();
  });

  window.addEventListener('beforeunload', () => {
    saveActiveQuizState();
  });

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
