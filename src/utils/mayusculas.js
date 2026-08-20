// Convierte a mayúsculas el valor de un evento de <input>/<textarea> — se usa
// dentro del handleChange genérico de los formularios de OT e Informes
// Técnicos para que el dato quede en mayúscula ya en el estado (y por lo
// tanto en lo que se guarda), no solo visualmente. No toca <select>, <input
// type="date">, <input type="number">, etc. — solo texto libre.
export const valorMayusculas = (e) => {
  const { value, type, tagName } = e.target;
  return (type === "text" || tagName === "TEXTAREA") ? value.toUpperCase() : value;
};
