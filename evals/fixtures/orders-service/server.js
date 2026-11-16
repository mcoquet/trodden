import { createServer } from "node:http";
import { createOrder, getOrder } from "./orders.js";

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (err) {
        reject(err);
      }
    });
  });
}

function send(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/orders") {
      const order = await createOrder(await readJson(req));
      return send(res, 201, order);
    }
    const match = req.url.match(/^\/orders\/(\w+)$/);
    if (req.method === "GET" && match) {
      const order = getOrder(match[1]);
      return order ? send(res, 200, order) : send(res, 404, { error: "not found" });
    }
    send(res, 404, { error: "not found" });
  } catch (err) {
    console.log("request failed " + err);
    send(res, 500, { error: "internal error" });
  }
});

server.listen(3000, () => {
  console.log("orders-service listening on 3000");
});
