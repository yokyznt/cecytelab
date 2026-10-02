/* =========================================================
   CECyTE Lab · Utilidades de interfaz
   Diálogos, toasts, confirmación, indicadores deslizantes,
   animaciones de entrada y atajos de teclado.
   ========================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Utilidades ---------- */
  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---------- Diálogos ---------- */
  var lastTrigger = new WeakMap();

  function openDialog(id, trigger) {
    var dlg = typeof id === 'string' ? document.getElementById(id) : id;
    if (!dlg || dlg.open) return dlg;
    if (trigger) lastTrigger.set(dlg, trigger);
    dlg.classList.remove('is-closing');
    dlg.showModal();
    document.documentElement.classList.add('has-dialog');
    return dlg;
  }

  // Limpieza tras cerrar; se ejecuta de forma síncrona (no depende del evento "close")
  function afterClose(dlg) {
    if (!document.querySelector('dialog[open]')) {
      document.documentElement.classList.remove('has-dialog');
    }
    var t = lastTrigger.get(dlg);
    lastTrigger.delete(dlg);
    if (t && document.contains(t) && typeof t.focus === 'function') t.focus({ preventScroll: true });
    dlg.dispatchEvent(new CustomEvent('dialog:closed'));
  }

  function closeDialog(id) {
    var dlg = typeof id === 'string' ? document.getElementById(id) : id;
    if (!dlg || !dlg.open || dlg.classList.contains('is-closing')) return;

    var finish = function () {
      dlg.classList.remove('is-closing');
      dlg.close();
      afterClose(dlg);
    };

    if (reduceMotion.matches) { finish(); return; }

    dlg.classList.add('is-closing');
    var panel = dlg.firstElementChild;
    var done = false;
    var end = function () {
      if (done) return;
      done = true;
      finish();
    };
    if (panel) panel.addEventListener('animationend', end, { once: true });
    setTimeout(end, 260); // por si la animación no se dispara
  }

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-open]');
    if (opener) {
      openDialog(opener.getAttribute('data-open'), opener);
      return;
    }
    var closer = e.target.closest('[data-close]');
    if (closer) {
      var dlg = closer.closest('dialog');
      if (dlg) closeDialog(dlg);
    }
  });

  document.querySelectorAll('dialog').forEach(function (dlg) {
    // Clic sobre el fondo: cerrar (sólo si el clic empezó y terminó fuera del panel)
    var downOnBackdrop = false;
    dlg.addEventListener('pointerdown', function (e) { downOnBackdrop = e.target === dlg; });
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg && downOnBackdrop) closeDialog(dlg);
      downOnBackdrop = false;
    });
    // Escape: usar la animación de salida
    dlg.addEventListener('cancel', function (e) {
      e.preventDefault();
      closeDialog(dlg);
    });
  });

  /* ---------- Toasts ---------- */
  var toaster = document.getElementById('toaster');
  var TOAST_ICONS = { success: 'check-circle', error: 'x-circle', info: 'info', warn: 'warning' };

  function ensureToasterVisible() {
    if (!toaster) return;
    if (typeof toaster.showPopover === 'function') {
      try {
        // Reabrir para que quede por encima de cualquier <dialog> modal
        if (toaster.matches(':popover-open')) toaster.hidePopover();
        toaster.showPopover();
      } catch (e) { /* noop */ }
    } else {
      toaster.classList.add('is-open');
    }
  }

  function toast(message, type, timeout) {
    if (!toaster) return;
    type = type || 'success';
    ensureToasterVisible();

    var el = document.createElement('div');
    el.className = 'toast toast--' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML =
      '<i class="ph-fill ph-' + (TOAST_ICONS[type] || 'info') + ' toast__icon" aria-hidden="true"></i>' +
      '<p class="toast__msg">' + escapeHTML(message) + '</p>' +
      '<button type="button" class="toast__close" aria-label="Cerrar notificación"><i class="ph ph-x" aria-hidden="true"></i></button>';

    toaster.appendChild(el);
    // Limitar a 3 visibles
    while (toaster.children.length > 3) toaster.firstElementChild.remove();

    var timer;
    var remove = function () {
      clearTimeout(timer);
      if (!el.isConnected) return;
      el.classList.add('is-leaving');
      setTimeout(function () {
        el.remove();
        if (!toaster.children.length && typeof toaster.hidePopover === 'function') {
          try { toaster.hidePopover(); } catch (e) { /* noop */ }
        }
      }, reduceMotion.matches ? 0 : 200);
    };
    var start = function () { timer = setTimeout(remove, timeout || 3800); };

    el.querySelector('.toast__close').addEventListener('click', remove);
    el.addEventListener('pointerenter', function () { clearTimeout(timer); });
    el.addEventListener('pointerleave', start);
    start();
  }

  /* ---------- Confirmación con estilo ---------- */
  var confirmDialog = null;

  function buildConfirm() {
    confirmDialog = document.createElement('dialog');
    confirmDialog.className = 'dialog dialog--confirm';
    confirmDialog.setAttribute('aria-labelledby', 'confirmTitle');
    confirmDialog.setAttribute('aria-describedby', 'confirmMsg');
    confirmDialog.innerHTML =
      '<div class="dialog__panel">' +
        '<div class="dialog__body confirm">' +
          '<span class="confirm__icon" aria-hidden="true"><i class="ph ph-trash"></i></span>' +
          '<h2 class="dialog__title" id="confirmTitle"></h2>' +
          '<p class="dialog__lead" id="confirmMsg"></p>' +
        '</div>' +
        '<footer class="dialog__foot">' +
          '<button type="button" class="btn btn--quiet" data-confirm="no">Cancelar</button>' +
          '<button type="button" class="btn btn--danger" data-confirm="yes" autofocus></button>' +
        '</footer>' +
      '</div>';
    document.body.appendChild(confirmDialog);

    var downOnBackdrop = false;
    confirmDialog.addEventListener('pointerdown', function (e) { downOnBackdrop = e.target === confirmDialog; });
    confirmDialog.addEventListener('click', function (e) {
      if (e.target === confirmDialog && downOnBackdrop) closeDialog(confirmDialog);
    });
    confirmDialog.addEventListener('cancel', function (e) { e.preventDefault(); closeDialog(confirmDialog); });
  }

  function confirmAction(opts) {
    if (!confirmDialog) buildConfirm();
    opts = opts || {};
    confirmDialog.querySelector('#confirmTitle').textContent = opts.title || '¿Confirmar?';
    confirmDialog.querySelector('#confirmMsg').textContent = opts.message || '';
    confirmDialog.querySelector('[data-confirm="yes"]').textContent = opts.confirmLabel || 'Eliminar';

    return new Promise(function (resolve) {
      var result = false;
      var onClick = function (e) {
        var b = e.target.closest('[data-confirm]');
        if (!b) return;
        result = b.getAttribute('data-confirm') === 'yes';
        closeDialog(confirmDialog);
      };
      var onClose = function () {
        confirmDialog.removeEventListener('click', onClick);
        resolve(result);
      };
      confirmDialog.addEventListener('click', onClick);
      confirmDialog.addEventListener('dialog:closed', onClose, { once: true });
      openDialog(confirmDialog, document.activeElement);
    });
  }

  /* ---------- Indicador deslizante (nav y segmentados) ---------- */
  function positionSlider(container) {
    var indicator = container.querySelector(':scope > .slider-indicator');
    if (!indicator) return;
    var active = container.querySelector('[aria-current="page"], [aria-selected="true"]');
    if (!active || !active.offsetParent) {
      indicator.style.opacity = '0';
      return;
    }
    var cRect = container.getBoundingClientRect();
    var aRect = active.getBoundingClientRect();
    indicator.style.width = aRect.width + 'px';
    indicator.style.height = aRect.height + 'px';
    indicator.style.transform =
      'translate(' + (aRect.left - cRect.left + container.scrollLeft) + 'px,' + (aRect.top - cRect.top) + 'px)';
    indicator.style.opacity = '1';
  }

  function updateSliders(root) {
    (root || document).querySelectorAll('[data-slider]').forEach(positionSlider);
  }

  var resizeRaf;
  window.addEventListener('resize', function () {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(function () { updateSliders(); });
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { updateSliders(); });
  }

  /* ---------- Animación de entrada (.reveal) ---------- */
  var io = null;
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  }

  function observeReveals(root) {
    (root || document).querySelectorAll('.reveal:not(.is-in)').forEach(function (el) {
      if (io) io.observe(el);
      else el.classList.add('is-in');
    });
  }

  /* ---------- Mostrar / ocultar contraseña ---------- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-reveal]');
    if (!btn) return;
    var input = document.getElementById(btn.getAttribute('data-reveal'));
    if (!input) return;
    var show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
    btn.setAttribute('aria-pressed', String(show));
    var icon = btn.querySelector('i');
    if (icon) icon.className = 'ph ' + (show ? 'ph-eye-slash' : 'ph-eye');
    input.focus();
  });

  /* ---------- Atajo "/" para buscar ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (document.querySelector('dialog[open]')) return;
    var view = document.querySelector('.view:not([hidden])');
    var search = view && view.querySelector('[data-search]');
    if (search) {
      e.preventDefault();
      search.focus();
      search.select();
    }
  });

  window.UI = {
    escapeHTML: escapeHTML,
    openDialog: openDialog,
    closeDialog: closeDialog,
    closeNow: function (dlg) {
      if (!dlg || !dlg.open) return;
      dlg.classList.remove('is-closing');
      dlg.close();
      afterClose(dlg);
    },
    toast: toast,
    confirm: confirmAction,
    updateSliders: updateSliders,
    positionSlider: positionSlider,
    observeReveals: observeReveals,
    reduceMotion: reduceMotion
  };
})();
