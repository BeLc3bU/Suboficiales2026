/**
 * PATRONATO 2026 - Servicio de Sincronización Multidispositivo (SyncService)
 * Gestiona la sincronización del progreso (favoritas, fallos, historial)
 * entre diferentes dispositivos (PC, Móvil, Tablet) usando Supabase
 * o Copia/Restauración de sincronización rápida con código.
 */

const SyncService = (function () {
  'use strict';

  const STORAGE_KEY_CONFIG = 'patronato_sync_config';
  const STORAGE_KEY_LAST_SYNC = 'patronato_last_sync_time';

  // Configuración por defecto
  let config = {
    syncCode: '', // Código personal (ej. Pedro2026)
    supabaseUrl: '', // URL del proyecto Supabase
    supabaseKey: '', // Clave anónima pública de Supabase
    autoSync: true
  };

  // Cargar configuración guardada
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      config = { ...config, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Error al cargar config de sincronización:', e);
  }

  function saveConfig(newConfig) {
    config = { ...config, ...newConfig };
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  }

  function getConfig() {
    return { ...config };
  }

  function isConfigured() {
    return !!(config.syncCode && config.supabaseUrl && config.supabaseKey);
  }

  function hasSyncCode() {
    return !!(config.syncCode && config.syncCode.trim().length >= 3);
  }

  /**
   * Recopila todo el estado actual del usuario
   */
  function collectLocalData() {
    return {
      version: 1,
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
    localStorage.setItem(STORAGE_KEY_LAST_SYNC, new Date().toISOString());
    return true;
  }

  /**
   * Sube los datos locales a Supabase
   */
  async function pushToSupabase(localData) {
    if (!isConfigured()) return { success: false, reason: 'not_configured' };

    const cleanCode = config.syncCode.trim().toLowerCase();
    const endpoint = `${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/user_sync`;

    const payload = {
      sync_code: cleanCode,
      data: localData,
      updated_at: new Date().toISOString()
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': config.supabaseKey,
        'Authorization': `Bearer ${config.supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error en Supabase (${res.status}): ${errText}`);
    }

    localStorage.setItem(STORAGE_KEY_LAST_SYNC, new Date().toISOString());
    return { success: true };
  }

  /**
   * Descarga los datos de Supabase y combina con los locales
   */
  async function pullFromSupabase() {
    if (!isConfigured()) return { success: false, reason: 'not_configured' };

    const cleanCode = config.syncCode.trim().toLowerCase();
    const endpoint = `${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/user_sync?sync_code=eq.${encodeURIComponent(cleanCode)}&select=*`;

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': config.supabaseKey,
        'Authorization': `Bearer ${config.supabaseKey}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error al leer de Supabase (${res.status}): ${errText}`);
    }

    const rows = await res.json();
    if (!rows || rows.length === 0) {
      // No hay datos previos para este código en la nube; subir los locales
      await pushToSupabase(collectLocalData());
      return { success: true, created: true };
    }

    const remoteRow = rows[0];
    const remoteData = remoteRow.data;

    // Fusionar inteligentemente historial, fallos y favoritos
    const localData = collectLocalData();
    const mergedData = mergeStates(localData, remoteData);

    applyRemoteData(mergedData);
    await pushToSupabase(mergedData);

    return { success: true, data: mergedData };
  }

  /**
   * Fusión bidireccional inteligente: une listas sin duplicados
   */
  function mergeStates(local, remote) {
    const favSet = new Set([...(local.favorites || []), ...(remote.favorites || [])]);
    const errSet = new Set([...(local.errors || []), ...(remote.errors || [])]);

    // Historial: unir por fecha o título/total para evitar duplicar el mismo intento
    const historyMap = new Map();
    [...(remote.history || []), ...(local.history || [])].forEach((h) => {
      const key = `${h.date || ''}_${h.title || ''}_${h.score || ''}`;
      if (!historyMap.has(key)) {
        historyMap.set(key, h);
      }
    });

    // Ordenar historial por fecha más reciente
    const mergedHistory = Array.from(historyMap.values()).sort((a, b) => {
      return new Date(b.date || 0) - new Date(a.date || 0);
    });

    return {
      version: 1,
      theme: local.theme || remote.theme || 'light',
      favorites: Array.from(favSet),
      errors: Array.from(errSet),
      history: mergedHistory,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Generar código de transferencia rápida (Base64 comprimido o JSON)
   */
  function exportSyncPackage() {
    const data = collectLocalData();
    const json = JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(json)));
  }

  /**
   * Importar código de transferencia rápida
   */
  function importSyncPackage(packageStr) {
    try {
      const json = decodeURIComponent(escape(atob(packageStr.trim())));
      const parsed = JSON.parse(json);
      if (!parsed || (!parsed.favorites && !parsed.history)) {
        throw new Error('Formato de datos no válido');
      }
      applyRemoteData(parsed);
      return { success: true, data: parsed };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  return {
    getConfig,
    saveConfig,
    isConfigured,
    hasSyncCode,
    collectLocalData,
    applyRemoteData,
    pushToSupabase,
    pullFromSupabase,
    exportSyncPackage,
    importSyncPackage
  };
})();

// Exportar globalmente
window.SyncService = SyncService;
