let port;
let reader;
let measuring = false;
let dataRows = [];

const connectBtn = document.getElementById("connectBtn");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const clearBtn = document.getElementById("clearBtn");
const csvBtn = document.getElementById("csvBtn");

const tempNow = document.getElementById("tempNow");
const voltageNow = document.getElementById("voltageNow");
const currentNow = document.getElementById("currentNow");
const powerNow = document.getElementById("powerNow");
const fanNow = document.getElementById("fanNow");
const summaryText = document.getElementById("summaryText");
const dataTable = document.getElementById("dataTable");
const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");

connectBtn.onclick = connectArduino;
startBtn.onclick = () => measuring = true;
pauseBtn.onclick = () => measuring = false;
clearBtn.onclick = clearData;
csvBtn.onclick = downloadCSV;

async function connectArduino() {
  if (!("serial" in navigator)) {
    alert("Chrome 또는 Edge에서 실행해야 합니다.");
    return;
  }

  port = await navigator.serial.requestPort();
  await port.open({ baudRate: 9600 });

  const decoder = new TextDecoderStream();
  port.readable.pipeTo(decoder.writable);
  reader = decoder.readable.getReader();

  readLoop();
}

async function readLoop() {
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += value;
    let lines = buffer.split("\n");
    buffer = lines.pop();

    for (let line of lines) {
      processLine(line.trim());
    }
  }
}

function processLine(line) {
  if (!measuring) return;
  if (!line || line.startsWith("Time_s")) return;

  const parts = line.split(",");
  if (parts.length < 6) return;

  const row = {
    time: Number(parts[0]),
    temp: Number(parts[1]),
    voltage: Number(parts[2]),
    current: Number(parts[3]),
    power: Number(parts[4]),
    fan: parts[5]
  };

  dataRows.push(row);
  updateCards(row);
  addTableRow(row);
  updateSummary();
  drawChart();
}

function updateCards(row) {
  tempNow.textContent = row.temp.toFixed(2) + " ℃";
  voltageNow.textContent = row.voltage.toFixed(3) + " V";
  currentNow.textContent = row.current.toFixed(3) + " mA";
  powerNow.textContent = row.power.toFixed(3) + " mW";
  fanNow.textContent = row.fan;
}

function addTableRow(row) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${row.time.toFixed(1)}</td>
    <td>${row.temp.toFixed(2)}</td>
    <td>${row.voltage.toFixed(3)}</td>
    <td>${row.current.toFixed(3)}</td>
    <td>${row.power.toFixed(3)}</td>
    <td>${row.fan}</td>
  `;
  dataTable.appendChild(tr);
}

function updateSummary() {
  const avg = arr => arr.reduce((a,b) => a + b, 0) / arr.length;

  const temps = dataRows.map(r => r.temp);
  const volts = dataRows.map(r => r.voltage);
  const currents = dataRows.map(r => r.current);
  const powers = dataRows.map(r => r.power);

  summaryText.textContent =
    `평균 온도 ${avg(temps).toFixed(2)}℃, ` +
    `평균 전압 ${avg(volts).toFixed(3)}V, ` +
    `평균 전류 ${avg(currents).toFixed(3)}mA, ` +
    `최대 전력 ${Math.max(...powers).toFixed(3)}mW`;
}

function drawChart() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (dataRows.length < 2) return;

  const margin = 50;
  const w = canvas.width - margin * 2;
  const h = canvas.height - margin * 2;

  const maxTime = Math.max(...dataRows.map(r => r.time));
  const maxPower = Math.max(...dataRows.map(r => r.power), 1);

  ctx.beginPath();
  ctx.moveTo(margin, margin);
  ctx.lineTo(margin, margin + h);
  ctx.lineTo(margin + w, margin + h);
  ctx.stroke();

  ctx.beginPath();

  dataRows.forEach((row, i) => {
    const x = margin + (row.time / maxTime) * w;
    const y = margin + h - (row.power / maxPower) * h;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  ctx.fillText("전력(mW)", 10, 30);
  ctx.fillText("시간(s)", canvas.width - 80, canvas.height - 15);
}

function downloadCSV() {
  if (dataRows.length === 0) {
    alert("저장할 데이터가 없습니다.");
    return;
  }

  let csv = "Time_s,HotTemp_C,Voltage_V,Current_mA,Power_mW,Fan\n";

  dataRows.forEach(r => {
    csv += `${r.time},${r.temp},${r.voltage},${r.current},${r.power},${r.fan}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "TEG_experiment_data.csv";
  a.click();

  URL.revokeObjectURL(url);
}

function clearData() {
  dataRows = [];
  dataTable.innerHTML = "";
  summaryText.textContent = "아직 측정 데이터가 없습니다.";

  tempNow.textContent = "-- ℃";
  voltageNow.textContent = "-- V";
  currentNow.textContent = "-- mA";
  powerNow.textContent = "-- mW";
  fanNow.textContent = "--";

  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
