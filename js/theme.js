/* =========================================================
   CECyTE Lab · Tema (se ejecuta antes del primer pintado)
   ========================================================= */
(function () {
  var KEY = 'cecyte_theme';
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* almacenamiento bloqueado */ }

  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme = saved === 'dark' || saved === 'light' ? saved : (prefersDark ? 'dark' : 'light');

  document.documentElement.dataset.theme = theme;

  window.CECYTE_THEME = {
    KEY: KEY,
    get: function () { return document.documentElement.dataset.theme || 'light'; },
    set: function (next) {
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem(KEY, next); } catch (e) { /* noop */ }
      var meta = document.querySelectorAll('meta[name="theme-color"]');
      meta.forEach(function (m) { m.setAttribute('content', next === 'dark' ? '#0d1209' : '#f6f8ec'); });
    }
  };
})();

/* Tamaño de texto guardado: se aplica antes del primer pintado */
try {
  var cecyteSize = localStorage.getItem('cecyte_size');
  if (cecyteSize) document.documentElement.setAttribute('data-size', cecyteSize);
} catch (e) { /* almacenamiento bloqueado */ }
