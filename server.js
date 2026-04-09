const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public")); 

// Conexión
const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "vitrina_ucc"
});

db.connect((err) => {
    if (err) {
        console.error(" Error conexión DB:", err);
        process.exit(1);
    } else {
        console.log(" MySQL conectado correctamente");
    }
});

// === Rutas API ===

// Obtener todos los emprendedores
app.get("/api/emprendedores", (req, res) => {
    db.query("SELECT * FROM emprendedores ORDER BY id DESC", (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Error al obtener emprendedores" });
        }
        // Parsear resenas de JSON string a array
        const emprendedores = result.map(emp => ({
            ...emp,
            resenas: emp.resenas ? JSON.parse(emp.resenas) : []
        }));
        res.json(emprendedores);
    });
});

// Agregar emprendedor
app.post("/api/emprendedores", (req, res) => {
    const {
        nombre, categoria, descripcion, precio, imagen,
        ubicacion, coordenadas, contacto, sitioWeb
    } = req.body;

    const sql = `INSERT INTO emprendedores 
        (nombre, categoria, descripcion, precio, imagen, ubicacion, coordenadas, contacto, sitioWeb, resenas, promedio) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [
        nombre, categoria, descripcion, precio, imagen || null,
        ubicacion || null, coordenadas || null, contacto, sitioWeb || null,
        JSON.stringify([]), 0
    ], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Error al guardar emprendedor" });
        }
        res.json({ mensaje: "Emprendedor agregado", id: result.insertId });
    });
});

// Actualizar reseñas
app.put("/api/emprendedores/:id/resenas", (req, res) => {
    const id = req.params.id;
    const { resenas, promedio } = req.body;

    db.query(
        "UPDATE emprendedores SET resenas = ?, promedio = ? WHERE id = ?",
        [JSON.stringify(resenas), promedio, id],
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Error al guardar reseñas" });
            }
            res.json({ mensaje: "Reseñas actualizadas" });
        }
    );
});

// Eliminar emprendedor
app.delete("/api/emprendedores/:id", (req, res) => {
    db.query("DELETE FROM emprendedores WHERE id=?", [req.params.id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Error eliminando" });
        }
        res.json({ mensaje: "Eliminado correctamente" });
    });
});

// === Rutas Oportunidades ===

app.get("/api/oportunidades", (req, res) => {
    db.query("SELECT * FROM oportunidades ORDER BY id DESC", (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Error al obtener oportunidades" });
        }
        res.json(result);
    });
});

app.post("/api/oportunidades", (req, res) => {
    const { titulo, tipo, descripcion, fechaCierre, link } = req.body;
    db.query(
        "INSERT INTO oportunidades (titulo, tipo, descripcion, fechaCierre, link) VALUES (?, ?, ?, ?, ?)",
        [titulo, tipo, descripcion, fechaCierre || null, link || null],
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Error al guardar oportunidad" });
            }
            res.json({ mensaje: "Oportunidad agregada", id: result.insertId });
        }
    );
});

app.delete("/api/oportunidades/:id", (req, res) => {
    db.query("DELETE FROM oportunidades WHERE id=?", [req.params.id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Error eliminando" });
        }
        res.json({ mensaje: "Eliminado correctamente" });
    });
});

// === Rutas Visitas ===

app.get("/api/visitas", (req, res) => {
    db.query("SELECT valor FROM configuracion WHERE clave = 'visitas_totales'", (err, result) => {
        if (err) {
            console.error(err);
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
            console.error(err);
            return res.status(500).json({ error: "Error incrementando visitas" });
        }
        res.json({ mensaje: "Visita registrada" });
    });
});

app.post("/api/visitas/reset", (req, res) => {
    db.query(`UPDATE configuracion SET valor = 0 WHERE clave = 'visitas_totales'`, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Error reiniciando visitas" });
        }
        res.json({ mensaje: "Visitas reiniciadas" });
    });
});


app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});