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

  // Un inventario guardado con la forma anterior (renglones sueltos) no sirve
  function validShape(table, list) {
    if (table !== 'inventario' || !list.length) return true;
    return list.every(function (r) { return r && typeof r.articulo === 'string' && Array.isArray(r.presentaciones); });
  }

  function getDB(table) {
    try {
      var raw = localStorage.getItem(DB_PREFIX + table);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && validShape(table, parsed)) return parsed;
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

  function normName(v) {
    return String(v == null ? '' : v).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
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

  /* ---------- Migración: materiales + reactivos -> inventario ----------
     Antes había dos tablas guardadas por separado. Se pasan al inventario
     único solo las altas de la persona (lo que no estaba en la lista original);
     las claves viejas se dejan como respaldo. Corre una sola vez. */
  var V2_KEY = 'cecyte_inv_v2';

  function readList(table) {
    try {
      var data = JSON.parse(localStorage.getItem(DB_PREFIX + table));
      return Array.isArray(data) ? data : null;
    } catch (e) { return null; }
  }

  // "500 ml (1 frasco)" -> 1 × 500 ml; "2.1 kg (26 frascos)" -> 26 frascos y el total en la nota
  function legacyReagentPresentation(r) {
    var text = String(r.cantidad || '').trim();
    var count = /\((\d+)\s*(?:frascos?|botes?)/i.exec(text);
    var total = text.replace(/\s*\(.*$/, '').trim();
    var caducidad = r.caducidad || 'N/A';
    if (count && +count[1] === 1 && total) return { medida: total, cantidad: 1, caducidad: caducidad, nota: '' };
    if (count) return { medida: '', cantidad: +count[1], caducidad: caducidad, nota: total ? 'Total ' + total : '' };
    return { medida: '', cantidad: 1, caducidad: caducidad, nota: text ? 'Cantidad original: ' + text : '' };
  }

  function legacyMaterialPresentation(m) {
    var text = String(m.cantidad || '').trim();
    var parsed = /^(\d+(?:[.,]\d+)?)\s*(.*)$/.exec(text);
    var p = { medida: '', cantidad: parsed ? parseFloat(parsed[1].replace(',', '.')) : 1, caducidad: 'N/A', nota: '' };
    if (!parsed && text) p.nota = 'Cantidad original: ' + text;
    var unit = parsed ? parsed[2].trim().toLowerCase() : '';
    if (unit && !/^pieza/.test(unit)) p.unidad = unit.replace(/s$/, '');
    if (m.estado && m.estado !== 'Bueno') p.nota = (p.nota ? p.nota + '. ' : '') + 'Estado ' + String(m.estado).toLowerCase();
    return p;
  }

  function migrateLegacy() {
    try {
      if (localStorage.getItem(V2_KEY)) return;
      var oldMat = readList('materiales'), oldReac = readList('reactivos');
      if (!oldMat && !oldReac) { localStorage.setItem(V2_KEY, '1'); return; }

      var legacy = window.CECYTE_LEGACY || { materiales: [], reactivos: [] };
      var known = {};
      legacy.materiales.concat(legacy.reactivos).forEach(function (n) { known[normName(n)] = true; });

      var inv = getDB('inventario');
      var before = inv.length;
      var exists = {};
      inv.forEach(function (a) { exists[normName(a.articulo)] = true; });

      function add(rec, name) {
        var key = normName(name);
        if (!key || known[key] || exists[key]) return;
        exists[key] = true;
        rec.id = nextId(inv, 'I');
        inv.push(rec);
      }

      (oldMat || []).forEach(function (m) {
        add({ articulo: m.material, tipo: 'material', presentaciones: [legacyMaterialPresentation(m)],
          ubicacion: m.ubicacion || '', obs: m.desc || '' }, m.material);
      });
      (oldReac || []).forEach(function (r) {
        add({ articulo: r.reactivo, tipo: 'reactivo', presentaciones: [legacyReagentPresentation(r)],
          riesgo: r.riesgo || '', almacen: r.almacen || '' }, r.reactivo);
      });

      if (inv.length !== before) localStorage.setItem(DB_PREFIX + 'inventario', JSON.stringify(inv));
      localStorage.setItem(V2_KEY, '1');
    } catch (e) { /* almacenamiento lleno o bloqueado: el sitio sigue con el inventario inicial */ }
  }

  /* ---------- Actualizaciones de datos ya guardados ----------
     Si el navegador ya tenía inventario guardado, inventario.js no se vuelve a
     leer. Aquí se aplican una sola vez las altas y correcciones nuevas
     (ver CECYTE_DATA_UPDATES en data.js). */
  var REV_KEY = 'cecyte_data_rev';

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
        if (!list) return; // usará el inventario inicial completo, que ya los incluye
        u.add[table].forEach(function (id) {
          var rec = (initial[table] || []).filter(function (r) { return r.id === id; })[0];
          if (!rec) return;
          var exists = list.some(function (r) { return normName(r.articulo) === normName(rec.articulo); });
          if (exists) return;
          var copy = clone(rec);
          if (list.some(function (r) { return r.id === copy.id; })) copy.id = nextId(list, 'I');
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

  migrateLegacy();
  migrate();

  window.Store = {
    TABLES: ['inventario', 'practicas'],
    getDB: getDB,
    setDB: setDB,
    getAdminPass: getAdminPass,
    setAdminPass: setAdminPass,
    onChange: onChange
  };
})();
