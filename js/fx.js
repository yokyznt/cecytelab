/* =========================================================
   CECyTE Lab · Efectos 3D y micro-interacciones
   - Escena del hero y módulos: inclinación 3D por puntero,
     expresada en variables CSS (--rx --ry --mx --my --gx --gy).
   - Los bucles de animación se detienen al asentarse.
   ========================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ---------- Inclinación suavizada ----------
     Mantiene un objetivo y lo persigue con rAF; el bucle se
     apaga solo cuando el valor llega al objetivo. */
  function makeTilt(el, opts) {
    var max = opts.max;
    var area = opts.area || el;
    var cur = { x: 0, y: 0 };
    var tgt = { x: 0, y: 0 };
    var raf = 0;

    function apply() {
      el.style.setProperty('--rx', cur.x.toFixed(2) + 'deg');
      el.style.setProperty('--ry', cur.y.toFixed(2) + 'deg');
      el.style.setProperty('--mx', (cur.x / max).toFixed(3));
      el.style.setProperty('--my', (cur.y / -max).toFixed(3));
    }

    function loop() {
      cur.x += (tgt.x - cur.x) * 0.12;
      cur.y += (tgt.y - cur.y) * 0.12;
      apply();
      if (Math.abs(tgt.x - cur.x) > 0.01 || Math.abs(tgt.y - cur.y) > 0.01) {
        raf = requestAnimationFrame(loop);
      } else {
        cur.x = tgt.x;
        cur.y = tgt.y;
        apply();
        raf = 0;
      }
    }

    function kick() {
      if (!raf) raf = requestAnimationFrame(loop);
    }

    area.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = el.getBoundingClientRect();
      var nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      var ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
      nx = Math.max(-1, Math.min(1, nx));
      ny = Math.max(-1, Math.min(1, ny));
      tgt.x = nx * max;
      tgt.y = -ny * max;
      if (opts.glare) {
        el.style.setProperty('--gx', (e.clientX - r.left).toFixed(0) + 'px');
        el.style.setProperty('--gy', (e.clientY - r.top).toFixed(0) + 'px');
        el.style.setProperty('--glare', '1');
      }
      kick();
    });

    area.addEventListener('pointerleave', function () {
      tgt.x = 0;
      tgt.y = 0;
      if (opts.glare) el.style.setProperty('--glare', '0');
      kick();
    });
  }

  function initTilt() {
    if (reduceMotion.matches || !hasFinePointer.matches) return;

    var stage = document.querySelector('[data-stage]');
    var hero = document.querySelector('.hero');
    if (stage && hero) makeTilt(stage, { max: 9, area: hero });

    document.querySelectorAll('.tile--3d').forEach(function (tile) {
      makeTilt(tile, { max: 6, glare: true });
    });

    document.querySelectorAll('.s-card').forEach(function (card) {
      makeTilt(card, { max: 5 });
    });
  }

  /* ---------- Brillo en tarjetas de seguridad ---------- */
  function initSafetyCardGlare() {
    if (reduceMotion.matches || !hasFinePointer.matches) return;

    document.querySelectorAll('.s-card').forEach(function (card) {
      var glare = document.createElement('div');
      glare.className = 's-card__glare';
      glare.style.cssText = [
        'position:absolute',
        'inset:0',
        'border-radius:inherit',
        'opacity:0',
        'pointer-events:none',
        'transition:opacity 300ms var(--ease-out)',
        'z-index:0'
      ].join(';');
      card.style.position = 'relative';
      card.insertBefore(glare, card.firstChild);

      card.addEventListener('pointermove', function (e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        glare.style.background = 'radial-gradient(300px 200px at ' + x + 'px ' + y + 'px, rgba(255,255,255,0.14), transparent 60%)';
        glare.style.opacity = '1';
      });
      card.addEventListener('pointerleave', function () {
        glare.style.opacity = '0';
      });
    });
  }

  /* ---------- Parallax suave del fondo ---------- */
  function initAmbientParallax() {
    if (reduceMotion.matches || !hasFinePointer.matches) return;

    var ambient = document.querySelector('.ambient');
    if (!ambient) return;

    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;

    function tick() {
      cx += (tx - cx) * 0.04;
      cy += (ty - cy) * 0.04;
      ambient.style.transform = 'translate(' + (cx * 30).toFixed(1) + 'px,' + (cy * 20).toFixed(1) + 'px)';
      if (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    }

    document.addEventListener('pointermove', function (e) {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
  }

  /* ---------- Contadores del resumen ---------- */
  function animateStatCounters() {
    if (reduceMotion.matches) return;
    document.querySelectorAll('.stat dd.mono').forEach(function (el) {
      var target = parseInt(el.textContent, 10);
      if (isNaN(target) || target === 0) return;
      var duration = 900;
      var startTime = performance.now();
      function tick(now) {
        var t = Math.min(1, (now - startTime) / duration);
        var eased = 1 - Math.pow(1 - t, 4);
        el.textContent = Math.round(target * eased);
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  /* ---------- Búsqueda global del inicio ----------
     Lleva a la tabla con más coincidencias y deja la búsqueda escrita. */
  function initGlobalSearch() {
    var form = document.getElementById('globalSearchForm');
    var input = document.getElementById('globalSearch');
    var msg = document.getElementById('globalSearchMsg');
    if (!form || !input || !window.Store || !window.Tables) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var raw = input.value.trim();
      var q = Tables.norm(raw);
      if (!q) { input.focus(); return; }

      var best = null;
      var bestN = 0;
      ['reactivos', 'materiales', 'practicas'].forEach(function (cat) {
        var n = Store.getDB(cat).filter(function (row) {
          var hay = Tables.norm(Object.keys(row).map(function (k) { return row[k]; }).join(' '));
          return q.split(/\s+/).every(function (w) { return hay.indexOf(w) > -1; });
        }).length;
        if (n > bestN) { bestN = n; best = cat; }
      });

      if (!best) {
        msg.textContent = 'No hay resultados para “' + raw + '”. Prueba con otra palabra.';
        input.focus();
        return;
      }

      msg.textContent = '';
      location.hash = '#' + best;
      setTimeout(function () {
        var target = document.querySelector('[data-search="' + best + '"]');
        if (!target) return;
        target.value = raw;
        target.dispatchEvent(new Event('input'));
      }, 0);
    });

    input.addEventListener('input', function () { msg.textContent = ''; });
  }

  /* ---------- Tamaño de texto (normal / grande / muy grande) ---------- */
  function initTextSize() {
    var btn = document.getElementById('textSize');
    if (!btn) return;
    var root = document.documentElement;
    var SIZES = ['', 'lg', 'xl'];
    var NAMES = ['normal', 'grande', 'muy grande'];

    function current() {
      var i = SIZES.indexOf(root.getAttribute('data-size') || '');
      return i < 0 ? 0 : i;
    }

    function sync() {
      var i = current();
      btn.setAttribute('data-level', String(i));
      btn.setAttribute('aria-label', 'Tamaño de texto: ' + NAMES[i] + '. Pulsa para cambiar');
      btn.title = 'Tamaño de texto: ' + NAMES[i];
    }

    btn.addEventListener('click', function () {
      var next = (current() + 1) % SIZES.length;
      if (SIZES[next]) root.setAttribute('data-size', SIZES[next]);
      else root.removeAttribute('data-size');
      try { localStorage.setItem('cecyte_size', SIZES[next]); } catch (e) { /* noop */ }
      sync();
      if (window.UI && UI.updateSliders) UI.updateSliders();
    });
    sync();
  }

  /* ---------- Volver arriba ---------- */
  function initToTop() {
    var btn = document.getElementById('toTop');
    if (!btn) return;
    var ticking = false;

    function update() {
      ticking = false;
      btn.classList.toggle('is-visible', window.scrollY > 700);
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      var main = document.getElementById('main');
      if (main) main.focus({ preventScroll: true });
    });
    update();
  }

  /* ---------- Inicialización ---------- */
  function init() {
    // Los átomos orbitales usan animación SMIL: respetar "menos movimiento".
    if (reduceMotion.matches) {
      document.querySelectorAll('svg').forEach(function (svg) {
        if (svg.pauseAnimations) svg.pauseAnimations();
      });
    }

    initGlobalSearch();
    initTextSize();
    initToTop();
    initTilt();
    initSafetyCardGlare();
    initAmbientParallax();

    var homeView = document.getElementById('sec-inicio');
    if (homeView && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateStatCounters();
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });
      io.observe(homeView);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
