const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();


app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Conexión MySQL 
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

db.connect((err) => {
    if (err) {
        console.error("❌ Error conexión DB:", err.message);
        console.error("Verifica que MySQL esté corriendo en XAMPP");
        process.exit(1);
    } else {
        console.log(" MySQL conectado correctamente");
        // Crear tablas si no existen
        inicializarBaseDatos();
    }
});

function inicializarBaseDatos() {
    // Se crear tabla emprendedores si no existe
    db.query(`CREATE TABLE IF NOT EXISTS emprendedores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        categoria VARCHAR(50) NOT NULL,
        descripcion TEXT NOT NULL,
        precio VARCHAR(100),
        imagen TEXT,
        ubicacion VARCHAR(200),
        coordenadas VARCHAR(100),
        contacto VARCHAR(100) NOT NULL,
        sitioWeb VARCHAR(200),
        resenas TEXT,
        promedio DECIMAL(3,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error("Error creando tabla emprendedores:", err);
        else console.log(" Tabla emprendedores lista");
    });

    // Se crear tabla oportunidades
    db.query(`CREATE TABLE IF NOT EXISTS oportunidades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titulo VARCHAR(200) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        descripcion TEXT NOT NULL,
        fechaCierre DATE,
        link VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error("Error creando tabla oportunidades:", err);
        else console.log(" Tabla oportunidades lista");
    });

    // Se crear tabla configuracion
    db.query(`CREATE TABLE IF NOT EXISTS configuracion (
        clave VARCHAR(50) PRIMARY KEY,
        valor INT DEFAULT 0
    )`, (err) => {
        if (err) console.error("Error creando tabla configuracion:", err);
        else {
            db.query("INSERT IGNORE INTO configuracion (clave, valor) VALUES ('visitas_totales', 0)", (err) => {
                if (err) console.error("Error insertando visitas:", err);
            });
        }
    });

    // Se Verifica si hay datos, si no, insertar datos de ejemplo
    db.query("SELECT COUNT(*) as count FROM emprendedores", (err, result) => {
        if (!err && result[0].count === 0) {
            const datosEjemplo = [
                ['Moda Étnica Colombia', 'moda', 'Ropa y accesorios hechos por comunidades indígenas', '$50.000 - $200.000', 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400', 'Centro Histórico, Bogotá', '4.5981,-74.0758', 'https://wa.me/573001234567', 'https://instagram.com/modaetnica', '[]', 0],
                ['Sabores de mi Tierra', 'comida', 'Comida típica colombiana a domicilio', '$15.000 - $45.000', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400', 'Cra 45 #22-10, Medellín', '6.2442,-75.5812', 'https://wa.me/573007654321', 'https://instagram.com/saboresdetierra', '[]', 0],
                ['Bienestar Saludable', 'salud', 'Terapias alternativas y medicina natural', '$40.000 - $150.000', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400', 'Cl 70 #15-30, Cali', '3.4516,-76.5320', 'https://wa.me/573009876543', 'https://bienestarsaludable.com', '[]', 0],
                ['EduTech Colombia', 'educacion', 'Cursos online de programación y tecnología', '$80.000 - $300.000', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400', 'Virtual - Todo Colombia', '4.7110,-74.0721', 'https://wa.me/573001112233', 'https://edutech.co', '[]', 0],
                ['Aventuras Colombia', 'turismo', 'Planes de ecoturismo y aventura', '$120.000 - $500.000', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400', 'Parque Nacional Natural Tayrona', '11.2878,-74.1865', 'https://wa.me/573004445556', 'https://aventurascolombia.com', '[]', 0]
            ];
            
            datosEjemplo.forEach(emp => {
                db.query(`INSERT INTO emprendedores 
                    (nombre, categoria, descripcion, precio, imagen, ubicacion, coordenadas, contacto, sitioWeb, resenas, promedio) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, emp);
            });
            console.log("📦 Datos de ejemplo insertados");
        }
    });
}

// === Rutas API ===

app.get("/api/emprendedores", (req, res) => {
    db.query("SELECT * FROM emprendedores ORDER BY id DESC", (err, result) => {
        if (err) {
            console.error("Error en /api/emprendedores:", err);
            return res.status(500).json({ error: "Error al obtener emprendedores", details: err.message });
        }
        const emprendedores = result.map(emp => ({
            ...emp,
            resenas: emp.resenas ? JSON.parse(emp.resenas) : []
        }));
        res.json(emprendedores);
    });
});

app.get("/api/oportunidades", (req, res) => {
    db.query("SELECT * FROM oportunidades ORDER BY id DESC", (err, result) => {
        if (err) {
            console.error("Error en /api/oportunidades:", err);
            return res.status(500).json({ error: "Error al obtener oportunidades" });
        }
        res.json(result);
    });
});

app.get("/api/visitas", (req, res) => {
    db.query("SELECT valor FROM configuracion WHERE clave = 'visitas_totales'", (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Error obteniendo visitas" });
        }
        if (result.length === 0) {
            db.query("INSERT INTO configuracion (clave, valor) VALUES ('visitas_totales', 0)", () => {
                res.json({ visitas: 0 });
            });
        } else {
            res.json({ visitas: result[0].valor });
        }
    });
});

app.post("/api/visitas/incrementar", (req, res) => {
    db.query(`UPDATE configuracion SET valor = valor + 1 WHERE clave = 'visitas_totales'`, (err) => {
        if (err) {
            return res.status(500).json({ error: "Error incrementando visitas" });
        }
        res.json({ mensaje: "Visita registrada" });
    });
});

app.post("/api/visitas/reset", (req, res) => {
    db.query(`UPDATE configuracion SET valor = 0 WHERE clave = 'visitas_totales'`, (err) => {
        if (err) {
            return res.status(500).json({ error: "Error reiniciando visitas" });
        }
        res.json({ mensaje: "Visitas reiniciadas" });
    });
});

app.post("/api/emprendedores", (req, res) => {
    const { nombre, categoria, descripcion, precio, imagen, ubicacion, coordenadas, contacto, sitioWeb } = req.body;
    const sql = `INSERT INTO emprendedores 
        (nombre, categoria, descripcion, precio, imagen, ubicacion, coordenadas, contacto, sitioWeb, resenas, promedio) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(sql, [nombre, categoria, descripcion, precio, imagen || null, ubicacion || null, coordenadas || null, contacto, sitioWeb || null, JSON.stringify([]), 0], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Error al guardar emprendedor" });
        }
        res.json({ mensaje: "Emprendedor agregado", id: result.insertId });
    });
});

app.put("/api/emprendedores/:id/resenas", (req, res) => {
    const id = req.params.id;
    const { resenas, promedio } = req.body;
    db.query("UPDATE emprendedores SET resenas = ?, promedio = ? WHERE id = ?", [JSON.stringify(resenas), promedio, id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Error al guardar reseñas" });
        }
        res.json({ mensaje: "Reseñas actualizadas" });
    });
});

app.delete("/api/emprendedores/:id", (req, res) => {
    db.query("DELETE FROM emprendedores WHERE id=?", [req.params.id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Error eliminando" });
        }
        res.json({ mensaje: "Eliminado correctamente" });
    });
});

app.post("/api/oportunidades", (req, res) => {
    const { titulo, tipo, descripcion, fechaCierre, link } = req.body;
    db.query("INSERT INTO oportunidades (titulo, tipo, descripcion, fechaCierre, link) VALUES (?, ?, ?, ?, ?)", [titulo, tipo, descripcion, fechaCierre || null, link || null], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Error al guardar oportunidad" });
        }
        res.json({ mensaje: "Oportunidad agregada", id: result.insertId });
    });
});

app.delete("/api/oportunidades/:id", (req, res) => {
    db.query("DELETE FROM oportunidades WHERE id=?", [req.params.id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Error eliminando" });
        }
        res.json({ mensaje: "Eliminado correctamente" });
    });
});



app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});