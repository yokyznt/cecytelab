/* ==========================================================================
   CECyTE Lab - Datos iniciales (prácticas)
   Se usan solo si no hay datos guardados en localStorage (claves cecyte_db_*).
   El inventario (materiales y reactivos) vive en js/inventario.js.
   ========================================================================== */

window.CECYTE_INITIAL_DB = {
  practicas: [
    { prac: "Ensaye a la flama", mat: "Química II", fecha: "2026-09-10", rec: "Cloruro de estroncio, Sales", obs: "Identificación de iones metálicos" },
    { prac: "Combustión del Magnesio", mat: "Química II", fecha: "2026-09-15", rec: "Magnesio cinta, Mechero, Cápsula", obs: "Reacción con Oxígeno" },
    { prac: "Separación de mezclas", mat: "Química I", fecha: "2026-09-20", rec: "Papel filtro, Embudo, Matraz", obs: "Filtración simple" },
    { prac: "Tensión superficial", mat: "Física II", fecha: "2026-10-01", rec: "Vasos de precipitado, Agua", obs: "Comprobación de fuerzas" },
    { prac: "Circuito en serie", mat: "Física II", fecha: "2026-10-05", rec: "Focos 2.2, Caimanes, Pila", obs: "Armado básico" }
  ]
};


/* --------------------------------------------------------------------------
   Actualizaciones del inventario para datos YA guardados en el navegador.
   Cada revisión se aplica una sola vez (clave cecyte_data_rev):
   - add:   agrega el artículo (por id de js/inventario.js) si no existe otro
            con el mismo nombre.
   - patch: cambia un campo solo si aún tiene el valor anterior
            (no pisa ediciones hechas por el administrador).
   Ejemplo: { rev: 1, note: "...", add: { inventario: ["I254"] },
              patch: [{ table: "inventario", id: "I010", field: "obs", from: "a", to: "b" }] }
   -------------------------------------------------------------------------- */
window.CECYTE_DATA_UPDATES = [];
