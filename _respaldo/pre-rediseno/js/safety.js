/* =========================================================
   CECyTE Lab · Sección de seguridad
   Pestañas segmentadas, hoja de protocolo y estante interactivo.
   ========================================================= */
(function () {
  'use strict';

  var SAFETY = window.CECYTE_SAFETY || {};
  var SHELF = window.CECYTE_SHELF || {};

  /* ---------- Pestañas ---------- */
  var tablist = document.querySelector('#sec-seguridad [role="tablist"]');
  var tabs = tablist ? Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]')) : [];

  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) {
        panel.hidden = !on;
        if (on) {
          panel.classList.remove('is-entering');
          void panel.offsetWidth;
          panel.classList.add('is-entering');
        }
      }
    });
    if (focus) tab.focus();
    UI.positionSlider(tablist);
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End') next = tabs[tabs.length - 1];
      if (!next) return;
      e.preventDefault();
      selectTab(next, true);
      next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  });

  /* ---------- Hoja de protocolo ---------- */
  var sheet = document.getElementById('safetySheet');
  var sheetIcon = document.getElementById('safetyIcon');
  var sheetTitle = document.getElementById('safetyTitle');
  var sheetBody = document.getElementById('safetyBody');

  function openSafety(key, trigger) {
    var data = SAFETY[key];
    if (!data) return;
    sheet.className = 'sheet tone-' + data.tone;
    sheetIcon.className = 'ph ph-' + data.icon;
    sheetTitle.textContent = data.title;
    sheetBody.innerHTML = data.content;
    sheetBody.scrollTop = 0;
    UI.openDialog(sheet, trigger);
  }

  document.addEventListener('click', function (e) {
    var card = e.target.closest('[data-safety]');
    if (card) { openSafety(card.getAttribute('data-safety'), card); return; }

    var flask = e.target.closest('[data-shelf]');
    if (flask) updateShelf(flask);
  });

  /* ---------- Estante interactivo ---------- */
  function updateShelf(flask) {
    var code = flask.getAttribute('data-shelf');
    var info = SHELF[code];
    var box = document.getElementById('shelfInfo');
    if (!info || !box) return;

    sheetBody.querySelectorAll('[data-shelf]').forEach(function (f) {
      f.setAttribute('aria-pressed', String(f.getAttribute('data-shelf') === code));
    });

    box.className = 'shelf-info shelf-info--' + code;
    box.innerHTML =
      '<p class="shelf-info__title"><span class="swatch-dot swatch-dot--' + code + '" aria-hidden="true"></span> ' + UI.escapeHTML(info.title) + '</p>' +
      '<p>' + UI.escapeHTML(info.text) + '</p>';

    if (!UI.reduceMotion.matches) {
      box.classList.remove('is-pop');
      void box.offsetWidth;
      box.classList.add('is-pop');
    }
  }

  // Swipe-down para cerrar la hoja en móvil
  (function enableSwipe() {
    var panel = sheet && sheet.querySelector('.sheet__panel');
    var hero = sheet && sheet.querySelector('.sheet__hero');
    if (!panel || !hero) return;
    var startY = 0, dy = 0, dragging = false, startT = 0;

    hero.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' || e.target.closest('button')) return;
      if (!window.matchMedia('(max-width: 720px)').matches) return;
      dragging = true;
      startY = e.clientY;
      startT = performance.now();
      dy = 0;
      panel.style.transition = 'none';
      hero.setPointerCapture(e.pointerId);
    });
    hero.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      dy = e.clientY - startY;
      // Resistencia al arrastrar hacia arriba
      var y = dy > 0 ? dy : dy / 6;
      panel.style.transform = 'translateY(' + y + 'px)';
    });
    function end() {
      if (!dragging) return;
      dragging = false;
      var velocity = dy / Math.max(1, performance.now() - startT);
      panel.style.transition = '';
      if (dy > 120 || velocity > 0.5) {
        // Continúa el gesto desde donde quedó hasta salir de la pantalla
        panel.style.transform = 'translateY(100%)';
        setTimeout(function () {
          UI.closeNow(sheet);
          panel.style.transform = '';
        }, UI.reduceMotion.matches ? 0 : 240);
      } else {
        panel.style.transform = '';
      }
    }
    hero.addEventListener('pointerup', end);
    hero.addEventListener('pointercancel', end);
  })();

  window.Safety = { open: openSafety, selectTab: selectTab };
})();
