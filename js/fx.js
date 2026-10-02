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

  /* ---------- Tooltips ([data-tip]) ----------
     Un solo globo flotante: no lo recorta el scroll de las tablas y
     aparece con mouse, teclado (foco) o al tocar. */
  function initTips() {
    var tip = document.createElement('div');
    tip.className = 'tip';
    tip.setAttribute('role', 'tooltip');
    tip.id = 'tipBubble';
    document.body.appendChild(tip);
    var current = null;

    function show(el) {
      var text = el.getAttribute('data-tip');
      if (!text) return;
      current = el;
      tip.textContent = text;
      tip.classList.remove('is-below');
      var r = el.getBoundingClientRect();
      var w = tip.offsetWidth;
      var h = tip.offsetHeight;
      var left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
      var top = r.top - h - 10;
      if (top < 8) { top = r.bottom + 10; tip.classList.add('is-below'); }
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
      tip.style.setProperty('--arrow-x', (r.left + r.width / 2 - left) + 'px');
      el.setAttribute('aria-describedby', 'tipBubble');
      tip.classList.add('is-on');
    }

    function hide() {
      if (current) current.removeAttribute('aria-describedby');
      current = null;
      tip.classList.remove('is-on');
    }

    function target(e) { return e.target.closest && e.target.closest('[data-tip]'); }

    document.addEventListener('mouseover', function (e) { var el = target(e); if (el) show(el); });
    document.addEventListener('mouseout', function (e) { if (target(e)) hide(); });
    document.addEventListener('focusin', function (e) { var el = target(e); if (el) show(el); });
    document.addEventListener('focusout', function (e) { if (target(e)) hide(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
    window.addEventListener('scroll', hide, { passive: true });
  }

  /* ---------- Inicialización ---------- */
  function init() {
    // Los átomos orbitales usan animación SMIL: respetar "menos movimiento".
    if (reduceMotion.matches) {
      document.querySelectorAll('svg').forEach(function (svg) {
        if (svg.pauseAnimations) svg.pauseAnimations();
      });
    }

    initTips();
    initTextSize();
    initToTop();
    initTilt();
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
