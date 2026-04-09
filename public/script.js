let emprendedores = [];
let oportunidades = [];
let visitasTotales = 0;
let filtroActual = 'all';
let busquedaActual = '';


let modoVista = 'public';
let empresaIdView = null;

// Contraseña para admin
const ADMIN_PASSWORD = "admin123";

// Clave para almacenar la sesión en sessionStorage
const SESSION_KEY = "vitrina_admin_authenticated";

// === Función de Verificación ===
function verificarYEstablecerModo() {
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('v');
    const empresa = urlParams.get('empresa');
    
    // Verificar
    const isAuthenticated = sessionStorage.getItem(SESSION_KEY) === "true";
    
    // Intentar acceder a admin sin autenticación
    if (view === 'admin' && !isAuthenticated) {
        // Redirigir a la página principal sin el parámetro admin
        window.location.href = window.location.origin + window.location.pathname + "?error=unauthorized";
        return false;
    }
    
    // Acceso admin autenticado
    if (view === 'admin' && isAuthenticated) {
        modoVista = 'admin';
        empresaIdView = null;
        return true;
    }
    
    // Vista de empresa 
    if (empresa) {
        modoVista = 'empresa';
        empresaIdView = parseInt(empresa);
        return true;
    }
    
    // Vista pública normal
    modoVista = 'public';
    empresaIdView = null;
    return true;
}

// === Detectar Modo de Vista ===
function detectarModoVista() {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    // Mostrar mensaje de error si se haceun intento de acceso no autorizado
    if (error === 'unauthorized') {
        alert("⚠️ Acceso no autorizado. Debes ingresar la contraseña correcta para acceder al panel de administración.");
        // Limpiar la URL
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
    
    // Configurar la interfaz según el modo
    if (modoVista === 'admin') {
        document.getElementById('viewBadge').innerHTML = '👑 Modo Administrador';
        document.getElementById('filtersSection').style.display = 'none';
        mostrarBotonesAdmin();
    } else if (modoVista === 'empresa') {
        document.getElementById('viewBadge').innerHTML = '🔗 Vista de Emprendedor';
        document.getElementById('filtersSection').style.display = 'none';
        mostrarBotonesPublico();
    } else {
        document.getElementById('viewBadge').innerHTML = '🏠 Modo Público';
        document.getElementById('filtersSection').style.display = 'block';
        mostrarBotonesPublico();
    }
}

function mostrarBotonesAdmin() {
    const headerButtons = document.getElementById('headerButtons');
    if (!headerButtons) return;
    headerButtons.innerHTML = `
        <button class="btn-public" onclick="cambiarAModoPublico()">🏠 Ver como público</button>
        <button class="btn-share" onclick="abrirPanelAdmin()">⚙️ Panel Admin</button>
        <button class="btn-share" onclick="abrirModalLinks()">🔗 Links emprendedores</button>
        <button class="btn-logout" onclick="cerrarSesionAdmin()">🚪 Cerrar sesión</button>
    `;
}

function mostrarBotonesPublico() {
    const headerButtons = document.getElementById('headerButtons');
    if (!headerButtons) return;
    headerButtons.innerHTML = `
        <button class="btn-admin" id="adminAccessBtn">🔐 Acceso Admin</button>
    `;
    
    const adminAccessBtn = document.getElementById('adminAccessBtn');
    if (adminAccessBtn) {
        // Remover eventos anteriores para evitar duplicados
        const newBtn = adminAccessBtn.cloneNode(true);
        adminAccessBtn.parentNode.replaceChild(newBtn, adminAccessBtn);
        newBtn.addEventListener('click', solicitarAccesoAdmin);
    }
}

function solicitarAccesoAdmin() {
    const password = prompt("Ingrese la contraseña de administrador:");
    
    if (password === ADMIN_PASSWORD) {
        // Contraseña correcta - guardar sesión y redirigir a modo admin
        sessionStorage.setItem(SESSION_KEY, "true");
        window.location.href = window.location.origin + window.location.pathname + '?v=admin';
    } else if (password !== null) {
        // Contraseña incorrecta
        alert("❌ Contraseña incorrecta. Acceso denegado.");
    }
}

function cerrarSesionAdmin() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = window.location.origin + window.location.pathname;
}

function cambiarAModoPublico() {
    window.location.href = window.location.origin + window.location.pathname;
}

function abrirPanelAdmin() {
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) adminPanel.classList.remove('hidden');
}

function irInicio() {
    if (modoVista === 'empresa') {
        window.location.href = window.location.origin + window.location.pathname;
    }
}

