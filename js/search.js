/* =========================================================
   CECyTE Lab · Buscador del inicio con sugerencias en vivo
   Mientras escribes muestra las coincidencias del inventario
   (reactivos y materiales) y de las prácticas; al elegir una, abre su tabla ya
   filtrada. Patrón combobox/listbox (teclado y lector de
   pantalla).
   ========================================================= */
(function () {
  'use strict';

  var form = document.getElementById('globalSearchForm');
  var input = document.getElementById('globalSearch');
  var panel = document.getElementById('sgPanel');
  var live = document.getElementById('sgLive');
  if (!form || !input || !panel || !live || !window.Store || !window.Tables || !window.UI) return;

  var esc = UI.escapeHTML;
  var CATS = [
    { id: 'inventario', label: 'Inventario', perGroup: 6 },
    { id: 'practicas', label: 'Prácticas', perGroup: 3 }
  ];
  var ACCENTS = { a: 'áàäâ', e: 'éèëê', i: 'íìïî', o: 'óòöô', u: 'úùüû', n: 'ñ' };
  var options = [];
  var active = -1;

  /* ---------- Resaltado sin distinguir acentos ---------- */
  function hitRegex(words) {
    var parts = words.map(function (w) {
      return w.split('').map(function (ch) {
        var extra = ACCENTS[ch.toLowerCase()];
        if (extra) {
          var set = ch.toLowerCase() + extra;
          return '[' + set + set.toUpperCase() + ']';
        }
        return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }).join('');
    });
    return new RegExp('(' + parts.join('|') + ')', 'gi');
  }

  function highlight(text, re) {
    var out = '';
    var last = 0;
    var m;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      if (m[0] === '') { re.lastIndex++; continue; }
      out += esc(text.slice(last, m.index)) + '<mark class="sg__hit">' + esc(m[0]) + '</mark>';
      last = m.index + m[0].length;
    }
    return out + esc(text.slice(last));
  }

  /* ---------- Cómo se ve cada coincidencia ---------- */
  function describe(cat, r) {
    if (cat === 'inventario') {
      var type = Tables.inventoryType(r);
      var total = Tables.stockInfo(r).parts.map(function (p) {
        return Math.round(p.n * 100) / 100 + ' ' + p.label;
      }).join(' · ');
      return {
        title: r.articulo,
        ico: r.tipo === 'reactivo'
          ? '<span class="sg__ico"><span class="swatch-dot swatch-dot--' + Tables.colorSlug(r.almacen) + '"></span></span>'
          : '<span class="sg__ico cell-icon--' + type.id + '"><i class="ph ph-' + type.icon + '"></i></span>',
        meta: [r.tipo === 'reactivo' ? 'Reactivo' : type.label, total].filter(Boolean).join(' · '),
        tag: Tables.rowExpired(r) ? 'Caducado' : ''
      };
    }
    return {
      title: r.prac,
      ico: '<span class="sg__ico"><i class="ph ph-microscope"></i></span>',
      meta: [r.mat, r.fecha].filter(Boolean).join(' · '),
      tag: ''
    };
  }

  /* ---------- Panel ---------- */
  function close() {
    panel.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  }

  function setActive(i, scroll) {
    var prev = panel.querySelector('[aria-selected="true"]');
    if (prev) prev.setAttribute('aria-selected', 'false');
    if (i < 0 || !options[i]) {
      active = -1;
      input.removeAttribute('aria-activedescendant');
      return;
    }
    active = i;
    var el = document.getElementById('sg-opt-' + i);
    el.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', el.id);
    if (scroll) el.scrollIntoView({ block: 'nearest' });
  }

  function render(raw) {
    var q = raw.trim();
    if (q.length < 2) { close(); live.textContent = ''; return; }

    var words = Tables.norm(q).split(/\s+/).filter(Boolean);
    var re = hitRegex(words);
    var total = 0;
    options = [];

    var html = CATS.map(function (c) {
      var rows = Tables.search(c.id, q)
        .map(function (r, i) {
          // Primero lo que coincide en el nombre; el resto (otros campos) después
          var name = Tables.norm(describe(c.id, r).title);
          var inName = words.every(function (w) { return name.indexOf(w) > -1; });
          return { r: r, i: i, s: inName ? 1 : 0 };
        })
        .sort(function (a, b) { return b.s - a.s || a.i - b.i; })
        .map(function (x) { return x.r; });
      total += rows.length;
      if (!rows.length) return '';
      var shown = rows.slice(0, c.perGroup);

      var opts = shown.map(function (r) {
        var d = describe(c.id, r);
        var i = options.push({ cat: c.id, title: d.title }) - 1;
        return '<div class="sg__opt" role="option" id="sg-opt-' + i + '" data-i="' + i + '" aria-selected="false">' +
          d.ico +
          '<span class="sg__main">' +
            '<span class="sg__title">' + highlight(d.title, re) + '</span>' +
            '<span class="sg__meta">' + esc(d.meta) + '</span>' +
          '</span>' +
          (d.tag ? '<span class="sg__tag">' + esc(d.tag) + '</span>' : '') +
        '</div>';
      }).join('');

      var more = rows.length > shown.length
        ? '<button type="button" class="sg__more" tabindex="-1" data-more="' + c.id + '">Ver los ' + rows.length + '</button>'
        : '';

      return '<div class="sg__group" role="group" aria-label="' + c.label + '">' +
        '<div class="sg__head"><span>' + c.label + '</span>' + more + '</div>' + opts + '</div>';
    }).join('');

    if (!total) html = '<p class="sg__empty">Sin coincidencias. Prueba con otra palabra.</p>';

    panel.innerHTML = html;
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    setActive(-1);
    live.textContent = total ? total + (total === 1 ? ' coincidencia' : ' coincidencias') : 'Sin coincidencias';
  }

  /* ---------- Ir a la tabla con la búsqueda aplicada ---------- */
  function goTo(cat, query) {
    close();
    Tables.show(cat); // sin búsqueda ni chips de antes
    location.hash = '#' + cat;
    setTimeout(function () {
      var target = document.querySelector('[data-search="' + cat + '"]');
      if (!target) return;
      target.value = query;
      target.dispatchEvent(new Event('input'));
    }, 0);
  }

  /* ---------- Eventos ---------- */
  input.addEventListener('input', function () { render(input.value); });

  input.addEventListener('focus', function () {
    if (input.value.trim() && panel.hidden) render(input.value);
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!panel.hidden) { e.preventDefault(); close(); }
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    if (panel.hidden) render(input.value);
    if (!options.length) return;
    e.preventDefault();
    var n = options.length;
    var next;
    if (e.key === 'ArrowDown') next = active < 0 ? 0 : (active + 1) % n;
    else next = active < 0 ? n - 1 : (active - 1 + n) % n;
    setActive(next, true);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var raw = input.value.trim();
    if (!raw) { input.focus(); return; }

    if (active >= 0 && options[active]) {
      goTo(options[active].cat, options[active].title);
      return;
    }

    var best = null;
    var bestN = 0;
    CATS.forEach(function (c) {
      var n = Tables.search(c.id, raw).length;
      if (n > bestN) { bestN = n; best = c.id; }
    });
    if (best) goTo(best, raw);
    else render(raw);
  });

  // El foco se queda en el campo al hacer clic en una sugerencia
  panel.addEventListener('mousedown', function (e) { e.preventDefault(); });

  panel.addEventListener('click', function (e) {
    var more = e.target.closest('[data-more]');
    if (more) { goTo(more.getAttribute('data-more'), input.value.trim()); return; }
    var opt = e.target.closest('.sg__opt');
    if (!opt) return;
    var picked = options[Number(opt.getAttribute('data-i'))];
    if (picked) goTo(picked.cat, picked.title);
  });

  document.addEventListener('click', function (e) {
    if (!form.contains(e.target)) close();
  });

  window.addEventListener('hashchange', close);
})();
