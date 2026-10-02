/* =========================================================
   CECyTE Lab · Tablas: búsqueda, filtros y paginación
   ========================================================= */
(function () {
  'use strict';

  var esc = UI.escapeHTML;
  var ROWS_PER_PAGE = 10;

  var CONFIG = {
    materiales: {
      noun: 'materiales',
      emptyIcon: 'package',
      columns: [
        { key: 'id', label: 'ID', type: 'id' },
        { key: 'material', label: 'Material', type: 'strong' },
        { key: 'material', label: 'Tipo', type: 'icon' },
        { key: 'cantidad', label: 'Cantidad', type: 'qty' },
        { key: 'estado', label: 'Estado', type: 'estado' },
        { key: 'ubicacion', label: 'Ubicación' }
      ],
      filterKey: 'estado',
      filterLabel: 'Estado',
      filters: function () {
        return [
          { value: 'Bueno', label: 'Bueno', dot: 'ok' },
          { value: 'Regular', label: 'Regular', dot: 'warn' },
          { value: 'Malo', label: 'Malo', dot: 'bad' }
        ];
      }
    },
    reactivos: {
      noun: 'reactivos',
      emptyIcon: 'test-tube',
      columns: [
        { key: 'id', label: 'ID', type: 'id' },
        { key: 'reactivo', label: 'Sustancia / fórmula', type: 'strong' },
        { key: 'cantidad', label: 'Cant. / lote', type: 'qty' },
        { key: 'caducidad', label: 'Caducidad', type: 'caducidad' },
        { key: 'riesgo', label: 'Riesgo (SGA)', type: 'riesgo' },
        { key: 'almacen', label: 'Almacenaje', type: 'almacen' }
      ],
      filterKey: 'almacen',
      filterLabel: 'Color',
      filters: function () {
        return [
          { value: 'Verde', label: 'Verde', swatch: 'verde' },
          { value: 'Azul', label: 'Azul', swatch: 'azul' },
          { value: 'Amarillo', label: 'Amarillo', swatch: 'amarillo' },
          { value: 'Rojo', label: 'Rojo', swatch: 'rojo' },
          { value: 'Blanco', label: 'Blanco', swatch: 'blanco' },
          { value: 'Rayas', label: 'Rayas', swatch: 'rayas' },
          { value: '__caducado', label: 'Caducados', dot: 'bad' }
        ];
      }
    },
    practicas: {
      noun: 'prácticas',
      emptyIcon: 'microscope',
      columns: [
        { key: 'prac', label: 'Práctica', type: 'strong' },
        { key: 'mat', label: 'Materia', type: 'materia' },
        { key: 'fecha', label: 'Fecha', type: 'fecha' },
        { key: 'rec', label: 'Reactivos / material' }
      ],
      filterKey: 'mat',
      filterLabel: 'Materia',
      filters: function () {
        var seen = {};
        Store.getDB('practicas').forEach(function (r) {
          var m = String(r.mat || '').trim();
          if (m) seen[m] = true;
        });
        return Object.keys(seen).sort(function (a, b) { return a.localeCompare(b, 'es'); })
          .map(function (m) { return { value: m, label: m }; });
      }
    }
  };

  var state = {};
  Object.keys(CONFIG).forEach(function (cat) {
    state[cat] = { page: 1, query: '', filter: '' };
  });

  /* ---------- Normalización para búsqueda sin acentos ---------- */
  function norm(v) {
    return String(v == null ? '' : v)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  var SEARCH_SYNONYMS = {
    'sr': ['estroncio', 'strontium'],
    'ba': ['bario', 'barium'],
    'ca': ['calcio', 'calcium'],
    'mg': ['magnesio', 'magnesium'],
    'na': ['sodio', 'sodium'],
    'k': ['potasio', 'potassium'],
    'cl': ['cloro', 'cloruro', 'chloride'],
    'cu': ['cobre', 'copper', 'cuprico'],
    'zn': ['zinc', 'zinc'],
    'fe': ['hierro', 'iron', 'ferrico', 'ferroso'],
    'al': ['aluminio', 'aluminum'],
    'ni': ['niquel', 'nickel'],
    'pb': ['plomo', 'lead'],
    'ag': ['plata', 'silver'],
    'au': ['oro', 'gold'],
    'hg': ['mercurio', 'mercury'],
    'mn': ['manganeso', 'manganese'],
    'cr': ['cromo', 'chromium'],
    'co': ['cobalto', 'cobalt'],
    'sn': ['estaño', 'tin'],
    'p': ['fosforo', 'phosphorus', 'fosfato'],
    's': ['azufre', 'sulfur', 'sulfato'],
    'n': ['nitrogeno', 'nitrogen', 'nitrato'],
    'c': ['carbono', 'carbon', 'carbonato'],
    'h': ['hidrogeno', 'hydrogen'],
    'o': ['oxigeno', 'oxygen', 'oxido'],
    'f': ['fluor', 'fluorine', 'fluoruro'],
    'br': ['bromo', 'bromine', 'bromuro'],
    'i': ['yodo', 'iodine', 'yoduro'],
    'mechero': ['bunsen', 'alcohol'],
    'matraz': ['flask', 'aforado', 'erlenmeyer', 'bola', 'kitazato', 'destilacion'],
    'probeta': ['cilindro', 'graduated'],
    'pipeta': ['pipette', 'serologica'],
    'bureta': ['buret'],
    'gradilla': ['rack', 'soporte tubos'],
    'microscopio': ['binocular', 'optico', 'digital'],
    'centrifuga': ['combot', 'mini'],
    'multimetro': ['osciloscopio'],
    'balanza': ['granataria', 'electronica', 'pesaje'],
    'termometro': ['temperatura'],
    'cronometro': ['tiempo', 'timer'],
    'bisturi': ['scalpel', 'mangos', 'hojas'],
    'lanceta': ['lancetas', 'sangre'],
    'jeringa': ['syringe'],
    'pinza': ['universal', 'crisol', 'bureta', 'tubo', 'matraz'],
    'soporte': ['anillo', 'nuez', 'tripie', 'tripode'],
    'electrodo': ['plomo', 'cobre', 'aluminio', 'zinc', 'placa'],
    'frasco': ['gotero', 'guardado', 'bottle'],
    'gafas': ['lentes', 'seguridad', 'epp'],
    'mascarilla': ['mask'],
    'guante': ['glove'],
    'bata': ['lab coat'],
    'botas': ['boots'],
    'papel': ['filtro', 'ph', 'tornasol', 'indicator'],
    'filtro': ['filtration'],
    'embudo': ['separacion', 'funnel'],
    'capsula': ['porcelana', 'crucible'],
    'mortero': ['pistilo', 'trituracion'],
    'escobillon': ['broom', 'lavado'],
    'pizeta': ['spray', 'lavado'],
    'pelota': ['golf', 'caida libre'],
    'perilla': ['succion'],
    'poster': ['anatomy', 'anatomia', 'its', 'fotosintesis', 'vih', 'reproductor', 'urinario'],
    'tijeras': ['scissors', 'curvas'],
    'lamina': ['slide', 'asbesto'],
    'vaso': ['beaker', 'precipitado', 'pascal'],
    'tubo': ['ensaye', 'test tube', '9800', 'elc', 'mediano'],
    'transportador': ['angulos', 'protractor'],
    'vernier': ['calibrador', 'micrometro'],
    'horadador': ['drill', 'tapones'],
    'titrisol': ['estandar'],
    'vaselina': ['solida'],
    'dominó': ['domino', 'quimica', 'organica', 'funcionales'],
    'motor': ['electrico', 'electromagnetismo'],
    'gotero': ['eyedropper', 'dosis'],
    'anhidrido': ['acetico', 'acetic anhydride'],
    'rojo de metilo': ['methyl red', 'indicador'],
    'solucion 0.1': ['0.1', 'normal', 'n/10'],
  };

  // Devuelve un grupo por palabra buscada: basta que el texto contenga
  // cualquiera de sus sinónimos, pero deben cumplirse todas las palabras.
  function expandSearchTerms(terms) {
    return terms.map(function (t) {
      var group = [t];
      var nt = norm(t);
      if (SEARCH_SYNONYMS[nt]) {
        SEARCH_SYNONYMS[nt].forEach(function (s) { group.push(norm(s)); });
      }
      Object.keys(SEARCH_SYNONYMS).forEach(function (k) {
        if (SEARCH_SYNONYMS[k].indexOf(nt) > -1) {
          group.push(k);
          SEARCH_SYNONYMS[k].forEach(function (s) { group.push(norm(s)); });
        }
      });
      return group;
    });
  }

  /* ---------- Celdas ---------- */
  function colorSlug(value) {
    var v = norm(value);
    if (v.indexOf('rayas') > -1) return 'rayas';
    if (v.indexOf('blanco') > -1) return 'blanco';
    if (v.indexOf('amarillo') > -1) return 'amarillo';
    if (v.indexOf('rojo') > -1) return 'rojo';
    if (v.indexOf('azul') > -1) return 'azul';
    if (v.indexOf('verde') > -1 || v.indexOf('gris') > -1) return 'verde';
    return 'neutral';
  }

  function estadoTone(value) {
    var v = norm(value);
    if (v.indexOf('malo') > -1) return 'bad';
    if (v.indexOf('regular') > -1) return 'warn';
    if (v.indexOf('bueno') > -1) return 'ok';
    return 'neutral';
  }

  function isExpired(value) {
    return String(value || '').toUpperCase().indexOf('CADUCADO') > -1;
  }

  /* ---------- Helpers nuevos ---------- */
  var ICON_MAP_MAT = {
    'matraz': 'flask', 'vaso': 'beaker', 'probeta': 'cylinder', 'pipeta': 'pipette',
    'bureta': 'pipette', 'embudo': 'funnel', 'gradilla': 'test-tube', 'tubo': 'test-tube',
    'caja petri': 'petri-dish', 'cubre': 'square', 'cuchara': 'spoon', 'espátula': 'spoon',
    'balanza': 'scales', 'báscula': 'scales', 'pesaje': 'scales', 'termómetro': 'thermometer',
    'cronómetro': 'timer', 'mechero': 'fire', 'bunsen': 'fire', 'alcohol': 'fire',
    'estufa': 'fire', 'baño': 'bowl-food', 'horno': 'fire', 'centrífuga': 'cube',
    'microscopio': 'microscope', 'lupa': 'magnifying-glass', 'óptica': 'eye',
    'imán': 'magnet', 'magnet': 'magnet', 'brújula': 'compass',
    'multímetro': 'lightning', 'osciloscopio': 'waveform', 'fuente': 'plug', 'eliminador': 'plug',
    'motor': 'engine', 'resistencia': 'cpu', 'foco': 'lightbulb', 'caiman': 'hand-grabbing',
    'jeringa': 'syringe', 'lanceta': 'droplet', 'aguja': 'droplet', 'pinza': 'wrench',
    'soporte': 'rows', 'anillo': 'circle', 'nuez': 'hexagon', 'tornillo': 'wrench',
    'regla': 'ruler', 'flexómetro': 'ruler', 'transportador': 'ruler', 'tripié': 'triangle',
    'carrito': 'truck', 'riel': 'minus', 'polea': 'circle-half', 'plomada': 'plumb-bob',
    'mascarilla': 'mask-happy', 'gafa': 'eyeglasses', 'lente': 'eyeglasses',
    'guante': 'hand', 'bata': 'user', 'botas': 'footprint',
    'papel': 'file-text', 'filtro': 'filter', 'ph': 'gauge', 'tornasol': 'gauge',
    'colador': 'funnel', 'charola': 'tray', 'capsula': 'bowl', 'mortero': 'bowl-food',
    'pistilo': 'pestle', 'escobillón': 'broom', 'pizeta': 'spray-bottle',
    'frasco': 'bottle', 'gotero': 'eyedropper', 'guardado': 'package',
    'pelota': 'circle', 'golf': 'circle', 'perilla': 'circle-half',
    'poster': 'image', 'tijeras': 'scissors', 'bisturí': 'scalpel',
    'lamina': 'square', 'asbesto': 'shield', 'pascal': 'cube',
    'vernier': 'ruler', 'calibrador': 'ruler', 'micrómetro': 'ruler',
    'horadador': 'drill', 'titrisol': 'flask', 'vaselina': 'bottle',
    'dominó': 'dice-five', 'dominó': 'dice-six'
  };

  function materialIcon(name) {
    var n = norm(name);
    for (var k in ICON_MAP_MAT) if (n.indexOf(k) > -1) return 'ph ph-' + ICON_MAP_MAT[k];
    return 'ph ph-package';
  }

  var RISK_ICONS = {
    'inflamable': 'flame', 'flamable': 'flame', 'fuego': 'flame', 'fire': 'flame',
    'corrosivo': 'drop-half', 'corros': 'drop-half', 'ácido': 'drop-half', 'base fuerte': 'drop-half',
    'tóxico': 'skull', 'toxico': 'skull', 'veneno': 'skull', 'peligroso': 'skull',
    'irritante': 'warning', 'irrita': 'warning', 'irritation': 'warning',
    'oxidante': 'fire-simple', 'oxid': 'fire-simple',
    'reactivo': 'sparkle', 'react': 'sparkle', 'agua': 'waveform',
    'volátil': 'wind', 'volatil': 'wind', 'vapor': 'wind',
    'bajo': 'leaf', 'inofens': 'leaf', 'inocuo': 'leaf', 'seguro': 'leaf', 'none': 'leaf'
  };

  function riskIcon(risk) {
    var r = norm(risk);
    for (var k in RISK_ICONS) if (r.indexOf(k) > -1) return 'ph ph-' + RISK_ICONS[k];
    return 'ph ph-shield-warning';
  }

  function parseQty(q) {
    var m = q.match(/^([\d.,]+)\s*(.*)/);
    if (!m) return { num: q, unit: '' };
    return { num: m[1], unit: m[2] || '' };
  }

  var dateFmt = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  function formatDate(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!m) return esc(value);
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return '<time datetime="' + esc(value) + '">' + esc(dateFmt.format(d).replace('.', '')) + '</time>';
  }

  function renderCell(col, row) {
    var raw = row[col.key];
    var val = raw == null ? '' : String(raw);
    var content;

    switch (col.type) {
      case 'id':
        content = '<span class="cell-id mono">' + esc(val) + '</span>';
        break;
      case 'strong':
        content = '<span class="cell-strong">' + esc(val) + '</span>';
        break;
      case 'mono':
        content = '<span class="mono">' + esc(val) + '</span>';
        break;
      case 'muted':
        content = '<span class="cell-muted">' + (val ? esc(val) : '—') + '</span>';
        break;
      case 'qty':
        var q = parseQty(val);
        content = '<span class="cell-qty"><strong class="cell-qty__num">' + esc(q.num) + '</strong>' + (q.unit ? '<span class="cell-qty__unit">' + esc(q.unit) + '</span>' : '') + '</span>';
        break;
      case 'riesgo':
        var icon = riskIcon(val);
        content = '<span class="cell-riesgo"><i class="' + icon + '" aria-hidden="true"></i><span>' + esc(val) + '</span></span>';
        break;
      case 'icon':
        var iconClass = materialIcon(val);
        content = '<span class="cell-icon" aria-hidden="true"><i class="' + iconClass + '"></i></span>';
        break;
      case 'estado':
        content = '<span class="badge badge--' + estadoTone(val) + '"><span class="badge__dot" aria-hidden="true"></span>' + esc(val) + '</span>';
        break;
      case 'almacen':
        content = '<span class="badge badge--color"><span class="swatch-dot swatch-dot--' + colorSlug(val) + '" aria-hidden="true"></span>' + esc(val) + '</span>';
        break;
      case 'caducidad':
        var cadText = val === 'N/A' ? 'Sin caducidad' : val;
        content = isExpired(val)
          ? '<span class="expired"><i class="ph-fill ph-warning" aria-hidden="true"></i>' + esc(val) + '</span>'
          : '<span class="mono cell-muted">' + esc(cadText) + '</span>';
        break;
      case 'materia':
        content = '<span class="badge badge--subject">' + esc(val) + '</span>';
        break;
      case 'fecha':
        content = '<span class="mono">' + formatDate(val) + '</span>';
        break;
      default:
        content = isExpired(val)
          ? '<span class="expired">' + esc(val) + '</span>'
          : esc(val);
    }

    return '<td data-label="' + esc(col.label) + '" class="td-' + (col.type || 'text') + '">' + content + '</td>';
  }

  /* ---------- Datos filtrados ---------- */
  // `filterValue` permite contar cada chip respetando la búsqueda activa.
  function getFiltered(cat, filterValue) {
    var conf = CONFIG[cat];
    var st = state[cat];
    var active = filterValue === undefined ? st.filter : filterValue;
    var q = norm(st.query.trim());
    var terms = q ? q.split(/\s+/) : [];
    var expTerms = expandSearchTerms(terms);

    return Store.getDB(cat)
      .map(function (row, index) { return { row: row, index: index }; })
      .filter(function (item) {
        if (active) {
          if (active === '__caducado') {
            if (!isExpired(item.row.caducidad)) return false;
          } else if (cat === 'reactivos') {
            if (colorSlug(item.row.almacen) !== colorSlug(active)) return false;
          } else if (norm(item.row[conf.filterKey]) !== norm(active)) {
            return false;
          }
        }
        if (!expTerms.length) return true;
        var hay = norm(Object.keys(item.row).map(function (k) { return item.row[k]; }).join(' '));
        return expTerms.every(function (group) {
          return group.some(function (t) { return hay.indexOf(t) > -1; });
        });
      });
  }

  /* ---------- Filtros (chips) ---------- */
  function renderFilters(cat) {
    var host = document.querySelector('[data-filters="' + cat + '"]');
    if (!host) return;
    var conf = CONFIG[cat];
    var st = state[cat];
    var all = Store.getDB(cat);
    var opts = conf.filters();

    // Si el filtro activo ya no existe (p. ej. se borró la materia), se limpia
    if (st.filter && st.filter !== '__caducado' && !opts.some(function (o) { return o.value === st.filter; })) {
      st.filter = '';
    }

    function count(value) {
      return getFiltered(cat, value).length;
    }

    var html = '';
    html += chip('', 'Todos', count(''), !st.filter);
    opts.forEach(function (o) {
      var n = count(o.value);
      if (!n && o.value !== st.filter) return;
      html += chip(o.value, o.label, n, st.filter === o.value, o);
    });
    host.innerHTML = html;
  }

  function chip(value, label, n, active, opt) {
    var lead = '';
    var dotOnly = !!(opt && opt.swatch);
    if (opt && opt.swatch) lead = '<span class="swatch-dot swatch-dot--' + opt.swatch + '" aria-hidden="true"></span>';
    else if (opt && opt.dot) lead = '<span class="badge__dot badge__dot--' + opt.dot + '" aria-hidden="true"></span>';
    var text = dotOnly
      ? '<span class="sr-only">' + esc(label) + '</span>'
      : '<span>' + esc(label) + '</span>';
    return '<button type="button" class="chip' + (dotOnly ? ' chip--dot' : '') + '" data-filter="' + esc(value) + '"' +
      ' aria-pressed="' + active + '" title="' + esc(label) + ': ' + n + '">' +
      lead + text + '<span class="chip__count mono">' + n + '</span></button>';
  }

  /* ---------- Tabla ---------- */
  function build(cat) {
    var card = document.querySelector('[data-table-card="' + cat + '"]');
    if (!card) return;
    var conf = CONFIG[cat];
    var st = state[cat];
    var isAdmin = document.body.classList.contains('is-admin');

    renderFilters(cat);

    var data = getFiltered(cat);
    var totalPages = Math.max(1, Math.ceil(data.length / ROWS_PER_PAGE));
    if (st.page > totalPages) st.page = totalPages;
    if (st.page < 1) st.page = 1;

    var start = (st.page - 1) * ROWS_PER_PAGE;
    var pageRows = data.slice(start, start + ROWS_PER_PAGE);

    var head = conf.columns.map(function (c) {
      return '<th scope="col">' + esc(c.label) + '</th>';
    }).join('');
    if (isAdmin) head += '<th scope="col" class="th-actions"><span class="sr-only">Acciones</span></th>';

    var body;
    if (!pageRows.length) {
      var hasQuery = st.query.trim() || st.filter;
      body = '<tr class="empty-row"><td colspan="' + (conf.columns.length + (isAdmin ? 1 : 0)) + '">' +
        '<div class="empty">' +
          '<span class="empty__icon" aria-hidden="true"><i class="ph ph-' + (hasQuery ? 'magnifying-glass' : conf.emptyIcon) + '"></i></span>' +
          '<p class="empty__title">' + (hasQuery ? 'Sin coincidencias' : 'Aún no hay ' + esc(conf.noun)) + '</p>' +
          '<p class="empty__text">' + (hasQuery
            ? 'Prueba con otra palabra o quita los filtros activos.'
            : (isAdmin ? 'Usa “Agregar” para crear el primer registro.' : 'Entra en modo admin para agregar registros.')) + '</p>' +
          (hasQuery ? '<button type="button" class="btn btn--ghost btn--sm" data-clear="' + cat + '"><i class="ph ph-x" aria-hidden="true"></i> Limpiar búsqueda</button>' : '') +
        '</div></td></tr>';
    } else {
      body = pageRows.map(function (item, i) {
        var expired = cat === 'reactivos' && isExpired(item.row.caducidad);
        var cells = conf.columns.map(function (c) { return renderCell(c, item.row); }).join('');
        if (isAdmin) {
          var name = esc(item.row[conf.columns[cat === 'practicas' ? 0 : 1].key] || 'registro');
          cells += '<td class="td-actions" data-label="Acciones"><div class="row-actions">' +
            '<button type="button" class="icon-btn icon-btn--sm" data-edit="' + cat + '" data-index="' + item.index + '" aria-label="Editar ' + name + '"><i class="ph ph-pencil-simple" aria-hidden="true"></i></button>' +
            '<button type="button" class="icon-btn icon-btn--sm icon-btn--danger" data-delete="' + cat + '" data-index="' + item.index + '" aria-label="Eliminar ' + name + '"><i class="ph ph-trash" aria-hidden="true"></i></button>' +
          '</div></td>';
        }
        return '<tr class="reveal' + (expired ? ' is-expired' : '') + '" style="--i:' + i + '">' + cells + '</tr>';
      }).join('');
    }

    var from = data.length ? start + 1 : 0;
    var to = start + pageRows.length;

    card.innerHTML =
      '<div class="table-scroll">' +
        '<table class="data-table data-table--' + cat + '">' +
          '<caption class="sr-only">Tabla de ' + esc(conf.noun) + '</caption>' +
          '<thead><tr>' + head + '</tr></thead>' +
          '<tbody>' + body + '</tbody>' +
        '</table>' +
      '</div>' +
      '<footer class="table-foot">' +
        '<p class="table-foot__count"><span class="mono">' + from + '–' + to + '</span> de <span class="mono">' + data.length + '</span> ' + esc(conf.noun) + '</p>' +
        '<nav class="pager" aria-label="Paginación de ' + esc(conf.noun) + '">' +
          '<button type="button" class="icon-btn icon-btn--sm" data-page="' + cat + '" data-delta="-1" aria-label="Página anterior"' + (st.page <= 1 ? ' disabled' : '') + '><i class="ph ph-caret-left" aria-hidden="true"></i></button>' +
          '<span class="pager__info mono" aria-live="polite">' + st.page + ' / ' + totalPages + '</span>' +
          '<button type="button" class="icon-btn icon-btn--sm" data-page="' + cat + '" data-delta="1" aria-label="Página siguiente"' + (st.page >= totalPages ? ' disabled' : '') + '><i class="ph ph-caret-right" aria-hidden="true"></i></button>' +
        '</nav>' +
      '</footer>';
  }

  function buildAll() {
    Object.keys(CONFIG).forEach(build);
  }

  /* ---------- Eventos ---------- */
  var searchTimers = {};
  document.querySelectorAll('[data-search]').forEach(function (input) {
    var cat = input.getAttribute('data-search');
    input.addEventListener('input', function () {
      clearTimeout(searchTimers[cat]);
      searchTimers[cat] = setTimeout(function () {
        state[cat].query = input.value;
        state[cat].page = 1;
        build(cat);
      }, 120);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && input.value) {
        e.preventDefault();
        input.value = '';
        state[cat].query = '';
        state[cat].page = 1;
        build(cat);
      }
    });
  });

  document.addEventListener('click', function (e) {
    var f = e.target.closest('[data-filter]');
    if (f) {
      var host = f.closest('[data-filters]');
      var cat = host && host.getAttribute('data-filters');
      if (!cat) return;
      var val = f.getAttribute('data-filter');
      state[cat].filter = state[cat].filter === val ? '' : val;
      state[cat].page = 1;
      build(cat);
      var again = document.querySelector('[data-filters="' + cat + '"] [data-filter="' + CSS.escape(state[cat].filter) + '"]');
      if (again) again.focus();
      return;
    }

    var p = e.target.closest('[data-page]');
    if (p) {
      var pc = p.getAttribute('data-page');
      state[pc].page += Number(p.getAttribute('data-delta'));
      build(pc);
      var card = document.querySelector('[data-table-card="' + pc + '"]');
      if (card) {
        var top = card.getBoundingClientRect().top;
        if (top < 0) card.scrollIntoView({ behavior: UI.reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
        var same = card.querySelector('[data-page][data-delta="' + p.getAttribute('data-delta') + '"]:not([disabled])') ||
                   card.querySelector('[data-page]:not([disabled])');
        if (same) same.focus({ preventScroll: true });
      }
      return;
    }

    var c = e.target.closest('[data-clear]');
    if (c) {
      var cc = c.getAttribute('data-clear');
      state[cc].query = '';
      state[cc].filter = '';
      state[cc].page = 1;
      var input = document.querySelector('[data-search="' + cc + '"]');
      if (input) { input.value = ''; input.focus(); }
      build(cc);
    }
  });

  Store.onChange(function (table) {
    if (CONFIG[table]) build(table);
  });

  window.Tables = {
    CONFIG: CONFIG,
    build: build,
    buildAll: buildAll,
    isExpired: isExpired,
    colorSlug: colorSlug,
    estadoTone: estadoTone,
    formatDate: formatDate,
    norm: norm
  };
})();