function volverALista() {
    window.location.href = window.location.origin + window.location.pathname;
}

function abrirModalLinks() {
    generarLinksCompartibles();
    // Activar la pestaña de links en el panel admin
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    if (tabs.length && contents.length) {
        tabs.forEach(btn => btn.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        const linkTab = document.querySelector('.tab-btn[data-tab="links"]');
        const linkContent = document.getElementById('tabLinks');
        if (linkTab) linkTab.classList.add('active');
        if (linkContent) linkContent.classList.add('active');
    }
    abrirPanelAdmin();
}

// === API Funciones ===

async function cargarEmprendedores() {
    try {
        const response = await fetch("/api/emprendedores");
        if (!response.ok) throw new Error("Error cargando emprendedores");
        emprendedores = await response.json();
        
        if (modoVista === 'empresa' && empresaIdView) {
            const empresa = emprendedores.find(e => e.id === empresaIdView);
            if (empresa) {
                const empresaTitulo = document.getElementById('empresaTitulo');
                const empresaNombre = document.getElementById('empresaNombre');
                if (empresaTitulo) empresaTitulo.style.display = 'block';
                if (empresaNombre) empresaNombre.innerHTML = `🌟 ${empresa.nombre}`;
                renderizarEmpresaUnica(empresa);
            } else {
                const grid = document.getElementById('vitrinasGrid');
                if (grid) grid.innerHTML = '<p style="text-align:center; padding:40px;">Emprendimiento no encontrado</p>';
            }
        } else {
            renderizarVitrinas();
        }
        
        actualizarListaAdmin();
        actualizarEstadisticas();
        mostrarOportunidadesDestacadas();
        if (modoVista === 'admin') {
            generarLinksCompartibles();
        }
    } catch (error) {
        console.error("Error:", error);
        const grid = document.getElementById('vitrinasGrid');
        if (grid) grid.innerHTML = '<p style="text-align:center; padding:40px; color:red;">❌ Error cargando datos. Verifica que el servidor esté corriendo.</p>';
    }
}

async function cargarOportunidades() {
    try {
        const response = await fetch("/api/oportunidades");
        if (!response.ok) throw new Error("Error cargando oportunidades");
        oportunidades = await response.json();
        actualizarListaOportunidades();
        actualizarEstadisticas();
        mostrarOportunidadesDestacadas();
    } catch (error) {
        console.error("Error:", error);
    }
}

async function cargarVisitas() {
    try {
        const response = await fetch("/api/visitas");
        const data = await response.json();
        visitasTotales = data.visitas;
        actualizarEstadisticas();
    } catch (error) {
        console.error("Error:", error);
    }
}

async function registrarVisita() {
    try {
        await fetch("/api/visitas/incrementar", { method: "POST" });
        cargarVisitas();
    } catch (error) {
        console.error("Error:", error);
    }
}

async function agregarEmprendedorAPI(emp) {
    const response = await fetch("/api/emprendedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emp)
    });
    if (!response.ok) throw new Error("Error guardando");
    return response.json();
}

async function actualizarResenasAPI(id, resenas, promedio) {
    const response = await fetch(`/api/emprendedores/${id}/resenas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resenas, promedio })
    });
    return response.json();
}

async function eliminarEmprendedorAPI(id) {
    const response = await fetch(`/api/emprendedores/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Error eliminando");
    return response.json();
}

async function agregarOportunidadAPI(op) {
    const response = await fetch("/api/oportunidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(op)
    });
    if (!response.ok) throw new Error("Error guardando");
    return response.json();
}

