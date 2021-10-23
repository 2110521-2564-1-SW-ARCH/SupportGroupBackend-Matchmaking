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

var app = express();
var router = express.Router();
var server = require("http").Server(app);
const cors = require("cors");
var socketIO = require("socket.io")(server, { cors: corsOption });

var queueSocket = socketIO.of("/queue");

app.use(cors(corsOption));

var msgPropertiesArray = [];

function generateUuid() {
  return (
    Math.random().toString() +
    Math.random().toString() +
    Math.random().toString()
  );
}

amqp.connect("amqp://localhost", function (error0, connection) {
  let number = 0;
  if (error0) {
    throw error0;
  }
  connection.createChannel(function (error1, channel) {
    console.log("channel 1")
    if (error1) {
      throw error1;
    }
    var queue = "1";

    channel.assertQueue(queue, {
      durable: false,
    });
    channel.prefetch(1);
    console.log(" [x] Awaiting RPC requests");
    channel.consume(queue, function reply(msg) {
      number = number + 1;

      // console.log(" [.] member (%d)", number, " channel ", queue);
      msgPropertiesArray.push({
        correlationId: msg.properties.correlationId,
        replyTo: msg.properties.replyTo,
      });

      console.log(" [.] member (%d)", number, " channel ", queue);
      console.log("queue length", msgPropertiesArray.length)

      if (msgPropertiesArray.length == 3) {
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
  // connection.createChannel(function (error1, channel) {
  //   console.log("channel 2")
  //   let number = 0;
  //   if (error1) {
  //     throw error1;
  //   }
  //   var queue = "2";

  //   channel.assertQueue(queue, {
  //     durable: false,
  //   });
  //   channel.prefetch(1);
  //   console.log(" [x] Awaiting RPC requests");
  //   channel.consume(queue, function reply(msg) {
  //     number = number + 1;

  //     // console.log(" [.] member (%d)", number, " channel ", queue);
  //     // console.log("queue length", msgPropertiesArray.length)
  //     msgPropertiesArray.push({
  //       correlationId: msg.properties.correlationId,
  //       replyTo: msg.properties.replyTo,
  //     });

  //     console.log(" [.] member (%d)", number, " channel ", queue);
  //     console.log("queue length", msgPropertiesArray.length)

  //     if (msgPropertiesArray.length == 3) {
  //       for (const msgProperties of msgPropertiesArray) {
  //         channel.sendToQueue(msgProperties.replyTo, Buffer.from("roomId"), {
  //           correlationId: msgProperties.correlationId,
  //         });
  //       }
  //       queueSocket.emit("queue", "roomID");
  //       msgPropertiesArray = [];
  //       number = 0;
  //     }
  //     channel.ack(msg);
  //   });
  // });
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use("/api", router);
router.route("/queue").post((req, res) => {
  // console.log(req);
  amqp.connect("amqp://localhost", function (error0, connection) {
    if (error0) {
      throw error0;
    }
    let queueName = req.body.category; // category name

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

          channel.sendToQueue(queueName, Buffer.from(correlationId), {
            correlationId: correlationId,
            replyTo: q.queue,
          });

          // channel.sendToQueue("rpc_queue", Buffer.from(correlationId), {
          //   correlationId: correlationId,
          //   replyTo: q.queue,
          // });
        }
      );
    });
  });
  res.json({"message":"completely send member to lobby"});
});
// router.route("/queue").get((req, res) => {
//   amqp.connect("amqp://localhost", function (error0, connection) {
//     if (error0) {
//       throw error0;
//     }
//     connection.createChannel(function (error1, channel) {
//       if (error1) {
//         throw error1;
//       }
//       channel.assertQueue(
//         "",
//         {
//           exclusive: true,
//         },
//         function (error2, q) {
//           if (error2) {
//             throw error2;
//           }
//           var correlationId = generateUuid();

//           console.log(" [x] Requesting ");

//           channel.consume(
//             q.queue,
//             function (msg) {
//               if (msg.properties.correlationId == correlationId) {
//                 console.log(" [.] Got %s", msg.content.toString());
//               }
//             },
//             {
//               noAck: true,
//             }
//           );

//           channel.sendToQueue("rpc_queue", Buffer.from(correlationId), {
//             correlationId: correlationId,
//             replyTo: q.queue,
//           });
//         }
//       );
//     });
//   });
//   res.send("hello");
// });

server.listen(5555, "0.0.0.0", () => {
  console.log("Running at localhost:5555");
});
