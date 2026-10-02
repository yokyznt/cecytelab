/* =========================================================
   CECyTE Lab · Sección de seguridad
   Manual con índice por capítulos y lector en la misma página
   (sin ventanas emergentes). En móvil el índice y el lector
   se alternan.
   ========================================================= */
(function () {
  'use strict';

  var SAFETY = window.CECYTE_SAFETY || {};
  var SHELF = window.CECYTE_SHELF || {};
  var host = document.getElementById('manual');
  if (!host) return;

  var esc = UI.escapeHTML;

  var CHAPTERS = [
    { title: 'Normas básicas', keys: ['equipo', 'autorizacion', 'disciplina', 'alimentos', 'limpieza', 'accidentes'] },
    { title: 'Almacenamiento', keys: ['colores', 'estanteria', 'senaletica'] },
    { title: 'Etiquetado y carpetas', keys: ['carpeta1', 'carpeta2', 'carpeta3', 'etiquetas'] },
    { title: 'Residuos', keys: ['normativa', 'neutralizacion', 'pozo'] }
  ];

  var order = [];
  CHAPTERS.forEach(function (c) {
    c.keys = c.keys.filter(function (k) { return SAFETY[k]; });
    order = order.concat(c.keys);
  });

  /* ---------- Estructura ---------- */
  host.innerHTML =
    '<nav class="manual__index" aria-label="Índice de seguridad">' +
      CHAPTERS.map(function (c) {
        return '<section class="mi-chapter">' +
          '<h3 class="mi-chapter__title">' + esc(c.title) + '</h3>' +
          '<ul class="mi-list">' +
            c.keys.map(function (k) {
              return '<li><button type="button" class="mi-item tone-' + SAFETY[k].tone + '" data-safety="' + k + '">' +
                esc(SAFETY[k].title) + '</button></li>';
            }).join('') +
          '</ul></section>';
      }).join('') +
    '</nav>' +
    '<article class="manual__reader" id="manualReader" aria-live="polite">' +
      '<button type="button" class="reader__back" data-reader-back><i class="ph ph-arrow-left" aria-hidden="true"></i> Índice</button>' +
      '<header class="reader__head">' +
        '<span class="reader__blob" aria-hidden="true"><i class="ph" id="readerIcon"></i></span>' +
        '<h3 class="reader__title" id="readerTitle" tabindex="-1"></h3>' +
      '</header>' +
      '<div class="reader__body" id="readerBody"></div>' +
      '<footer class="reader__nav">' +
        '<button type="button" class="reader__step reader__step--prev" data-step="-1"></button>' +
        '<button type="button" class="reader__step reader__step--next" data-step="1"></button>' +
      '</footer>' +
    '</article>';

  var reader = document.getElementById('manualReader');
  var icon = document.getElementById('readerIcon');
  var title = document.getElementById('readerTitle');
  var body = document.getElementById('readerBody');
  var prevBtn = host.querySelector('.reader__step--prev');
  var nextBtn = host.querySelector('.reader__step--next');
  var current = null;

  function step(btn, key, dir) {
    if (!key) { btn.hidden = true; return; }
    btn.hidden = false;
    btn.setAttribute('data-key', key);
    btn.innerHTML =
      '<small>' + (dir < 0 ? '← Anterior' : 'Siguiente →') + '</small>' +
      '<strong>' + esc(SAFETY[key].title) + '</strong>';
  }

  function select(key, opts) {
    var data = SAFETY[key];
    if (!data) return;
    opts = opts || {};
    var idx = order.indexOf(key);
    var dir = current ? (idx >= order.indexOf(current) ? 'next' : 'back') : 'next';
    current = key;

    host.querySelectorAll('.mi-item').forEach(function (b) {
      var on = b.getAttribute('data-safety') === key;
      if (on) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });

    reader.className = 'manual__reader tone-' + data.tone;
    icon.className = 'ph ph-' + data.icon;
    title.textContent = data.title;
    body.innerHTML = data.content;
    step(prevBtn, order[idx - 1], -1);
    step(nextBtn, order[idx + 1], 1);

    if (!UI.reduceMotion.matches) {
      reader.setAttribute('data-dir', dir);
      reader.classList.remove('is-swapping');
      void reader.offsetWidth;
      reader.classList.add('is-swapping');
    }

    if (opts.drill) {
      host.classList.add('is-reading');
      window.scrollTo({ top: host.getBoundingClientRect().top + window.scrollY - 90, behavior: UI.reduceMotion.matches ? 'auto' : 'smooth' });
      title.focus({ preventScroll: true });
    }
  }

  /* ---------- Eventos ---------- */
  host.addEventListener('click', function (e) {
    var item = e.target.closest('[data-safety]');
    if (item) { select(item.getAttribute('data-safety'), { drill: true }); return; }

    var stepBtn = e.target.closest('[data-step]');
    if (stepBtn) {
      select(stepBtn.getAttribute('data-key'), { drill: true });
      return;
    }

    if (e.target.closest('[data-reader-back]')) {
      host.classList.remove('is-reading');
      var active = host.querySelector('.mi-item[aria-current="true"]');
      if (active) active.focus({ preventScroll: true });
      return;
    }

    var flask = e.target.closest('[data-shelf]');
    if (flask) updateShelf(flask);
  });

  // Flechas arriba/abajo recorren el índice
  host.querySelector('.manual__index').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    var items = Array.prototype.slice.call(host.querySelectorAll('.mi-item'));
    var i = items.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    var next = items[i + (e.key === 'ArrowDown' ? 1 : -1)];
    if (next) next.focus();
  });

  /* ---------- Estante interactivo ---------- */
  function updateShelf(flask) {
    var code = flask.getAttribute('data-shelf');
    var info = SHELF[code];
    var box = document.getElementById('shelfInfo');
    if (!info || !box) return;

    body.querySelectorAll('[data-shelf]').forEach(function (f) {
      f.setAttribute('aria-pressed', String(f.getAttribute('data-shelf') === code));
    });

    box.className = 'shelf-info shelf-info--' + code;
    box.innerHTML =
      '<p class="shelf-info__title"><span class="swatch-dot swatch-dot--' + code + '" aria-hidden="true"></span> ' + esc(info.title) + '</p>' +
      '<p>' + esc(info.text) + '</p>';

    if (!UI.reduceMotion.matches) {
      box.classList.remove('is-pop');
      void box.offsetWidth;
      box.classList.add('is-pop');
    }
  }

  if (order.length) select(order[0]);

  window.Safety = { select: select };
})();