async function eliminarOportunidadAPI(id) {
    const response = await fetch(`/api/oportunidades/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Error eliminando");
    return response.json();
}

async function resetVisitasAPI() {
    const response = await fetch("/api/visitas/reset", { method: "POST" });
    if (!response.ok) throw new Error("Error reiniciando");
    return response.json();
}

// === Utilidades ===
function getCategoriaEmoji(categoria) {
    const emojis = {
        moda: '👗', comida: '🍔', tecnologia: '💻',
        arte: '🎨', servicios: '📋', salud: '🏥',
        educacion: '📚', turismo: '✈️'
    };
    return emojis[categoria] || '🏪';
}

function generarEstrellas(promedio) {
    let estrellas = '';
    for (let i = 1; i <= 5; i++) {
        estrellas += `<span class="star-filled" style="color:${i <= Math.round(promedio) ? '#F59E0B' : '#CBD5E1'}">★</span>`;
    }
    return estrellas;
}

// === Renderisar Vitrinas ===
function renderizarVitrinas() {
    const grid = document.getElementById('vitrinasGrid');
    if (!grid) return;

    let filtrados = [...emprendedores];
    if (filtroActual !== 'all') filtrados = filtrados.filter(e => e.categoria === filtroActual);
    if (busquedaActual) filtrados = filtrados.filter(e => 
        e.nombre.toLowerCase().includes(busquedaActual) || 
        (e.descripcion && e.descripcion.toLowerCase().includes(busquedaActual))
    );

    if (filtrados.length === 0) {
        grid.innerHTML = '<p style="text-align:center; padding:40px;">No hay resultados</p>';
        return;
    }

    grid.innerHTML = filtrados.map(emp => `
        <div class="vitrina-card" data-id="${emp.id}">
            <div class="vitrina-imagen-container">
                <img src="${emp.imagen || 'https://via.placeholder.com/400x300'}" class="vitrina-imagen" onerror="this.src='https://via.placeholder.com/400x300'">
            </div>
            <div class="vitrina-info">
                <span class="vitrina-categoria">${getCategoriaEmoji(emp.categoria)} ${emp.categoria}</span>
                <h3>${emp.nombre}</h3>
                <p class="vitrina-descripcion">${emp.descripcion || ''}</p>
                <p class="vitrina-precio">💰 ${emp.precio || ''}</p>
                <div class="resenas">
                    <div class="promedio">
                        <div class="promedio-stars">${generarEstrellas(emp.promedio || 0)}</div>
                        <span class="resenas-count">${emp.resenas?.length || 0} reseñas</span>
                    </div>
                    <div class="stars">
                        ${[1,2,3,4,5].map(star => `<span class="star" data-value="${star}" onclick="calificar(${emp.id}, ${star})">★</span>`).join('')}
                    </div>
                    ${emp.resenas && emp.resenas.length > 0 ? `
                        <div class="comentario">
                            💬 "${emp.resenas[emp.resenas.length-1].comentario || 'Sin comentario'}"
                        </div>
                    ` : ''}
                </div>
                <div class="mapa-container">
                    <div class="mapa-placeholder" onclick="abrirMapa('${emp.coordenadas || '4.7110,-74.0721'}', '${emp.nombre}')">📍 ${emp.ubicacion || 'Ubicación no especificada'}</div>
                </div>
                <div class="vitrina-botones">
                    <a href="${emp.contacto}" target="_blank" class="vitrina-contacto">📞 Contactar</a>
                    <button class="vitrina-web" onclick="iniciarChatConEmprendedor(${emp.id})">💬 Chat</button>
                    ${emp.sitioWeb ? `<a href="${emp.sitioWeb}" target="_blank" class="vitrina-web">🌐 Web</a>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function renderizarEmpresaUnica(emp) {
    const grid = document.getElementById('vitrinasGrid');
    if (!grid) return;
    
    grid.innerHTML = `
        <div class="vitrina-card">
            <div class="vitrina-imagen-container">
                <img src="${emp.imagen || 'https://via.placeholder.com/400x300'}" class="vitrina-imagen" onerror="this.src='https://via.placeholder.com/400x300'">
            </div>
            <div class="vitrina-info">
                <span class="vitrina-categoria">${getCategoriaEmoji(emp.categoria)} ${emp.categoria}</span>
                <h3>${emp.nombre}</h3>
                <p class="vitrina-descripcion">${emp.descripcion || ''}</p>
                <p class="vitrina-precio">💰 ${emp.precio || ''}</p>
                <div class="resenas">
                    <div class="promedio">
                        <div class="promedio-stars">${generarEstrellas(emp.promedio || 0)}</div>
                        <span class="resenas-count">${emp.resenas?.length || 0} reseñas</span>
                    </div>
                    <div class="stars">
                        ${[1,2,3,4,5].map(star => `<span class="star" data-value="${star}" onclick="calificar(${emp.id}, ${star})">★</span>`).join('')}
                    </div>
                    ${emp.resenas && emp.resenas.length > 0 ? `
                        <div class="comentario">
                            💬 "${emp.resenas[emp.resenas.length-1].comentario || 'Sin comentario'}"
                        </div>
                    ` : ''}
                </div>
                <div class="mapa-container">
                    <div class="mapa-placeholder" onclick="abrirMapa('${emp.coordenadas || '4.7110,-74.0721'}', '${emp.nombre}')">📍 ${emp.ubicacion || 'Ubicación no especificada'}</div>
                </div>
                <div class="vitrina-botones">
                    <a href="${emp.contacto}" target="_blank" class="vitrina-contacto">📞 Contactar</a>
                    <button class="vitrina-web" onclick="iniciarChatConEmprendedor(${emp.id})">💬 Chat</button>
                    ${emp.sitioWeb ? `<a href="${emp.sitioWeb}" target="_blank" class="vitrina-web">🌐 Web</a>` : ''}
                </div>
            </div>
        </div>
    `;
}

// === Reseñas ===
window.calificar = async function(id, estrellas) {
    const comentario = prompt(`Calificaste con ${estrellas} estrellas. ¿Quieres dejar un comentario?`);
    const emprendedor = emprendedores.find(e => e.id === id);
    if (!emprendedor) return;
    
    if (!emprendedor.resenas) emprendedor.resenas = [];
    
    emprendedor.resenas.push({
        estrellas: estrellas,
        comentario: comentario || "Sin comentario",
        fecha: new Date().toLocaleDateString()
    });
    
    const total = emprendedor.resenas.reduce((sum, r) => sum + r.estrellas, 0);
    emprendedor.promedio = total / emprendedor.resenas.length;
    
    await actualizarResenasAPI(id, emprendedor.resenas, emprendedor.promedio);
    await cargarEmprendedores();
    alert(`✅ Gracias por calificar ${emprendedor.nombre}`);
};

// === Mapa ===
window.abrirMapa = function(coordenadas, nombre) {
    const [lat, lng] = coordenadas.split(',');
    window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`, '_blank');
};

// === Chat ===
let chatEmprendedorId = null;

function iniciarChatConEmprendedor(id) {
    const emp = emprendedores.find(e => e.id === id);
    if (!emp) return;
    
    chatEmprendedorId = id;
    const chatWindow = document.getElementById('chatWindow');
    const chatMessages = document.getElementById('chatMessages');
    
    if (chatMessages) chatMessages.innerHTML = `<div class="chat-message emprendedor">👋 ¡Hola! Soy ${emp.nombre}. ¿En qué puedo ayudarte?</div>`;
    if (chatWindow) chatWindow.classList.add('open');
}

function configurarChat() {
    const chatBtn = document.getElementById('chatBtn');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const chatInput = document.getElementById('chatInput');
    
    if (chatBtn) {
        chatBtn.addEventListener('click', () => {
            const chatWindow = document.getElementById('chatWindow');
            if (chatWindow) chatWindow.classList.toggle('open');
        });
    }
    
    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', () => {
            const chatWindow = document.getElementById('chatWindow');
            if (chatWindow) chatWindow.classList.remove('open');
        });
    }
    
    if (sendChatBtn) {
        sendChatBtn.addEventListener('click', () => {
            const input = document.getElementById('chatInput');
            const mensaje = input.value.trim();
            if (!mensaje) return;
            
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) chatMessages.innerHTML += `<div class="chat-message cliente">${mensaje}</div>`;
            if (input) input.value = '';
            if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
            
            setTimeout(() => {
                let respuesta = "Gracias por tu mensaje. Un asesor te contactará pronto.";
                if (chatEmprendedorId) {
                    const emp = emprendedores.find(e => e.id === chatEmprendedorId);
                    respuesta = `📢 ${emp?.nombre || 'El emprendedor'} ha recibido tu mensaje. Te responderemos por WhatsApp en breve.`;
                }
                if (chatMessages) chatMessages.innerHTML += `<div class="chat-message emprendedor">${respuesta}</div>`;
                if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 1000);
        });
    }
    
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && sendChatBtn) sendChatBtn.click();
        });
    }
}

