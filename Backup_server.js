const WebSocket = require("ws");
const mysql = require("mysql2");

// Crear una conexión a la base de datos MySQL
const connection = mysql.createConnection({
  host: "localhost", // Cambia esto por la dirección de tu base de datos
  user: "root", // Cambia esto por tu usuario de MySQL
  password: "", // Cambia esto por tu contraseña de MySQL
  database: "tvpanel" // Cambia esto por el nombre de tu base de datos
});

// Array para almacenar el historial de turnos (obtenido desde la base de datos)
let historial = [];

// Función para enviar el historial a todos los clientes conectados
const enviarHistorial = (wss, historial) => {
  const historialJSON = JSON.stringify(historial);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(historialJSON);
    }
  });

  // Mostrar el historial enviado en la consola
  //console.log("Historial de turnos enviado a los clientes:", historial);
};

// Función para obtener el historial de turnos desde la base de datos
const obtenerHistorialDesdeDB = (callback) => {
  connection.query("SELECT * FROM atenciones LIMIT 8", (error, results) => {
    if (error) {
      console.error("Error al obtener el historial de turnos desde la DB:", error);
    } else {
      const historial = results;
      callback(historial);

      // Mostrar el historial en la consola
      //console.log("Historial de turnos obtenido desde la DB:", historial);
    }
  });
};

// Función para verificar cambios en la tabla de turnos y actualizar el historial
const verificarCambiosEnDB = () => {
    connection.query("SELECT * FROM atenciones LIMIT 8", (error, results) => {
      if (error) {
        console.error("Error al verificar cambios en la DB:", error);
      } else {
        const nuevosTurnos = results;
        if (!sonArraysIguales(nuevosTurnos, historial)) {
          historial = nuevosTurnos;
          enviarHistorial(wss, historial);
  
          // Mostrar mensaje en la consola cuando se actualice el historial
          console.log("Se ha actualizado el historial de turnos.", historial);
        }
      }
    });
  };

// Función para comparar si dos arrays son iguales (utilizada para verificar cambios en la base de datos)
const sonArraysIguales = (arr1, arr2) => {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (JSON.stringify(arr1[i]) !== JSON.stringify(arr2[i])) return false;
  }
  return true;
};

// Crear el servidor WebSocket
const wss = new WebSocket.Server({ port: 5001 });

// Manejar la conexión de un nuevo cliente WebSocket
wss.on("connection", (ws) => {
  console.log("Nuevo cliente conectado");

  // Enviar el historial al cliente cuando se conecta
  obtenerHistorialDesdeDB((historial) => {
    const historialJSON = JSON.stringify(historial);
    ws.send(historialJSON);
  });

  // Manejar el cierre de la conexión del cliente
  ws.on("close", () => {
    console.log("Cliente desconectado");
  });
});

// Intervalo para verificar cambios cada 5 segundos (ajústalo según tus necesidades)
const intervaloVerificarCambios = 5000;
setInterval(verificarCambiosEnDB, intervaloVerificarCambios);

// Obtener el historial desde la base de datos al iniciar el servidor
connection.connect((err) => {
  if (err) {
    console.error("Error al conectar a la base de datos:", err);
  } else {
    console.log("Conexión exitosa a la base de datos");
    obtenerHistorialDesdeDB((historial) => {
      enviarHistorial(wss, historial);
    });
  }
});