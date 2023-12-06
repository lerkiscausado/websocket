const WebSocket = require('ws');
const mysql = require("mysql2");

// Crear una conexión a la base de datos MySQL
const connection = mysql.createConnection({
  host: "localhost", // Cambia esto por la dirección de tu base de datos
  user: "root", // Cambia esto por tu usuario de MySQL
  password: "", // Cambia esto por tu contraseña de MySQL
  database: "turno" // Cambia esto por el nombre de tu base de datos
});

const wss = new WebSocket.Server({ port: 5000 });

function enviarEstado(ws, estado) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(estado));
  }
}

function enviarEstadoATodos(estado) {
  wss.clients.forEach((client) => enviarEstado(client, estado));
}

async function mostrarTurnos(noTurno, noCaja) {
  try {
    // Insertar el nuevo turno en la base de datos
    await connection.promise().query(
      "INSERT INTO turnos (numero_turno, id_caja) VALUES (?, ?)",
      [noTurno, noCaja]
    );

    // Consultar los últimos 10 registros de la base de datos
    const [rows] = await connection.promise().query(
      "SELECT numero_turno, id_caja FROM turnos ORDER BY id DESC LIMIT 10"
    );

    const turno = rows.map((row) => row.numero_turno);
    const caja = rows.map((row) => row.id_caja);
    const data = { turno: noTurno, idCaja: noCaja, turnos: turno, cajas: caja };

    console.log("Datos enviados al cliente:", data);
    enviarEstadoATodos(data);
  } catch (err) {
    console.error("Error al consultar o insertar en la base de datos:", err);
  }
}

function recibido(ws, message) {
  const jsonData = JSON.parse(message);

  if (jsonData.turno && jsonData.idCaja) {
    console.log("Nuevo turno recibido:", jsonData.turno, "en la caja:", jsonData.idCaja);
    mostrarTurnos(jsonData.turno, jsonData.idCaja);
  }
}

function iniciarWebsocket() {
  wss.on('connection', (ws) => {
    abierto();
  
    ws.on('message', (message) => recibido(ws, message));
  
    ws.on('close', () => cerrado());
  
    ws.on('error', () => errores());
  });
}

function abierto() {
  console.log("Conectado");
  enviarEstadoATodos({ status: 'conectado' });
}

function cerrado() {
  console.log("Desconectado");
  enviarEstadoATodos({ status: 'desconectado' });
}

function errores() {
  console.log("Error en la conexión");
  enviarEstadoATodos({ status: 'error' });
}

iniciarWebsocket();
