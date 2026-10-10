/**
 * js/utiles/dom.js
 * ---------------------------------------------------------------------
 * Utilidades para crear y manipular elementos del DOM.
 *
 * EL PROBLEMA QUE RESUELVE ESTE ARCHIVO
 * ---------------------------------------------------------------------
 * Crear elementos con la API nativa es muy verboso:
 *
 *   const boton = document.createElement('button');
 *   boton.className = 'a-boton a-boton--primario';
 *   boton.textContent = 'Guardar';
 *   boton.addEventListener('click', guardar);
 *   contenedor.appendChild(boton);
 *
 * Con el ayudante `crear` queda en una linea:
 *
 *   crear('button', {
 *     clase: 'a-boton a-boton--primario',
 *     texto: 'Guardar',
 *     onClick: guardar
 *   })
 *
 * POR QUE NO USAR innerHTML?
 * ---------------------------------------------------------------------
 * Porque innerHTML con datos del usuario abre la puerta a un ataque
 * XSS (Cross-Site Scripting). Si un usuario se llama:
 *
 *   <img src=x onerror="alert('me robe tu sesion')">
 *
 * y lo insertamos con innerHTML, el navegador EJECUTA ese codigo.
 *
 * Con textContent, el navegador lo trata como TEXTO: se muestra el
 * texto literal y nada se ejecuta. Es seguro por diseno.
 *
 * Regla practica: innerHTML solo con texto que escribimos nosotros
 * (nunca con datos de la API o de un formulario).
 */

/**
 * Crea un elemento del DOM con sus propiedades y sus hijos.
 *
 * @param {string} etiqueta    Nombre de la etiqueta HTML ('div', 'button'...).
 * @param {object} propiedades Configuracion del elemento.
 * @param {...(Node|string|null)} hijos  Elementos o textos a insertar dentro.
 * @returns {HTMLElement}
 */
export function crear(etiqueta, propiedades = {}, ...hijos) {
  const elemento = document.createElement(etiqueta);

  // Recorremos las propiedades y las aplicamos segun su nombre.
  for (const [clave, valor] of Object.entries(propiedades)) {
    // Saltamos los valores vacios para no poner atributos inutiles.
    if (valor === null || valor === undefined || valor === false) continue;

    // ---- Caso 1: clases CSS ----
    if (clave === 'clase') {
      elemento.className = valor;
      continue;
    }

    // ---- Caso 2: texto (seguro, no interpreta HTML) ----
    if (clave === 'texto') {
      elemento.textContent = valor;
      continue;
    }

    // ---- Caso 3: HTML interno. Solo para marcado nuestro (iconos). ----
    if (clave === 'html') {
      elemento.innerHTML = valor;
      continue;
    }

    // ---- Caso 4: manejadores de evento (onClick, onInput...) ----
    // Detectamos las propiedades que empiezan por "on" seguido de
    // mayuscula y las convertimos en addEventListener.
    if (clave.startsWith('on') && typeof valor === 'function') {
      // 'onClick' -> 'click'
      const evento = clave.slice(2).toLowerCase();
      elemento.addEventListener(evento, valor);
      continue;
    }

    // ---- Caso 5: atributos data-* y aria-* ----
    // Estos SI tienen que ir como atributo, no como propiedad del
    // objeto, porque el DOM no expone una propiedad con ese nombre.
    if (clave.startsWith('data') || clave.startsWith('aria')) {
      // 'dataEtiqueta' -> 'data-etiqueta'; 'ariaLabel' -> 'aria-label'
      const atributo = clave
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase();
      elemento.setAttribute(atributo, valor);
      continue;
    }

    // ---- Caso 6: estilos en linea ----
    if (clave === 'estilo' && typeof valor === 'object') {
      Object.assign(elemento.style, valor);
      continue;
    }

    // ---- Caso 7: cualquier otra propiedad del DOM ----
    // id, type, value, disabled, href, placeholder, etc.
    // Preferimos la propiedad al atributo porque es mas rapida y
    // respeta los tipos (disabled = true, no disabled="true").
    if (clave in elemento) {
      elemento[clave] = valor;
    } else {
      elemento.setAttribute(clave, valor);
    }
  }

  // Insertamos los hijos. flat(Infinity) aplana los arreglos anidados
  // para poder escribir crear('ul', {}, items.map(...)) sin envolver.
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;

    // Un texto se convierte en nodo de texto (de nuevo: seguro).
    if (typeof hijo === 'string' || typeof hijo === 'number') {
      elemento.appendChild(document.createTextNode(String(hijo)));
    } else {
      elemento.appendChild(hijo);
    }
  }

  return elemento;
}

