#!/usr/bin/env node

const whitelist = ["http://localhost:3000"];
const corsOption = {
	origin: (origin, callback) => {
		if (whitelist.indexOf(origin) !== -1) {
			callback(null, true);
		} else {
			callback(new Error("Not allowed by CORS"));
		}
	},
	optionsSuccessStatus: 200,
	credentials: true,
};

var amqp = require("amqplib/callback_api");
var express = require("express");
var bodyParser = require("body-parser");
const database = require("./database");
var app = express();
var router = express.Router();
const http = require("http");
const server = http.createServer(app);
const cors = require("cors");
const io = require("socket.io")(server);

app.use(cors(corsOption));

var msgPropertiesArray = {};
msgPropertiesArray["Life"] = [];
msgPropertiesArray["Love"] = [];
msgPropertiesArray["Work"] = [];
msgPropertiesArray["Study"] = [];
msgPropertiesArray["Other"] = [];

function generateUuid() {
	return (
		Math.random().toString() +
		Math.random().toString() +
		Math.random().toString()
	);
}

const maxNumber = 2;
// connect to mysql database
database.Connect();

amqp.connect("amqp://localhost", function (error0, connection) {
	if (error0) {
		throw error0;
	}
	connection.createChannel(function (error1, channel) {
		if (error1) {
			throw error1;
		}
		var queue = "rpc_queue";

		channel.assertQueue(queue, {
			durable: false,
		});
		channel.prefetch(1);
		console.log(" [x] Awaiting RPC requests");
		channel.consume(queue, function reply(msg) {
			msgPropertiesArray[msg.properties.correlationId].push(
				msg.properties.replyTo
			);
			console.log("array", msgPropertiesArray);

			if (
				msgPropertiesArray[msg.properties.correlationId].length >= maxNumber
			) {
				io.emit("queue", {
					roomID: generateUuid(),
					joinerList: msgPropertiesArray[msg.properties.correlationId],
				});
				msgPropertiesArray[msg.properties.correlationId] = [
					...msgPropertiesArray[msg.properties.correlationId].slice(
						maxNumber,
						msgPropertiesArray[msg.properties.correlationId].length
					),
				];
				console.log(msgPropertiesArray);
			}
			channel.ack(msg);
		});
	});
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use("/api", router);
router
	.route("/queue")
	.delete((req, res) => {
		amqp.connect("amqp://localhost", function (error0, connection) {
			if (error0) {
				throw error0;
			}
			const category = req.body.category;
			const token = req.body.token;

			msgPropertiesArray[category] = msgPropertiesArray[category].filter(
				(item) => {
					return item !== token;
				}
			);
		});
		res.json({ message: "completely delete member from lobby" });
	})
	.post((req, res) => {
		amqp.connect("amqp://localhost", function (error0, connection) {
			if (error0) {
				throw error0;
			}
			const category = req.body.category;
			const token = req.body.token;

			connection.createChannel(function (error1, channel) {
				if (error1) {
					throw error1;
				}
				channel.assertQueue(
					"",
					{
						exclusive: true,
						durable: true, // ป้องกัน ถ้า rabbit crash มันจะไม่ลืม queue
					},
					function (error2, q) {
						if (error2) {
							throw error2;
						}

						console.log(" [x] Requesting ");

						channel.sendToQueue("rpc_queue", Buffer.from(category), {
							correlationId: category,
							replyTo: token,
						});
					}
				);
			});
		});
		res.json({ message: "completely send member to lobby" });
	});

server.listen(5555, "0.0.0.0", () => {
	console.log("Running at localhost:5555");
});
