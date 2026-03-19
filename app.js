import { logoutUser } from "./auth.js";

const STORAGE_KEY = "ugel_practicantes_asistencia_v2";
const STUDENTS_KEY = "ugel_practicantes_lista_v2";

const ESTADOS = {
  ASISTIO: "ASISTIO",
  TARDE: "TARDE",
  FALTA: "FALTA",
  REGULARIZADO: "REGULARIZADO"
};

const DEFAULT_PRACTICANTE = "Lenin Bryan Payano Torres";

let registros = [];
let practicantes = [];
let editingId = null;
let appStarted = false;
let clockInterval = null;
let alertTimeout = null;

const navItems = document.querySelectorAll(".nav-item");
const sections = document.querySelectorAll(".section");

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const menuToggle = document.getElementById("menuToggle");

const studentSelect = document.getElementById("studentSelect");
const studentSelectTop = document.getElementById("studentSelectTop");
const sidebarStudent = document.getElementById("sidebarStudent");

const fechaInput = document.getElementById("fechaInput");
const turnoInput = document.getElementById("turnoInput");
const entradaInput = document.getElementById("entradaInput");
const salidaInput = document.getElementById("salidaInput");
const estadoInput = document.getElementById("estadoInput");
const observacionInput = document.getElementById("observacionInput");

const tablaBody = document.getElementById("tablaBody");
const buscarInput = document.getElementById("buscarInput");
const alertBox = document.getElementById("alertBox");

const statRegistros = document.getElementById("statRegistros");
const statHoras = document.getElementById("statHoras");
const statFaltas = document.getElementById("statFaltas");
const statRegularizaciones = document.getElementById("statRegularizaciones");
const estadoHoyBox = document.getElementById("estadoHoyBox");
const ultimoMovimiento = document.getElementById("ultimoMovimiento");

const studentDialog = document.getElementById("studentDialog");
const studentForm = document.getElementById("studentForm");
const nuevoStudentBtn = document.getElementById("nuevoStudentBtn");
const nuevoStudentBtn2 = document.getElementById("nuevoStudentBtn2");
const cancelStudentBtn = document.getElementById("cancelStudentBtn");
const nuevoStudentInput = document.getElementById("nuevoStudentInput");
const studentList = document.getElementById("studentList");

const noteDialog = document.getElementById("noteDialog");
const noteDialogText = document.getElementById("noteDialogText");
const closeNoteBtn = document.getElementById("closeNoteBtn");

const duplicateDialog = document.getElementById("duplicateDialog");
const duplicateText = document.getElementById("duplicateText");
const closeDuplicateBtn = document.getElementById("closeDuplicateBtn");

const registrarBtn = document.getElementById("registrarBtn");
const regularizarBtn = document.getElementById("regularizarBtn");
const marcarFaltaBtn = document.getElementById("marcarFaltaBtn");
const limpiarFormBtn = document.getElementById("limpiarFormBtn");
const logoutBtn = document.getElementById("logoutBtn");

const registroMultipleBtn = document.getElementById("registroMultipleBtn");
const bulkDialog = document.getElementById("bulkDialog");
const bulkFechaInicio = document.getElementById("bulkFechaInicio");
const bulkFechaFin = document.getElementById("bulkFechaFin");
const bulkTurno = document.getElementById("bulkTurno");
const bulkEntrada = document.getElementById("bulkEntrada");
const bulkSalida = document.getElementById("bulkSalida");
const bulkEstado = document.getElementById("bulkEstado");
const bulkObservacion = document.getElementById("bulkObservacion");
const cancelBulkBtn = document.getElementById("cancelBulkBtn");
const guardarBulkBtn = document.getElementById("guardarBulkBtn");

bindStaticEvents();

window.addEventListener("user-authenticated", () => {
  init();
});

