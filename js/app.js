/* =========================================================
   CECyTE Lab · Aplicación principal
   Enrutador por hash, panel de inicio y cambio de tema.
   ========================================================= */
(function () {
  'use strict';

  var esc = UI.escapeHTML;
  var VIEWS = ['inicio', 'inventario', 'practicas', 'seguridad'];
  var TITLES = {
    inicio: 'CECyTE Lab · Sistema integral de laboratorio',
    practicas: 'Prácticas · CECyTE Lab',
    inventario: 'Inventario · CECyTE Lab',
    seguridad: 'Seguridad · CECyTE Lab'
  };

  // Enlaces de las versiones anteriores: abren el inventario con su tipo ya elegido
  var LEGACY_VIEWS = { materiales: 'material', reactivos: 'reactivo' };

  /* ---------- Enrutador ---------- */
  var currentView = null;

  function route(initial) {
    var hash = (location.hash || '').replace('#', '');
    if (LEGACY_VIEWS[hash]) {
      Tables.show('inventario', { tipo: LEGACY_VIEWS[hash] });
      history.replaceState(null, '', '#inventario');
      hash = 'inventario';
    }
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

  function setNavBadge(id, n, text) {
    var el = document.getElementById(id);
    if (!el) return;
    el.hidden = !n;
    el.innerHTML = n + '<span class="sr-only"> ' + text + '</span>';
  }

  function renderHome() {
    var inv = Tables.stats();
    var prac = Store.getDB('practicas');

    animateNumber(document.getElementById('tile-mat'), inv.materiales);
    animateNumber(document.getElementById('tile-reac'), inv.reactivos);
    animateNumber(document.getElementById('tile-prac'), prac.length);

    // Alertas
    var alerts = [];
    if (inv.expired) {
      alerts.push(
        '<a class="alert alert--bad" href="#inventario" data-goto-filter="inventario:alerta=caducado">' +
          '<i class="ph-fill ph-warning" aria-hidden="true"></i>' +
          '<span><strong>' + plural(inv.expired, 'artículo con lote caducado', 'artículos con lotes caducados') + '</strong>' +
          '</span>' +
          '<i class="ph ph-arrow-right alert__go" aria-hidden="true"></i>' +
        '</a>');
    }
    if (inv.observed) {
      alerts.push(
        '<a class="alert alert--warn" href="#inventario" data-goto-filter="inventario:alerta=obs">' +
          '<i class="ph-fill ph-wrench" aria-hidden="true"></i>' +
          '<span><strong>' + plural(inv.observed, 'artículo con observaciones', 'artículos con observaciones') + '</strong>' +
          '</span>' +
          '<i class="ph ph-arrow-right alert__go" aria-hidden="true"></i>' +
        '</a>');
    }
    if (!alerts.length) {
      alerts.push('<p class="alert alert--ok"><i class="ph-fill ph-check-circle" aria-hidden="true"></i><span><strong>Todo en orden</strong></span></p>');
    }
    document.getElementById('homeAlerts').innerHTML = alerts.join('');
    setNavBadge('navBadgeCad', inv.expired, 'caducados');
    setNavBadge('navBadgeObs', inv.observed, 'con observaciones');
  }

  // Tarjetas y alertas del inicio: al navegar, el inventario abre con ese filtro solo
  // ("inventario:tipo=material" limpia búsqueda y demás filtros y deja únicamente ese).
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-goto-filter]');
    if (!a) return;
    var m = /^([^:]+):([^=]+)=(.*)$/.exec(a.getAttribute('data-goto-filter'));
    if (!m) return;
    var f = {};
    f[m[2]] = m[3];
    Tables.show(m[1], f);
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
