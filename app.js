"use strict";

// # =====================
// # Estado + Persistencia
// # =====================

const STORAGE_KEY = "malla_interactiva_v1"; // # llave para guardar/cargar en LocalStorage

let state = loadState() ?? defaultState(); // # carga el estado guardado o crea uno por defecto

// # =====================
// # Helpers de UI
// # =====================

const $ = (sel) => document.querySelector(sel); // # atajo para seleccionar elementos
const gridEl = $("#grid"); // # contenedor principal donde se dibujan los semestres
const toastEl = $("#toast"); // # toast para mensajes rápidos

const progressText = $("#progressText"); // # texto % avance
const progressDetail = $("#progressDetail"); // # detalle ramos cumplidos
const creditsText = $("#creditsText"); // # créditos aprobados
const creditsDetail = $("#creditsDetail"); // # texto de créditos

const importDialog = $("#importDialog"); // # modal importar
const importTextarea = $("#importTextarea"); // # textarea JSON

function toast(msg) { // # muestra un mensaje temporal en pantalla
  toastEl.textContent = msg; // # define el texto del toast
  toastEl.classList.add("show"); // # lo hace visible
  setTimeout(() => toastEl.classList.remove("show"), 1800); // # lo oculta luego de 1.8s
}

function uid() { // # genera un id único simple (para semestres y ramos)
  return Math.random().toString(16).slice(2) + Date.now().toString(16); // # aleatorio + timestamp
}

// # =====================
// # Modelo de datos
// # =====================

function defaultState() { // # crea una malla base de ejemplo
  return {
    theme: "dark", // # tema inicial
    semesters: [
      {
        id: uid(),
        name: "Semestre 1",
        courses: [
          { id: uid(), name: "Matemática I", credits: 6, done: false }, // # done = si está cumplido
          { id: uid(), name: "Introducción a la carrera", credits: 4, done: false },
          { id: uid(), name: "Comunicación", credits: 4, done: false },
        ],
      },
      {
        id: uid(),
        name: "Semestre 2",
        courses: [
          { id: uid(), name: "Matemática II", credits: 6, done: false },
          { id: uid(), name: "Fundamentos", credits: 5, done: false },
        ],
      },
    ],
  };
}

function loadState() { // # lee el estado desde LocalStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY); // # obtiene JSON guardado
    if (!raw) return null; // # si no existe, retorna null
    return JSON.parse(raw); // # parsea JSON -> objeto
  } catch {
    return null; // # si falla el parseo, evita romper la app
  }
}

function saveState() { // # guarda el estado actual en LocalStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); // # transforma a JSON y guarda
}

function applyTheme() { // # aplica tema claro/oscuro al documento
  document.documentElement.dataset.theme = state.theme === "light" ? "light" : ""; // # data-theme
}

// # =====================
// # Cálculos de avance
// # =====================

function getAllCourses() { // # obtiene todos los ramos de todos los semestres en una lista
  return state.semesters.flatMap((s) => s.courses); // # flatMap une arrays en uno solo
}

function calcProgress() { // # calcula % cumplido y créditos aprobados
  const courses = getAllCourses(); // # lista total de ramos
  const total = courses.length; // # cantidad total
  const doneCount = courses.filter((c) => !!c.done).length; // # cuenta ramos cumplidos

  const doneCredits = courses // # suma créditos solo de ramos cumplidos
    .filter((c) => !!c.done)
    .reduce((acc, c) => acc + (Number(c.credits) || 0), 0);

  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100); // # porcentaje redondeado

  return { total, doneCount, doneCredits, pct }; // # devuelve el resumen
}

function updateSummary() { // # actualiza las tarjetas de resumen arriba
  const { total, doneCount, doneCredits, pct } = calcProgress(); // # obtiene valores

  progressText.textContent = `${pct}%`; // # muestra % cumplido
  progressDetail.textContent = `${doneCount} de ${total} ramos cumplidos`; // # muestra conteo
  creditsText.textContent = String(doneCredits); // # muestra créditos aprobados
  creditsDetail.textContent = "créditos aprobados"; // # texto fijo
}

// # =====================
// # Render principal
// # =====================

function render() { // # dibuja toda la malla
  applyTheme(); // # aplica tema al render
  gridEl.innerHTML = ""; // # limpia el grid para re-renderizar

  state.semesters.forEach((sem) => { // # recorre semestres
    gridEl.appendChild(renderSemester(sem)); // # agrega cada columna
  });

  updateSummary(); // # actualiza el resumen de avance
  saveState(); // # guarda automáticamente
}