function bindStaticEvents() {
  registrarBtn?.addEventListener("click", guardarRegistro);
  regularizarBtn?.addEventListener("click", regularizarRegistro);
  marcarFaltaBtn?.addEventListener("click", marcarFalta);
  limpiarFormBtn?.addEventListener("click", () => limpiarFormulario(true));

  buscarInput?.addEventListener("input", renderTabla);

  studentSelect?.addEventListener("change", sincronizarPracticante);
  studentSelectTop?.addEventListener("change", sincronizarPracticanteDesdeTop);

  nuevoStudentBtn?.addEventListener("click", () => studentDialog?.showModal());
  nuevoStudentBtn2?.addEventListener("click", () => studentDialog?.showModal());
  cancelStudentBtn?.addEventListener("click", () => studentDialog?.close());

  closeNoteBtn?.addEventListener("click", () => noteDialog?.close());
  closeDuplicateBtn?.addEventListener("click", () => duplicateDialog?.close());

  studentForm?.addEventListener("submit", onStudentSubmit);

  menuToggle?.addEventListener("click", abrirMenu);
  overlay?.addEventListener("click", cerrarMenu);

  navItems.forEach((btn) => {
    btn.addEventListener("click", () => activarSeccion(btn.dataset.section));
  });

  registroMultipleBtn?.addEventListener("click", abrirRegistroMultiple);
  cancelBulkBtn?.addEventListener("click", () => bulkDialog?.close());
  guardarBulkBtn?.addEventListener("click", guardarRegistroMultiple);

  logoutBtn?.addEventListener("click", async () => {
    await logoutUser();
  });
}

function init() {
  if (appStarted) return;
  appStarted = true;

  cargarPracticantes();
  cargarRegistros();
  renderPracticanteSelects(practicantes[0] || "");
  fechaInput.value = getTodayISO();
  limpiarFormulario(false);
  updateClock();

  if (!clockInterval) {
    clockInterval = setInterval(updateClock, 1000);
  }

  renderAll();
}

function abrirMenu() {
  sidebar?.classList.add("open");
  overlay?.classList.add("show");
}

function cerrarMenu() {
  sidebar?.classList.remove("open");
  overlay?.classList.remove("show");
}

function activarSeccion(target) {
  if (!target) return;

  navItems.forEach((n) => {
    n.classList.remove("active");
    n.removeAttribute("aria-current");
  });

  sections.forEach((s) => s.classList.remove("active"));

  const btn = document.querySelector(`[data-section="${target}"]`);
  const section = document.getElementById(target);

  btn?.classList.add("active");
  btn?.setAttribute("aria-current", "page");
  section?.classList.add("active");

  cerrarMenu();
}

function loadFromStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function guardarPracticantes() {
  saveToStorage(STUDENTS_KEY, practicantes);
}

function cargarPracticantes() {
  practicantes = loadFromStorage(STUDENTS_KEY, [DEFAULT_PRACTICANTE]);

  if (!Array.isArray(practicantes) || !practicantes.length) {
    practicantes = [DEFAULT_PRACTICANTE];
  }
}

function cargarRegistros() {
  registros = loadFromStorage(STORAGE_KEY, []);

  if (!Array.isArray(registros)) {
    registros = [];
  }

  registros = registros.map((r) => {
    const estado = r?.estado || ESTADOS.ASISTIO;
    const turno = r?.turno || "mañana";
    const entrada = r?.entrada || "";
    const salida = r?.salida || "";
    const minutos = estado === ESTADOS.FALTA ? "" : calcMinutes(entrada, salida, turno);

    return {
      id: r?.id ?? `${Date.now()}_${Math.random()}`,
      practicante: r?.practicante || "",
      fecha: r?.fecha || "",
      turno,
      entrada,
      salida,
      horas: minutos,
      estado,
      observacion: r?.observacion || "",
      regularizado: Boolean(r?.regularizado || estado === ESTADOS.REGULARIZADO)
    };
  });

  guardarRegistros();
}

function guardarRegistros() {
  saveToStorage(STORAGE_KEY, registros);
}

function onStudentSubmit(e) {
  e.preventDefault();

  const nombre = nuevoStudentInput.value.trim();

  if (!nombre) {
    mostrarAlerta("Escribe el nombre del practicante.", "error");
    return;
  }

  if (practicantes.includes(nombre)) {
    mostrarAlerta("Ese practicante ya existe.", "error");
    return;
  }

  practicantes.push(nombre);
  guardarPracticantes();
  renderPracticanteSelects(nombre);
  renderPracticantes();
  renderDashboard();

  mostrarAlerta("Practicante agregado correctamente.", "success");
  nuevoStudentInput.value = "";
  studentDialog.close();
}

function renderPracticanteSelects(selected = "") {
  const options = practicantes
    .map((nombre) => `<option value="${escapeHtml(nombre)}">${escapeHtml(nombre)}</option>`)
    .join("");

  studentSelect.innerHTML = options;
  studentSelectTop.innerHTML = options;

  const valor = selected || practicantes[0] || "";
  studentSelect.value = valor;
  studentSelectTop.value = valor;
  sidebarStudent.textContent = valor || "No seleccionado";
}