// === Link que se pueden compartir ===
function generarLinksCompartibles() {
    const container = document.getElementById('linksLista');
    if (!container) return;
    
    const urlBase = window.location.origin + window.location.pathname;
    
    container.innerHTML = emprendedores.map(emp => `
        <div class="admin-item">
            <div>
                <strong>${emp.nombre}</strong><br>
                <small style="color: #666;">ID: ${emp.id}</small>
            </div>
            <div>
                <input type="text" id="link_${emp.id}" value="${urlBase}?empresa=${emp.id}" style="width: 200px; font-size: 11px; padding: 5px;" readonly>
                <button class="edit-btn" onclick="copiarAlPortapapeles('link_${emp.id}')">📋 Copiar</button>
                <button class="btn-public" onclick="verVistaPrevia(${emp.id})">👁️ Ver</button>
            </div>
        </div>
    `).join('');
}

function copiarAlPortapapeles(idInput) {
    const input = document.getElementById(idInput);
    if (input) {
        input.select();
        document.execCommand('copy');
        alert('✅ Enlace copiado al portapapeles');
    }
}

function verVistaPrevia(id) {
    window.open(window.location.origin + window.location.pathname + `?empresa=${id}`, '_blank');
}

function abrirModalCompartir(id, nombre) {
    const urlBase = window.location.origin + window.location.pathname;
    const linkCompleto = `${urlBase}?empresa=${id}`;
    const shareLink = document.getElementById('shareLink');
    const modalShare = document.getElementById('modalShare');
    if (shareLink) shareLink.value = linkCompleto;
    if (modalShare) modalShare.classList.remove('hidden');
}