function renderSemester(semester) { // # crea el DOM de un semestre completo
  const wrap = document.createElement("div"); // # contenedor
  wrap.className = "semester"; // # clase visual
  wrap.dataset.semesterId = semester.id; // # id en el DOM

  const header = document.createElement("div"); // # header del semestre
  header.className = "semesterHeader";

  const titleBox = document.createElement("div"); // # caja izquierda del header
  titleBox.className = "semesterTitle";

  const nameInput = document.createElement("input"); // # input editable del nombre
  nameInput.value = semester.name; // # valor actual
  nameInput.addEventListener("input", () => { // # actualiza nombre mientras escribes
    semester.name = nameInput.value.trim() || "Semestre"; // # evita vacío
    render(); // # re-render
  });

  const meta = document.createElement("div"); // # meta info del semestre
  meta.className = "semesterMeta";
  meta.textContent = `${sumCredits(semester)} créditos • ${countDone(semester)} cumplidos`; // # resumen corto

  titleBox.appendChild(nameInput); // # agrega input al header
  titleBox.appendChild(meta); // # agrega meta

  const btns = document.createElement("div"); // # botones derecha
  btns.style.display = "flex";
  btns.style.gap = "8px";

  const addBtn = document.createElement("button"); // # botón agregar ramo en este semestre
  addBtn.className = "iconBtn";
  addBtn.title = "Agregar ramo aquí";
  addBtn.textContent = "+";
  addBtn.addEventListener("click", () => { // # agrega un ramo nuevo
    semester.courses.push({ id: uid(), name: "Nuevo ramo", credits: 0, done: false });
    render();
    toast("Ramo agregado");
  });

  const delBtn = document.createElement("button"); // # botón eliminar semestre
  delBtn.className = "iconBtn";
  delBtn.title = "Eliminar semestre";
  delBtn.textContent = "🗑️";
  delBtn.addEventListener("click", () => { // # elimina el semestre completo
    state.semesters = state.semesters.filter((s) => s.id !== semester.id);
    render();
    toast("Semestre eliminado");
  });

  btns.appendChild(addBtn); // # agrega botón +
  btns.appendChild(delBtn); // # agrega botón eliminar

  header.appendChild(titleBox); // # arma header
  header.appendChild(btns);

  const body = document.createElement("div"); // # body del semestre (ramos)
  body.className = "semesterBody";

  const hint = document.createElement("div"); // # zona guía para drop
  hint.className = "dropHint";
  hint.textContent = "Suelta aquí para mover ramos";
  body.appendChild(hint);

  semester.courses.forEach((course) => { // # renderiza cada ramo
    body.appendChild(renderCourse(course, semester.id));
  });

  body.addEventListener("dragover", (e) => { // # permite soltar en el semestre
    e.preventDefault();
  });

  body.addEventListener("drop", (e) => { // # recibe el ramo arrastrado
    e.preventDefault();
    const payload = e.dataTransfer.getData("text/plain"); // # obtiene el JSON del drag
    if (!payload) return;

    const { courseId, fromSemesterId } = JSON.parse(payload); // # parsea datos
    moveCourse(courseId, fromSemesterId, semester.id); // # mueve entre semestres
  });

  wrap.appendChild(header); // # agrega header al contenedor
  wrap.appendChild(body); // # agrega body

  return wrap; // # devuelve el semestre listo
}

function renderCourse(course, semesterId) { // # crea tarjeta de ramo (con checkbox “cumplido”)
  const card = document.createElement("div"); // # contenedor tarjeta
  card.className = "course" + (course.done ? " done" : ""); // # agrega clase done si está cumplido
  card.draggable = true; // # permite arrastrar

  card.addEventListener("dragstart", (e) => { // # al iniciar arrastre
    card.classList.add("dragging"); // # estilo dragging
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ courseId: course.id, fromSemesterId: semesterId }) // # datos para mover
    );
  });

  card.addEventListener("dragend", () => { // # al terminar arrastre
    card.classList.remove("dragging"); // # quita estilo
  });

  // # Checkbox “Cumplido”
  const check = document.createElement("input"); // # checkbox
  check.type = "checkbox";
  check.className = "check";
  check.checked = !!course.done; // # refleja estado actual

  check.addEventListener("change", () => { // # cuando lo marcas/desmarcas
    course.done = check.checked; // # actualiza el estado done
    render(); // # re-render para estilo y resumen
    toast(course.done ? "Ramo marcado como cumplido ✅" : "Ramo marcado como pendiente");
  });

  // # Bloque nombre + subtítulo
  const mid = document.createElement("div"); // # bloque central
  const name = document.createElement("div"); // # nombre del ramo
  name.className = "courseName";
  name.textContent = course.name;

  name.addEventListener("dblclick", () => { // # doble clic para editar nombre
    const v = prompt("Nombre del ramo:", course.name);
    if (v === null) return;
    course.name = v.trim() || "Ramo";
    render();
    toast("Nombre actualizado");
  });

  const sub = document.createElement("div"); // # subtítulo
  sub.className = "courseSub";
  sub.textContent = course.done ? "Estado: Cumplido" : "Estado: Pendiente"; // # texto según done

  mid.appendChild(name);
  mid.appendChild(sub);

  // # Bloque derecho: créditos + eliminar
  const right = document.createElement("div"); // # bloque derecho
  right.className = "courseInfo";

  const badge = document.createElement("span"); // # badge de créditos
  badge.className = "badge";
  badge.textContent = `${course.credits ?? 0} cr`;

  badge.addEventListener("click", () => { // # click para editar créditos
    const v = prompt("Créditos (número):", String(course.credits ?? 0));
    if (v === null) return;
    const n = Number(v);
    course.credits = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0; // # valida
    render();
    toast("Créditos actualizados");
  });

  const del = document.createElement("button"); // # botón eliminar ramo
  del.className = "iconBtn";
  del.title = "Eliminar ramo";
  del.textContent = "✕";
  del.addEventListener("click", () => { // # elimina el ramo
    removeCourse(semesterId, course.id);
    render();
    toast("Ramo eliminado");
  });

  right.appendChild(badge);
  right.appendChild(del);

  // # Orden: checkbox - centro - derecha
  card.appendChild(check);
  card.appendChild(mid);
  card.appendChild(right);

  return card; // # devuelve tarjeta lista
}

