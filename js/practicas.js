(function () {
  'use strict';

  var esc = UI.escapeHTML;
  var KEY = 'cecyte_prac_vista';
  var MODES = ['tabla', 'chico', 'grande'];
  var mode = MODES.indexOf(localStorage.getItem(KEY)) > -1 ? localStorage.getItem(KEY) : 'grande';
  var list = [];
  var pos = -1;

  function norm(v) {
    return String(v == null ? '' : v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  function media(row) {
    return (window.PRACTICAS_MEDIA || {})[norm(row && row.prac)] || null;
  }

  function text(row) {
    var m = media(row);
    if (!m) return '';
    return [m.fenomeno, m.objetivo, m.materiales.join(' '), 'video'].join(' ');
  }

  function fecha(v) {
    return Tables.formatDate ? Tables.formatDate(v) : esc(v || '');
  }

  function syncSwitch() {
    document.querySelectorAll('[data-prac-mode]').forEach(function (b) {
      var on = b.getAttribute('data-prac-mode') === mode;
      b.setAttribute('aria-checked', on);
      b.tabIndex = on ? 0 : -1;
    });
  }

  function setMode(m) {
    if (MODES.indexOf(m) < 0 || m === mode) return;
    var go = function () {
      mode = m;
      localStorage.setItem(KEY, m);
      syncSwitch();
      Tables.build('practicas');
    };
    if (document.startViewTransition && !UI.reduceMotion.matches) document.startViewTransition(go);
    else go();
  }

  function card(item, i, isAdmin) {
    var r = item.row;
    var m = media(r);
    var name = esc(r.prac || 'Práctica');
    var art = m
      ? '<img src="' + esc(m.poster) + '" alt="" loading="lazy" decoding="async">' +
        '<span class="pcard__play" aria-hidden="true"><i class="ph-fill ph-play"></i></span>' +
        '<span class="pcard__dur mono">' + esc(m.duracion) + '</span>'
      : '<span class="pcard__empty" aria-hidden="true"><i class="ph ph-video-camera-slash"></i></span>';
    var num = m ? '<span class="pcard__num mono">' + String(m.num).padStart(2, '0') + '</span>' : '';
    var actions = isAdmin
      ? '<div class="pcard__actions">' +
          '<button type="button" class="icon-btn icon-btn--sm" data-edit="practicas" data-index="' + item.index + '" aria-label="Editar ' + name + '"><i class="ph ph-pencil-simple" aria-hidden="true"></i></button>' +
          '<button type="button" class="icon-btn icon-btn--sm icon-btn--danger" data-delete="practicas" data-index="' + item.index + '" aria-label="Eliminar ' + name + '"><i class="ph ph-trash" aria-hidden="true"></i></button>' +
        '</div>'
      : '';
    return '<li class="pgal__item reveal" style="--i:' + i + ';view-transition-name:prac-' + item.index + '">' +
      '<article class="pcard">' +
        '<button type="button" class="pcard__open" data-prac-open="' + item.index + '" aria-label="Ver práctica: ' + name + '">' +
          '<span class="pcard__media">' + art + num + '</span>' +
          '<span class="pcard__body">' +
            '<span class="pcard__title">' + name + '</span>' +
            '<span class="pcard__meta"><span class="badge badge--subject">' + esc(r.mat || 'Sin materia') + '</span><span class="pcard__date mono">' + fecha(r.fecha) + '</span></span>' +
            (m ? '<span class="pcard__fen">' + esc(m.fenomeno) + '</span>' : '') +
          '</span>' +
        '</button>' + actions +
      '</article></li>';
  }

  function render(host, data, isAdmin, filtered) {
    list = data.map(function (d) { return d.index; });
    if (!data.length) {
      host.innerHTML = '<div class="empty pgal-empty">' +
        '<span class="empty__icon" aria-hidden="true"><i class="ph ph-' + (filtered ? 'magnifying-glass' : 'microscope') + '"></i></span>' +
        '<p class="empty__title">' + (filtered ? 'Sin coincidencias' : 'Aún no hay prácticas') + '</p>' +
        '<p class="empty__text">' + (filtered ? 'Prueba con otra palabra o quita los filtros activos.' : 'Entra en modo admin para agregar registros.') + '</p>' +
        (filtered ? '<button type="button" class="btn btn--ghost btn--sm" data-clear="practicas"><i class="ph ph-x" aria-hidden="true"></i> Limpiar búsqueda</button>' : '') +
      '</div>';
      return;
    }
    host.innerHTML = '<ul class="pgal pgal--' + mode + '" role="list">' +
      data.map(function (d, i) { return card(d, i, isAdmin); }).join('') + '</ul>' +
      '<footer class="table-foot"><p class="table-foot__count"><span class="mono">' + data.length + '</span> prácticas · toca una para ver su video</p></footer>';
    if (UI.observeReveals) UI.observeReveals(host);
  }

  function block(title, icon, body) {
    return '<section class="pdlg__block"><h3 class="pdlg__h"><i class="ph ph-' + icon + '" aria-hidden="true"></i> ' + title + '</h3>' + body + '</section>';
  }

  function fill(index) {
    var dlg = document.getElementById('pracDialog');
    var row = Store.getDB('practicas')[index];
    if (!dlg || !row) return;
    var m = media(row);
    pos = list.indexOf(index);
    dlg.querySelector('#pracTitle').textContent = row.prac || 'Práctica';
    dlg.querySelector('[data-prac-num]').textContent = m ? 'Práctica ' + m.num : 'Práctica';
    var stage = dlg.querySelector('[data-prac-stage]');
    stage.innerHTML = m
      ? '<video class="pdlg__video" controls playsinline preload="metadata" poster="' + esc(m.poster) + '" src="' + esc(m.video) + '"></video>'
      : '<div class="pdlg__novideo"><i class="ph ph-video-camera-slash" aria-hidden="true"></i><span>Esta práctica aún no tiene video</span></div>';
    var info = '<div class="pdlg__facts">' +
      '<span class="badge badge--subject">' + esc(row.mat || 'Sin materia') + '</span>' +
      '<span class="pdlg__fact"><i class="ph ph-calendar-blank" aria-hidden="true"></i><span class="mono">' + fecha(row.fecha) + '</span></span>' +
      (m ? '<span class="pdlg__fact"><i class="ph ph-clock" aria-hidden="true"></i><span class="mono">' + esc(m.duracion) + '</span></span>' : '') +
    '</div>';
    if (m) {
      info += '<p class="pdlg__fen">' + esc(m.fenomeno) + '</p>' +
        block('Objetivo', 'target', '<p>' + esc(m.objetivo) + '</p>') +
        block('Materiales y reactivos', 'flask', '<ul class="pdlg__chips">' + m.materiales.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>') +
        (m.seguridad ? '<p class="pdlg__safety"><i class="ph ph-warning" aria-hidden="true"></i><span>' + esc(m.seguridad) + '</span></p>' : '') +
        '<details class="pdlg__more"><summary>Fundamento teórico</summary><p>' + esc(m.fundamento) + '</p></details>' +
        '<details class="pdlg__more"><summary>Procedimiento (' + m.pasos.length + ' pasos)</summary><ol>' + m.pasos.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></details>' +
        '<details class="pdlg__more"><summary>Resultados y conclusión</summary><p>' + esc(m.resultados) + '</p><p>' + esc(m.conclusion) + '</p></details>';
    } else {
      info += block('Reactivos / material', 'flask', '<p>' + esc(row.rec || '—') + '</p>') +
        (row.obs ? block('Observaciones', 'note', '<p>' + esc(row.obs) + '</p>') : '');
    }
    var side = dlg.querySelector('[data-prac-info]');
    side.innerHTML = info;
    side.scrollTop = 0;
    dlg.querySelector('[data-prac-count]').textContent = (pos + 1) + ' / ' + list.length;
    dlg.querySelector('[data-prac-step="-1"]').disabled = pos <= 0;
    dlg.querySelector('[data-prac-step="1"]').disabled = pos < 0 || pos >= list.length - 1;
    var panel = dlg.querySelector('.dialog__panel');
    panel.classList.remove('is-swapping');
    void panel.offsetWidth;
    panel.classList.add('is-swapping');
  }

  function stop() {
    var v = document.querySelector('#pracDialog video');
    if (v) v.pause();
  }

  function play() {
    var v = document.querySelector('#pracDialog video');
    if (!v) return;
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }

  function open(index, trigger) {
    if (!list.length || list.indexOf(index) < 0) list = Tables.getFiltered('practicas').map(function (d) { return d.index; });
    fill(index);
    UI.openDialog('pracDialog', trigger);
    play();
  }

  function step(d) {
    var next = list[pos + d];
    if (next == null) return;
    stop();
    fill(next);
    play();
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-edit],[data-delete]')) return;
    var o = e.target.closest('[data-prac-open]');
    if (o) { open(Number(o.getAttribute('data-prac-open')), o); return; }
    var s = e.target.closest('[data-prac-step]');
    if (s) { step(Number(s.getAttribute('data-prac-step'))); return; }
    var b = e.target.closest('[data-prac-mode]');
    if (b) setMode(b.getAttribute('data-prac-mode'));
  });

  document.addEventListener('keydown', function (e) {
    var row = e.target.closest && e.target.closest('tr[data-prac-open]');
    if (row && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      open(Number(row.getAttribute('data-prac-open')), row);
      return;
    }
    var sw = e.target.closest && e.target.closest('[data-prac-mode]');
    if (sw && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      e.preventDefault();
      var i = MODES.indexOf(mode) + (e.key === 'ArrowRight' ? 1 : -1);
      var m = MODES[(i + MODES.length) % MODES.length];
      setMode(m);
      var nb = document.querySelector('[data-prac-mode="' + m + '"]');
      if (nb) nb.focus();
      return;
    }
    var dlg = document.getElementById('pracDialog');
    if (dlg && dlg.open && e.target.tagName !== 'VIDEO' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      e.preventDefault();
      step(e.key === 'ArrowRight' ? 1 : -1);
    }
  });

  var dlg = document.getElementById('pracDialog');
  if (dlg) {
    dlg.addEventListener('close', stop);
    dlg.addEventListener('dialog:closed', stop);
    dlg.addEventListener('cancel', stop);
  }

  syncSwitch();

  window.Practicas = { mode: function () { return mode; }, render: render, text: text, open: open, media: media };
})();