function copiarLink() {
    const input = document.getElementById('shareLink');
    if (input) {
        input.select();
        document.execCommand('copy');
        alert('✅ Enlace copiado al portapapeles');
    }
}

function cerrarModal() {
    const modalShare = document.getElementById('modalShare');
    if (modalShare) modalShare.classList.add('hidden');
}

// === Admin ===
function actualizarListaAdmin() {
    const lista = document.getElementById('listaEmprendedores');
    if (!lista) return;
    
    lista.innerHTML = emprendedores.map(emp => `
        <div class="admin-item">
            <div><strong>${emp.nombre}</strong><br><small>${emp.categoria} | ${emp.precio || ''}</small></div>
            <div>
                <button class="edit-btn" onclick="editarEmprendedor(${emp.id})">✏️</button>
                <button class="delete-btn" onclick="eliminarEmprendedor(${emp.id})">🗑️</button>
                <button class="btn-share" onclick="abrirModalCompartir(${emp.id}, '${emp.nombre}')">🔗</button>
            </div>
        </div>
    `).join('');
}

function actualizarListaOportunidades() {
    const lista = document.getElementById('listaOportunidades');
    if (!lista) return;
    
    lista.innerHTML = oportunidades.map(op => `
        <div class="oportunidad-card">
            <h4>${op.titulo}</h4>
            <p>${op.descripcion}</p>
            <small>📅 ${op.fechaCierre || 'Sin fecha'}</small><br>
            <a href="${op.link}" target="_blank" style="color: var(--primary);">🔗 Ver más</a><br>
            <button class="delete-btn" onclick="eliminarOportunidad(${op.id})" style="margin-top:10px;">Eliminar</button>
        </div>
    `).join('');
}

function actualizarEstadisticas() {
    const totalEmp = document.getElementById('totalEmprendedores');
    const totalVis = document.getElementById('totalVisitas');
    const totalOps = document.getElementById('totalOportunidades');
    
    if (totalEmp) totalEmp.textContent = emprendedores.length;
    if (totalVis) totalVis.textContent = visitasTotales;
    if (totalOps) totalOps.textContent = oportunidades.length;
}

function mostrarOportunidadesDestacadas() {
    const container = document.getElementById('destacadosContainer');
    if (!container) return;
    
    const destacadas = oportunidades.slice(0, 3);
    container.innerHTML = destacadas.map(op => `
        <div style="background:white; border-radius:16px; padding:20px; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
            <h3>${op.titulo}</h3>
            <p>${op.descripcion}</p>
            <a href="${op.link}" target="_blank" style="display:inline-block; margin-top:10px; color:#8B5CF6;">🔗 Conocer más →</a>
        </div>
    `).join('');
}

// CRUD Emprendedores
async function agregarEmprendedor(e) {
    e.preventDefault();
    
    const nuevoEmprendedor = {
        nombre: document.getElementById('nombre').value,
        categoria: document.getElementById('categoria').value,
        descripcion: document.getElementById('descripcion').value,
        precio: document.getElementById('precio').value,
        imagen: document.getElementById('imagen').value || 'https://via.placeholder.com/400',
        ubicacion: document.getElementById('ubicacion').value,
        coordenadas: document.getElementById('coordenadas').value || '4.7110,-74.0721',
        contacto: document.getElementById('contacto').value,
        sitioWeb: document.getElementById('sitioWeb').value || ''
    };
    
    try {
        await agregarEmprendedorAPI(nuevoEmprendedor);
        await cargarEmprendedores();
        document.getElementById('emprendedorForm').reset();
        alert('✅ Emprendedor agregado a la base de datos');
    } catch (error) {
        alert('❌ Error al guardar: ' + error.message);
    }
}

