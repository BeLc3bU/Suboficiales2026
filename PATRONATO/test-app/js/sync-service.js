/**
 * PATRONATO 2026 - Gestor de Guardado Automático en la Nube (AutoSaveManager)
 * 100% transparente: Guarda y carga automáticamente el progreso entre dispositivos
 * sin códigos, sin registros y sin botones manuales.
 */

const SyncService = (function () {
  'use strict';

  let isSaving = false;
  let saveTimeout = null;
  let hasPendingChanges = false;

  /**
   * Recopila todo el estado actual del usuario
   */
  function collectLocalData() {
    return {
      version: 2,
      theme: localStorage.getItem('patronato_theme') || 'light',
      favorites: JSON.parse(localStorage.getItem('patronato_favorites') || '[]'),
      errors: JSON.parse(localStorage.getItem('patronato_errors') || '[]'),
      history: JSON.parse(localStorage.getItem('patronato_history') || '[]'),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Aplica datos remotos en el almacenamiento local
   */
  function applyRemoteData(remoteData) {
    if (!remoteData) return false;

    if (Array.isArray(remoteData.favorites)) {
      localStorage.setItem('patronato_favorites', JSON.stringify(remoteData.favorites));
    }
    if (Array.isArray(remoteData.errors)) {
      localStorage.setItem('patronato_errors', JSON.stringify(remoteData.errors));
    }
    if (Array.isArray(remoteData.history)) {
      localStorage.setItem('patronato_history', JSON.stringify(remoteData.history));
    }
    if (remoteData.theme) {
      localStorage.setItem('patronato_theme', remoteData.theme);
    }
    return true;
  }

  /**
   * Fusión inteligente bidireccional: une fallos, favoritas e historial sin duplicar
   */
  function mergeStates(local, remote) {
    if (!remote) return local;

    const favSet = new Set([...(local.favorites || []), ...(remote.favorites || [])]);
    const errSet = new Set([...(local.errors || []), ...(remote.errors || [])]);

    const historyMap = new Map();
    [...(remote.history || []), ...(local.history || [])].forEach((h) => {
      const key = `${h.date || ''}_${h.title || ''}_${h.score || ''}`;
      if (!historyMap.has(key)) {
        historyMap.set(key, h);
      }
    });

    const mergedHistory = Array.from(historyMap.values()).sort((a, b) => {
      return new Date(b.date || 0) - new Date(a.date || 0);
    });

    return {
      version: 2,
      theme: local.theme || remote.theme || 'light',
      favorites: Array.from(favSet),
      errors: Array.from(errSet),
      history: mergedHistory,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Carga inicial automática en segundo plano al arrancar la web
   */
  async function autoLoad(onDataUpdated) {
    updateBadge('loading');

    try {
      const endpoints = ['/api/progress', 'http://127.0.0.1:8080/api/progress'];
      let remoteData = null;

      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, { method: 'GET', cache: 'no-cache' });
          if (res.ok) {
            const json = await res.json();
            if (json && json.data) {
              remoteData = json.data;
              break;
            }
          }
        } catch (e) {
          // Continuar al siguiente endpoint
        }
      }

      const localData = collectLocalData();

      if (remoteData) {
        // Fusionar datos
        const merged = mergeStates(localData, remoteData);
        applyRemoteData(merged);

        // Si el usuario tenía datos locales que la nube no tenía, sincronizar la fusión a la nube
        if (JSON.stringify(merged.history) !== JSON.stringify(remoteData.history) ||
            merged.favorites.length !== remoteData.favorites.length) {
          triggerAutoSave();
        }

        if (typeof onDataUpdated === 'function') {
          onDataUpdated(merged);
        }
        updateBadge('saved');
      } else {
        // La nube está vacía todavía: subir el progreso local inicial
        if (localData.history.length > 0 || localData.favorites.length > 0 || localData.errors.length > 0) {
          triggerAutoSave();
        } else {
          updateBadge('saved');
        }
      }
    } catch (err) {
      console.warn('Almacenamiento en la nube no disponible temporalmente:', err);
      updateBadge('offline');
    }
  }

  /**
   * Dispara guardado automático con retardo para no saturar peticiones
   */
  function triggerAutoSave() {
    hasPendingChanges = true;
    updateBadge('saving');

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      await executeSave();
    }, 600);
  }

  /**
   * Envía los datos locales a la nube
   */
  async function executeSave() {
    if (isSaving) return;
    isSaving = true;

    const payload = collectLocalData();
    const endpoints = ['/api/progress', 'http://127.0.0.1:8080/api/progress'];
    let success = false;

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          success = true;
          break;
        }
      } catch (e) {
        // Probar siguiente
      }
    }

    isSaving = false;

    if (success) {
      hasPendingChanges = false;
      updateBadge('saved');
    } else {
      updateBadge('offline');
    }
  }

  /**
   * Actualiza el indicador visual discreto en la cabecera
   */
  function updateBadge(status) {
    const badge = document.getElementById('autosave-badge');
    if (!badge) return;

    const dot = badge.querySelector('.autosave-dot');
    const text = badge.querySelector('.autosave-text');

    badge.className = 'autosave-badge';

    if (status === 'saving') {
      badge.classList.add('saving');
      if (text) text.textContent = 'Guardando...';
      badge.title = 'Guardando progreso automáticamente en la nube';
    } else if (status === 'saved') {
      badge.classList.add('saved');
      if (text) text.textContent = 'Guardado';
      badge.title = 'Progreso sincronizado automáticamente en la nube';
    } else if (status === 'loading') {
      badge.classList.add('loading');
      if (text) text.textContent = 'Cargando...';
      badge.title = 'Verificando progreso en la nube';
    } else {
      badge.classList.add('offline');
      if (text) text.textContent = 'Guardado local';
      badge.title = 'Sin conexión a la nube. Los datos se guardan en este dispositivo y se subirán al conectar';
    }
  }

  // Detectar recuperación de conexión a internet para subir datos pendientes
  window.addEventListener('online', () => {
    if (hasPendingChanges) {
      triggerAutoSave();
    } else {
      autoLoad();
    }
  });

  return {
    autoLoad,
    triggerAutoSave,
    collectLocalData,
    applyRemoteData
  };
})();

window.SyncService = SyncService;
