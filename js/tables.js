/* =========================================================
   CECyTE Lab · Tablas: búsqueda, filtros y paginación
   ========================================================= */
(function () {
  'use strict';

  var esc = UI.escapeHTML;
  var ROWS_PER_PAGE = 10;

  var CONFIG = {
    inventario: {
      noun: 'artículos',
      emptyIcon: 'list-checks',
      perPage: 25,
      nameKey: 'articulo',
      columns: [
        { key: 'articulo', label: 'Tipo', type: 'tipoinv' },
        { key: 'articulo', label: 'Artículo', type: 'articulo' },
        { key: 'presentaciones', label: 'Existencia', type: 'existencia' },
        { key: 'presentaciones', label: 'Caducidad', type: 'caducidadinv' },
        { key: 'presentaciones', label: 'Estado', type: 'estadoinv' }
      ],
      // Dos grupos de filtros combinables: tipo y alertas
      groups: [
        {
          key: 'tipo', label: 'Tipo', all: 'Todos', keepZero: true,
          options: function () {
            return [
              { value: 'reactivo', label: 'Reactivos' },
              { value: 'material', label: 'Materiales' }
            ];
          }
        },
        {
          key: 'alerta', label: 'Alertas', keepZero: true,
          options: function () {
            return [
              { value: 'caducado', label: 'Caducados', dot: 'bad' },
              { value: 'obs', label: 'Con observaciones', dot: 'warn' }
            ];
          }
        }
      ]
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
      groups: [
        {
          key: 'mat', label: 'Materia', all: 'Todos',
          options: function () {
            var seen = {};
            Store.getDB('practicas').forEach(function (r) {
              var m = String(r.mat || '').trim();
              if (m) seen[m] = true;
            });
            return Object.keys(seen).sort(function (a, b) { return a.localeCompare(b, 'es'); })
              .map(function (m) { return { value: m, label: m }; });
          }
        }
      ]
    }
  };

  var state = {};
  Object.keys(CONFIG).forEach(function (cat) {
    var filters = {};
    CONFIG[cat].groups.forEach(function (g) { filters[g.key] = ''; });
    state[cat] = { page: 1, query: '', filters: filters };
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

  function isExpired(value) {
    return String(value || '').toUpperCase().indexOf('CADUCADO') > -1;
  }

  /* ---------- Tipos de material ----------
     Cada material pertenece a un tipo. El orden importa: gana la primera
     categoría cuyo texto aparezca en el nombre (ya sin acentos ni mayúsculas). */
  var MAT_TYPES = [
    { id: 'seguridad', label: 'Seguridad y protección', icon: 'shield-check',
      keys: ['gafa', 'lente', 'seguridad', 'mascarilla', 'asbesto', 'guante'] },
    { id: 'didactico', label: 'Didáctico y consumibles', icon: 'graduation-cap',
      keys: ['didactic', 'poster', 'modelo', 'domino', 'papel', 'manguera', 'tapon', 'alambre', 'magnesio', 'titrisol', 'kit de', 'set para'] },
    { id: 'optica', label: 'Microscopía y óptica', icon: 'microscope',
      keys: ['microscop', 'lupa', 'objetos', 'optic'] },
    { id: 'electricidad', label: 'Electricidad y magnetismo', icon: 'lightning',
      keys: ['multimetro', 'osciloscopio', 'adaptador', 'eliminador', 'electrodo', 'resistencia', 'foco', 'motor', 'caiman', 'iman', 'brujula', 'fuente de poder'] },
    { id: 'calor', label: 'Calentamiento', icon: 'fire',
      keys: ['mechero', 'estufa', 'parrilla', 'bano maria', 'olla', 'equipo de calor'] },
    { id: 'medicion', label: 'Medición', icon: 'ruler',
      keys: ['balanza', 'termometro', 'cronometro', 'flexometro', 'regla', 'transportador', 'calibrador', 'potenciometro', 'pechimetro', 'bascula', 'vernier'] },
    { id: 'fisica', label: 'Mecánica y física', icon: 'atom',
      keys: ['carrito', 'riel', 'polea', 'plomada', 'balines', 'pelota'] },
    { id: 'herramientas', label: 'Soportes y herramientas', icon: 'wrench',
      keys: ['pinza', 'sujetador', 'soporte', 'nuez', 'tripie', 'gradilla', 'horadador', 'espatula', 'cuchara', 'tijera', 'bisturi',
             'aguja', 'lanceta', 'jeringa', 'colador', 'charola', 'escobillon', 'mortero', 'pistilo', 'bomba', 'centrifug'] },
    { id: 'vidrio', label: 'Vidrio y volumetría', icon: 'flask',
      keys: ['matraz', 'vaso', 'vasito', 'probeta', 'pipeta', 'bureta', 'embudo', 'tubo', 'petri', 'reloj', 'capsula', 'refrigerante',
             'frasco', 'gotero', 'pizeta', 'perilla', 'filtro de vidrio'] }
  ];

  var MAT_OTHER = { id: 'otros', label: 'Otros', icon: 'package' };
  var INV_REAGENT = { id: 'reactivo', label: 'Reactivo químico', icon: 'test-tube' };

  // Cada artículo trae su tipo (reactivo o material); el icono de los materiales sale de su nombre.
  function inventoryType(row) {
    return row.tipo === 'reactivo' ? INV_REAGENT : materialType(row.articulo);
  }

  function presList(row) {
    return Array.isArray(row.presentaciones) ? row.presentaciones : [];
  }

  function rowExpired(row) {
    return presList(row).some(function (p) { return isExpired(p.caducidad); });
  }

  function hasObservation(row) {
    return presList(row).some(function (p) { return String(p.nota || '').trim() !== ''; });
  }

  /* ---------- Existencia: presentaciones compactas y total ---------- */
  function countUnit(row, p) {
    return p.unidad || (row.tipo === 'reactivo' ? 'frasco' : 'pieza');
  }

  function unitLabel(unit, n) {
    return n === 1 ? unit : (/s$/.test(unit) ? unit : unit + 's');
  }

  function qtyText(n) {
    return String(Math.round(n * 100) / 100);
  }

  // "250 gr" / "1.5 kg" / "500 ml" / "2 L" -> { fam, v } en gr o ml; otra medida -> null
  function parseMeasure(m) {
    var x = /^([\d.,]+)\s*(gr|g|kg|ml|l)$/i.exec(String(m || '').trim());
    if (!x) return null;
    var v = parseFloat(x[1].replace(',', '.'));
    var u = x[2].toLowerCase();
    if (u === 'kg') return { fam: 'g', v: v * 1000 };
    if (u === 'l') return { fam: 'ml', v: v * 1000 };
    return { fam: u === 'ml' ? 'ml' : 'g', v: v };
  }

  function fmtAmount(v, fam) {
    var big = v >= 1000;
    return qtyText(big ? v / 1000 : v) + ' ' + (fam === 'g' ? (big ? 'kg' : 'gr') : (big ? 'L' : 'ml'));
  }

  // Total por unidad de conteo y, en reactivos con medidas de peso o de volumen, el total acumulado
  function stockInfo(row) {
    var pres = presList(row);
    var units = [], byUnit = {};
    var fam = null, amount = 0, measurable = pres.length > 0;
    pres.forEach(function (p) {
      var n = Number(p.cantidad) || 0;
      var u = countUnit(row, p);
      if (!(u in byUnit)) { byUnit[u] = 0; units.push(u); }
      byUnit[u] += n;
      var pm = parseMeasure(p.medida);
      if (!pm || (fam && pm.fam !== fam)) measurable = false;
      else { fam = pm.fam; amount += pm.v * n; }
    });
    var parts = units.map(function (u) { return { n: byUnit[u], label: unitLabel(u, byUnit[u]) }; });
    var count = parts.reduce(function (s, p) { return s + p.n; }, 0);
    return { parts: parts, count: count, amount: row.tipo === 'reactivo' && measurable && fam && count > 1 ? fmtAmount(amount, fam) : '' };
  }

  function presItem(row, p) {
    var n = Number(p.cantidad) || 0;
    return p.medida
      ? qtyText(n) + ' × ' + p.medida
      : qtyText(n) + ' ' + unitLabel(countUnit(row, p), n);
  }

  function stats() {
    var all = Store.getDB('inventario');
    return {
      total: all.length,
      reactivos: all.filter(function (a) { return a.tipo === 'reactivo'; }).length,
      materiales: all.filter(function (a) { return a.tipo !== 'reactivo'; }).length,
      expired: all.filter(rowExpired).length,
      observed: all.filter(hasObservation).length
    };
  }

  function materialType(name) {
    var n = norm(name);
    for (var i = 0; i < MAT_TYPES.length; i++) {
      var keys = MAT_TYPES[i].keys;
      for (var j = 0; j < keys.length; j++) {
        if (n.indexOf(keys[j]) > -1) return MAT_TYPES[i];
      }
    }
    return MAT_OTHER;
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

  var dateFmt = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  function formatDate(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!m) return esc(value);
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return '<time datetime="' + esc(value) + '">' + esc(dateFmt.format(d).replace('.', '')) + '</time>';
  }

  // Indicador compacto de reactivos: color de almacenaje + icono de riesgo, con tooltip
  function tagsHtml(row) {
    if (row.tipo !== 'reactivo' || (!row.riesgo && !row.almacen)) return '';
    var tip = [row.riesgo && 'Riesgo: ' + row.riesgo, row.almacen && 'Almacenaje: ' + row.almacen]
      .filter(Boolean).join(' · ');
    return '<span class="cell-tags" tabindex="0" role="img" aria-label="' + esc(tip) + '" data-tip="' + esc(tip) + '">' +
      (row.almacen ? '<span class="swatch-dot swatch-dot--' + colorSlug(row.almacen) + '" aria-hidden="true"></span>' : '') +
      (row.riesgo ? '<span class="cell-riesgo"><i class="' + riskIcon(row.riesgo) + '" aria-hidden="true"></i></span>' : '') +
      '</span>';
  }

  function renderCell(col, row) {
    var raw = row[col.key];
    var val = raw == null || typeof raw === 'object' ? '' : String(raw);
    var content;
    var pres = presList(row);

    switch (col.type) {
      case 'strong':
        content = '<span class="cell-strong">' + esc(val) + '</span>';
        break;
      case 'articulo':
        content = '<span class="cell-name"><span class="cell-strong">' + esc(val) + '</span>' + tagsHtml(row) + '</span>';
        break;
      case 'tipoinv':
        var it = inventoryType(row);
        content = '<span class="cell-icon cell-icon--' + it.id + '" tabindex="0" role="img"' +
          ' aria-label="Tipo: ' + esc(it.label) + '" data-tip="' + esc(it.label) + '">' +
          '<i class="ph ph-' + it.icon + '" aria-hidden="true"></i></span>';
        break;
      case 'existencia':
        var st = stockInfo(row);
        var total = st.parts.map(function (p) {
          return '<span class="cell-qty"><strong class="cell-qty__num">' + esc(qtyText(p.n)) + '</strong>' +
            '<span class="cell-qty__unit">' + esc(p.label) + '</span></span>';
        }).join('<span class="cell-stock__sep" aria-hidden="true">·</span>');
        var showList = pres.length > 1 || (pres[0] && pres[0].medida);
        content = '<span class="cell-stock"><span class="cell-stock__total">' + total +
          (st.amount ? '<span class="cell-stock__amt">' + esc(st.amount) + '</span>' : '') +
          (st.count === 0 ? '<span class="badge badge--bad">Agotado</span>' : '') + '</span>' +
          (showList ? '<span class="cell-stock__list">' +
            pres.map(function (p) { return '<span>' + esc(presItem(row, p)) + '</span>'; }).join('') + '</span>' : '') +
          '</span>';
        break;
      case 'caducidadinv':
        var exp = pres.filter(function (p) { return isExpired(p.caducidad); });
        var dates = [];
        pres.forEach(function (p) {
          var c = String(p.caducidad || '').trim();
          if (c && c !== 'N/A' && !isExpired(c) && dates.indexOf(c) < 0) dates.push(c);
        });
        if (exp.length) {
          var label = exp.length === 1 ? exp[0].caducidad : 'CADUCADOS (' + exp.map(function (p) {
            var m = /\((.*)\)/.exec(p.caducidad);
            return m ? m[1] : p.caducidad;
          }).join(', ') + ')';
          content = '<span class="expired"><i class="ph-fill ph-warning" aria-hidden="true"></i>' + esc(label) + '</span>';
        } else if (dates.length) {
          content = '<span class="mono cell-muted">' + esc(dates.join(', ')) + '</span>';
        } else {
          content = '<span class="cell-none" aria-hidden="true">—</span><span class="sr-only">Sin caducidad</span>';
        }
        break;
      case 'estadoinv':
        var notes = pres.filter(function (p) { return String(p.nota || '').trim(); }).map(function (p) {
          return (pres.length > 1 && p.medida ? p.medida + ': ' : '') + p.nota;
        });
        content = notes.length
          ? '<span class="cell-notes">' + notes.map(function (n) {
              return '<span class="badge badge--warn"><span class="badge__dot" aria-hidden="true"></span>' + esc(n) + '</span>';
            }).join('') + '</span>'
          : '<span class="badge badge--ok"><span class="badge__dot" aria-hidden="true"></span>Buen estado</span>';
        break;
      case 'materia':
        content = '<span class="badge badge--subject">' + esc(val) + '</span>';
        break;
      case 'fecha':
        content = '<span class="mono">' + formatDate(val) + '</span>';
        break;
      default:
        content = esc(val);
    }

    return '<td data-label="' + esc(col.label) + '" class="td-' + (col.type || 'text') + '">' + content + '</td>';
  }

  /* ---------- Datos filtrados ---------- */
  // Texto donde se busca: todo lo que se ve del registro, más el tipo
  function haystack(cat, row) {
    if (cat === 'inventario') {
      return [row.id, row.articulo, row.tipo === 'reactivo' ? 'reactivo reactivos' : 'material materiales',
        inventoryType(row).label, row.riesgo, row.almacen, row.ubicacion, row.obs]
        .concat(presList(row).map(function (p) { return [p.medida, p.cantidad, p.unidad, p.caducidad, p.nota].join(' '); }))
        .join(' ');
    }
    if (cat === 'practicas' && window.Practicas) return Object.keys(row).map(function (k) { return row[k]; }).join(' ') + ' ' + Practicas.text(row);
    return Object.keys(row).map(function (k) { return row[k]; }).join(' ');
  }

  // ¿La fila contiene todas las palabras buscadas (o alguno de sus sinónimos)?
  function textMatches(cat, row, expTerms) {
    if (!expTerms.length) return true;
    var hay = norm(haystack(cat, row));
    return expTerms.every(function (group) {
      return group.some(function (t, idx) {
        // Lo que la persona escribe (idx 0) coincide por fragmento, para poder buscar mientras teclea.
        // Los símbolos de 1–2 letras que vienen de sinónimos (Na, K, Cl…) solo cuentan como palabra completa.
        if (idx > 0 && t.length <= 2 && /^[a-z]+$/.test(t)) {
          return new RegExp('(^|[^a-z0-9])' + t + '([^a-z0-9]|$)').test(hay);
        }
        return hay.indexOf(t) > -1;
      });
    });
  }

  // Cómo se aplica cada grupo de filtros a una fila
  var MATCHERS = {
    inventario: {
      tipo: function (row, v) { return (row.tipo === 'reactivo' ? 'reactivo' : 'material') === v; },
      alerta: function (row, v) { return v === 'caducado' ? rowExpired(row) : hasObservation(row); }
    },
    practicas: {
      mat: function (row, v) { return norm(row.mat) === norm(v); }
    }
  };

  // Búsqueda sin tocar el estado de las tablas (sugerencias del inicio)
  function search(cat, query) {
    var terms = norm(String(query).trim()).split(/\s+/).filter(Boolean);
    var expTerms = expandSearchTerms(terms);
    return Store.getDB(cat).filter(function (row) { return textMatches(cat, row, expTerms); });
  }

  // `override` ({grupo: valor}) permite contar cada chip respetando la búsqueda y los demás grupos activos.
  function getFiltered(cat, override) {
    var st = state[cat];
    var active = Object.assign({}, st.filters, override || {});
    var q = norm(st.query.trim());
    var terms = q ? q.split(/\s+/) : [];
    var expTerms = expandSearchTerms(terms);

    return Store.getDB(cat)
      .map(function (row, index) { return { row: row, index: index }; })
      .filter(function (item) {
        var ok = CONFIG[cat].groups.every(function (g) {
          return !active[g.key] || MATCHERS[cat][g.key](item.row, active[g.key]);
        });
        return ok && textMatches(cat, item.row, expTerms);
      });
  }

  function anyFilter(cat) {
    var f = state[cat].filters;
    return Object.keys(f).some(function (k) { return f[k]; });
  }

  /* ---------- Filtros (chips) ---------- */
  function renderFilters(cat) {
    var host = document.querySelector('[data-filters="' + cat + '"]');
    if (!host) return;
    var st = state[cat];

    host.innerHTML = CONFIG[cat].groups.map(function (g) {
      var opts = g.options();
      // Si el filtro activo ya no existe (p. ej. se borró la materia), se limpia
      if (st.filters[g.key] && !opts.some(function (o) { return o.value === st.filters[g.key]; })) {
        st.filters[g.key] = '';
      }
      var current = st.filters[g.key];
      function count(value) {
        var o = {};
        o[g.key] = value;
        return getFiltered(cat, o).length;
      }

      var chips = '';
      if (g.all) chips += chip(g.key, '', g.all, count(''), !current);
      opts.forEach(function (o) {
        var n = count(o.value);
        if (!n && o.value !== current && !g.keepZero) return;
        chips += chip(g.key, o.value, o.label, n, current === o.value, o);
      });
      return chips
        ? '<div class="filters__group" role="group" aria-label="' + esc(g.label) + '">' + chips + '</div>'
        : '';
    }).join('');
  }

  function chip(group, value, label, n, active, opt) {
    var lead = '';
    if (opt && opt.dot) lead = '<span class="badge__dot badge__dot--' + opt.dot + '" aria-hidden="true"></span>';
    return '<button type="button" class="chip" data-group="' + esc(group) + '" data-filter="' + esc(value) + '"' +
      ' aria-pressed="' + active + '" title="' + esc(label) + ': ' + n + '">' +
      lead + '<span>' + esc(label) + '</span><span class="chip__count mono">' + n + '</span></button>';
  }

  /* ---------- Tabla ---------- */
  function build(cat) {
    var card = document.querySelector('[data-table-card="' + cat + '"]');
    if (!card) return;
    var conf = CONFIG[cat];
    var st = state[cat];
    var isAdmin = document.body.classList.contains('is-admin') && !conf.readonly;
    var perPage = conf.perPage || ROWS_PER_PAGE;

    renderFilters(cat);

    var data = getFiltered(cat);
    if (cat === 'practicas' && window.Practicas && Practicas.mode() !== 'tabla') {
      Practicas.render(card, data, isAdmin, !!(st.query.trim() || anyFilter(cat)));
      return;
    }
    var totalPages = Math.max(1, Math.ceil(data.length / perPage));
    if (st.page > totalPages) st.page = totalPages;
    if (st.page < 1) st.page = 1;

    var start = (st.page - 1) * perPage;
    var pageRows = data.slice(start, start + perPage);

    var head = conf.columns.map(function (c) {
      return '<th scope="col">' + esc(c.label) + '</th>';
    }).join('');
    if (isAdmin) head += '<th scope="col" class="th-actions"><span class="sr-only">Acciones</span></th>';

    var body;
    if (!pageRows.length) {
      var hasQuery = st.query.trim() || anyFilter(cat);
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
        var expired = cat === 'inventario' && rowExpired(item.row);
        var cells = conf.columns.map(function (c) { return renderCell(c, item.row); }).join('');
        if (isAdmin) {
          var name = esc(item.row[conf.nameKey || conf.columns[0].key] || 'registro');
          cells += '<td class="td-actions" data-label="Acciones"><div class="row-actions">' +
            '<button type="button" class="icon-btn icon-btn--sm" data-edit="' + cat + '" data-index="' + item.index + '" aria-label="Editar ' + name + '"><i class="ph ph-pencil-simple" aria-hidden="true"></i></button>' +
            '<button type="button" class="icon-btn icon-btn--sm icon-btn--danger" data-delete="' + cat + '" data-index="' + item.index + '" aria-label="Eliminar ' + name + '"><i class="ph ph-trash" aria-hidden="true"></i></button>' +
          '</div></td>';
        }
        var open = cat === 'practicas' ? ' data-prac-open="' + item.index + '" tabindex="0"' : '';
        return '<tr class="reveal' + (expired ? ' is-expired' : '') + (open ? ' is-clickable' : '') + '" style="--i:' + i + '"' + open + '>' + cells + '</tr>';
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

    // Las filas nuevas nacen con .reveal: hay que observarlas para que aparezcan
    if (window.UI && UI.observeReveals) UI.observeReveals(card);
  }

  function buildAll() {
    Object.keys(CONFIG).forEach(build);
  }

  // Cambia un filtro desde fuera (tarjetas del inicio, alertas, redirecciones, buscador)
  function setFilter(cat, group, value) {
    var st = state[cat];
    if (!st || !(group in st.filters)) return;
    st.filters[group] = value || '';
    st.page = 1;
    build(cat);
  }

  // Deja la tabla como nueva y aplica solo estos filtros (y sin búsqueda)
  function show(cat, filters) {
    var st = state[cat];
    if (!st) return;
    st.query = '';
    var input = document.querySelector('[data-search="' + cat + '"]');
    if (input) input.value = '';
    Object.keys(st.filters).forEach(function (k) { st.filters[k] = (filters && filters[k]) || ''; });
    st.page = 1;
    build(cat);
  }

  function resetFilters(cat) {
    var st = state[cat];
    if (!st) return;
    Object.keys(st.filters).forEach(function (k) { st.filters[k] = ''; });
    st.page = 1;
    build(cat);
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
      var group = f.getAttribute('data-group');
      if (!cat || !state[cat] || !group) return;
      var val = f.getAttribute('data-filter');
      state[cat].filters[group] = state[cat].filters[group] === val ? '' : val;
      state[cat].page = 1;
      build(cat);
      var again = document.querySelector('[data-filters="' + cat + '"] [data-group="' + group + '"][data-filter="' + CSS.escape(state[cat].filters[group]) + '"]');
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
      var input = document.querySelector('[data-search="' + cc + '"]');
      if (input) { input.value = ''; input.focus(); }
      resetFilters(cc);
    }
  });

  Store.onChange(function (table) {
    if (CONFIG[table]) build(table);
  });

  window.Tables = {
    CONFIG: CONFIG,
    formatDate: formatDate,
    getFiltered: getFiltered,
    build: build,
    buildAll: buildAll,
    isExpired: isExpired,
    rowExpired: rowExpired,
    hasObservation: hasObservation,
    colorSlug: colorSlug,
    formatDate: formatDate,
    norm: norm,
    search: search,
    stats: stats,
    stockInfo: stockInfo,
    setFilter: setFilter,
    show: show,
    resetFilters: resetFilters,
    materialType: materialType,
    inventoryType: inventoryType
  };
})();
