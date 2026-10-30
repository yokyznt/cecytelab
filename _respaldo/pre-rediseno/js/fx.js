/* =========================================================
   CECyTE Lab · Efectos visuales 3D y micro-interacciones
   ========================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var rafId = null;
  var targets = [];

  /* ---------- 3D Tilt (pointer tracking) ---------- */
  function initTilt() {
    if (reduceMotion.matches || !hasFinePointer.matches) return;

    var tiles = document.querySelectorAll('.tile--3d');
    if (!tiles.length) return;

    tiles.forEach(function (tile) {
      var bounds = null;
      var currentX = 0;
      var currentY = 0;
      var targetX = 0;
      var targetY = 0;

      function onMove(e) {
        if (!bounds) bounds = tile.getBoundingClientRect();
        var rect = tile.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var dx = (e.clientX - cx) / (rect.width / 2);
        var dy = (e.clientY - cy) / (rect.height / 2);
        targetX = Math.max(-1, Math.min(1, dx)) * 8; // max 8deg
        targetY = Math.max(-1, Math.min(1, dy)) * -8;
      }

      function onLeave() {
        targetX = 0;
        targetY = 0;
      }

      function tick() {
        currentX += (targetX - currentX) * 0.15;
        currentY += (targetY - currentY) * 0.15;
        if (Math.abs(currentX) > 0.01 || Math.abs(targetX) > 0.01 ||
            Math.abs(currentY) > 0.01 || Math.abs(targetY) > 0.01) {
          tile.style.transform = 'perspective(1000px) rotateX(' + currentY + 'deg) rotateY(' + currentX + 'deg) translateY(-3px)';
        } else if (targetX === 0 && targetY === 0) {
          tile.style.transform = '';
        }
        rafId = requestAnimationFrame(tick);
      }

      tile.addEventListener('mousemove', onMove);
      tile.addEventListener('mouseleave', onLeave);
      targets.push({ tile: tile, tick: tick });

      // Iniciar loop de animación
      tick();
    });
  }

  /* ---------- Glare en tarjetas de seguridad ---------- */
  function initSafetyCardGlare() {
    if (reduceMotion.matches || !hasFinePointer.matches) return;

    var cards = document.querySelectorAll('.s-card');
    if (!cards.length) return;

    cards.forEach(function (card) {
      var glare = document.createElement('div');
      glare.className = 's-card__glare';
      glare.style.cssText = [
        'position:absolute',
        'inset:0',
        'border-radius:inherit',
        'background:linear-gradient(135deg,rgba(255,255,255,0.08) 0%,transparent 50%)',
        'opacity:0',
        'pointer-events:none',
        'transition:opacity 300ms var(--ease-out)',
        'z-index:0'
      ].join(';');
      card.style.position = 'relative';
      card.insertBefore(glare, card.firstChild);

      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        glare.style.background = 'radial-gradient(300px 200px at ' + x + 'px ' + y + 'px, rgba(255,255,255,0.12), transparent 60%)';
        glare.style.opacity = '1';
      });
      card.addEventListener('mouseleave', function () {
        glare.style.opacity = '0';
      });
    });
  }

  /* ---------- Animación underline en hero title ---------- */
  function initHeroTitleUnderline() {
    var mark = document.querySelector('.hero__title mark');
    if (!mark || reduceMotion.matches) return;

    var line = document.createElement('span');
    line.className = 'hero__title__underline';
    line.style.cssText = [
      'position:absolute',
      'left:0',
      'right:0',
      'bottom:0.04em',
      'height:0.12em',
      'border-radius:99px',
      'background:var(--accent)',
      'opacity:0.22',
      'transform:scaleX(0)',
      'transform-origin:left',
      'transition:transform 900ms var(--ease-out)',
      'pointer-events:none'
    ].join(';');
    mark.style.position = 'relative';
    mark.appendChild(line);

    // Disparar después de que la página esté lista
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        line.style.transform = 'scaleX(1)';
      });
    });
  }

  /* ---------- Parallax suave en ambient ---------- */
  function initAmbientParallax() {
    if (reduceMotion.matches || !hasFinePointer.matches) return;

    var ambient = document.querySelector('.ambient');
    if (!ambient) return;

    var targetX = 0, targetY = 0;
    var currentX = 0, currentY = 0;

    document.addEventListener('mousemove', function (e) {
      targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    function tick() {
      currentX += (targetX - currentX) * 0.02;
      currentY += (targetY - currentY) * 0.02;
      ambient.style.transform = 'translate(' + (currentX * 30) + 'px, ' + (currentY * 20) + 'px)';
      requestAnimationFrame(tick);
    }
    tick();
  }

  /* ---------- Contador animado para stats en home ---------- */
  function animateStatCounters() {
    if (reduceMotion.matches) return;
    var counters = document.querySelectorAll('.stat dd.mono');
    counters.forEach(function (el) {
      var target = parseInt(el.textContent, 10);
      if (isNaN(target) || target === 0) return;
      var start = 0;
      var duration = 800;
      var startTime = performance.now();
      function tick(now) {
        var t = Math.min(1, (now - startTime) / duration);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(start + (target - start) * eased);
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  /* ---------- Inicialización ---------- */
  function init() {
    initTilt();
    initSafetyCardGlare();
    initHeroTitleUnderline();
    initAmbientParallax();

    // Observar cuando se muestra la vista de inicio para animar contadores
    var homeView = document.getElementById('sec-inicio');
    if (homeView) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateStatCounters();
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      io.observe(homeView);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();