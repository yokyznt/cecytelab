/* =========================================================
   CECyTE Lab · Modo administrador
   Acceso, cambio de clave, alta/edición/borrado y editor JSON.
   ========================================================= */
(function () {
  'use strict';

  var esc = UI.escapeHTML;
  var $ = function (id) { return document.getElementById(id); };

  var SCHEMAS = {
    materiales: [
      { id: 'id', label: 'ID', type: 'text', placeholder: 'M079', mono: true },
      { id: 'material', label: 'Material', type: 'text', required: true, wide: true },
      { id: 'cantidad', label: 'Cantidad', type: 'text', placeholder: '10 piezas' },
      { id: 'estado', label: 'Estado', type: 'select', opts: ['Bueno', 'Regular', 'Malo'] },
      { id: 'ubicacion', label: 'Ubicación', type: 'text', placeholder: 'Cristalería', list: 'ubicaciones' },
      { id: 'desc', label: 'Descripción', type: 'textarea' }
    ],
    reactivos: [
      { id: 'id', label: 'ID', type: 'text', placeholder: 'R052', mono: true },
      { id: 'reactivo', label: 'Reactivo', type: 'text', required: true, wide: true },
      { id: 'cantidad', label: 'Cantidad', type: 'text', placeholder: '500 ml (1 frasco)' },
      { id: 'caducidad', label: 'Caducidad', type: 'text', placeholder: 'N/A o CADUCADO (Mes Año)' },
      { id: 'riesgo', label: 'Riesgo / tipo', type: 'text', placeholder: 'Irritante' },
      { id: 'almacen', label: 'Color de almacenaje', type: 'select', opts: ['Verde', 'Azul', 'Amarillo', 'Rojo', 'Blanco (Piso)', 'Rayas (Separado)'] }
    ],
    practicas: [
      { id: 'prac', label: 'Nombre de la práctica', type: 'text', required: true, wide: true },
      { id: 'mat', label: 'Materia', type: 'text', placeholder: 'Química II', list: 'materias' },
      { id: 'fecha', label: 'Fecha', type: 'date' },
      { id: 'rec', label: 'Recursos', type: 'text', wide: true, placeholder: 'Reactivos y material' },
      { id: 'obs', label: 'Observaciones', type: 'textarea' }
    ]
  };

  var NOUN = { materiales: 'material', reactivos: 'reactivo', practicas: 'práctica' };

  var current = { cat: null, index: null };
  var bulkCat = 'materiales';

  /* ---------- Estado de sesión ---------- */
  function isAdmin() {
    return document.body.classList.contains('is-admin');
  }

  function setAdmin(on) {
    document.body.classList.toggle('is-admin', on);
    $('adminBar').hidden = !on;
    $('btnAuth').hidden = on;
    Tables.buildAll();
  }

  /* ---------- Errores en línea ---------- */
  function showError(el, msg, input) {
    el.textContent = msg;
    el.hidden = false;
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      input.select && input.select();
    }
    var panel = el.closest('.dialog__panel');
    if (panel && !UI.reduceMotion.matches) {
      panel.classList.remove('shake');
      void panel.offsetWidth;
      panel.classList.add('shake');
    }
  }

  function clearError(el, form) {
    el.hidden = true;
    el.textContent = '';
    if (form) form.querySelectorAll('[aria-invalid]').forEach(function (i) { i.removeAttribute('aria-invalid'); });
  }

  /* ---------- Acceso ---------- */
  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = $('adminPass');
    var err = $('loginError');
    clearError(err, this);
    if (!input.value) { showError(err, 'Escribe la contraseña.', input); return; }
    if (input.value !== Store.getAdminPass()) { showError(err, 'Contraseña incorrecta. Inténtalo de nuevo.', input); return; }
    input.value = '';
    UI.closeDialog('loginDialog');
    setAdmin(true);
    UI.toast('Modo administrador activado');
  });

  $('loginDialog').addEventListener('dialog:closed', function () {
    $('adminPass').value = '';
    $('adminPass').type = 'password';
    clearError($('loginError'), $('loginForm'));
  });

  $('btnLogout').addEventListener('click', function () {
    setAdmin(false);
    $('btnAuth').focus();
    UI.toast('Sesión de administrador cerrada', 'info');
  });

  /* ---------- Cambio de contraseña ---------- */
  $('passForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var oldI = $('cp_old'), newI = $('cp_new'), confI = $('cp_confirm'), err = $('cp_error');
    clearError(err, this);
    if (oldI.value !== Store.getAdminPass()) { showError(err, 'La contraseña actual es incorrecta.', oldI); return; }
    if (newI.value.length < 4) { showError(err, 'La nueva contraseña debe tener al menos 4 caracteres.', newI); return; }
    if (newI.value !== confI.value) { showError(err, 'Las contraseñas nuevas no coinciden.', confI); return; }
    Store.setAdminPass(newI.value);
    UI.closeDialog('passDialog');
    UI.toast('Contraseña actualizada');
  });

  $('passDialog').addEventListener('dialog:closed', function () {
    $('passForm').reset();
    clearError($('cp_error'), $('passForm'));
  });

  /* ---------- Formulario de registro ---------- */
  function datalist(name, cat, key) {
    var seen = {};
    Store.getDB(cat).forEach(function (r) { var v = String(r[key] || '').trim(); if (v) seen[v] = true; });
    return '<datalist id="dl-' + name + '">' +
      Object.keys(seen).sort().map(function (v) { return '<option value="' + esc(v) + '"></option>'; }).join('') +
      '</datalist>';
  }

  function nextId(cat) {
    var prefix = cat === 'materiales' ? 'M' : 'R';
    var max = 0;
    Store.getDB(cat).forEach(function (r) {
      var m = /^[A-Z](\d+)$/.exec(String(r.id || ''));
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return prefix + String(max + 1).padStart(3, '0');
  }

  function openForm(cat, index) {
    var isEdit = index !== null && index !== undefined;
    current.cat = cat;
    current.index = isEdit ? index : null;
    var data = isEdit ? (Store.getDB(cat)[index] || {}) : {};

    $('formTitle').innerHTML =
      '<span class="title-icon"><i class="ph ph-' + (isEdit ? 'pencil-simple' : 'plus') + '" aria-hidden="true"></i></span> ' +
      (isEdit ? 'Editar ' : 'Nuevo ') + esc(NOUN[cat]);

    var html = '';
    SCHEMAS[cat].forEach(function (f) {
      var val = data[f.id] != null ? String(data[f.id]) : '';
      if (!isEdit && f.id === 'id') val = nextId(cat);
      var fid = 'inp_' + f.id;
      var cls = 'field' + (f.type === 'textarea' || f.wide ? ' field--full' : '');
      var auto = f.required ? ' autofocus' : '';
      html += '<div class="' + cls + '"><label for="' + fid + '">' + esc(f.label) + (f.required ? ' <span class="req" aria-hidden="true">*</span>' : '') + '</label>';
      if (f.type === 'select') {
        var opts = f.opts.slice();
        if (val && opts.indexOf(val) === -1) opts.unshift(val);
        html += '<div class="select-wrap"><select class="input" id="' + fid + '" name="' + f.id + '">' +
          opts.map(function (o) { return '<option' + (o === val ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') +
          '</select><i class="ph ph-caret-up-down" aria-hidden="true"></i></div>';
      } else if (f.type === 'textarea') {
        html += '<textarea class="input" id="' + fid + '" name="' + f.id + '" rows="3">' + esc(val) + '</textarea>';
      } else {
        html += '<input class="input' + (f.mono ? ' mono' : '') + '" type="' + f.type + '" id="' + fid + '" name="' + f.id + '" value="' + esc(val) + '"' +
          (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') +
          (f.required ? ' required aria-required="true"' : '') +
          (f.list ? ' list="dl-' + f.list + '"' : '') +
          ' autocomplete="off"' + auto + '>';
      }
      html += '<p class="field__error" id="err_' + f.id + '" hidden></p></div>';
    });
    html += datalist('ubicaciones', 'materiales', 'ubicacion') + datalist('materias', 'practicas', 'mat');

    $('formFields').innerHTML = html;
    UI.openDialog('formDialog', document.activeElement);
  }

  $('recordForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var cat = current.cat;
    if (!cat) return;
    var obj = {};
    var invalid = null;
    SCHEMAS[cat].forEach(function (f) {
      var el = $('inp_' + f.id);
      var errEl = $('err_' + f.id);
      obj[f.id] = el.value.trim();
      el.removeAttribute('aria-invalid');
      errEl.hidden = true;
      if (f.required && !obj[f.id] && !invalid) {
        invalid = el;
        el.setAttribute('aria-invalid', 'true');
        el.setAttribute('aria-describedby', 'err_' + f.id);
        errEl.textContent = 'Este campo es obligatorio.';
        errEl.hidden = false;
      }
    });
    if (invalid) { invalid.focus(); return; }

    var db = Store.getDB(cat);
    var editing = current.index !== null;
    if (editing) db[current.index] = obj; else db.push(obj);
    Store.setDB(cat, db);
    UI.closeDialog('formDialog');
    UI.toast(editing ? 'Registro actualizado' : 'Registro agregado');
  });

  function deleteRecord(cat, index) {
    var db = Store.getDB(cat);
    var row = db[index];
    if (!row) return;
    var label = row.material || row.reactivo || row.prac || 'este registro';
    UI.confirm({
      title: '¿Eliminar ' + NOUN[cat] + '?',
      message: '“' + label + '” se eliminará de forma definitiva.',
      confirmLabel: 'Eliminar'
    }).then(function (ok) {
      if (!ok) return;
      var fresh = Store.getDB(cat);
      fresh.splice(index, 1);
      Store.setDB(cat, fresh);
      UI.toast('Registro eliminado', 'info');
    });
  }

  document.addEventListener('click', function (e) {
    var add = e.target.closest('[data-add]');
    if (add) { if (isAdmin()) openForm(add.getAttribute('data-add'), null); return; }
    var edit = e.target.closest('[data-edit]');
    if (edit) { if (isAdmin()) openForm(edit.getAttribute('data-edit'), Number(edit.getAttribute('data-index'))); return; }
    var del = e.target.closest('[data-delete]');
    if (del) { if (isAdmin()) deleteRecord(del.getAttribute('data-delete'), Number(del.getAttribute('data-index'))); }
  });

  /* ---------- Editor masivo JSON ---------- */
  var area = $('bulkCodeArea');
  var status = $('bulkStatus');
  var bulkTabs = document.querySelectorAll('[data-bulk]');

  function setStatus(kind, text) {
    status.className = 'code-status code-status--' + kind;
    status.innerHTML = '<i class="ph' + (kind === 'error' ? '-fill ph-warning-circle' : kind === 'ok' ? '-fill ph-check-circle' : ' ph-info') + '" aria-hidden="true"></i> ' + esc(text);
  }

  function validate() {
    try {
      var parsed = JSON.parse(area.value);
      if (!Array.isArray(parsed)) throw new Error('los datos deben estar dentro de un arreglo [ ]');
      area.removeAttribute('aria-invalid');
      setStatus('ok', 'JSON válido · ' + parsed.length + ' registros');
      return parsed;
    } catch (err) {
      area.setAttribute('aria-invalid', 'true');
      setStatus('error', 'Error de sintaxis: ' + err.message);
      return null;
    }
  }

  function loadBulk(cat) {
    bulkCat = cat;
    bulkTabs.forEach(function (t) {
      var on = t.getAttribute('data-bulk') === cat;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    area.value = JSON.stringify(Store.getDB(cat), null, 2);
    area.scrollTop = 0;
    validate();
    UI.updateSliders($('bulkDialog'));
  }

  $('btnBulk').addEventListener('click', function () {
    UI.openDialog('bulkDialog', this);
    loadBulk(bulkCat);
    requestAnimationFrame(function () { UI.updateSliders($('bulkDialog')); });
  });

  bulkTabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { loadBulk(tab.getAttribute('data-bulk')); });
    tab.addEventListener('keydown', function (e) {
      var dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      var next = bulkTabs[(i + dir + bulkTabs.length) % bulkTabs.length];
      next.focus();
      loadBulk(next.getAttribute('data-bulk'));
    });
  });

  var validateTimer;
  area.addEventListener('input', function () {
    clearTimeout(validateTimer);
    validateTimer = setTimeout(validate, 250);
  });

  // Tab inserta sangría (Shift+Tab sigue moviendo el foco fuera del editor)
  area.addEventListener('keydown', function (e) {
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      area.setRangeText('  ', area.selectionStart, area.selectionEnd, 'end');
    }
  });

  $('bulkFormat').addEventListener('click', function () {
    var parsed = validate();
    if (!parsed) return;
    area.value = JSON.stringify(parsed, null, 2);
    UI.toast('JSON formateado', 'info', 2200);
  });

  $('bulkSave').addEventListener('click', function () {
    var parsed = validate();
    if (!parsed) { area.focus(); return; }
    UI.confirm({
      title: '¿Sobrescribir ' + bulkCat + '?',
      message: 'Se reemplazarán todos los registros de la tabla por los ' + parsed.length + ' del editor.',
      confirmLabel: 'Sobrescribir'
    }).then(function (ok) {
      if (!ok) return;
      Store.setDB(bulkCat, parsed);
      UI.toast('Base de datos de ' + bulkCat + ' actualizada');
    });
  });

  window.Admin = { isAdmin: isAdmin, openForm: openForm };
})();
