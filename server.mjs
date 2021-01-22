import * as path from "path";
import express from "express";
import WebSocket from "ws";

const port = process.env.PORT || 5000;

const apiKeys = new Set([
  "4a83051d-aad4-483e-8fc8-693273d15dc7",
  "c08c9038-693d-4669-98cd-9f0dd5ef06bf",
  "4b1545c4-4a70-4727-9ea1-152ed4c84ae2",
  "4a226908-aa3e-4a34-a57d-1f3d1f6cba84",
]);

const colors = [
  "#140c1c",
  "#442434",
  "#30346d",
  "#4e4a4e",
  "#854c30",
  "#346524",
  "#d04648",
  "#757161",
  "#597dce",
  "#d27d2c",
  "#8595a1",
  "#6daa2c",
  "#d2aa99",
  "#6dc2ca",
  "#dad45e",
  "#deeed6",
];

const timeout = 10;

let nextTime = {};

const size = 256;
// place(x, y) := place[x + y * size]
const place = Array(size * size).fill(null);

for (const [colorIndex, colorValue] of colors.entries()) {
  for (let dx = 0; dx < size; dx++) {
    place[dx + colorIndex * size] = colorValue;
  }
}

function isValidPointData(data) {
  return data.x >= 0 && data.x < size
      && data.y >= 0 && data.y < size
      && colors.includes(data.color)
}

const app = express();

app.use(express.static(path.join(process.cwd(), "client")));

app.get("/api/colors/", (_, res) => {
  res.send(colors);
});

app.get("/*", (_, res) => {
  res.send("Place(holder)");
});

const server = app.listen(port);

const wss = new WebSocket.Server({
  noServer: true,
});

const wm = new WeakMap();

wss.on('connection', function connection(ws) {
  const key = wm.get(ws);
  nextTime[`${key}`] = new Date();

  ws.on('message', function incoming(message) {
    const data = JSON.parse(message);
    if (data.type === 'setPoint' && isValidPointData(data.payload)) {
      if(nextTime[`${key}`] < new Date()) {
        let now = new Date();
        let nt = new Date(now.valueOf() + timeout * 1000);
        nextTime[`${key}`] = nt;
        place[data.payload.y * size + data.payload.x] = data.payload.color;
        wss.clients.forEach(function each(client) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
            ws.send(JSON.stringify({type: 'time', payload: nt.toISOString() }));
          }
        });
      }
      else
        ws.send(JSON.stringify({type: 'time', payload: nextTime[`${key}`].toISOString() }));
    }
  })
});

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, req.headers.origin);
  const apiKey = url.searchParams.get('apiKey');
  if (apiKeys.has(apiKey))
    wss.handleUpgrade(req, socket, head, (ws) => {
        wm.set(ws, apiKey);
        wss.emit("connection", ws, req);
    })
  else {
    console.log('Закрываюсьььь')
    socket.destroy();
  }

});