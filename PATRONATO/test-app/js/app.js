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
    folderFilter: 'all',
    historyReviewFilter: 'all',
    historyResultFilter: 'all',
    historySortOrder: 'date-desc',
    currentViewingHistoryId: null,
    latestFinishedTestId: null,
    pendingDeleteAction: null
  };

  // Asegurar que el Tema 1 en modo práctica figure como completado inicialmente
  ensureDefaultProgress();

  function ensureDefaultProgress() {
    // Si el usuario descartó explícitamente o borró su progreso, no forzarlo de nuevo
    if (localStorage.getItem('patronato_tema1_cleared') === 'true') {
      return;
    }

    // Normalizar IDs para cualquier historial existente
    state.history = state.history.map((h, idx) => {
      if (!h.id) {
        h.id = 'hist_' + (h.date ? new Date(h.date).getTime() : Date.now()) + '_' + idx;
      }
      return h;
    });

    const hasTema1Practice = state.history.some(h => 
      (h.topicId === 'tema_1' || (h.title && h.title.includes('Tema 1'))) && (h.mode === 'practice' || !h.mode)
    );

    if (!hasTema1Practice) {
      let tema1Questions = [];
      if (window.TEST_DATA && window.TEST_DATA.topics) {
        const t1 = window.TEST_DATA.topics.find(t => t.id === 'tema_1');
        if (t1 && t1.questions) {
          tema1Questions = t1.questions.map(q => ({
            id: q.id,
            number: q.number,
            type: q.type || 'choice',
            question: q.question,
            options: q.options || null,
            answer: q.answer,
            explanation: q.explanation || '',
            section: q.section || '',
            readingText: q.readingText || null,
            userAnswer: q.answer,
            isCorrect: true,
            isBlank: false
          }));
        }
      }

      state.history.unshift({
        id: 'hist_tema1_seed',
        date: new Date().toISOString(),
        topicId: 'tema_1',
        mode: 'practice',
        title: 'Tema 1: Formas verbales, To be y Presente simple',
        badge: 'Tema 1',
        total: 45,
        correct: 45,
        wrong: 0,
        blank: 0,
        score: 10.0,
        passed: true,
        timeSeconds: 720,
        questionsReview: tema1Questions
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
    initSpecialModesFolder();
    renderTopics();
    renderPendingQuizBanner();
  }

  function initSpecialModesFolder() {
    const fEspeciales = document.getElementById('folder-group-especiales');
    if (!fEspeciales) return;
    try {
      const isCollapsed = localStorage.getItem('patronato_folder_especiales') === 'collapsed';
      fEspeciales.classList.toggle('collapsed', isCollapsed);
    } catch (e) {}
  }

  window.showDashboard = function () {
    if (state.currentQuiz && !state.currentQuiz.isFinished) {
      clearInterval(state.timerInterval);
      saveActiveQuizState();
      state.currentQuiz = null;
    }
    showView('view-dashboard');
    updateStatsBar();
    initSpecialModesFolder();
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

    const historyBadgeEl = document.getElementById('count-history-badge');
    if (historyBadgeEl) historyBadgeEl.textContent = state.history.length;

    const historyCountEl = document.getElementById('count-history');
    if (historyCountEl) historyCountEl.textContent = state.history.length;
  }

  function getQuestionById(qId) {
    if (!qId || !window.TEST_DATA || !window.TEST_DATA.topics) return null;
    for (const t of window.TEST_DATA.topics) {
      const found = (t.questions || []).find(q => q.id === qId);
      if (found) {
        return { ...found, topicTitle: t.title, topicBadge: t.badge };
      }
    }
    return null;
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
    document.querySelectorAll('.folder-filter-pills .pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
    });

    // Mostrar/ocultar carpetas según el filtro seleccionado
    document.querySelectorAll('#topics-container .folder-group').forEach(group => {
      const gFilter = group.getAttribute('data-block-id');
      if (filter === 'all' || filter === gFilter) {
        group.style.display = 'block';
      } else {
        group.style.display = 'none';
      }
    });
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

    // 1. Agrupar temas por bloque (usando blockId o deduciendo)
    const blocksOrder = [];
    const blocksMap = {};

    data.topics.forEach(topic => {
      let bId = topic.blockId;
      let bName = topic.blockName;

      if (!bId) {
        const tid = topic.id.toLowerCase();
        if (tid.includes('repaso') || tid.includes('simulacro') || tid.includes('bloque_1_examen') || tid.includes('embed') || tid.includes('reading')) {
          bId = 'repaso_b1';
          bName = 'Repaso de Bloque 1';
        } else if (tid.startsWith('tema_6')) {
          bId = 'bloque_2';
          bName = 'Bloque 2';
        } else {
          bId = 'bloque_1';
          bName = 'Bloque 1';
        }
      }

      if (!blocksMap[bId]) {
        blocksMap[bId] = {
          id: bId,
          name: bName || bId,
          isRepaso: bId.startsWith('repaso_'),
          topics: []
        };
        blocksOrder.push(bId);
      }
      blocksMap[bId].topics.push(topic);
    });

    // 2. Renderizar dinámicamente las píldoras de filtrado
    const pillsContainer = document.getElementById('folder-filter-pills');
    if (pillsContainer) {
      pillsContainer.innerHTML = '';
      
      // Píldora "Todos"
      const btnAll = document.createElement('button');
      btnAll.className = `pill-btn ${state.folderFilter === 'all' ? 'active' : ''}`;
      btnAll.id = 'pill-all';
      btnAll.setAttribute('data-filter', 'all');
      btnAll.onclick = () => window.setFolderFilter('all');
      btnAll.innerHTML = `Todos (<span id="count-pill-all">${data.topics.length}</span>)`;
      pillsContainer.appendChild(btnAll);

      // Píldoras por cada bloque detectado
      blocksOrder.forEach(bId => {
        const block = blocksMap[bId];
        const btnBlock = document.createElement('button');
        const isActive = state.folderFilter === bId;
        btnBlock.className = `pill-btn ${isActive ? 'active' : ''}`;
        btnBlock.id = `pill-${bId}`;
        btnBlock.setAttribute('data-filter', bId);
        btnBlock.onclick = () => window.setFolderFilter(bId);
        const icon = block.isRepaso ? '📂' : '📁';
        btnBlock.innerHTML = `${icon} ${block.name} (<span id="count-pill-${bId}">${block.topics.length}</span>)`;
        pillsContainer.appendChild(btnBlock);
      });
    }

    // 3. Renderizar cada carpeta de bloque
    blocksOrder.forEach(bId => {
      const block = blocksMap[bId];
      const totalQ = block.topics.reduce((acc, t) => acc + (t.questions || []).length, 0);

      let isCollapsed = false;
      try {
        isCollapsed = localStorage.getItem('patronato_folder_' + bId) === 'collapsed';
      } catch (e) {}

      const fGroup = document.createElement('div');
      fGroup.className = `folder-group ${isCollapsed ? 'collapsed' : ''}`;
      fGroup.id = `folder-group-${bId}`;
      fGroup.setAttribute('data-block-id', bId);

      const icon = block.isRepaso ? '📂' : '📁';
      const badgeSuffix = block.isRepaso ? 'Tests' : 'Temas';
      const subtitle = block.isRepaso 
        ? `Simulacro oficial de examen, lectura y ejercicios extra • ${block.topics.length} tests • ${totalQ} preguntas`
        : `${block.topics.length} temas del temario • ${totalQ} preguntas`;

      // Si es una carpeta de repaso, subcategorizar (Simulacros, Reading, Refuerzo) si aplica
      if (block.isRepaso) {
        const examTopics = block.topics.filter(t => t.id.includes('examen') || t.id.includes('simulacro'));
        const readingTopics = block.topics.filter(t => t.id.includes('reading'));
        const extraTopics = block.topics.filter(t => !t.id.includes('examen') && !t.id.includes('simulacro') && !t.id.includes('reading'));

        fGroup.innerHTML = `
          <div class="folder-header" onclick="toggleFolder('${bId}')">
            <div class="folder-header-left">
              <span class="folder-icon">${icon}</span>
              <div>
                <div class="folder-title">${block.name}</div>
                <div class="folder-subtitle">${subtitle}</div>
              </div>
            </div>
            <div class="folder-header-right">
              <span class="folder-badge">${block.topics.length} ${badgeSuffix}</span>
              <span class="folder-arrow">▼</span>
            </div>
          </div>
          <div class="folder-content" id="folder-content-${bId}">
            ${examTopics.length > 0 ? `
              <div class="folder-sub-header">
                <span>🎯 Simulacro Oficial Formato Examen (60 preguntas)</span>
              </div>
              <div class="topics-grid" id="grid-${bId}-examen" style="margin-bottom: 1.5rem;"></div>
            ` : ''}

            ${readingTopics.length > 0 ? `
              <div class="folder-sub-header">
                <span>📖 Comprensión Lectora (Reading)</span>
              </div>
              <div class="topics-grid" id="grid-${bId}-reading" style="margin-bottom: 1.5rem;"></div>
            ` : ''}

            ${extraTopics.length > 0 ? `
              <div class="folder-sub-header">
                <span>⚡ Ejercicios Extra de Refuerzo</span>
              </div>
              <div class="topics-grid" id="grid-${bId}-extra"></div>
            ` : ''}
          </div>
        `;

        const gridEx = fGroup.querySelector(`#grid-${bId}-examen`);
        if (gridEx) examTopics.forEach(t => gridEx.appendChild(createTopicCard(t)));

        const gridRd = fGroup.querySelector(`#grid-${bId}-reading`);
        if (gridRd) readingTopics.forEach(t => gridRd.appendChild(createTopicCard(t)));

        const gridExr = fGroup.querySelector(`#grid-${bId}-extra`);
        if (gridExr) extraTopics.forEach(t => gridExr.appendChild(createTopicCard(t)));

      } else {
        // Bloque estándar con temas oficiales
        fGroup.innerHTML = `
          <div class="folder-header" onclick="toggleFolder('${bId}')">
            <div class="folder-header-left">
              <span class="folder-icon">${icon}</span>
              <div>
                <div class="folder-title">${block.name}</div>
                <div class="folder-subtitle">${subtitle}</div>
              </div>
            </div>
            <div class="folder-header-right">
              <span class="folder-badge">${block.topics.length} ${badgeSuffix}</span>
              <span class="folder-arrow">▼</span>
            </div>
          </div>
          <div class="folder-content" id="folder-content-${bId}">
            <div class="topics-grid" id="grid-${bId}"></div>
          </div>
        `;

        const grid = fGroup.querySelector(`#grid-${bId}`);
        block.topics.forEach(t => grid.appendChild(createTopicCard(t)));
      }

      container.appendChild(fGroup);
    });

    // Aplicar filtro activo actual
    if (state.folderFilter && typeof window.setFolderFilter === 'function') {
      window.setFolderFilter(state.folderFilter);
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
      showPracticeFeedback(q, userSelected === q.answer, false, userSelected);
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
      showPracticeFeedback(q, isCorrect, false, userVal);
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
    showPracticeFeedback(q, isCorrect, false, val);
    renderSidebarGrid();
    saveActiveQuizState();
  };

  window.revealInteractiveAnswer = function () {
    const qz = state.currentQuiz;
    const q = qz.questions[qz.currentIndex];
    qz.interactiveChecked[q.id] = true;
    showPracticeFeedback(q, false, true, null);
    saveActiveQuizState();
  };

  function checkTextAnswer(userVal, correctVal) {
    if (!userVal || !correctVal) return false;
    const cleanUser = userVal.toLowerCase().replace(/['".,!?;]/g, '').trim();
    
    // Check if multiple alternatives (e.g. 'each other / one another')
    const options = correctVal.split('/').map(s => s.toLowerCase().replace(/['".,!?;]/g, '').trim());
    return options.includes(cleanUser);
  }

  function getMistakeExplanation(q, userPick) {
    if (!q || !userPick || userPick === q.answer) return '';

    const isChoice = q.type === 'choice' && q.options;
    const userLetter = isChoice ? String(userPick).toUpperCase() : null;
    const userText = isChoice ? (q.options[userLetter] || '').trim() : String(userPick).trim();
    const correctLetter = isChoice ? String(q.answer).toUpperCase() : null;
    const correctText = isChoice ? (q.options[correctLetter] || '').trim() : String(q.answer).trim();

    const prompt = (q.question || '').toLowerCase();
    const userLower = userText.toLowerCase();
    const correctLower = correctText.toLowerCase();
    const section = (q.section || '').toLowerCase();

    // Si es sección de lectura (Reading)
    if (q.readingText || section.includes('reading') || section.includes('comprensi')) {
      return `Según el texto de lectura, la opción elegida no se corresponde con los datos expuestos en el pasaje o contradice la información del autor. La opción correcta fundamentada en el texto es "${escapeHtml(correctText)}".`;
    }

    // 1. Deformidades sintácticas en distractores
    // 1a. 'to be' + verbo base (ej. 'is rain', 'are have', 'is leave', 'am carry', 'am receive', 'are you do', 'is work', 'are live')
    if (/\b(am|is|are|was|were)\s+([a-z]+)\b/.test(userLower)) {
      const match = userLower.match(/\b(am|is|are|was|were)\s+([a-z]+)\b/);
      const beForm = match[1];
      const nextWord = match[2];
      const isSpecial = ['going', 'not', 'being', 'having', 'doing'].includes(nextWord) || nextWord.endsWith('ing') || nextWord.endsWith('ed') || nextWord.endsWith('en');
      if (!isSpecial && !['very', 'so', 'too', 'quite', 'always', 'usually', 'often', 'never', 'just'].includes(nextWord)) {
        return `La combinación de <em>to be</em> (${escapeHtml(beForm)}) con un verbo en infinitivo simple (<em>${escapeHtml(nextWord)}</em>) es una <strong>estructura agramatical</strong> en inglés. Para expresar una acción en desarrollo se requiere el gerundio en <em>-ing</em> (${escapeHtml(beForm)} ${escapeHtml(nextWord)}ing) o pasiva con participio, nunca el infinitivo sin 'to'.`;
      }
    }

    // 1b. Perífrasis incompleta de 'going to' sin 'to be' (ej. 'going to rain', 'going to do', 'going to travel')
    if (/^going\s+to\b/i.test(userLower) || (userLower.includes('going to') && !/\b(am|is|are|was|were)\b/.test(userLower))) {
      return `La perífrasis de futuro con intención o evidencia requiere la presencia obligatoria del verbo auxiliar <em>to be</em>: <strong>am / is / are + going to + infinitivo</strong>. En "${escapeHtml(userText)}" falta la forma correspondiente de <em>to be</em>.`;
    }

    // 1c. Auxiliar modal 'will' unido directamente a gerundio -ing (ej. 'will having', 'will travelling', 'will doing')
    if (/\bwill\s+([a-z]+ing)\b/i.test(userLower)) {
      const match = userLower.match(/\bwill\s+([a-z]+ing)\b/i);
      return `El auxiliar modal <em>will</em> siempre rige un infinitivo sin 'to' (bare infinitive). No se puede colocar un gerundio (<em>${escapeHtml(match[1])}</em>) directamente detrás de <em>will</em>. Si se desea expresar futuro continuo, la estructura exige el auxiliar 'be' intermedio: <strong>will be + -ing</strong>.`;
    }

    // 1d. Combinaciones de auxiliares incompatibles (ej. 'do you going to', 'am be travelling')
    if (/do\s+you\s+going/i.test(userLower) || /am\s+be\b/i.test(userLower)) {
      return `Estructura agramatical: no se pueden combinar auxiliares incompatibles en la misma perífrasis verbal.`;
    }

    // 2. Genitivo Sajón vs Plural Simple
    if ((userLower.includes("'s") || userLower.includes("s'")) && !correctLower.includes("'")) {
      return `Has seleccionado una forma con <strong>apóstrofo de genitivo sajón</strong> (<em>${escapeHtml(userText)}</em>). En esta frase no hay ninguna relación de pertenencia ni objeto poseído a continuación; se requiere un simple <strong>sustantivo en plural</strong> (<strong>${escapeHtml(correctText)}</strong>).`;
    }
    if (!userLower.includes("'") && (correctLower.includes("'s") || correctLower.includes("s'"))) {
      return `En esta oración existe una relación de posesión que exige el <strong>genitivo sajón</strong> con apóstrofo (<strong>${escapeHtml(correctText)}</strong>), no un plural o sustantivo simple.`;
    }
    if (userLower.includes("'") && correctLower.includes("'")) {
      if (userLower.includes("s'") && correctLower.includes("'s")) {
        return `El genitivo con apóstrofo final (<em>s'</em>) se emplea exclusivamente para plurales regulares terminados en -s. Para sustantivos singulares o <strong>plurales irregulares que no acaban en -s</strong> (como <em>children, women, men</em>), el genitivo se forma siempre con <strong>'s</strong> (<em>${escapeHtml(correctText)}</em>).`;
      }
      if (userLower.includes("'s") && correctLower.includes("s'")) {
        return `Para sustantivos en plural regular que ya terminan en -s (como <em>students, parents, teachers</em>), el genitivo sajón se forma simplemente añadiendo el apóstrofo al final (<strong>s'</strong>), sin duplicar la 's'.`;
      }
    }

    // 3. Reglas ortográficas de plurales (Tema 4)
    if (userLower.endsWith('ys') && correctLower.endsWith('ies')) {
      return `Regla ortográfica de plurales: los sustantivos terminados en <strong>consonante + 'y'</strong> cambian la 'y' por <strong>-ies</strong> (<em>${escapeHtml(correctText)}</em>), no añaden simplemente '-s'.`;
    }
    if (userLower.endsWith('eies') || userLower.endsWith('keyes') || (userLower.endsWith('ies') && correctLower.endsWith('ys'))) {
      return `Regla ortográfica: los sustantivos terminados en <strong>vocal + 'y'</strong> (como <em>key, day, boy</em>) forman el plural añadiendo simplemente <strong>-s</strong> (<em>${escapeHtml(correctText)}</em>), sin cambiar la 'y'.`;
    }
    if (userLower.endsWith('buss') || userLower.endsWith('workeres')) {
      return `Error de ortografía en el plural. La terminación regular para este sustantivo es <strong>${escapeHtml(correctText)}</strong>.`;
    }
    if (userLower === 'photoes' && correctLower === 'photos') {
      return `Sustantivos de origen abreviado o técnico como <em>photo</em> (de photograph) forman el plural añadiendo simplemente <strong>-s</strong> (<em>photos</em>), no '-es'.`;
    }

    // 4. Oraciones temporales con valor de futuro (as soon as, when, until, before, after, unless, etc.)
    const timeClauseRegex = /\b(as soon as|when|until|till|before|after|unless|as long as|by the time)\b/i;
    if (timeClauseRegex.test(prompt)) {
      const conjMatch = prompt.match(timeClauseRegex);
      const conj = conjMatch ? conjMatch[0] : 'la conjunción temporal';
      if (/\bwill\b/i.test(userLower)) {
        return `<strong>Regla de oro de las oraciones temporales:</strong> En las cláusulas subordinadas introducidas por conectores de tiempo como <em>${escapeHtml(conj)}</em>, la gramática inglesa <strong>prohíbe el uso de 'will'</strong>. En su lugar se debe emplear el <strong>Presente Simple</strong> con valor de futuro (<em>${escapeHtml(correctText)}</em>).`;
      }
      if (userLower.endsWith('ing') && !/\b(am|is|are)\b/.test(userLower)) {
        return `Tras la conjunción temporal <em>${escapeHtml(conj)}</em> la oración subordinada requiere un verbo en <strong>Presente Simple</strong> conjugado, no un gerundio aislado.`;
      }
    }

    // 5. Tiempos de Futuro (Tema 6)
    // 5a. Evidencia visual directa / inmediata: Look at those clouds / watch out / look!
    if (/look\s+at\b|clouds|look!|watch\s+out|be\s+careful|sky/i.test(prompt)) {
      if (/\bwill\b/i.test(userLower)) {
        return `Aunque <em>will</em> se usa para predicciones generales o basadas en opinión subjetiva (<em>I think...</em>), cuando existe <strong>evidencia visual directa o indicios presentes claros</strong> (como ${prompt.includes('cloud') ? 'las nubes oscuras' : 'lo que vemos'}), la norma del temario exige <strong>be going to</strong> para predicciones inminentes.`;
      }
      if (userLower === 'rains' || userLower === 'snows' || (!userLower.includes('going') && !userLower.includes('will'))) {
        return `El Presente Simple describe hábitos o estados permanentes. Cuando hay <strong>evidencia física o visual presente</strong> de que algo va a ocurrir en breve, se debe usar <strong>be going to</strong> (<em>${escapeHtml(correctText)}</em>).`;
      }
    }

    // 5b. Opinión / predicción subjetiva con 'I think', 'probably', 'maybe', 'I believe', etc.
    if (/i\s+think|probably|maybe|i\s+doubt|i\s+guess|perhaps|in\s+my\s+opinion/i.test(prompt)) {
      if (correctLower.includes('will') && !userLower.includes('will')) {
        return `Con expresiones de opinión, creencia o incertidumbre como <em>${prompt.includes('think') ? 'I think' : 'predicciones subjetivas'}</em> sobre el futuro, se utiliza <strong>will + infinitivo</strong>, no el presente simple ni formas continuas.`;
      }
    }

    // 5c. Decisión espontánea u ofrecimiento inmediato: "heavy", "doorbell", "phone is ringing", "I'll carry/help"
    if (/heavy|phone|doorbell|i\s+carry|i\s+help|thirsty|hungry|cold\s+in\s+here/i.test(prompt)) {
      if (!userLower.includes('will') && correctLower.includes('will')) {
        return `Para <strong>decisiones espontáneas u ofrecimientos inmediatos</strong> tomados en el mismo instante de hablar (como ofrecerse a llevar algo pesado o abrir la puerta), se emplea <strong>will + infinitivo</strong>, no el presente simple (que expresaría una rutina periódica).`;
      }
    }

    // 5d. Horarios públicos programados (bus, train, plane, flight, starts at, leaves at, opens at)
    if (/bus|train|plane|flight|cinema|film|museum|class|match|concert/i.test(prompt) && (/\bat\s+\d/i.test(prompt) || /tomorrow\s+morning|this\s+evening/i.test(prompt))) {
      if (userLower.includes('will') || userLower.includes('going to') || userLower.includes('is leave')) {
        return `Para <strong>horarios fijos oficiales, transporte público o eventos de calendario preestablecido</strong> (como autobuses, trenes o vuelos), el inglés emplea el <strong>Presente Simple</strong> con valor de futuro (con la terminación <em>-s</em> de 3ª persona: <em>${escapeHtml(correctText)}</em>), en lugar de 'will' o 'be going to'.`;
      }
    }

    // 5e. Planes personales concertados previamente (the plan is ready, tickets, arranged, meeting, dinner with)
    if (/plan\s+is\s+ready|arranged|dinner\s+with|doctor|dentist|appointment/i.test(prompt)) {
      if (!userLower.includes('ing') && correctLower.includes('ing')) {
        return `Para <strong>planes personales acordados previamente con otras personas</strong> (citas fijadas en la agenda o preparativos cerrados), el inglés utiliza prioritariamente el <strong>Present Continuous con valor de futuro</strong> (<em>am/is/are + -ing</em>).`;
      }
    }

    // 5f. Future continuous: at this time tomorrow, this time next week, at 10 am tomorrow
    if (/at\s+this\s+time\s+tomorrow|this\s+time\s+next\s+week|at\s+\d{1,2}\s*(am|pm)\s+tomorrow/i.test(prompt)) {
      if (correctLower.includes('will be') && !userLower.includes('will be')) {
        return `Marcadores temporales precisos como <em>at this time tomorrow</em> sitúan una acción que <strong>estará en pleno desarrollo en un punto futuro concreto</strong>, exigiendo la estructura de <strong>Future Continuous</strong> (<strong>will be + verbo-ing</strong>).`;
      }
    }

    // 6. Good vs Well (Tema 5)
    if ((userLower === 'well' && correctLower === 'good') || (userLower === 'good' && correctLower === 'well')) {
      if (userLower === 'well' && correctLower === 'good') {
        return `Delante de un sustantivo para calificarlo se requiere el <strong>adjetivo</strong> (<strong>good</strong>). <em>Well</em> se reserva principalmente para su función como adverbio de modo que modifica a un verbo.`;
      } else {
        return `Para modificar la manera en que se ejecuta una acción verbal (cómo conduce, trabaja o habla) se necesita el <strong>adverbio de modo</strong> (<strong>well</strong>), no la forma adjetiva (<em>good</em>).`;
      }
    }

    // 7. Adjetivo vs Adverbio en -ly (Tema 5)
    if (/\b(are|is|am|was|were|seem|seems|feel|feels|look|looks|taste|smell)\s+____/i.test(prompt) || /\b(are|is|am|was|were)\s+____,/i.test(prompt)) {
      if (userLower.endsWith('ly') && !correctLower.endsWith('ly')) {
        return `Tras verbos copulativos o atributivos como <em>to be</em> (${prompt.includes('are') ? 'are' : 'is/was'}), la función sintáctica requiere un <strong>adjetivo</strong> atributivo (<strong>${escapeHtml(correctText)}</strong>), no un adverbio de modo en <em>-ly</em>.`;
      }
    }
    if (correctLower.endsWith('ly') && !userLower.endsWith('ly')) {
      return `La palabra modifica la forma en que se ejecuta la acción del verbo. Por lo tanto, la función gramatical exige un <strong>adverbio de modo</strong> (habitualmente terminado en <em>-ly</em>: <strong>${escapeHtml(correctText)}</strong>), no la forma adjetiva (<em>${escapeHtml(userText)}</em>).`;
    }
    if (userLower.endsWith('ly') && !correctLower.endsWith('ly')) {
      return `<em>${escapeHtml(userText)}</em> es un adverbio. En esta posición se necesita la forma del <strong>adjetivo</strong> (<strong>${escapeHtml(correctText)}</strong>).`;
    }

    // 8. Pronombres y posesión (Tema 3)
    const possAdjs = ['my', 'your', 'his', 'her', 'its', 'our', 'their'];
    const possPronouns = ['mine', 'yours', 'his', 'hers', 'its', 'ours', 'theirs'];
    const subjPronouns = ['i', 'he', 'she', 'we', 'they'];
    const objPronouns = ['me', 'him', 'her', 'us', 'them'];
    const reflexives = ['myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'themselves'];

    // 8a. Posición de sujeto antes del verbo principal
    if (/^____\b|[\.\?!]\s*____\b/i.test(prompt)) {
      if (subjPronouns.includes(correctLower)) {
        if (possAdjs.includes(userLower)) {
          return `<em>${escapeHtml(userText)}</em> es un adjetivo posesivo que siempre requiere un sustantivo detrás. Al inicio de la oración como sujeto del verbo se necesita un <strong>pronombre personal sujeto</strong> (<strong>${escapeHtml(correctText)}</strong>).`;
        }
        if (possPronouns.includes(userLower)) {
          return `<em>${escapeHtml(userText)}</em> es un pronombre posesivo ('el suyo/la suya'). En la posición de sujeto que realiza la acción se requiere el <strong>pronombre personal sujeto</strong> (<strong>${escapeHtml(correctText)}</strong>).`;
        }
        if (objPronouns.includes(userLower)) {
          return `<em>${escapeHtml(userText)}</em> es un pronombre objeto. Para ejecutar la acción verbal como sujeto se debe utilizar el <strong>pronombre sujeto</strong> (<strong>${escapeHtml(correctText)}</strong>).`;
        }
        if (reflexives.includes(userLower)) {
          return `<em>${escapeHtml(userText)}</em> es un pronombre reflexivo y no puede funcionar como sujeto principal de la oración; se requiere el <strong>pronombre personal sujeto</strong> (<strong>${escapeHtml(correctText)}</strong>).`;
        }
      }
    }

    // 8b. Posición de objeto tras preposición o verbo
    if (/\b(to|with|for|at|about|between|after|before|behind)\s+____/i.test(prompt)) {
      if (objPronouns.includes(correctLower)) {
        if (subjPronouns.includes(userLower)) {
          return `Detrás de una preposición (<em>${prompt.match(/\b(to|with|for|at|about|between|after|before|behind)\b/i)[0]}</em>) la gramática inglesa prohíbe los pronombres sujeto. Se debe emplear obligatoriamente el <strong>pronombre objeto</strong> (<strong>${escapeHtml(correctText)}</strong>).`;
        }
        if (possAdjs.includes(userLower)) {
          return `<em>${escapeHtml(userText)}</em> es un adjetivo posesivo y necesita un sustantivo detrás. Tras la preposición se requiere el <strong>pronombre personal objeto</strong> (<strong>${escapeHtml(correctText)}</strong>).`;
        }
        if (possPronouns.includes(userLower)) {
          return `En esta frase la preposición rige a las personas como objeto de la acción, por lo que corresponde el <strong>pronombre objeto</strong> (<strong>${escapeHtml(correctText)}</strong>), no el pronombre posesivo.`;
        }
      }
    }

    // 8c. Adjetivo posesivo delante de sustantivo
    if (/____\s+[a-z]+/i.test(prompt) && possAdjs.includes(correctLower)) {
      if (possPronouns.includes(userLower)) {
        return `<em>${escapeHtml(userText)}</em> es un pronombre posesivo ('el suyo') que sustituye al nombre y nunca puede preceder a un sustantivo. Para acompañar al sustantivo que sigue se usa el <strong>adjetivo posesivo</strong> (<strong>${escapeHtml(correctText)}</strong>).`;
      }
      if (objPronouns.includes(userLower)) {
        return `<em>${escapeHtml(userText)}</em> es un pronombre objeto. Delante del sustantivo poseído para indicar pertenencia se debe usar el <strong>adjetivo posesivo</strong> (<strong>${escapeHtml(correctText)}</strong>).`;
      }
      if (subjPronouns.includes(userLower)) {
        return `Delante del sustantivo poseído se requiere el <strong>adjetivo posesivo</strong> (<strong>${escapeHtml(correctText)}</strong>), no el pronombre sujeto.`;
      }
    }

    // 8d. Pronombre posesivo al final o aislado
    if (possPronouns.includes(correctLower) && possAdjs.includes(userLower)) {
      return `<em>${escapeHtml(userText)}</em> es un adjetivo posesivo y exige un sustantivo detrás (ej: <em>${escapeHtml(userText)} notebook</em>). Al encontrarse al final de la frase sin sustantivo, la función corresponde al <strong>pronombre posesivo</strong> (<strong>${escapeHtml(correctText)}</strong>).`;
    }

    // 8e. Reflexivo vs Recíproco
    if ((userLower.includes('themselves') || userLower.includes('each other')) && (correctLower.includes('themselves') || correctLower.includes('each other'))) {
      if (userLower.includes('themselves')) {
        return `Los pronombres reflexivos como <em>themselves</em> indican que la acción recae sobre el mismo sujeto que la ejecuta ('a sí mismos'). Para expresar una <strong>acción recíproca mutua</strong> entre dos o más personas ('el uno al otro') se utiliza <strong>each other</strong> (o <em>one another</em>).`;
      } else {
        return `<em>Each other</em> expresa reciprocidad ('el uno al otro'). Cuando los sujetos ejecutan la acción sobre ellos mismos se debe usar el pronombre reflexivo <strong>themselves</strong>.`;
      }
    }

    // 9. Demostrativos (Tema 4): this/that vs these/those
    const demSingular = ['this', 'that'];
    const demPlural = ['these', 'those'];
    if (demSingular.includes(userLower) && demPlural.includes(correctLower)) {
      return `<em>${escapeHtml(userText)}</em> es un demostrativo de número <strong>singular</strong> y no puede concordar con un sustantivo plural o una referencia plural. Para plurales se exige <strong>${escapeHtml(correctText)}</strong> (these/those).`;
    }
    if (demPlural.includes(userLower) && demSingular.includes(correctLower)) {
      return `<em>${escapeHtml(userText)}</em> es un demostrativo de número <strong>plural</strong> y no puede acompañar a un sustantivo singular o incontable. En este caso se requiere la forma singular <strong>${escapeHtml(correctText)}</strong> (this/that).`;
    }

    // 10. Concordancia Sujeto-Verbo y 3ª persona singular (Tema 1 & Repasos)
    // 10a. Sujeto plural con verbo acabado en -s
    const pluralSubjectsRegex = /\b(the children|children|the women|women|the men|men|people|the people|the police|they|the hotels|hotels|my parents|parents|the students|students|the workers|workers)\b/i;
    if (pluralSubjectsRegex.test(prompt)) {
      const subjMatch = prompt.match(pluralSubjectsRegex)[0];
      if (/[a-z]+(s|es)\b/i.test(userLower) && !userLower.endsWith('ss') && !userLower.endsWith('us') && userLower !== 'is' && userLower !== 'has') {
        if (!pluralSubjectsRegex.test(userLower)) {
          return `El sujeto (<em>${escapeHtml(subjMatch)}</em>) es <strong>plural</strong> (equivale a 'they'). En Presente Simple afirmativo los sujetos plurales llevan el verbo en su <strong>forma base</strong>; la desinencia <strong>-s / -es</strong> solo se aplica a la 3ª persona del singular (he / she / it).`;
        }
      }
      if (userLower === 'has') {
        return `El sujeto (<em>${escapeHtml(subjMatch)}</em>) es un sustantivo plural, por lo que el verbo correspondiente es <strong>have</strong>, reservando <em>has</em> únicamente para la 3ª persona singular (he / she / it).`;
      }
      if (userLower === 'is') {
        return `El sujeto (<em>${escapeHtml(subjMatch)}</em>) es plural, por lo que la forma requerida del verbo <em>to be</em> es <strong>are</strong> (o <em>were</em> en pasado), no 'is'.`;
      }
    }

    // 10b. Sujeto singular de 3ª persona con verbo base sin -s
    if (correctLower.endsWith('s') && !userLower.endsWith('s') && !userLower.includes('is') && !userLower.includes('has')) {
      if (/\b(he|she|it|the\s+([a-z]+\s+)?(mechanic|doctor|manager|sister|mother|train|bus|car|government|teacher|driver|room))\b/i.test(prompt)) {
        return `El sujeto de la oración es <strong>3ª persona del singular</strong> (he/she/it). En Presente Simple afirmativo, la norma gramatical exige añadir obligatoriamente la desinencia <strong>-s / -es</strong> al verbo (<strong>${escapeHtml(correctText)}</strong>).`;
      }
    }

    // 10c. 'Have got' vs 'Do/Does have'
    if (/\bgot\b/i.test(prompt)) {
      if (/\b(does|do|did)\b/i.test(userLower)) {
        return `En la pregunta aparece la partícula <strong>got</strong>. Cuando se utiliza la estructura británica de posesión <em>have got</em>, la interrogación se formula directamente con el verbo tener: <strong>Have / Has + sujeto + got...?</strong>. Los auxiliares <em>Do / Does</em> solo se usan cuando el verbo es 'have' simple sin 'got' (ej: <em>Does she have...?</em>).`;
      }
      if (userLower === 'have' && correctLower === 'has') {
        return `El sujeto de la oración es 3ª persona del singular, por lo que el auxiliar correcto es <strong>Has</strong> (Has ... got?), no <em>Have</em>.`;
      }
      if (userLower === 'has' && correctLower === 'have') {
        return `El sujeto de la oración es plural o 'I/you/we/they', por lo que el auxiliar correspondiente es <strong>Have</strong> (Have ... got?), no <em>Has</em>.`;
      }
      if (userLower === 'is' || userLower === 'are') {
        return `La estructura con <em>got</em> para expresar posesión se forma con el verbo <strong>have/has got</strong>, nunca con el verbo <em>to be</em>.`;
      }
      if (userLower === 'haves') {
        return `La forma <em>haves</em> no existe en inglés. La 3ª persona irregular de <em>have</em> es <strong>has</strong>.`;
      }
    }

    // 10d. Auxiliar 'do/does' usado con adjetivos
    if (/\b(do|does|did)\b/i.test(userLower) && /\b(responsible|ready|tired|happy|busy|sure|late|early|available|afraid|interested)\b/i.test(prompt)) {
      return `En la frase hay un adjetivo o atributo. En inglés, las oraciones atributivas o de estado se construyen con el verbo <strong>to be</strong> (<em>am / is / are</em>), nunca con el auxiliar léxico <em>do / does</em>.`;
    }

    // 11. Stative Verbs (Tema 2)
    const stativeVerbs = ['know', 'want', 'like', 'love', 'hate', 'understand', 'believe', 'remember', 'prefer', 'need', 'belong', 'mean', 'seem', 'hear', 'see', 'contain', 'consist'];
    for (const sv of stativeVerbs) {
      if (userLower.includes(sv + 'ing') || userLower.includes(sv.slice(0, -1) + 'ing')) {
        return `El verbo <em>${sv}</em> es un <strong>stative verb</strong> (verbo de estado, percepción o cognición). Según las normas gramaticales, estos verbos no admiten tiempos continuos (<em>-ing</em>) para describir estados, requiriendo su forma en <strong>Presente Simple</strong> (<em>${escapeHtml(correctText)}</em>).`;
      }
    }

    // 12. Adjetivos en -ed vs -ing (Tema 5)
    if (userLower.endsWith('ed') && correctLower.endsWith('ing')) {
      return `Confusión clásica de adjetivos participiales: las formas terminadas en <strong>-ed</strong> describen cómo se <strong>siente</strong> una persona (el estado emocional recibido). Para describir la cualidad o el estímulo que <strong>provoca</strong> esa emoción (la película, el libro o la situación) se debe emplear la terminación en <strong>-ing</strong> (<strong>${escapeHtml(correctText)}</strong>).`;
    }
    if (userLower.endsWith('ing') && correctLower.endsWith('ed')) {
      return `Las terminaciones en <strong>-ing</strong> definen la cualidad intrínseca de una situación o estímulo. Para expresar el <strong>sentimiento o emoción que experimenta una persona</strong> ante algo, la norma gramatical exige el adjetivo terminado en <strong>-ed</strong> (<strong>${escapeHtml(correctText)}</strong>).`;
    }

    // 13. Fallback inteligente de contraste
    const userOptionDisplay = isChoice ? `la opción <strong>${userLetter}) "${escapeHtml(userText)}"</strong>` : `<strong>"${escapeHtml(userText)}"</strong>`;
    const correctOptionDisplay = isChoice ? `la opción <strong>${correctLetter}) "${escapeHtml(correctText)}"</strong>` : `<strong>"${escapeHtml(correctText)}"</strong>`;

    return `Has seleccionado ${userOptionDisplay}, pero en esta oración la opción correcta es ${correctOptionDisplay}. No concuerda gramatical o temporalmente con la estructura de la frase.`;
  }

  function showPracticeFeedback(q, isCorrect, isForcedReveal = false, userPickParam = null) {
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

    const qz = state.currentQuiz;
    const userPick = userPickParam !== null ? userPickParam : (qz && qz.userAnswers ? qz.userAnswers[q.id] : null);
    const isChoice = q.type === 'choice' && q.options;

    let contentHtml = '';

    if (isCorrect) {
      if (isChoice && q.options) {
        contentHtml = `
          <div class="feedback-correct-rule">
            <div class="correct-rule-title">💡 <strong>Opción correcta: ${q.answer}) ${escapeHtml(q.options[q.answer] || '')}</strong></div>
            <div class="correct-rule-text">${escapeHtml(q.explanation || 'Regla gramatical oficial del temario.')}</div>
          </div>
        `;
      } else {
        contentHtml = `
          <div class="feedback-correct-rule">
            <div class="correct-rule-title">💡 <strong>Respuesta correcta: ${escapeHtml(q.answer)}</strong></div>
            <div class="correct-rule-text">${escapeHtml(q.explanation || 'Regla gramatical oficial del temario.')}</div>
          </div>
        `;
      }
    } else if (isForcedReveal || !userPick) {
      if (isChoice && q.options) {
        contentHtml = `
          <div class="feedback-correct-rule">
            <div class="correct-rule-title">💡 <strong>Solución oficial: Opción ${q.answer}) ${escapeHtml(q.options[q.answer] || '')}</strong></div>
            <div class="correct-rule-text">${escapeHtml(q.explanation || 'Regla gramatical oficial del temario.')}</div>
          </div>
        `;
      } else {
        contentHtml = `
          <div class="feedback-correct-rule">
            <div class="correct-rule-title">💡 <strong>Solución oficial: ${escapeHtml(q.answer)}</strong></div>
            <div class="correct-rule-text">${escapeHtml(q.explanation || 'Regla gramatical oficial del temario.')}</div>
          </div>
        `;
      }
    } else {
      const mistakeExplanation = getMistakeExplanation(q, userPick);
      const userText = isChoice ? (q.options[userPick] || userPick) : userPick;
      const userPickLabel = isChoice ? `Opción ${userPick}) "${escapeHtml(userText)}"` : `"${escapeHtml(userText)}"`;
      const correctText = isChoice ? (q.options[q.answer] || q.answer) : q.answer;
      const correctPickLabel = isChoice ? `Opción ${q.answer}) "${escapeHtml(correctText)}"` : `"${escapeHtml(correctText)}"`;

      contentHtml = `
        <div class="feedback-mistake-analysis">
          <div class="mistake-analysis-title">⚠️ <strong>¿Por qué no es tu respuesta (${userPickLabel})?</strong></div>
          <div class="mistake-analysis-text">${mistakeExplanation}</div>
        </div>
        <div class="feedback-correct-rule">
          <div class="correct-rule-title">💡 <strong>Solución oficial (${correctPickLabel}):</strong></div>
          <div class="correct-rule-text">${escapeHtml(q.explanation || 'Regla gramatical oficial del temario.')}</div>
        </div>
      `;
    }

    text.innerHTML = contentHtml;
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

    // Generate unique test ID
    const testId = 'test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    state.latestFinishedTestId = testId;

    const questionsReview = qz.questions.map((q, idx) => {
      const userAns = qz.userAnswers[q.id];
      const isBlank = (userAns === undefined || userAns === '');
      let isRight = false;
      if (!isBlank) {
        isRight = (q.type === 'choice') ? (userAns === q.answer) : checkTextAnswer(userAns, q.answer);
      }
      return {
        id: q.id,
        number: q.number || (idx + 1),
        type: q.type || 'choice',
        question: q.question,
        options: q.options || null,
        answer: q.answer,
        explanation: q.explanation || '',
        section: q.section || '',
        readingText: q.readingText || null,
        userAnswer: isBlank ? null : userAns,
        isCorrect: isRight,
        isBlank: isBlank
      };
    });

    // Save to history (newest first)
    state.history.unshift({
      id: testId,
      date: new Date().toISOString(),
      topicId: qz.topicId || null,
      mode: qz.mode || 'practice',
      title: qz.title,
      badge: qz.badge || '',
      total,
      correct,
      wrong,
      blank,
      score: parseFloat(scoreVal),
      passed: isPassed,
      timeSeconds: qz.elapsedSeconds,
      questionsReview: questionsReview
    });
    localStorage.setItem('patronato_history', JSON.stringify(state.history));
    if (window.SyncService) window.SyncService.triggerAutoSave();
    updateStatsBar();

    renderResultsScreen({
      testId,
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
    state.latestFinishedTestId = res.testId;
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

  // --- HISTÓRICO DE TESTS REALIZADOS ---
  function showHistoryView() {
    if (state.currentQuiz && !state.currentQuiz.isFinished) {
      clearInterval(state.timerInterval);
      saveActiveQuizState();
      state.currentQuiz = null;
    }
    showView('view-history');
    renderHistorySummary();
    renderHistoryList();
  }
  window.showHistoryView = showHistoryView;

  window.showLatestHistoryDetail = function () {
    if (state.latestFinishedTestId) {
      showHistoryDetailView(state.latestFinishedTestId);
    } else if (state.history.length > 0) {
      showHistoryDetailView(state.history[0].id);
    } else {
      showHistoryView();
    }
  };

  function renderHistorySummary() {
    const list = state.history;
    const total = list.length;
    const aptos = list.filter(h => h.passed).length;
    const noAptos = list.filter(h => !h.passed).length;

    let avgScore = 0;
    let totalCorrect = 0;
    let totalQuestions = 0;

    if (total > 0) {
      const sumScores = list.reduce((acc, h) => acc + (parseFloat(h.score) || 0), 0);
      avgScore = (sumScores / total).toFixed(1);
      totalCorrect = list.reduce((acc, h) => acc + (h.correct || 0), 0);
      totalQuestions = list.reduce((acc, h) => acc + (h.total || 0), 0);
    }

    const accuracyPct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    const elTotal = document.getElementById('hist-stat-total');
    if (elTotal) elTotal.textContent = total;

    const elAptos = document.getElementById('hist-stat-aptos');
    if (elAptos) elAptos.textContent = aptos;

    const elNoAptos = document.getElementById('hist-stat-no-aptos');
    if (elNoAptos) elNoAptos.textContent = noAptos;

    const elAvg = document.getElementById('hist-stat-avg-score');
    if (elAvg) elAvg.textContent = total > 0 ? avgScore : '0.0';

    const elAcc = document.getElementById('hist-stat-accuracy');
    if (elAcc) elAcc.textContent = `${accuracyPct}%`;
  }

  window.onHistoryFilterChange = function () {
    renderHistoryList();
  };

  window.setHistoryResultFilter = function (val) {
    state.historyResultFilter = val;
    const btnAll = document.getElementById('hist-filter-all');
    const btnPassed = document.getElementById('hist-filter-passed');
    const btnFailed = document.getElementById('hist-filter-failed');

    if (btnAll) btnAll.classList.toggle('active', val === 'all');
    if (btnPassed) btnPassed.classList.toggle('active', val === 'passed');
    if (btnFailed) btnFailed.classList.toggle('active', val === 'failed');

    renderHistoryList();
  };

  function renderHistoryList() {
    const container = document.getElementById('history-items-container');
    if (!container) return;

    const searchInput = document.getElementById('hist-search-input');
    const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const sortSelect = document.getElementById('hist-sort-select');
    const sortBy = sortSelect ? sortSelect.value : (state.historySortOrder || 'date-desc');

    const totalCount = state.history.length;
    const passedCount = state.history.filter(h => h.passed).length;
    const failedCount = state.history.filter(h => !h.passed).length;

    const elCountAll = document.getElementById('hist-filter-count-all');
    if (elCountAll) elCountAll.textContent = totalCount;
    const elCountPassed = document.getElementById('hist-filter-count-passed');
    if (elCountPassed) elCountPassed.textContent = passedCount;
    const elCountFailed = document.getElementById('hist-filter-count-failed');
    if (elCountFailed) elCountFailed.textContent = failedCount;

    // Filter
    let filtered = state.history.filter(h => {
      if (state.historyResultFilter === 'passed' && !h.passed) return false;
      if (state.historyResultFilter === 'failed' && h.passed) return false;

      if (query) {
        const titleMatch = (h.title || '').toLowerCase().includes(query);
        const badgeMatch = (h.badge || '').toLowerCase().includes(query);
        const modeMatch = (h.mode === 'exam' ? 'examen simulacro' : 'práctica practica').includes(query);
        if (!titleMatch && !badgeMatch && !modeMatch) return false;
      }
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date-asc') {
        return new Date(a.date || 0) - new Date(b.date || 0);
      } else if (sortBy === 'score-desc') {
        return (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0);
      } else if (sortBy === 'score-asc') {
        return (parseFloat(a.score) || 0) - (parseFloat(b.score) || 0);
      } else {
        return new Date(b.date || 0) - new Date(a.date || 0);
      }
    });

    container.innerHTML = '';

    if (filtered.length === 0) {
      if (state.history.length === 0) {
        container.innerHTML = `
          <div class="empty-history-state">
            <div class="empty-history-icon">📜</div>
            <div class="empty-history-title">Aún no hay tests en el historial</div>
            <p class="empty-history-desc">
              Cada vez que finalices un test o simulacro militar, se guardará automáticamente aquí con el desglose de preguntas acertadas y falladas.
            </p>
            <button class="btn btn-primary" onclick="showDashboard()">
              🚀 Comenzar un Test Ahora
            </button>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="empty-history-state">
            <div class="empty-history-icon">🔍</div>
            <div class="empty-history-title">No hay resultados coincidentes</div>
            <p class="empty-history-desc">
              Ningún test de tu historial coincide con el término de búsqueda o filtro seleccionado.
            </p>
            <button class="btn btn-secondary" onclick="resetHistoryFilters()">
              Restablecer Filtros
            </button>
          </div>
        `;
      }
      return;
    }

    filtered.forEach((h) => {
      const itemEl = document.createElement('div');
      itemEl.className = `history-card-item ${h.passed ? 'passed' : 'failed'}`;

      const totalQ = h.total || 0;
      const correctPct = totalQ > 0 ? Math.round((h.correct / totalQ) * 100) : 0;
      const wrongPct = totalQ > 0 ? Math.round((h.wrong / totalQ) * 100) : 0;
      const blankPct = totalQ > 0 ? Math.round((h.blank / totalQ) * 100) : 0;

      const formattedDate = formatHistoryDate(h.date);
      const formattedTime = formatSeconds(h.timeSeconds || 0);

      const isExam = h.mode === 'exam';
      const modeLabel = isExam ? '⏱️ Examen / Simulacro' : '📝 Modo Práctica';
      const modeClass = isExam ? 'badge-blue' : 'badge-amber';

      itemEl.innerHTML = `
        <div class="history-card-header">
          <div class="history-card-badges">
            <span class="card-badge ${modeClass}">${modeLabel}</span>
            <span class="${h.passed ? 'badge-apto-tag' : 'badge-no-apto-tag'}">
              ${h.passed ? '🎖️ APTO' : '❌ NO APTO'} (${(parseFloat(h.score) || 0).toFixed(1)}/10)
            </span>
          </div>
          <span style="font-size: 0.82rem; color: var(--text-muted); font-weight: 500;">
            📅 ${formattedDate}
          </span>
        </div>

        <h3 class="history-card-title">${escapeHtml(h.title)}</h3>

        <div class="history-card-bar-wrap" title="${correctPct}% aciertos, ${wrongPct}% fallos, ${blankPct}% en blanco">
          <div class="h-bar-segment h-bar-correct" style="width: ${correctPct}%;"></div>
          <div class="h-bar-segment h-bar-wrong" style="width: ${wrongPct}%;"></div>
          <div class="h-bar-segment h-bar-blank" style="width: ${blankPct}%;"></div>
        </div>

        <div class="history-card-stats-row">
          <span class="h-card-stat-item" style="color: var(--accent);">
            ✓ <strong>${h.correct}</strong> aciertos
          </span>
          <span class="h-card-stat-item" style="color: var(--danger);">
            ✕ <strong>${h.wrong}</strong> fallos
          </span>
          ${h.blank > 0 ? `
            <span class="h-card-stat-item" style="color: var(--warning);">
              ⚪ <strong>${h.blank}</strong> en blanco
            </span>
          ` : ''}
          <span class="h-card-stat-item">
            📊 <strong>${correctPct}%</strong> acierto
          </span>
          <span class="h-card-stat-item">
            ⏱️ <strong>${formattedTime}</strong>
          </span>
        </div>

        <div class="history-card-actions">
          <button class="btn btn-primary btn-sm" onclick="showHistoryDetailView('${h.id}')" title="Ver análisis pregunta a pregunta de este test">
            🔍 Ver Detalle de Preguntas
          </button>
          <button class="btn btn-secondary btn-sm" onclick="repeatHistoryQuiz('${h.id}', false)" title="Volver a realizar este mismo test">
            🔄 Repetir Todo
          </button>
          ${h.wrong > 0 ? `
            <button class="btn btn-danger btn-sm" onclick="repeatHistoryQuiz('${h.id}', true)" title="Hacer un test únicamente con las preguntas que fallaste">
              ⚠️ Repetir Fallos (${h.wrong})
            </button>
          ` : ''}
          <button class="btn btn-outline btn-sm btn-danger-outline" onclick="askDeleteHistoryItem('${h.id}')" title="Eliminar este intento del historial" style="margin-left: auto;">
            🗑️
          </button>
        </div>
      `;

      container.appendChild(itemEl);
    });
  }

  window.resetHistoryFilters = function () {
    const searchInput = document.getElementById('hist-search-input');
    if (searchInput) searchInput.value = '';
    const sortSelect = document.getElementById('hist-sort-select');
    if (sortSelect) sortSelect.value = 'date-desc';
    setHistoryResultFilter('all');
  };

  // --- DETALLE DE PREGUNTAS DEL HISTÓRICO ---
  function showHistoryDetailView(testId) {
    const item = state.history.find(h => h.id === testId);
    if (!item) {
      alert('No se encontró el registro seleccionado.');
      showHistoryView();
      return;
    }

    state.currentViewingHistoryId = testId;
    state.historyReviewFilter = 'all';

    showView('view-history-detail');

    // Header info
    document.getElementById('hd-test-title').textContent = item.title;
    
    const formattedDate = formatHistoryDate(item.date);
    const formattedTime = formatSeconds(item.timeSeconds || 0);
    document.getElementById('hd-meta-text').textContent = `Realizado el ${formattedDate} • Tiempo empleado: ${formattedTime}`;

    const isExam = item.mode === 'exam';
    const badgesRow = document.getElementById('hd-badges-row');
    if (badgesRow) {
      badgesRow.innerHTML = `
        <span class="card-badge ${isExam ? 'badge-blue' : 'badge-amber'}">${isExam ? '⏱️ Examen' : '📝 Práctica'}</span>
        ${item.badge ? `<span class="card-badge">${escapeHtml(item.badge)}</span>` : ''}
      `;
    }

    const scoreBox = document.getElementById('hd-score-box');
    if (scoreBox) {
      const pct = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
      scoreBox.innerHTML = `
        <div class="result-badge-huge ${item.passed ? 'badge-apto' : 'badge-no-apto'}" style="font-size: 1rem; padding: 0.4rem 1.25rem;">
          ${item.passed ? '🎖️ APTO (APROBADO)' : '❌ NO APTO (SUSPENSO)'}
        </div>
        <div style="font-size: 1.6rem; font-weight: 800; text-align: center; margin-top: 0.35rem; color: var(--text-main);">
          ${(parseFloat(item.score) || 0).toFixed(1)} / 10 <span style="font-size: 1rem; font-weight: 600; color: var(--text-muted);">(${pct}%)</span>
        </div>
      `;
    }

    // Quick stats
    document.getElementById('hd-stat-correct').textContent = item.correct;
    document.getElementById('hd-stat-wrong').textContent = item.wrong;
    document.getElementById('hd-stat-blank').textContent = item.blank;
    document.getElementById('hd-stat-time').textContent = formattedTime;

    // Retry failed button
    const btnRepeatFailed = document.getElementById('btn-hd-repeat-failed');
    const countFailedEl = document.getElementById('hd-count-failed-repeat');
    if (btnRepeatFailed) {
      if (item.wrong > 0) {
        btnRepeatFailed.style.display = 'inline-flex';
        if (countFailedEl) countFailedEl.textContent = item.wrong;
      } else {
        btnRepeatFailed.style.display = 'none';
      }
    }

    // Counts for filter pills
    const pillAll = document.getElementById('rf-count-all');
    if (pillAll) pillAll.textContent = item.total;
    const pillWrong = document.getElementById('rf-count-wrong');
    if (pillWrong) pillWrong.textContent = item.wrong;
    const pillCorrect = document.getElementById('rf-count-correct');
    if (pillCorrect) pillCorrect.textContent = item.correct;
    const pillBlank = document.getElementById('rf-count-blank');
    if (pillBlank) pillBlank.textContent = item.blank;

    // Reset pills UI to "all"
    document.querySelectorAll('.review-pills-row .pill-btn').forEach(btn => btn.classList.remove('active'));
    const allPill = document.getElementById('rf-pill-all');
    if (allPill) allPill.classList.add('active');

    renderHistoryDetailQuestions();
  }
  window.showHistoryDetailView = showHistoryDetailView;
  window.viewHistoryDetail = showHistoryDetailView;

  window.setReviewFilter = function (filter) {
    state.historyReviewFilter = filter;
    document.querySelectorAll('.review-pills-row .pill-btn').forEach(btn => btn.classList.remove('active'));
    
    if (filter === 'all') {
      document.getElementById('rf-pill-all')?.classList.add('active');
    } else if (filter === 'wrong') {
      document.getElementById('rf-pill-wrong')?.classList.add('active');
    } else if (filter === 'correct') {
      document.getElementById('rf-pill-correct')?.classList.add('active');
    } else if (filter === 'blank') {
      document.getElementById('rf-pill-blank')?.classList.add('active');
    }

    renderHistoryDetailQuestions();
  };

  function renderHistoryDetailQuestions() {
    const container = document.getElementById('history-detail-questions-list');
    if (!container) return;
    container.innerHTML = '';

    const item = state.history.find(h => h.id === state.currentViewingHistoryId);
    if (!item) return;

    const hasStoredReview = Array.isArray(item.questionsReview) && item.questionsReview.length > 0;
    let questions = [];
    let isLegacy = false;

    if (hasStoredReview) {
      questions = item.questionsReview;
    } else {
      isLegacy = true;
      // Intento legado sin telemetría de respuestas individuales
      if (item.topicId) {
        const top = window.TEST_DATA?.topics?.find(t => t.id === item.topicId);
        if (top && top.questions) {
          questions = top.questions.map((q, idx) => {
            const isInErrors = state.errors.includes(q.id);
            let legacyStatus = 'neutral';
            if (isInErrors) {
              legacyStatus = 'wrong';
            } else if (item.wrong === 0) {
              legacyStatus = 'correct';
            } else {
              legacyStatus = 'study';
            }

            return {
              id: q.id,
              number: q.number || (idx + 1),
              type: q.type || 'choice',
              question: q.question,
              options: q.options || null,
              answer: q.answer,
              explanation: q.explanation || '',
              section: q.section || '',
              readingText: q.readingText || null,
              userAnswer: null,
              isCorrect: (item.wrong === 0),
              isBlank: false,
              isLegacy: true,
              legacyStatus: legacyStatus
            };
          });
        }
      }
    }

    if (questions.length === 0) {
      container.innerHTML = `
        <div class="empty-history-state" style="margin: 1.5rem auto;">
          <div class="empty-history-icon">ℹ️</div>
          <div class="empty-history-title">Registro histórico sin detalle individual</div>
          <p class="empty-history-desc">
            Este intento fue guardado antes de habilitar el registro detallado pregunta a pregunta (${item.correct} aciertos y ${item.wrong} fallos globales).
            <br><br>
            Todos los tests nuevos que realices a partir de ahora registrarán el 100% de tus preguntas, respuestas exactas y explicaciones.
          </p>
        </div>
      `;
      return;
    }

    // Banner informativo para intentos legados
    if (isLegacy) {
      const banner = document.createElement('div');
      banner.className = 'legacy-history-notice';
      banner.innerHTML = `
        <div class="legacy-notice-icon">ℹ️</div>
        <div class="legacy-notice-text">
          <strong>Registro anterior a la actualización de detalle:</strong>
          Este intento previo se registró antes de incorporar el guardado individual de respuestas. Se conserva tu resultado global (<strong>${item.correct} aciertos</strong>, <strong>${item.wrong} fallos</strong>${item.blank > 0 ? `, <strong>${item.blank} en blanco</strong>` : ''}).
          <br>
          ${item.wrong > 0 ? 'A continuación puedes repasar las preguntas y soluciones oficiales del tema. Aquellas registradas en tu <strong>Banco de Fallos</strong> se destacan en rojo.' : 'Todas las preguntas de este tema figuran con sus soluciones y explicaciones completas.'}
          Los tests que realices a partir de ahora guardan automáticamente tus respuestas exactas.
        </div>
      `;
      container.appendChild(banner);
    }

    // Filtrar preguntas
    const currentFilter = state.historyReviewFilter || 'all';
    const filteredQuestions = questions.filter(q => {
      if (q.isLegacy) {
        if (currentFilter === 'wrong') return q.legacyStatus === 'wrong';
        if (currentFilter === 'correct') return q.legacyStatus === 'correct';
        if (currentFilter === 'blank') return false;
        return true;
      }
      if (currentFilter === 'wrong') return !q.isCorrect && !q.isBlank;
      if (currentFilter === 'correct') return q.isCorrect;
      if (currentFilter === 'blank') return q.isBlank;
      return true;
    });

    if (filteredQuestions.length === 0) {
      const emptyFilterMsg = document.createElement('div');
      emptyFilterMsg.style.cssText = 'text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);';
      if (isLegacy && currentFilter === 'wrong') {
        emptyFilterMsg.innerHTML = `
          <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔍</div>
          <p>En este intento anterior a la actualización no se registraron las preguntas exactas que fallaste (actualmente ninguna coincide en tu Banco de Fallos).</p>
          <button class="btn btn-secondary btn-sm" onclick="setReviewFilter('all')" style="margin-top: 0.5rem;">Ver todas las preguntas del tema</button>
        `;
      } else {
        emptyFilterMsg.innerHTML = 'No hay preguntas que coincidan con el filtro seleccionado.';
      }
      container.appendChild(emptyFilterMsg);
      return;
    }

    filteredQuestions.forEach((q, idx) => {
      // Intentar enriquecer datos con questions-data si faltan
      const masterQ = getQuestionById(q.id);
      const options = q.options || (masterQ ? masterQ.options : null);
      const explanation = q.explanation || (masterQ ? masterQ.explanation : '');
      const readingText = q.readingText || (masterQ ? masterQ.readingText : null);
      const section = q.section || (masterQ ? masterQ.section : '');

      const isFav = state.favorites.includes(q.id);

      const card = document.createElement('div');
      card.className = 'question-card';
      card.style.marginBottom = '1.25rem';

      let resultBadgeHtml = '';

      if (q.isLegacy) {
        if (q.legacyStatus === 'wrong') {
          card.style.borderLeft = '6px solid var(--danger)';
          resultBadgeHtml = `<span class="q-result-badge badge-q-wrong">✕ En Banco de Fallos</span>`;
        } else if (q.legacyStatus === 'correct') {
          card.style.borderLeft = '6px solid var(--accent)';
          resultBadgeHtml = `<span class="q-result-badge badge-q-correct">✓ Acertada</span>`;
        } else {
          card.style.borderLeft = '6px solid var(--border)';
          resultBadgeHtml = `<span class="q-result-badge badge-q-neutral">📖 Solución Oficial</span>`;
        }
      } else {
        if (q.isCorrect) {
          card.style.borderLeft = '6px solid var(--accent)';
          resultBadgeHtml = `<span class="q-result-badge badge-q-correct">✓ Acertada</span>`;
        } else if (q.isBlank) {
          card.style.borderLeft = '6px solid var(--warning)';
          resultBadgeHtml = `<span class="q-result-badge badge-q-blank">⚪ En blanco</span>`;
        } else {
          card.style.borderLeft = '6px solid var(--danger)';
          resultBadgeHtml = `<span class="q-result-badge badge-q-wrong">✕ Fallada</span>`;
        }
      }

      // Generar bloque de opciones o respuesta interactiva
      let answersBlockHtml = '';
      if (q.type === 'choice' && options) {
        const letters = ['A', 'B', 'C', 'D'];
        let optionsItemsHtml = '';

        letters.forEach(letter => {
          if (!options[letter]) return;
          const optText = options[letter];

          let itemClass = '';
          let tagHtml = '';

          const isUserPick = (q.userAnswer === letter);
          const isOfficial = (q.answer === letter);

          if (q.isLegacy) {
            if (isOfficial) {
              itemClass = 'choice-official-correct';
              tagHtml = `<span class="review-choice-tag">✓ Solución correcta</span>`;
            }
          } else {
            if (isUserPick && q.isCorrect) {
              itemClass = 'choice-user-correct';
              tagHtml = `<span class="review-choice-tag">✓ Tu respuesta (Correcta)</span>`;
            } else if (isUserPick && !q.isCorrect) {
              itemClass = 'choice-user-wrong';
              tagHtml = `<span class="review-choice-tag">✕ Tu respuesta (Incorrecta)</span>`;
            } else if (isOfficial && (!q.isCorrect || q.isBlank)) {
              itemClass = 'choice-official-correct';
              tagHtml = `<span class="review-choice-tag">✓ Solución correcta</span>`;
            }
          }

          optionsItemsHtml += `
            <div class="review-choice-item ${itemClass}">
              <span class="review-choice-letter">${letter}</span>
              <span class="review-choice-text">${escapeHtml(optText)}</span>
              ${tagHtml}
            </div>
          `;
        });

        answersBlockHtml = `<div class="review-options-list">${optionsItemsHtml}</div>`;
      } else {
        if (q.isLegacy) {
          answersBlockHtml = `
            <div style="margin: 1rem 0;">
              <div class="review-text-answer-box text-official">
                <strong>Solución oficial:</strong> ${escapeHtml(q.answer)}
              </div>
            </div>
          `;
        } else {
          answersBlockHtml = `
            <div style="margin: 1rem 0;">
              <div class="review-text-answer-box ${q.isCorrect ? 'text-correct' : 'text-wrong'}">
                <strong>Tu respuesta:</strong> ${q.userAnswer ? escapeHtml(q.userAnswer) : '<em>Sin responder (en blanco)</em>'}
              </div>
              ${(!q.isCorrect || q.isBlank) ? `
                <div class="review-text-answer-box text-official">
                  <strong>Solución oficial:</strong> ${escapeHtml(q.answer)}
                </div>
              ` : ''}
            </div>
          `;
        }
      }

      let reviewFeedbackHtml = '';
      if (!q.isLegacy && !q.isCorrect && !q.isBlank && q.userAnswer) {
        const mistakeExplanation = getMistakeExplanation(q, q.userAnswer);
        const isChoice = q.type === 'choice' && options;
        const userText = isChoice ? (options[q.userAnswer] || q.userAnswer) : q.userAnswer;
        const userPickLabel = isChoice ? `Opción ${q.userAnswer}) "${escapeHtml(userText)}"` : `"${escapeHtml(userText)}"`;
        const correctText = isChoice ? (options[q.answer] || q.answer) : q.answer;
        const correctPickLabel = isChoice ? `Opción ${q.answer}) "${escapeHtml(correctText)}"` : `"${escapeHtml(correctText)}"`;

        reviewFeedbackHtml = `
          <div class="feedback-box incorrect-box show" style="margin-top: 0.85rem;">
            <div class="feedback-header">✕ Análisis pedagógico del error</div>
            <div class="feedback-text">
              <div class="feedback-mistake-analysis">
                <div class="mistake-analysis-title">⚠️ <strong>¿Por qué no es tu respuesta (${userPickLabel})?</strong></div>
                <div class="mistake-analysis-text">${mistakeExplanation}</div>
              </div>
              <div class="feedback-correct-rule">
                <div class="correct-rule-title">💡 <strong>Solución oficial (${correctPickLabel}):</strong></div>
                <div class="correct-rule-text">${escapeHtml(explanation || 'Regla gramatical oficial del temario.')}</div>
              </div>
            </div>
          </div>
        `;
      } else if (!q.isLegacy && q.isCorrect) {
        reviewFeedbackHtml = `
          <div class="feedback-box correct-box show" style="margin-top: 0.85rem;">
            <div class="feedback-header">✓ Respuesta correcta</div>
            <div class="feedback-text">
              <div class="feedback-correct-rule">
                <div class="correct-rule-title">💡 <strong>Regla del Patronato:</strong></div>
                <div class="correct-rule-text">${escapeHtml(explanation || 'Regla gramatical oficial del temario.')}</div>
              </div>
            </div>
          </div>
        `;
      } else {
        reviewFeedbackHtml = `
          <div class="feedback-box show" style="margin-top: 0.85rem;">
            <div class="feedback-header">${q.isBlank ? '⚪ Pregunta en blanco' : '💡 Solución oficial'}</div>
            <div class="feedback-text">
              <strong>Solución oficial: ${q.answer}</strong><br>${escapeHtml(explanation || 'Regla gramatical oficial del temario.')}
            </div>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="question-header-row">
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <span class="q-badge">Pregunta ${q.number || (idx + 1)}</span>
            ${section ? `<span class="q-section-text">${escapeHtml(section)}</span>` : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            ${resultBadgeHtml}
            <button class="q-fav-btn ${isFav ? 'active' : ''}" onclick="toggleHistoryQuestionFav('${q.id}', this)" title="${isFav ? 'Quitar de favoritas' : 'Guardar en favoritas'}">
              ★
            </button>
          </div>
        </div>

        ${readingText ? `
          <div class="reading-box" style="margin-bottom: 1rem;">
            <div style="font-weight: 700; margin-bottom: 0.35rem; color: var(--primary);">📖 Texto de lectura</div>
            <div style="font-size: 0.92rem; line-height: 1.5;">${escapeHtml(readingText)}</div>
          </div>
        ` : ''}

        <div class="q-prompt" style="font-size: 1.05rem; margin-bottom: 0.75rem;">
          ${formatPromptText(q.question)}
        </div>

        ${answersBlockHtml}

        ${reviewFeedbackHtml}
      `;

      container.appendChild(card);
    });
  }

  window.toggleHistoryQuestionFav = function (qId, btn) {
    if (!qId) return;
    if (state.favorites.includes(qId)) {
      state.favorites = state.favorites.filter(id => id !== qId);
      if (btn) btn.classList.remove('active');
      showToast('⭐ Pregunta retirada de favoritas.');
    } else {
      state.favorites.push(qId);
      if (btn) btn.classList.add('active');
      showToast('⭐ Pregunta guardada en favoritas.');
    }
    localStorage.setItem('patronato_favorites', JSON.stringify(state.favorites));
    if (window.SyncService) window.SyncService.triggerAutoSave();
    updateStatsBar();
  };

  // --- REPETICIÓN DE TESTS DESDE EL HISTÓRICO ---
  window.repeatHistoryQuiz = function (testId, onlyFailed) {
    const item = state.history.find(h => h.id === testId);
    if (!item) {
      alert('No se encontró el test a repetir.');
      return;
    }

    let rawQuestions = item.questionsReview || [];
    if (rawQuestions.length === 0 && item.topicId) {
      const top = window.TEST_DATA?.topics?.find(t => t.id === item.topicId);
      if (top && top.questions) rawQuestions = top.questions;
    }

    if (rawQuestions.length === 0) {
      alert('No hay preguntas disponibles para repetir en este registro.');
      return;
    }

    let targetQuestions = rawQuestions.map(qr => {
      const fullQ = getQuestionById(qr.id);
      if (fullQ) return fullQ;
      return {
        id: qr.id,
        number: qr.number,
        type: qr.type || 'choice',
        section: qr.section || '',
        question: qr.question,
        options: qr.options,
        answer: qr.answer,
        explanation: qr.explanation,
        readingText: qr.readingText
      };
    });

    if (onlyFailed) {
      targetQuestions = targetQuestions.filter((_, idx) => {
        const qr = rawQuestions[idx];
        if (qr && qr.isCorrect !== undefined && !qr.isLegacy) {
          return !qr.isCorrect;
        }
        return state.errors.includes(qr.id);
      });
    }

    if (targetQuestions.length === 0) {
      alert('¡Enhorabuena! No hay preguntas falladas identificadas en este intento.');
      return;
    }

    startQuizSession({
      topicId: item.topicId || null,
      title: onlyFailed ? `Repetición de Fallos: ${item.title}` : item.title,
      badge: item.badge || 'Histórico',
      mode: 'practice',
      questions: targetQuestions
    });
  };

  window.repeatCurrentHistoricalQuiz = function (onlyFailed) {
    if (state.currentViewingHistoryId) {
      repeatHistoryQuiz(state.currentViewingHistoryId, onlyFailed);
    }
  };

  // --- ELIMINACIÓN Y BORRADO DE HISTORIAL ---
  window.askDeleteHistoryItem = function (testId) {
    state.pendingDeleteAction = { type: 'single', testId };
    const desc = document.getElementById('modal-delete-desc');
    if (desc) desc.textContent = '¿Deseas eliminar este registro de examen del historial? Esta acción no se puede deshacer.';
    const modal = document.getElementById('modal-delete-confirm');
    if (modal) modal.classList.add('show');
  };

  window.confirmClearHistory = function () {
    if (state.history.length === 0) {
      alert('El historial ya está vacío.');
      return;
    }
    state.pendingDeleteAction = { type: 'all' };
    const desc = document.getElementById('modal-delete-desc');
    if (desc) desc.textContent = '¿Estás seguro de que deseas vaciar TODO tu historial de tests realizados? Se borrarán todos los registros de intentos y estadísticas de exámenes.';
    const modal = document.getElementById('modal-delete-confirm');
    if (modal) modal.classList.add('show');
  };

  window.closeDeleteConfirmModal = function () {
    state.pendingDeleteAction = null;
    const modal = document.getElementById('modal-delete-confirm');
    if (modal) modal.classList.remove('show');
  };

  window.executeDeleteConfirmAction = function () {
    const action = state.pendingDeleteAction;
    window.closeDeleteConfirmModal();

    if (!action) return;

    if (action.type === 'single') {
      state.history = state.history.filter(h => h.id !== action.testId);
      localStorage.setItem('patronato_history', JSON.stringify(state.history));
      if (window.SyncService) window.SyncService.triggerAutoSave();
      updateStatsBar();
      renderHistorySummary();
      renderHistoryList();
      showToast('🗑️ Intento eliminado del historial.');
    } else if (action.type === 'all') {
      state.history = [];
      localStorage.setItem('patronato_history', JSON.stringify(state.history));
      localStorage.setItem('patronato_tema1_cleared', 'true');
      if (window.SyncService) window.SyncService.triggerAutoSave();
      updateStatsBar();
      renderHistorySummary();
      renderHistoryList();
      showToast('🗑️ Historial de tests limpiado por completo.');
    }
  };

  function formatHistoryDate(dateStr) {
    if (!dateStr) return '--';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '--';
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  }

  function formatSeconds(secs) {
    const s = parseInt(secs || 0, 10);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }

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
