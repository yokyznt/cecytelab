/* =========================================================
   CECyTE Lab · Almacenamiento (localStorage)
   Mantiene las mismas claves que la versión original:
   cecyte_db_<tabla> y cecyte_admin_pass
   ========================================================= */
(function () {
  'use strict';

  var DB_PREFIX = 'cecyte_db_';
  var PASS_KEY = 'cecyte_admin_pass';
  var DEFAULT_PASS = 'admin123';
  var listeners = [];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getDB(table) {
    try {
      var raw = localStorage.getItem(DB_PREFIX + table);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { /* datos corruptos: se usa el inicial */ }
    var initial = (window.CECYTE_INITIAL_DB || {})[table];
    return initial ? clone(initial) : [];
  }

  function setDB(table, data) {
    localStorage.setItem(DB_PREFIX + table, JSON.stringify(data));
    listeners.forEach(function (fn) { fn(table); });
  }

  function getAdminPass() {
    try { return localStorage.getItem(PASS_KEY) || DEFAULT_PASS; }
    catch (e) { return DEFAULT_PASS; }
  }

  function setAdminPass(pass) {
    localStorage.setItem(PASS_KEY, pass);
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  /* ---------- Migración de datos guardados ----------
     Si el navegador ya tenía inventario guardado, data.js no se vuelve a
     leer. Aquí se aplican una sola vez las altas y correcciones nuevas. */
  var REV_KEY = 'cecyte_data_rev';

  function normName(v) {
    return String(v == null ? '' : v).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function nextId(list, prefix) {
    var max = 0;
    list.forEach(function (r) {
      var m = new RegExp('^' + prefix + '(\\d+)$').exec(String(r.id || ''));
      if (m) max = Math.max(max, +m[1]);
    });
    return prefix + String(max + 1).padStart(3, '0');
  }

  function migrate() {
    var updates = window.CECYTE_DATA_UPDATES || [];
    var initial = window.CECYTE_INITIAL_DB || {};
    var current;
    try { current = parseInt(localStorage.getItem(REV_KEY), 10) || 0; } catch (e) { return; }
    var latest = updates.reduce(function (n, u) { return Math.max(n, u.rev); }, 0);
    if (current >= latest) return;

    var cache = {};
    function load(table) {
      if (cache[table] !== undefined) return cache[table];
      var raw = localStorage.getItem(DB_PREFIX + table);
      var data = null;
      try { data = raw ? JSON.parse(raw) : null; } catch (e) { data = null; }
      cache[table] = Array.isArray(data) ? data : null; // null = sin datos guardados
      return cache[table];
    }

    updates.forEach(function (u) {
      if (u.rev <= current) return;

      Object.keys(u.add || {}).forEach(function (table) {
        var list = load(table);
        if (!list) return; // usará data.js completo, que ya los incluye
        var nameKey = table === 'materiales' ? 'material' : 'reactivo';
        u.add[table].forEach(function (id) {
          var rec = (initial[table] || []).filter(function (r) { return r.id === id; })[0];
          if (!rec) return;
          var exists = list.some(function (r) { return normName(r[nameKey]) === normName(rec[nameKey]); });
          if (exists) return;
          var copy = clone(rec);
          if (list.some(function (r) { return r.id === copy.id; })) {
            copy.id = nextId(list, table === 'materiales' ? 'M' : 'R');
          }
          list.push(copy);
        });
      });

      (u.patch || []).forEach(function (p) {
        var list = load(p.table);
        if (!list) return;
        list.forEach(function (r) {
          if (r.id === p.id && String(r[p.field]) === p.from) r[p.field] = p.to;
        });
      });
    });

    try {
      Object.keys(cache).forEach(function (table) {
        if (cache[table]) localStorage.setItem(DB_PREFIX + table, JSON.stringify(cache[table]));
      });
      localStorage.setItem(REV_KEY, String(latest));
    } catch (e) { /* almacenamiento lleno o bloqueado */ }
  }

  migrate();

  window.Store = {
    TABLES: ['materiales', 'reactivos', 'practicas'],
    getDB: getDB,
    setDB: setDB,
    getAdminPass: getAdminPass,
    setAdminPass: setAdminPass,
    onChange: onChange
  };
})();
