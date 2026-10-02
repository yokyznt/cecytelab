/* =========================================================
   CECyTE Lab · Contenido de los protocolos de seguridad
   (contenido estático de confianza; sin datos del usuario)
   ========================================================= */
(function () {
  'use strict';

  function li(icon, html) {
    return '<li><i class="ph ph-' + icon + '" aria-hidden="true"></i><span>' + html + '</span></li>';
  }

  function list(items) {
    return '<ul class="check-list">' + items.join('') + '</ul>';
  }

  function callout(tone, icon, text, pulse) {
    return '<p class="callout callout--' + tone + (pulse ? ' callout--pulse' : '') + '">' +
      '<i class="ph-fill ph-' + icon + '" aria-hidden="true"></i><span>' + text + '</span></p>';
  }

  function quote(html) {
    return '<blockquote class="quote">' + html + '</blockquote>';
  }

  function noSign(icon, label) {
    return '<figure class="no-sign" aria-label="' + label + '">' +
      '<i class="ph ph-' + icon + ' no-sign__icon" aria-hidden="true"></i>' +
      '<span class="no-sign__slash" aria-hidden="true"></span></figure>';
  }

  function folder(n, tone) {
    return '<div class="folder-art folder-art--' + tone + '" aria-hidden="true">' +
      '<span class="folder-art__tab"></span><span class="folder-art__body"><span class="folder-art__num">' + n + '</span></span></div>';
  }

  var SAFETY = {
    equipo: {
      title: 'Equipo de protección',
      icon: 'eyeglasses',
      tone: 'blue',
      content:
        callout('info', 'shield-check', 'Obligatorio en el área de reactivos', true) +
        '<p>Usa siempre bata abotonada y equipo de protección personal completo en todo momento dentro del área de reactivos.</p>' +
        '<ul class="ppe-grid" aria-label="Equipo requerido">' +
          '<li class="ppe-item"><i class="ph ph-eyeglasses" aria-hidden="true"></i><span>Lentes</span></li>' +
          '<li class="ppe-item"><i class="ph ph-t-shirt" aria-hidden="true"></i><span>Bata</span></li>' +
          '<li class="ppe-item"><i class="ph ph-hand" aria-hidden="true"></i><span>Guantes</span></li>' +
          '<li class="ppe-item"><i class="ph ph-sneaker" aria-hidden="true"></i><span>Calzado</span></li>' +
        '</ul>' +
        list([
          li('check', 'Bata blanca abotonada (algodón, preferentemente).'),
          li('check', 'Lentes de seguridad (protección ocular).'),
          li('check', 'Guantes de nitrilo o látex, según la práctica.'),
          li('check', 'Calzado completamente cerrado.')
        ])
    },

    autorizacion: {
      title: 'Sin autorización',
      icon: 'prohibit',
      tone: 'red',
      content:
        '<div class="art-center"><span class="alert-orb" aria-hidden="true"><i class="ph-fill ph-warning-circle"></i></span></div>' +
        callout('danger', 'warning', 'Restricción estricta') +
        '<p>Queda <strong>estrictamente prohibido</strong> manipular materiales, reactivos químicos o equipos de cristal sin la autorización expresa y la supervisión del profesor.</p>' +
        '<p>Cualquier acceso al área de almacén de reactivos debe estar avalado por el personal responsable del laboratorio.</p>'
    },

    disciplina: {
      title: 'Instrucciones y disciplina',
      icon: 'chalkboard-teacher',
      tone: 'violet',
      content:
        '<p>Seguir las instrucciones es vital para la integridad de todos los alumnos y del personal docente en el laboratorio.</p>' +
        quote('<strong>Competencia genérica 1.5</strong>Asume las consecuencias de sus comportamientos y decisiones.') +
        quote('<strong>Competencia disciplinar 14</strong>Aplica normas de seguridad en el manejo de sustancias, instrumentos y equipo en la realización de actividades de su vida cotidiana.')
    },

    alimentos: {
      title: 'Prohibido alimentos',
      icon: 'fork-knife',
      tone: 'amber',
      content:
        '<div class="art-center art-center--gap">' +
          noSign('hamburger', 'Prohibido comer') +
          noSign('coffee', 'Prohibido beber') +
          noSign('cigarette', 'Prohibido fumar') +
        '</div>' +
        callout('warn', 'skull', 'Cero tolerancia') +
        '<p>No fumes, no comas ni bebas ningún tipo de líquido dentro de las instalaciones del laboratorio escolar.</p>' +
        '<p><strong>¿Por qué?</strong> Esta medida es indispensable para evitar la contaminación cruzada o la ingestión accidental de compuestos tóxicos o vapores residuales adheridos a los alimentos.</p>'
    },

    limpieza: {
      title: 'Orden y limpieza',
      icon: 'broom',
      tone: 'green',
      content:
        '<ol class="timeline">' +
          '<li><span class="timeline__dot" aria-hidden="true"><i class="ph ph-spray-bottle"></i></span><div><strong>Antes de iniciar</strong><p>Asegúrate de que tu mesa y tu material estén impecables.</p></div></li>' +
          '<li><span class="timeline__dot" aria-hidden="true"><i class="ph ph-hand-soap"></i></span><div><strong>Durante la práctica</strong><p>Mantén tu área de trabajo despejada. No acumules mochilas ni basura.</p></div></li>' +
          '<li><span class="timeline__dot" aria-hidden="true"><i class="ph ph-trash"></i></span><div><strong>Al terminar</strong><p>Limpia la zona, lava el instrumental y asegúrate de no dejar residuos experimentales.</p></div></li>' +
        '</ol>'
    },

    accidentes: {
      title: 'En caso de accidente',
      icon: 'first-aid-kit',
      tone: 'rose',
      content:
        '<div class="emergency" aria-hidden="true">' +
          '<div class="emergency__unit"><i class="ph ph-shower"></i><span class="drops"><i></i><i></i><i></i><i></i></span><small>Regadera</small></div>' +
          '<div class="emergency__unit"><i class="ph ph-eye"></i><span class="drops drops--side"><i></i><i></i><i></i></span><small>Lavaojos</small></div>' +
        '</div>' +
        '<p>La rapidez de reacción es fundamental ante un derrame o una salpicadura.</p>' +
        callout('danger', 'megaphone', 'Avisa de inmediato al profesor a cargo. No intentes ocultar el incidente.', true) +
        list([
          li('shower', '<strong>Regadera de seguridad:</strong> conoce su ubicación para una descontaminación corporal rápida.'),
          li('eyedropper', '<strong>Lavaojos de emergencia:</strong> úsalo mínimo 15 minutos en caso de contacto ocular.')
        ])
    },

    colores: {
      title: 'Código de colores',
      icon: 'paint-bucket',
      tone: 'slate',
      content:
        callout('danger', 'skull', 'Regla de oro: nunca almacenes por orden alfabético.') +
        '<div class="shelf">' +
          '<div class="rack" role="group" aria-label="Estante de reactivos. Elige un frasco">' +
            '<div class="rack__shelf">' +
              '<button type="button" class="flask flask--verde" data-shelf="verde" aria-label="Frasco verde"></button>' +
              '<button type="button" class="flask flask--verde" data-shelf="verde" aria-label="Frasco verde"></button>' +
              '<button type="button" class="flask flask--azul" data-shelf="azul" aria-label="Frasco azul"></button>' +
            '</div>' +
            '<div class="rack__shelf">' +
              '<button type="button" class="flask flask--amarillo" data-shelf="amarillo" aria-label="Frasco amarillo"></button>' +
              '<span class="rack__gap" aria-hidden="true"></span>' +
              '<button type="button" class="flask flask--blanco" data-shelf="blanco" aria-label="Frasco blanco"></button>' +
              '<button type="button" class="flask flask--rayas" data-shelf="rayas" aria-label="Frasco con rayas"></button>' +
            '</div>' +
            '<div class="rack__shelf rack__shelf--floor">' +
              '<button type="button" class="flask flask--rojo" data-shelf="rojo" aria-label="Frasco rojo"></button>' +
              '<button type="button" class="flask flask--rojo" data-shelf="rojo" aria-label="Frasco rojo"></button>' +
              '<span class="rack__note">Ácidos al piso</span>' +
            '</div>' +
          '</div>' +
          '<div class="shelf-info" id="shelfInfo" aria-live="polite">' +
            '<p class="shelf-info__title"><i class="ph ph-hand-pointing" aria-hidden="true"></i> Toca un frasco</p>' +
            '<p>Selecciona un reactivo del estante para ver las características de su código de color.</p>' +
          '</div>' +
        '</div>' +
        '<h3 class="sheet__h3">Tabla de clasificación</h3>' +
        '<ul class="color-legend">' +
          '<li><span class="swatch swatch--blanco">Blanco</span><span>Corrosivo. Nocivo para ojos y piel. Separado de combustibles e inflamables.</span></li>' +
          '<li><span class="swatch swatch--amarillo">Amarillo</span><span>Reactivo u oxidante. Reacciona con agua o aire. Separado de inflamables.</span></li>' +
          '<li><span class="swatch swatch--rojo">Rojo</span><span>Inflamable. Almacenar sólo con otras sustancias inflamables.</span></li>' +
          '<li><span class="swatch swatch--azul">Azul</span><span>Tóxico. Riesgo a la salud si se ingiere o inhala. Área segura.</span></li>' +
          '<li><span class="swatch swatch--verde">Verde / Gris</span><span>Riesgo moderado. Almacenamiento general.</span></li>' +
          '<li><span class="swatch swatch--rayas">Rayas</span><span>Incompatible con los de su mismo color. Almacenar separado.</span></li>' +
        '</ul>'
    },

    estanteria: {
      title: 'Reglas de estantería',
      icon: 'rows',
      tone: 'indigo',
      content:
        '<div class="rack-diagram" aria-label="Distribución por niveles">' +
          '<div class="rack-diagram__level"><i class="ph ph-package" aria-hidden="true"></i> Menores de 500 ml y material ligero</div>' +
          '<div class="rack-diagram__level"><i class="ph ph-test-tube" aria-hidden="true"></i> Reactivos de uso general (verde / azul)</div>' +
          '<div class="rack-diagram__level rack-diagram__level--floor"><i class="ph ph-flask" aria-hidden="true"></i> Mayores de 500 ml y ácidos al piso</div>' +
        '</div>' +
        list([
          li('arrow-down', '<strong>Recipientes grandes abajo:</strong> no coloques en estantes elevados recipientes mayores a medio litro.'),
          li('test-tube', '<strong>Ácidos al piso:</strong> los ácidos fuertes siempre van al nivel del piso.'),
          li('stack', '<strong>Separación estratégica:</strong> rojo, blanco y amarillo siempre en estantes separados.'),
          li('wrench', '<strong>Fijación obligatoria:</strong> todos los estantes deben estar sujetos a la pared.')
        ])
    },

    senaletica: {
      title: 'Señalética y áreas',
      icon: 'signpost',
      tone: 'teal',
      content:
        '<p>Es preponderante colocar señalética de advertencia, precaución y obligación en puntos clave, con apoyo en la normatividad oficial.</p>' +
        list([
          li('map-trifold', '<strong>Áreas delimitadas:</strong> el área de materiales debe estar claramente separada del área de reactivos químicos.'),
          li('drop', '<strong>Instalaciones vitales:</strong> tarjas funcionales, regadera de seguridad y lavaojos identificados.'),
          li('fire', '<strong>Gas:</strong> instalación en perfecto estado con llaves de paso señalizadas.'),
          li('book-bookmark', '<strong>Normas aplicables:</strong> señalética conforme a los estándares de la STPS y las NOM vigentes.')
        ])
    },

    carpeta1: {
      title: 'Carpeta 1 · Operatividad',
      icon: 'folder-open',
      tone: 'amber',
      content:
        folder(1, 'amber') +
        quote('El Manual de Operatividad es el eje central para el funcionamiento diario del laboratorio del plantel.') +
        list([
          li('book', 'Manual de Operatividad del Laboratorio.'),
          li('flow-arrow', 'Diagrama de flujo detallado del manejo de residuos.'),
          li('flask', 'Manejo y clasificación general de reactivos químicos.'),
          li('funnel', 'Pasos específicos para neutralizar residuos.'),
          li('map-pin', 'Ubicación y características del pozo de absorción.')
        ])
    },

    carpeta2: {
      title: 'Carpeta 2 · Seguridad (HDS)',
      icon: 'folder-open',
      tone: 'red',
      content:
        folder(2, 'red') +
        '<p>En caso de emergencia médica o química, esta es la primera carpeta que debe consultarse.</p>' +
        list([
          li('archive', '<strong>Inventario de reactivos:</strong> lista actualizada de todas las sustancias existentes.'),
          li('file-text', '<strong>Hojas de Datos de Seguridad (HDS):</strong> completas para cada reactivo, con el rombo NFPA y los pictogramas SGA correspondientes.')
        ])
    },

    carpeta3: {
      title: 'Carpeta 3 · Mantenimiento',
      icon: 'folder-open',
      tone: 'blue',
      content:
        folder(3, 'blue') +
        '<p>Lleva el control físico e histórico del equipo de laboratorio y de su vida útil.</p>' +
        list([
          li('clipboard-text', 'Programa y bitácora de mantenimiento preventivo y correctivo.'),
          li('pencil-simple-line', 'Bitácora de uso general del laboratorio (firmas de ingreso y prácticas).'),
          li('microscope', 'Inventario de materiales y equipo físico.'),
          li('book-open', 'Manuales o instructivos de fábrica del equipo.')
        ])
    },

    etiquetas: {
      title: 'Re-etiquetado obligatorio',
      icon: 'tag',
      tone: 'green',
      content:
        '<p>Los frascos con etiquetas viejas o poco legibles deben re-etiquetarse con los datos de las HDS. Esta es la estructura requerida:</p>' +
        '<article class="label-mockup" aria-label="Ejemplo de etiqueta">' +
          '<header class="label-mockup__head"><strong>Ácido clorhídrico</strong><span class="mono">HCl</span></header>' +
          '<dl class="label-mockup__grid">' +
            '<div><dt>Marca / proveedor</dt><dd>Fermont</dd></div>' +
            '<div><dt>Lote / caducidad</dt><dd class="mono">L-492 / 2027</dd></div>' +
            '<div><dt>Código de color</dt><dd><span class="swatch swatch--blanco swatch--sm">Blanco (piso)</span></dd></div>' +
            '<div><dt>Contenido en existencia</dt><dd class="mono">~ 450 ml</dd></div>' +
            '<div class="label-mockup__full"><dt>Seguridad</dt><dd>SGA corrosivo · NFPA <span class="mono">3-0-1-COR</span></dd></div>' +
            '<div><dt>Responsable</dt><dd>Docente titular</dd></div>' +
            '<div><dt>Fecha</dt><dd class="mono">20/09/2026</dd></div>' +
          '</dl>' +
        '</article>' +
        callout('warn', 'info', 'Si hay frascos con caducidad expirada, aíslalos y anota “Reactivo caduco” en la columna de observaciones del inventario.')
    },

    normativa: {
      title: 'Normatividad ambiental',
      icon: 'leaf',
      tone: 'green',
      content:
        quote('El cuidado del medio ambiente es una responsabilidad obligatoria en la operación experimental.') +
        list([
          li('gavel', 'Cumplir con el <strong>Manual de procedimientos para el manejo de desechos químicos in situ</strong>.'),
          li('seal-check', 'Sujeto a visita y aprobación de la <strong>SEMARNAT</strong>.'),
          li('prohibit', 'Ningún químico puro ni mezcla tóxica sin neutralizar puede verterse en tarjas comunes.')
        ])
    },

    neutralizacion: {
      title: 'Neutralización in situ',
      icon: 'scales',
      tone: 'blue',
      content:
        '<p>Antes de desechar cualquier sustancia resultante de una práctica, debe estabilizarse.</p>' +
        '<div class="phmeter" role="img" aria-label="Escala de pH: neutralizar hasta pH 7">' +
          '<div class="phmeter__bar"><span class="phmeter__mark"></span></div>' +
          '<div class="phmeter__labels mono"><span>0 · ácido</span><span>7 · neutro</span><span>14 · básico</span></div>' +
        '</div>' +
        list([
          li('book', 'Consulta los <strong>pasos para neutralizar residuos</strong> descritos en la Carpeta 1.'),
          li('scales', 'Ajusta el pH de soluciones ácidas y básicas hasta un punto neutro (pH ~7) antes de desecharlas al pozo.')
        ])
    },

    pozo: {
      title: 'Pozo de absorción',
      icon: 'waves',
      tone: 'amber',
      content:
        callout('warn', 'warning', 'Destino final de los residuos', true) +
        '<p>Es indispensable conocer la ubicación exacta y las características estructurales del <strong>pozo de absorción</strong> del plantel.</p>' +
        '<p>Asegúrate de que los residuos vertidos en este pozo hayan pasado antes por el protocolo completo de neutralización in situ, para evitar la contaminación de los mantos freáticos.</p>'
    }
  };

  var SHELF = {
    blanco:   { title: 'Blanco · corrosivo', text: 'Nocivo para mucosas y piel. Almacenar separado de combustibles e inflamables. Los ácidos siempre van al nivel del piso.' },
    amarillo: { title: 'Amarillo · reactivo / oxidante', text: 'Reacciona violentamente con agua o aire. Almacenar separado de inflamables.' },
    rojo:     { title: 'Rojo · inflamable', text: 'Almacenar por separado, sólo con otras sustancias inflamables.' },
    azul:     { title: 'Azul · tóxico', text: 'Riesgo a la salud si se ingiere o inhala. Puede ir en estantes intermedios.' },
    verde:    { title: 'Verde · riesgo moderado', text: 'Almacenamiento general. Puede usarse como separador físico de otros colores.' },
    rayas:    { title: 'Rayas · incompatibles', text: 'Incompatible con reactivos de su mismo color. Requiere almacenamiento aislado.' }
  };

  window.CECYTE_SAFETY = SAFETY;
  window.CECYTE_SHELF = SHELF;
})();