// # =====================
// # Lógica de negocio
// # =====================

function sumCredits(semester) { // # suma créditos totales del semestre (incluye pendientes y cumplidos)
  return semester.courses.reduce((acc, c) => acc + (Number(c.credits) || 0), 0);
}

function countDone(semester) { // # cuenta ramos cumplidos en el semestre
  return semester.courses.filter((c) => !!c.done).length;
}

function findSemester(id) { // # busca semestre por id
  return state.semesters.find((s) => s.id === id);
}

function removeCourse(semesterId, courseId) { // # elimina un ramo de un semestre
  const sem = findSemester(semesterId);
  if (!sem) return;
  sem.courses = sem.courses.filter((c) => c.id !== courseId);
}

function moveCourse(courseId, fromSemesterId, toSemesterId) { // # mueve un ramo entre semestres
  if (fromSemesterId === toSemesterId) return;

  const from = findSemester(fromSemesterId);
  const to = findSemester(toSemesterId);
  if (!from || !to) return;

  const idx = from.courses.findIndex((c) => c.id === courseId);
  if (idx === -1) return;

  const [course] = from.courses.splice(idx, 1); // # saca del origen
  to.courses.push(course); // # agrega al destino

  render();
  toast("Ramo movido");
}

// # =====================
// # Acciones de botones
// # =====================

$("#btnAddSemester").addEventListener("click", () => { // # agrega un semestre nuevo al final
  state.semesters.push({ id: uid(), name: `Semestre ${state.semesters.length + 1}`, courses: [] });
  render();
  toast("Semestre agregado");
});

$("#btnAddCourse").addEventListener("click", () => { // # agrega un ramo al primer semestre
  if (state.semesters.length === 0) {
    toast("Primero agrega un semestre");
    return;
  }
  state.semesters[0].courses.push({ id: uid(), name: "Nuevo ramo", credits: 0, done: false });
  render();
  toast("Ramo agregado en Semestre 1");
});

$("#btnTheme").addEventListener("click", () => { // # alterna el tema
  state.theme = state.theme === "light" ? "dark" : "light";
  render();
});

$("#btnReset").addEventListener("click", () => { // # reinicia la malla
  const ok = confirm("¿Seguro que quieres resetear la malla? (Perderás lo guardado)");
  if (!ok) return;
  state = defaultState();
  render();
  toast("Malla reseteada");
});

$("#btnExport").addEventListener("click", async () => { // # exporta estado a JSON (copiar)
  const json = JSON.stringify(state, null, 2);
  try {
    await navigator.clipboard.writeText(json);
    toast("JSON copiado ✅");
  } catch {
    prompt("Copia tu JSON:", json);
  }
});

$("#btnImport").addEventListener("click", () => { // # abre modal de importación
  importTextarea.value = "";
  importDialog.showModal();
});

$("#btnImportConfirm").addEventListener("click", () => { // # importa el JSON pegado
  try {
    const obj = JSON.parse(importTextarea.value);
    if (!obj || !Array.isArray(obj.semesters)) throw new Error("Formato inválido");
    state = obj;
    render();
    toast("Malla importada ✅");
  } catch {
    toast("JSON inválido ❌");
  }
});

// # =====================
// # Inicio
// # =====================

render(); // # render inicial