function renderPracticantes() {
  if (!practicantes.length) {
    studentList.innerHTML = `<div class="empty-cell">No hay practicantes registrados.</div>`;
    return;
  }

  studentList.innerHTML = practicantes
    .map((nombre) => {
      const safeName = escapeQuotes(nombre);
      const safeHtmlName = escapeHtml(nombre);

      return `
        <div class="student-item">
          <div class="student-name">${safeHtmlName}</div>
          <div class="btn-group">
            <button
              class="btn btn-outline"
              type="button"
              onclick="seleccionarPracticante('${safeName}')"
              aria-label="Seleccionar practicante ${safeHtmlName}"
            >
              Seleccionar
            </button>
            <button
              class="btn btn-danger"
              type="button"
              onclick="eliminarPracticante('${safeName}')"
              aria-label="Eliminar practicante ${safeHtmlName}"
            >
              Eliminar
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

function escapeQuotes(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function seleccionarPracticante(nombre) {
  studentSelect.value = nombre;
  studentSelectTop.value = nombre;
  sidebarStudent.textContent = nombre;
  renderAll();
  mostrarAlerta("Practicante seleccionado.", "success");
}

function eliminarPracticante(nombre) {
  const confirmar = window.confirm(`¿Eliminar a ${nombre}? También se borrarán sus registros.`);
  if (!confirmar) return;

  practicantes = practicantes.filter((p) => p !== nombre);
  registros = registros.filter((r) => r.practicante !== nombre);

  guardarPracticantes();
  guardarRegistros();

  if (!practicantes.length) {
    practicantes = [DEFAULT_PRACTICANTE];
    guardarPracticantes();
  }

  editingId = null;
  renderPracticanteSelects(practicantes[0]);
  renderAll();

  mostrarAlerta("Practicante eliminado correctamente.", "success");
}

window.seleccionarPracticante = seleccionarPracticante;
window.eliminarPracticante = eliminarPracticante;

function sincronizarPracticante() {
  studentSelectTop.value = studentSelect.value;
  sidebarStudent.textContent = studentSelect.value || "No seleccionado";
  renderAll();
}

function sincronizarPracticanteDesdeTop() {
  studentSelect.value = studentSelectTop.value;
  sidebarStudent.textContent = studentSelectTop.value || "No seleccionado";
  renderAll();
}

function getSelectedPracticante() {
  return studentSelect.value || "";
}

function getTodayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseTimeToParts(hora) {
  if (!hora) return null;

  const parts = hora.split(":").map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const s = parts[2] ?? 0;

  if ([h, m, s].some(Number.isNaN)) return null;

  return { h, m, s };
}

function calcMinutes(entrada, salida, turno) {
  if (!entrada || !salida) return "";

  const entradaParts = parseTimeToParts(entrada);
  const salidaParts = parseTimeToParts(salida);

  if (!entradaParts || !salidaParts) return "";

  let { h: hEntrada, m: mEntrada } = entradaParts;
  let { h: hSalida, m: mSalida } = salidaParts;

  if (turno === "tarde") {
    if (hEntrada < 12) hEntrada += 12;
    if (hSalida < 12) hSalida += 12;
  }

  if (turno === "mañana") {
    const entradaMinTemp = hEntrada * 60 + mEntrada;
    const salidaMinTemp = hSalida * 60 + mSalida;

    if (salidaMinTemp < entradaMinTemp) {
      hSalida += 12;
    }
  }

  const entradaMin = hEntrada * 60 + mEntrada;
  const salidaMin = hSalida * 60 + mSalida;
  const diff = salidaMin - entradaMin;

  if (diff <= 0) return "0";

  return String(diff);
}

function getMinutosNumericos(registro) {
  if (!registro || registro.estado === ESTADOS.FALTA) return 0;

  const minutosGuardados = Number(registro.horas);
  if (!Number.isNaN(minutosGuardados) && minutosGuardados >= 0) {
    return minutosGuardados;
  }

  const minutosRecalculados = Number(
    calcMinutes(registro.entrada, registro.salida, registro.turno)
  );

  return Number.isNaN(minutosRecalculados) ? 0 : minutosRecalculados;
}

function formatMinutes(minutos) {
  const total = Number(minutos);

  if (Number.isNaN(total) || total <= 0) {
    return "0 h 0 min";
  }

  const horas = Math.floor(total / 60);
  const mins = total % 60;

  return `${horas} h ${mins} min`;
}

function existeFechaTurno(practicante, fecha, turno, excludeId = null) {
  return registros.some((r) => {
    const mismoRegistro = excludeId !== null && String(r.id) === String(excludeId);

    return (
      !mismoRegistro &&
      r.practicante === practicante &&
      r.fecha === fecha &&
      r.turno === turno
    );
  });
}

function buildRegistro(payload) {
  const minutos =
    payload.estado === ESTADOS.FALTA
      ? ""
      : calcMinutes(payload.entrada, payload.salida, payload.turno);

  return {
    id: payload.id ?? `${Date.now()}_${Math.random()}`,
    practicante: payload.practicante,
    fecha: payload.fecha,
    turno: payload.turno,
    entrada: payload.entrada,
    salida: payload.salida,
    horas: minutos,
    estado: payload.estado,
    observacion: payload.observacion || "",
    regularizado: !!payload.regularizado
  };
}

function guardarRegistro() {
  const practicante = getSelectedPracticante();

  if (!practicante) {
    mostrarAlerta("Selecciona un practicante.", "error");
    return;
  }

  if (!fechaInput.value || !turnoInput.value) {
    mostrarAlerta("Completa fecha y turno.", "error");
    return;
  }

  if (editingId !== null) {
    actualizarRegistroExistente();
    return;
  }

  if (existeFechaTurno(practicante, fechaInput.value, turnoInput.value)) {
    duplicateText.textContent = `👁️ Ya está marcada la asistencia con esta fecha y turno para ${practicante}.`;
    duplicateDialog.showModal();
    return;
  }

  const payload = buildRegistro({
    practicante,
    fecha: fechaInput.value,
    turno: turnoInput.value,
    entrada: entradaInput.value,
    salida: salidaInput.value,
    estado: estadoInput.value,
    observacion: observacionInput.value,
    regularizado: estadoInput.value === ESTADOS.REGULARIZADO
  });

  registros.unshift(payload);
  guardarRegistros();
  limpiarFormulario(false);
  mostrarAlerta("Registro guardado correctamente.", "success");
  renderAll();
}

function regularizarRegistro() {
  const practicante = getSelectedPracticante();

  if (!practicante) {
    mostrarAlerta("Selecciona un practicante.", "error");
    return;
  }

  if (!fechaInput.value || !turnoInput.value) {
    mostrarAlerta("Completa fecha y turno para regularizar.", "error");
    return;
  }

  if (editingId !== null) {
    actualizarRegistroExistente(ESTADOS.REGULARIZADO, true);
    return;
  }

  if (existeFechaTurno(practicante, fechaInput.value, turnoInput.value)) {
    duplicateText.textContent = `👁️ Ya está marcada la asistencia con esta fecha y turno para ${practicante}.`;
    duplicateDialog.showModal();
    return;
  }

  const payload = buildRegistro({
    practicante,
    fecha: fechaInput.value,
    turno: turnoInput.value,
    entrada: entradaInput.value,
    salida: salidaInput.value,
    estado: ESTADOS.REGULARIZADO,
    observacion: observacionInput.value || "Regularización manual",
    regularizado: true
  });

  registros.unshift(payload);
  guardarRegistros();
  limpiarFormulario(false);
  mostrarAlerta("Regularización registrada correctamente.", "success");
  renderAll();
}

function marcarFalta() {
  const practicante = getSelectedPracticante();

  if (!practicante) {
    mostrarAlerta("Selecciona un practicante.", "error");
    return;
  }

  if (!fechaInput.value || !turnoInput.value) {
    mostrarAlerta("Selecciona fecha y turno para marcar la falta.", "error");
    return;
  }

  if (editingId !== null) {
    actualizarRegistroExistente(ESTADOS.FALTA);
    return;
  }

  if (existeFechaTurno(practicante, fechaInput.value, turnoInput.value)) {
    duplicateText.textContent = `👁️ Ya está marcada la asistencia con esta fecha y turno para ${practicante}.`;
    duplicateDialog.showModal();
    return;
  }

  const payload = buildRegistro({
    practicante,
    fecha: fechaInput.value,
    turno: turnoInput.value,
    entrada: "",
    salida: "",
    estado: ESTADOS.FALTA,
    observacion: observacionInput.value || "Falta no permitida",
    regularizado: false
  });

  registros.unshift(payload);
  guardarRegistros();
  limpiarFormulario(false);
  mostrarAlerta("Falta registrada.", "success");
  renderAll();
}

function actualizarRegistroExistente(modoEstado = null, forzarRegularizado = false) {
  const index = registros.findIndex((r) => String(r.id) === String(editingId));

  if (index === -1) {
    mostrarAlerta("No se encontró el registro a actualizar.", "error");
    return;
  }

  const practicante = getSelectedPracticante();
  const fecha = fechaInput.value;
  const turno = turnoInput.value;

  if (!practicante) {
    mostrarAlerta("Selecciona un practicante.", "error");
    return;
  }

  if (!fecha || !turno) {
    mostrarAlerta("Completa fecha y turno.", "error");
    return;
  }

  if (existeFechaTurno(practicante, fecha, turno, editingId)) {
    duplicateText.textContent = `👁️ Ya está marcada la asistencia con esta fecha y turno para ${practicante}.`;
    duplicateDialog.showModal();
    return;
  }

  const itemAnterior = registros[index];

  let nuevoEstado = estadoInput.value;
  let esRegularizado = false;
  let nuevaEntrada = entradaInput.value;
  let nuevaSalida = salidaInput.value;
  let nuevosMinutos = calcMinutes(nuevaEntrada, nuevaSalida, turno);

  if (modoEstado === ESTADOS.REGULARIZADO) {
    nuevoEstado = ESTADOS.REGULARIZADO;
    esRegularizado = true;
  } else if (modoEstado === ESTADOS.FALTA) {
    nuevoEstado = ESTADOS.FALTA;
    esRegularizado = false;
    nuevaEntrada = "";
    nuevaSalida = "";
    nuevosMinutos = "";
  } else {
    nuevoEstado = estadoInput.value;
    esRegularizado = forzarRegularizado || nuevoEstado === ESTADOS.REGULARIZADO;
  }

  registros[index] = {
    ...itemAnterior,
    practicante,
    fecha,
    turno,
    entrada: nuevaEntrada,
    salida: nuevaSalida,
    horas: nuevosMinutos,
    estado: nuevoEstado,
    observacion: observacionInput.value || "",
    regularizado: esRegularizado
  };

  guardarRegistros();
  limpiarFormulario(false);
  renderAll();
  mostrarAlerta("Registro actualizado correctamente.", "success");
}

function eliminarRegistro(id) {
  const item = registros.find((r) => String(r.id) === String(id));
  if (!item) {
    mostrarAlerta("No se encontró el registro.", "error");
    return;
  }

  const confirmar = window.confirm(
    `¿Seguro que quieres eliminar el registro de ${item.practicante} del ${item.fecha} (${item.turno})?`
  );

  if (!confirmar) return;

  registros = registros.filter((r) => String(r.id) !== String(id));
  guardarRegistros();

  if (editingId !== null && String(editingId) === String(id)) {
    limpiarFormulario(false);
  }

  renderAll();
  mostrarAlerta("Registro eliminado correctamente.", "success");
}

function limpiarFormulario(resetFecha = true) {
  if (resetFecha) fechaInput.value = getTodayISO();

  turnoInput.value = "mañana";
  entradaInput.value = "";
  salidaInput.value = "";
  estadoInput.value = ESTADOS.ASISTIO;
  observacionInput.value = "";
  editingId = null;

  registrarBtn.textContent = "Guardar registro";
  regularizarBtn.textContent = "Regularizar";
  marcarFaltaBtn.textContent = "Marcar falta";
}

function abrirRegistroMultiple() {
  const hoy = getTodayISO();

  bulkFechaInicio.value = hoy;
  bulkFechaFin.value = hoy;
  bulkTurno.value = turnoInput?.value || "mañana";
  bulkEntrada.value = entradaInput?.value || "";
  bulkSalida.value = salidaInput?.value || "";
  bulkEstado.value = estadoInput?.value || ESTADOS.ASISTIO;
  bulkObservacion.value = observacionInput?.value || "";

  bulkDialog?.showModal();
}

function getDatesInRange(start, end) {
  const dates = [];
  const current = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);

  while (current <= endDate) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function guardarRegistroMultiple() {
  const practicante = getSelectedPracticante();

  if (!practicante) {
    mostrarAlerta("Selecciona un practicante.", "error");
    return;
  }

  if (!bulkFechaInicio.value || !bulkFechaFin.value) {
    mostrarAlerta("Completa la fecha inicial y final.", "error");
    return;
  }

  if (bulkFechaFin.value < bulkFechaInicio.value) {
    mostrarAlerta("La fecha final no puede ser menor que la inicial.", "error");
    return;
  }

  const fechas = getDatesInRange(bulkFechaInicio.value, bulkFechaFin.value);
  let creados = 0;
  let omitidos = 0;

  for (const fecha of fechas) {
    if (existeFechaTurno(practicante, fecha, bulkTurno.value)) {
      omitidos++;
      continue;
    }

    const esFalta = bulkEstado.value === ESTADOS.FALTA;

    const payload = buildRegistro({
      practicante,
      fecha,
      turno: bulkTurno.value,
      entrada: esFalta ? "" : bulkEntrada.value,
      salida: esFalta ? "" : bulkSalida.value,
      estado: bulkEstado.value,
      observacion: bulkObservacion.value,
      regularizado: bulkEstado.value === ESTADOS.REGULARIZADO
    });

    registros.unshift(payload);
    creados++;
  }

  guardarRegistros();
  renderAll();
  bulkDialog?.close();

  if (creados > 0 && omitidos > 0) {
    mostrarAlerta(
      `Se registraron ${creados} días. ${omitidos} ya existían y fueron omitidos.`,
      "success"
    );
    return;
  }

  if (creados > 0) {
    mostrarAlerta(`Se registraron ${creados} días correctamente.`, "success");
    return;
  }

  mostrarAlerta("No se registró nada porque todas esas fechas ya existían.", "error");
}

function getFilteredRecords() {
  const practicante = getSelectedPracticante();
  const filtro = buscarInput.value.trim().toLowerCase();

  return registros.filter((r) => {
    const sameStudent = r.practicante === practicante;
    const text = `${r.fecha} ${r.turno} ${r.estado} ${r.observacion}`.toLowerCase();
    return sameStudent && (!filtro || text.includes(filtro));
  });
}

function getStateClass(estado) {
  if (estado.includes(ESTADOS.FALTA)) return "state-falta";
  if (estado.includes(ESTADOS.REGULARIZADO)) return "state-regularizado";
  if (estado.includes(ESTADOS.TARDE)) return "state-tarde";
  return "state-normal";
}

function renderTabla() {
  const lista = getFilteredRecords();

  if (!lista.length) {
    tablaBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-cell">No hay registros todavía.</td>
      </tr>
    `;
    return;
  }

  tablaBody.innerHTML = lista
    .map((r) => {
      const estadoSeguro = escapeHtml(r.estado);
      const observacionBtn = r.observacion
        ? `<button class="note-btn" type="button" onclick="verNota('${String(r.id)}')" title="Ver nota" aria-label="Ver nota">👁️</button>`
        : "-";

      return `
        <tr>
          <td>${escapeHtml(r.fecha)}</td>
          <td>${escapeHtml(r.practicante)}</td>
          <td>${escapeHtml(r.turno)}</td>
          <td>${escapeHtml(r.entrada || "-")}</td>
          <td>${escapeHtml(r.salida || "-")}</td>
          <td>${r.horas !== "" ? formatMinutes(r.horas) : "-"}</td>
          <td><span class="state-pill ${getStateClass(r.estado)}">${estadoSeguro}</span></td>
          <td>${observacionBtn}</td>
          <td>
            <button
              class="edit-btn"
              type="button"
              onclick="cargarEnFormulario('${String(r.id)}')"
              title="Editar"
              aria-label="Editar registro"
            >
              ✏️
            </button>
            <button
              class="delete-btn"
              type="button"
              onclick="eliminarRegistro('${String(r.id)}')"
              title="Eliminar"
              aria-label="Eliminar registro"
            >
              🗑️
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function verNota(id) {
  const item = registros.find((r) => String(r.id) === String(id));
  if (!item) return;

  noteDialogText.textContent = item.observacion || "No hay anotación.";
  noteDialog.showModal();
}

function cargarEnFormulario(id) {
  const item = registros.find((r) => String(r.id) === String(id));
  if (!item) return;

  editingId = String(id);

  studentSelect.value = item.practicante;
  studentSelectTop.value = item.practicante;
  sidebarStudent.textContent = item.practicante;

  fechaInput.value = item.fecha;
  turnoInput.value = item.turno;
  entradaInput.value = item.entrada || "";
  salidaInput.value = item.salida || "";
  observacionInput.value = item.observacion || "";

  if (item.estado.includes(ESTADOS.FALTA)) {
    estadoInput.value = ESTADOS.FALTA;
  } else if (item.estado.includes(ESTADOS.REGULARIZADO)) {
    estadoInput.value = ESTADOS.REGULARIZADO;
  } else if (item.estado.includes(ESTADOS.TARDE)) {
    estadoInput.value = ESTADOS.TARDE;
  } else {
    estadoInput.value = ESTADOS.ASISTIO;
  }

  registrarBtn.textContent = "Actualizar registro";
  regularizarBtn.textContent = "Actualizar como regularizado";
  marcarFaltaBtn.textContent = "Actualizar como falta";

  activarSeccion("registro");
}

function renderDashboard() {
  const practicante = getSelectedPracticante();
  const propios = registros.filter((r) => r.practicante === practicante);

  const diasUnicos = new Set(
    propios
      .filter((r) => r.estado !== ESTADOS.FALTA)
      .map((r) => r.fecha)
  );

  const totalMin = propios.reduce((acc, r) => acc + getMinutosNumericos(r), 0);

  statRegistros.textContent = String(diasUnicos.size);
  statHoras.textContent = formatMinutes(totalMin);
  statFaltas.textContent = String(
    propios.filter((r) => r.estado === ESTADOS.FALTA).length
  );
  statRegularizaciones.textContent = String(
    propios.filter((r) => r.regularizado).length
  );

  const hoy = getTodayISO();
  const hoyItems = propios.filter((r) => r.fecha === hoy);

  const manana = hoyItems.find((r) => r.turno === "mañana");
  const tarde = hoyItems.find((r) => r.turno === "tarde");

  estadoHoyBox.innerHTML = `
    <div class="status-item">
      <span class="status-title">Mañana</span>
      <span class="status-value">
        ${
          manana
            ? `${escapeHtml(manana.entrada || "-")} / ${escapeHtml(manana.salida || "-")} / ${escapeHtml(manana.estado)} / ${formatMinutes(manana.horas || 0)}`
            : "Sin registrar"
        }
      </span>
    </div>
    <div class="status-item">
      <span class="status-title">Tarde</span>
      <span class="status-value">
        ${
          tarde
            ? `${escapeHtml(tarde.entrada || "-")} / ${escapeHtml(tarde.salida || "-")} / ${escapeHtml(tarde.estado)} / ${formatMinutes(tarde.horas || 0)}`
            : "Sin registrar"
        }
      </span>
    </div>
  `;

  if (propios.length > 0) {
    const ultimo = propios[0];
    ultimoMovimiento.innerHTML = `
      <strong>${escapeHtml(ultimo.fecha)}</strong><br>
      ${escapeHtml(ultimo.turno)} | Entrada: ${escapeHtml(ultimo.entrada || "-")} | Salida: ${escapeHtml(ultimo.salida || "-")}<br>
      Estado: ${escapeHtml(ultimo.estado)} | Tiempo: ${formatMinutes(ultimo.horas || 0)}<br>
      ${ultimo.observacion ? `Nota: ${escapeHtml(ultimo.observacion)}` : ""}
    `;
  } else {
    ultimoMovimiento.textContent = "No hay movimientos registrados.";
  }
}

function mostrarAlerta(texto, tipo) {
  if (!alertBox) return;

  if (alertTimeout) {
    clearTimeout(alertTimeout);
  }

  alertBox.textContent = texto;
  alertBox.className = `alert ${tipo}`;

  alertTimeout = setTimeout(() => {
    alertBox.className = "alert hidden";
    alertBox.textContent = "";
  }, 3200);
}

function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString("es-PE");
  const date = now.toLocaleDateString("es-PE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const clockTime = document.getElementById("clockTime");
  const clockDate = document.getElementById("clockDate");
  const clockMini = document.getElementById("clockMini");

  if (clockTime) clockTime.textContent = time;
  if (clockDate) clockDate.textContent = date;
  if (clockMini) clockMini.textContent = time;
}

function renderAll() {
  renderDashboard();
  renderTabla();
  renderPracticantes();
}

window.verNota = verNota;
window.cargarEnFormulario = cargarEnFormulario;
window.eliminarRegistro = eliminarRegistro;
