let emprendedores = [];
let oportunidades = [];
let visitasTotales = 0;
let filtroActual = 'all';
let busquedaActual = '';

// === API ===

async function cargarEmprendedores() {
    try {
        const response = await fetch("/api/emprendedores");
        if (!response.ok) throw new Error("Error cargando emprendedores");
        emprendedores = await response.json();
        renderizarVitrinas();
        actualizarListaAdmin();
        actualizarEstadisticas();
        mostrarOportunidadesDestacadas();
    } catch (error) {
        console.error("Error:", error);
        alert("Error cargando datos. Verifica que el servidor esté corriendo.");
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

// === Render ===
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
            <img src="${emp.imagen || 'https://via.placeholder.com/400x300'}" class="vitrina-imagen" onerror="this.src='https://via.placeholder.com/400x300'">
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
    
    chatMessages.innerHTML = `<div class="chat-message emprendedor">👋 ¡Hola! Soy ${emp.nombre}. ¿En qué puedo ayudarte?</div>`;
    chatWindow.classList.add('open');
}

document.getElementById('chatBtn')?.addEventListener('click', () => {
    document.getElementById('chatWindow').classList.toggle('open');
});

document.getElementById('closeChatBtn')?.addEventListener('click', () => {
    document.getElementById('chatWindow').classList.remove('open');
});

document.getElementById('sendChatBtn')?.addEventListener('click', () => {
    const input = document.getElementById('chatInput');
    const mensaje = input.value.trim();
    if (!mensaje) return;
    
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML += `<div class="chat-message cliente">${mensaje}</div>`;
    input.value = '';
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    setTimeout(() => {
        let respuesta = "Gracias por tu mensaje. Un asesor te contactará pronto.";
        if (chatEmprendedorId) {
            const emp = emprendedores.find(e => e.id === chatEmprendedorId);
            respuesta = `📢 ${emp?.nombre || 'El emprendedor'} ha recibido tu mensaje. Te responderemos por WhatsApp en breve.`;
        }
        chatMessages.innerHTML += `<div class="chat-message emprendedor">${respuesta}</div>`;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 1000);
});

document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('sendChatBtn').click();
});

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

// Crud Emprendedores
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

// Crud Oportunidades
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
        alert('Oportunidad agregada a la base de datos');
    } catch (error) {
        alert('Error al guardar');
    }
}

window.eliminarOportunidad = async (id) => {
    if (confirm('¿Eliminar esta oportunidad?')) {
        try {
            await eliminarOportunidadAPI(id);
            await cargarOportunidades();
            alert('Oportunidad eliminada');
        } catch (error) {
            alert('Error al eliminar');
        }
    }
};

// === Inicialización ===
document.addEventListener('DOMContentLoaded', async () => {
    await cargarEmprendedores();
    await cargarOportunidades();
    await cargarVisitas();
    await registrarVisita();
    
    // Filtros
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filtroActual = btn.dataset.filter;
            renderizarVitrinas();
        });
    });
    
    // Búsqueda
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        busquedaActual = e.target.value.toLowerCase();
        renderizarVitrinas();
    });
    
    // Admin panel
    const adminBtn = document.getElementById('adminLoginBtn');
    const adminPanel = document.getElementById('adminPanel');
    const closeAdminBtn = document.getElementById('closeAdminBtn');
    
    adminBtn?.addEventListener('click', () => adminPanel.classList.remove('hidden'));
    closeAdminBtn?.addEventListener('click', () => adminPanel.classList.add('hidden'));
    adminPanel?.addEventListener('click', (e) => {
        if (e.target === adminPanel) adminPanel.classList.add('hidden');
    });
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
        });
    });
    
    // Formularios
    document.getElementById('emprendedorForm')?.addEventListener('submit', agregarEmprendedor);
    document.getElementById('oportunidadForm')?.addEventListener('submit', agregarOportunidad);
    document.getElementById('resetVisitasBtn')?.addEventListener('click', async () => {
        if (confirm('¿Reiniciar contador de visitas?')) {
            await resetVisitasAPI();
            await cargarVisitas();
            alert('✅ Visitas reiniciadas');
        }
    });
});