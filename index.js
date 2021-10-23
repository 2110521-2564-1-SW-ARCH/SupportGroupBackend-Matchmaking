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

var app = express();
var router = express.Router();
var server = require("http").Server(app);
const cors = require("cors");
var socketIO = require("socket.io")(server, { cors: corsOption });

var queueSocket = socketIO.of("/queue");

app.use(cors(corsOption));

var number = 0;
var msgPropertiesArray = [];

function generateUuid() {
  return (
    Math.random().toString() +
    Math.random().toString() +
    Math.random().toString()
  );
}

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
      number = number + 1;

      console.log(" [.] number (%d)", number);

      msgPropertiesArray.push({
        correlationId: msg.properties.correlationId,
        replyTo: msg.properties.replyTo,
      });

      if (msgPropertiesArray.length == 6) {
        for (const msgProperties of msgPropertiesArray) {
          channel.sendToQueue(msgProperties.replyTo, Buffer.from("roomId"), {
            correlationId: msgProperties.correlationId,
          });
        }
        queueSocket.emit("queue", "roomID");
        msgPropertiesArray = [];
        number = 0;
      }
      channel.ack(msg);
    });
  });
});

app.use("/api", router);
router.route("/queue").post((req, res) => {
  console.log(req);
});
router.route("/queue").get((req, res) => {
  amqp.connect("amqp://localhost", function (error0, connection) {
    if (error0) {
      throw error0;
    }
    connection.createChannel(function (error1, channel) {
      if (error1) {
        throw error1;
      }
      channel.assertQueue(
        "",
        {
          exclusive: true,
        },
        function (error2, q) {
          if (error2) {
            throw error2;
          }
          var correlationId = generateUuid();

          console.log(" [x] Requesting ");

          channel.consume(
            q.queue,
            function (msg) {
              if (msg.properties.correlationId == correlationId) {
                console.log(" [.] Got %s", msg.content.toString());
              }
            },
            {
              noAck: true,
            }
          );

          channel.sendToQueue("rpc_queue", Buffer.from(correlationId), {
            correlationId: correlationId,
            replyTo: q.queue,
          });
        }
      );
    });
  });
  res.send("hello");
});

server.listen(5555, "0.0.0.0", () => {
  console.log("Running at localhost:5555");
});
