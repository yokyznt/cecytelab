/* =========================================================
   CECyTE Lab · Aplicación principal
   Enrutador por hash, panel de inicio y cambio de tema.
   ========================================================= */
(function () {
  'use strict';

  var esc = UI.escapeHTML;
  var VIEWS = ['inicio', 'materiales', 'reactivos', 'practicas', 'seguridad'];
  var TITLES = {
    inicio: 'CECyTE Lab · Sistema integral de laboratorio',
    materiales: 'Materiales · CECyTE Lab',
    reactivos: 'Reactivos · CECyTE Lab',
    practicas: 'Prácticas · CECyTE Lab',
    seguridad: 'Seguridad · CECyTE Lab'
  };

  /* ---------- Enrutador ---------- */
  var currentView = null;

  function route(initial) {
    var hash = (location.hash || '').replace('#', '');
    var view = VIEWS.indexOf(hash) > -1 ? hash : 'inicio';
    if (view === currentView) return;
    var prevView = currentView;
    currentView = view;

    document.querySelectorAll('.view[data-view]').forEach(function (sec) {
      var on = sec.getAttribute('data-view') === view;
      sec.hidden = !on;
      if (on) {
        sec.classList.remove('is-entering');
        sec.setAttribute('data-dir', prevView && VIEWS.indexOf(view) < VIEWS.indexOf(prevView) ? 'back' : 'next');
        void sec.offsetWidth;
        sec.classList.add('is-entering');
      }
    });

    document.querySelectorAll('[data-nav]').forEach(function (a) {
      if (a.getAttribute('data-nav') === view) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    document.title = TITLES[view];
    UI.updateSliders();
    UI.observeReveals(document.querySelector('.view[data-view="' + view + '"]'));

    if (!initial) {
      window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
      var main = document.getElementById('main');
      if (main) main.focus({ preventScroll: true });
    }

    // Mantener visible el enlace activo en la barra móvil desplazable
    var active = document.querySelector('[data-nav="' + view + '"]');
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  window.addEventListener('hashchange', function () { route(false); });

  /* ---------- Panel de inicio ---------- */
  var DIST_ORDER = [
    { slug: 'verde', label: 'Verde' },
    { slug: 'azul', label: 'Azul' },
    { slug: 'amarillo', label: 'Amarillo' },
    { slug: 'rojo', label: 'Rojo' },
    { slug: 'blanco', label: 'Blanco' },
    { slug: 'rayas', label: 'Rayas' }
  ];

  function animateNumber(el, to) {
    if (!el) return;
    var from = parseInt(el.textContent, 10) || 0;
    if (UI.reduceMotion.matches || from === to) { el.textContent = String(to); return; }
    var start = performance.now();
    var dur = 600;
    function tick(now) {
      var t = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(from + (to - from) * eased));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function plural(n, one, many) {
    return n + ' ' + (n === 1 ? one : many);
  }

  function renderHome() {
    var mat = Store.getDB('materiales');
    var reac = Store.getDB('reactivos');
    var prac = Store.getDB('practicas');

    animateNumber(document.getElementById('stat-mat'), mat.length);
    animateNumber(document.getElementById('stat-reac'), reac.length);
    animateNumber(document.getElementById('stat-prac'), prac.length);

    animateNumber(document.getElementById('tile-mat'), mat.length);
    animateNumber(document.getElementById('tile-reac'), reac.length);
    animateNumber(document.getElementById('tile-prac'), prac.length);

    // Distribución por color de almacenaje
    var counts = {};
    reac.forEach(function (r) {
      var s = Tables.colorSlug(r.almacen);
      counts[s] = (counts[s] || 0) + 1;
    });
    var total = reac.length || 1;
    var bar = document.getElementById('distBar');
    var legend = document.getElementById('distLegend');
    var parts = DIST_ORDER.filter(function (d) { return counts[d.slug]; });

    bar.innerHTML = parts.map(function (d) {
      return '<span class="dist__seg swatch-bg--' + d.slug + '" style="flex-grow:' + counts[d.slug] + '" title="' + d.label + ': ' + counts[d.slug] + '"></span>';
    }).join('');
    bar.setAttribute('aria-label', 'Distribución de reactivos: ' + parts.map(function (d) {
      return d.label + ' ' + counts[d.slug];
    }).join(', '));

    legend.innerHTML = parts.map(function (d) {
      var pct = Math.round((counts[d.slug] / total) * 100);
      return '<li><span class="swatch-dot swatch-dot--' + d.slug + '" aria-hidden="true"></span>' + d.label +
        ' <span class="mono dist-legend__n">' + counts[d.slug] + '</span><span class="sr-only"> (' + pct + '%)</span></li>';
    }).join('');

    // Alertas
    var expired = reac.filter(function (r) { return Tables.isExpired(r.caducidad); });
    var bad = mat.filter(function (m) { return Tables.estadoTone(m.estado) === 'bad'; });
    var alerts = [];
    if (expired.length) {
      alerts.push(
        '<a class="alert alert--bad" href="#reactivos" data-goto-filter="reactivos:__caducado">' +
          '<i class="ph-fill ph-warning" aria-hidden="true"></i>' +
          '<span><strong>' + plural(expired.length, 'reactivo con lote caducado', 'reactivos con lotes caducados') + '</strong>' +
          '</span>' +
          '<i class="ph ph-arrow-right alert__go" aria-hidden="true"></i>' +
        '</a>');
    }
    if (bad.length) {
      alerts.push(
        '<a class="alert alert--warn" href="#materiales" data-goto-filter="materiales:Malo">' +
          '<i class="ph-fill ph-wrench" aria-hidden="true"></i>' +
          '<span><strong>' + plural(bad.length, 'material en mal estado', 'materiales en mal estado') + '</strong>' +
          '</span>' +
          '<i class="ph ph-arrow-right alert__go" aria-hidden="true"></i>' +
        '</a>');
    }
    if (!alerts.length) {
      alerts.push('<p class="alert alert--ok"><i class="ph-fill ph-check-circle" aria-hidden="true"></i><span><strong>Todo en orden</strong></span></p>');
    }
    document.getElementById('homeAlerts').innerHTML = alerts.join('');

    renderAgenda(prac);
  }

  function renderAgenda(prac) {
    var list = document.getElementById('agendaList');
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var dated = prac
      .map(function (p) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(p.fecha || ''));
        return m ? { p: p, d: new Date(+m[1], +m[2] - 1, +m[3]) } : null;
      })
      .filter(Boolean)
      .sort(function (a, b) { return a.d - b.d; });

    var upcoming = dated.filter(function (x) { return x.d >= today; });
    var showingPast = false;
    if (!upcoming.length) {
      upcoming = dated.slice(-4).reverse();
      showingPast = true;
    }
    upcoming = upcoming.slice(0, 4);

    if (!upcoming.length) {
      list.innerHTML = '<li class="agenda__empty"><i class="ph ph-calendar-blank" aria-hidden="true"></i> No hay prácticas con fecha registrada.</li>';
      return;
    }

    var dayFmt = new Intl.DateTimeFormat('es-MX', { day: '2-digit' });
    var monFmt = new Intl.DateTimeFormat('es-MX', { month: 'short' });
    var wkFmt = new Intl.DateTimeFormat('es-MX', { weekday: 'long' });

    list.innerHTML = upcoming.map(function (x) {
      var diff = Math.round((x.d - today) / 86400000);
      var rel = diff === 0 ? 'Hoy' : diff === 1 ? 'Mañana' : diff > 1 ? 'En ' + diff + ' días' : 'Hace ' + Math.abs(diff) + ' días';
      return '<li class="agenda__item' + (diff === 0 ? ' is-today' : '') + (diff < 0 ? ' is-past' : '') + '">' +
        '<time class="agenda__date" datetime="' + esc(x.p.fecha) + '">' +
          '<span class="agenda__day mono">' + dayFmt.format(x.d) + '</span>' +
          '<span class="agenda__mon">' + monFmt.format(x.d).replace('.', '') + '</span>' +
        '</time>' +
        '<div class="agenda__body">' +
          '<p class="agenda__title">' + esc(x.p.prac) + '</p>' +
          '<p class="agenda__meta"><span class="badge badge--subject">' + esc(x.p.mat) + '</span></p>' +
        '</div>' +
        '<span class="agenda__rel"><span class="mono">' + rel + '</span></span>' +
      '</li>';
    }).join('') + '';
  }

  // Alertas del inicio: navegar y aplicar filtro
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-goto-filter]');
    if (!a) return;
    var parts = a.getAttribute('data-goto-filter').split(':');
    var btn = function () {
      return document.querySelector('[data-filters="' + parts[0] + '"] [data-filter="' + parts[1] + '"]');
    };
    setTimeout(function () {
      var b = btn();
      if (b && b.getAttribute('aria-pressed') !== 'true') b.click();
    }, 0);
  });

  /* ---------- Fecha de hoy ---------- */
  function renderToday() {
    var el = document.getElementById('todayLabel');
    if (!el) return;
    var now = new Date();
    el.dateTime = now.toISOString().slice(0, 10);
    el.textContent = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
      .format(now).replace('.', '');
  }

  /* ---------- Tema ---------- */
  var themeBtn = document.getElementById('themeToggle');

  function syncThemeButton() {
    var dark = window.CECYTE_THEME.get() === 'dark';
    themeBtn.setAttribute('aria-label', dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    themeBtn.setAttribute('aria-pressed', String(dark));
    themeBtn.querySelector('i').className = 'ph ' + (dark ? 'ph-sun' : 'ph-moon');
  }

  themeBtn.addEventListener('click', function () {
    var next = window.CECYTE_THEME.get() === 'dark' ? 'light' : 'dark';
    var root = document.documentElement;
    root.classList.add('theme-switching');
    window.CECYTE_THEME.set(next);
    syncThemeButton();
    // Desactiva transiciones durante el cambio para evitar destellos desiguales
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { root.classList.remove('theme-switching'); });
    });
  });

  /* ---------- Topbar con sombra al desplazar ---------- */
  var topbar = document.querySelector('.topbar');
  var sentinelTicking = false;
  window.addEventListener('scroll', function () {
    if (sentinelTicking) return;
    sentinelTicking = true;
    requestAnimationFrame(function () {
      topbar.classList.toggle('is-scrolled', window.scrollY > 4);
      sentinelTicking = false;
    });
  }, { passive: true });

  /* ---------- Arranque ---------- */
  Store.onChange(function () { renderHome(); });

  syncThemeButton();
  renderToday();
  Tables.buildAll();
  renderHome();
  route(true);
  UI.observeReveals();
  document.documentElement.classList.add('is-ready');
})();
