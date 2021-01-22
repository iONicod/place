import timeout from "./timeout.mjs";
import drawer from "./drawer.mjs";
import picker from "./picker.mjs";

document.querySelector("#start").addEventListener("submit", e => {
  e.preventDefault();
  main(new FormData(e.currentTarget).get("apiKey"));
  document.querySelector(".container").classList.add("ready");
});

const main = apiKey => {
  const ws = connect(apiKey);
  ws.addEventListener("message", (e) => {
    const data = JSON.parse(e.data);
    if (data.type === 'currentPlace')
      drawer.putArray(data.payload);
    else if (data.type === 'setPoint') {
      drawer.put(data.payload.x, data.payload.y, data.payload.color);
    }
    else if (data.type === 'time') {
      timeout.next = new Date(data.payload);
    }
  });
  drawer.onClick = (x, y) => {
    ws.send(JSON.stringify({ type: 'setPoint', payload : {x: x, y: y, color: picker.color} }));
  };
};

const connect = apiKey => {
  const url = `${location.origin.replace(/^http/, "ws")}?apiKey=${apiKey}`;
  return new WebSocket(url);
};