window.eliminarEmprendedor = async (id) => {
    if (confirm('¿Eliminar este emprendedor?')) {
        try {
            await eliminarEmprendedorAPI(id);
            await cargarEmprendedores();
            alert('✅ Emprendedor eliminado');
        } catch (error) {
            alert('❌ Error al eliminar');
        }
    }
};

window.editarEmprendedor = async (id) => {
    const emp = emprendedores.find(e => e.id === id);
    if (emp) {
        document.getElementById('nombre').value = emp.nombre;
        document.getElementById('categoria').value = emp.categoria;
        document.getElementById('descripcion').value = emp.descripcion || '';
        document.getElementById('precio').value = emp.precio || '';
        document.getElementById('imagen').value = emp.imagen || '';
        document.getElementById('ubicacion').value = emp.ubicacion || '';
        document.getElementById('coordenadas').value = emp.coordenadas || '';
        document.getElementById('contacto').value = emp.contacto || '';
        document.getElementById('sitioWeb').value = emp.sitioWeb || '';
        
        await eliminarEmprendedorAPI(id);
        document.getElementById('emprendedorForm').scrollIntoView({ behavior: 'smooth' });
        alert('✏️ Ahora puedes editar los datos y guardar como nuevo');
    }
};

// CRUD Oportunidades
async function agregarOportunidad(e) {
    e.preventDefault();
    
    const nuevaOportunidad = {
        titulo: document.getElementById('tituloOportunidad').value,
        tipo: document.getElementById('tipoOportunidad').value,
        descripcion: document.getElementById('descripcionOportunidad').value,
        fechaCierre: document.getElementById('fechaCierre').value,
        link: document.getElementById('linkOportunidad').value
    };
    
    try {
        await agregarOportunidadAPI(nuevaOportunidad);
        await cargarOportunidades();
        document.getElementById('oportunidadForm').reset();
        alert('✅ Oportunidad agregada a la base de datos');
    } catch (error) {
        alert('❌ Error al guardar');
    }
}

window.eliminarOportunidad = async (id) => {
    if (confirm('¿Eliminar esta oportunidad?')) {
        try {
            await eliminarOportunidadAPI(id);
            await cargarOportunidades();
            alert('✅ Oportunidad eliminada');
        } catch (error) {
            alert('❌ Error al eliminar');
        }
    }
};

// === Inicialización ===
document.addEventListener('DOMContentLoaded', async () => {
    // PRIMERO: Verificar autenticación y establecer modo
    const continuar = verificarYEstablecerModo();
    if (!continuar) return;
    
    // Configurar la interfaz según el modo
    detectarModoVista();
    
    // Configurar el chat
    configurarChat();
    
    // Cargar datos
    await cargarEmprendedores();
    await cargarOportunidades();
    await cargarVisitas();
    await registrarVisita();
    
    // Filtros (solo se puede ver en modo público)
    if (modoVista === 'public') {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filtroActual = btn.dataset.filter;
                renderizarVitrinas();
            });
        });
    }
    
    // Búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            busquedaActual = e.target.value.toLowerCase();
            renderizarVitrinas();
        });
    }
    
    // Panel admin
    const adminPanel = document.getElementById('adminPanel');
    const closeAdminBtn = document.getElementById('closeAdminBtn');
    
    if (closeAdminBtn) {
        closeAdminBtn.addEventListener('click', () => {
            if (adminPanel) adminPanel.classList.add('hidden');
        });
    }
    
    if (adminPanel) {
        adminPanel.addEventListener('click', (e) => {
            if (e.target === adminPanel) adminPanel.classList.add('hidden');
        });
    }
    
    // Tabs del admin
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tabContents.forEach(c => c.classList.remove('active'));
            const activeTab = document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
            if (activeTab) activeTab.classList.add('active');
        });
    });
    
    // Formularios
    const emprendedorForm = document.getElementById('emprendedorForm');
    const oportunidadForm = document.getElementById('oportunidadForm');
    const resetVisitasBtn = document.getElementById('resetVisitasBtn');
    
    if (emprendedorForm) emprendedorForm.addEventListener('submit', agregarEmprendedor);
    if (oportunidadForm) oportunidadForm.addEventListener('submit', agregarOportunidad);
    if (resetVisitasBtn) {
        resetVisitasBtn.addEventListener('click', async () => {
            if (confirm('¿Reiniciar contador de visitas?')) {
                await resetVisitasAPI();
                await cargarVisitas();
                alert('✅ Visitas reiniciadas');
            }
        });
    }
});