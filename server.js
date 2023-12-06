require("dotenv").config()
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mysql = require("mysql");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });


// Conexión a DB
var connection = mysql.createConnection({
	host: process.env.MYSQL_HOST,
	user: process.env.MYSQL_USER,
	password: process.env.MYSQL_PASSWORD,
	database: process.env.MYSQL_DATABASE,
	port: process.env.MYSQL_PORT
});
connection.connect(function (error) {
	if (error) {
		throw error;
	} else {
		console.info("Conexion A DB correcta.");
	}
});

let TVPanelID;

wss.on('connection', (ws) => {
	ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            TVPanelID = data.TVPanelID;
            console.log(`ID recibido desde el cliente: ${TVPanelID}`);
            // Aquí puedes realizar cualquier lógica que necesites con el ID recibido.
        } catch (error) {
            console.error('Error al analizar el mensaje JSON:', error);
        }
    });
    console.log('Cliente conectado');
  
    ws.on('close', () => {
        console.log('Cliente desconectado');
    });
});

// Variables de fecha
var date = new Date();
var hora = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
var mes = new Intl.DateTimeFormat("es", { month: "2-digit" }).format(date);
var fecha = date.getFullYear() + "-" + mes + "-" + date.getDate() + " " + hora;
console.log(fecha);


// Consulta a la tabla de atenciones
setInterval(Timer_devices_ultimate_connect, 3000);
function Timer_devices_ultimate_connect() {
	//console.log('TVPanel ID: '+TVPanelID);
	var results = [];
	connection.query(
		//'SELECT * FROM `atenciones` WHERE `TVPanel` = ?',[TVPanelID],
		`SELECT atenciones.id,	concat(atenciones.prefijo,atenciones.turno) as turno,	atenciones.idServicio,	slots.nombre as modulo,	tvpanels.id as idTvPanel, atenciones.estado	FROM atenciones 
		inner join slots on (atenciones.idSlot=slots.id) inner join areaatenciones on (slots.idAreaAtencion=areaatenciones.id)	inner join tvpanels on (areaatenciones.id=tvpanels.idAreaAtencion)	
		where atenciones.estado='LLAMADO' or atenciones.estado='RELLAMADO'`,
		(err, rows) => {
			if (err) {
				throw err;
			} else {
				Object.keys(rows).forEach(function (key) {
					var row = rows[key];
					var estado = row.estado;

					// Si el estado cambia a 2 se lista y envía al tvpanel
					if (estado == 'LLAMADO') {
						var Llamado = 'PrimerLlamado';
						var AtencionID = row.id;
						var TVPanelID = row.idTVPanel;
						var codigoServicio = row.idServicio;//row.CodigoServicio;
						var NumeroTurno = row.turno;
						var Modulo = row.modulo;
						
						console.log('Nuevo llamado - Servicio: ' + codigoServicio + ' Turno: ' + NumeroTurno + ' Modulo: ' + Modulo + ' Estado: ' + estado);
						
						// Enviar datos por WebSocket
						var dataToSend = {
							Llamado : Llamado,
							TVPanel : TVPanelID,
							codigoServicio: codigoServicio,
							NumeroTurno: NumeroTurno,
							Modulo: Modulo
						};
						//console.log(dataToSend);
						wss.clients.forEach(client => {
							//console.log("probando");							
							if (client.readyState === WebSocket.OPEN) {
								client.send(JSON.stringify(dataToSend));

								console.log('Enviando datos por WebSocket:', dataToSend);
								// Actualizar el estado a 3 en la base de datos
								connection.query(
									//'UPDATE `atenciones` SET `estado` = 3 , `FechaPrimerLlamado` = NOW() WHERE `id` = ?',
									`UPDATE atenciones SET estado = 'ESPERA' where id=`+[AtencionID],
									(updateErr) => {
										if (updateErr) {
											throw updateErr;
										}
									}
								);
							}
						});
					}

					if (estado == 'RELLAMADO') {
						var Llamado = 'ReLlamado';
						var AtencionID = row.id;
						var TVPanelID = row.idTVPanel;
						var codigoServicio = row.idServicio;//row.CodigoServicio;
						var NumeroTurno = row.turno;
						var Modulo = row.modulo;

						var dataToSend = {
							Llamado : Llamado,
							TVPanel : TVPanelID,
							codigoServicio: codigoServicio,
							NumeroTurno: NumeroTurno,
							Modulo: Modulo
						};

						wss.clients.forEach(client => {
							if (client.readyState === WebSocket.OPEN) {
								client.send(JSON.stringify(dataToSend));

								console.log('Enviando datos por WebSocket:', dataToSend);
								// Actualizar el estado a 3 en la base de datos
								connection.query(
									//'UPDATE `atenciones` SET `estado` = 3 , `FechaReLlamado` = NOW() WHERE `id` = ?',
									`UPDATE atenciones SET estado = 'ESPERA' where id=`+[AtencionID],
									(updateErr) => {
										if (updateErr) {
											throw updateErr;
										}
									}
								);
							}
						});
						
					}

				});
			}
		}
	);
}

const PORT = process.env.PORT;
server.listen(PORT, () => {
  console.log(`Servidor WebSocket iniciado en el puerto ${PORT}`);
});