/**
 * Atajo de document.querySelector.
 * @param {string} selector
 * @param {Document|HTMLElement} raiz
 * @returns {HTMLElement|null}
 */
export function buscar(selector, raiz = document) {
  return raiz.querySelector(selector);
}

/**
 * Atajo de querySelectorAll que devuelve un ARREGLO de verdad.
 *
 * querySelectorAll devuelve una NodeList, que NO tiene map ni filter.
 * Array.from la convierte en arreglo para poder usar todos los
 * metodos de iteracion.
 */
export function buscarTodos(selector, raiz = document) {
  return Array.from(raiz.querySelectorAll(selector));
}

/**
 * Borra todos los hijos de un elemento.
 *
 * Por que no `elemento.innerHTML = ''`?
 * Porque con innerHTML el navegador tiene que parsear una cadena
 * vacia y, en algunos casos, no libera bien los manejadores de
 * eventos de los hijos. removeChild en bucle es explicito y rapido.
 *
 * @param {HTMLElement} elemento
 */
export function vaciar(elemento) {
  while (elemento.firstChild) {
    elemento.removeChild(elemento.firstChild);
  }
}

/**
 * Reemplaza todo el contenido de un elemento por los nuevos hijos.
 * Es la operacion mas frecuente al re-renderizar una vista.
 *
 * @param {HTMLElement} contenedor
 * @param {...(Node|string)} hijos
 */
export function reemplazarContenido(contenedor, ...hijos) {
  vaciar(contenedor);

  for (const hijo of hijos.flat(Infinity)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;

    if (typeof hijo === 'string' || typeof hijo === 'number') {
      contenedor.appendChild(document.createTextNode(String(hijo)));
    } else {
      contenedor.appendChild(hijo);
    }
  }
}

/**
 * Crea una funcion "con retardo" (debounce).
 *
 * COMO FUNCIONA
 * Cada vez que se llama a la funcion devuelta, CANCELA el temporizador
 * anterior y arranca uno nuevo. Solo cuando pasan `retardo`
 * milisegundos sin nuevas llamadas, se ejecuta de verdad.
 *
 * Caso de uso tipico: el campo de busqueda. El usuario escribe
 * "hopper" (6 pulsaciones) y en lugar de 6 peticiones a la API se
 * envia UNA, cuando deja de teclear.
 *
 * @param {function} funcion
 * @param {number} retardo  Milisegundos de espera.
 * @returns {function}
 */
export function conRetardo(funcion, retardo = 400) {
  // `temporizador` vive en el closure: persiste entre llamadas sin
  // ser una variable global.
  let temporizador = null;

  return function (...argumentos) {
    // Cancelamos la ejecucion pendiente, si habia alguna.
    clearTimeout(temporizador);

    temporizador = setTimeout(() => {
      funcion.apply(this, argumentos);
    }, retardo);
  };
}

/**
 * Crea un icono SVG a partir del contenido de su trazado.
 *
 * Centralizamos los iconos para no repetir el marcado del SVG
 * en cada componente. Ver utiles/iconos.js para el catalogo.
 *
 * @param {string} trazado  El interior del <svg> (paths, circles...).
 * @param {string} clase    Clases CSS del icono.
 * @returns {SVGElement}
 */
export function crearIcono(trazado, clase = 'a-icono') {
  // Los elementos SVG necesitan createElementNS con su namespace.
  // Si se usa createElement('svg'), el navegador crea un elemento
  // HTML desconocido y el icono NO se dibuja. Es un error muy comun.
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', clase);

  // Los iconos son decorativos: el lector de pantalla los ignora y
  // lee el texto o el aria-label del boton que los contiene.
  svg.setAttribute('aria-hidden', 'true');

  // Aqui innerHTML es seguro: el trazado es una constante nuestra,
  // nunca un dato que venga del usuario o de la API.
  svg.innerHTML = trazado;

  return svg;
}
