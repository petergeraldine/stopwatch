let startTime = 0;
let elapsed = 0;
let interval = null;

const timeDisplay = document.getElementById("time");
const startStopBtn = document.getElementById("startStop");
const resetBtn = document.getElementById("reset");

function update() {
  const now = Date.now();
  const diff = now - startTime + elapsed;

  const ms = Math.floor((diff % 1000) / 10);
  const sec = Math.floor(diff / 1000) % 60;
  const min = Math.floor(diff / 60000);

  timeDisplay.textContent =
    `${String(min).padStart(2, "0")}:` +
    `${String(sec).padStart(2, "0")}.` +
    `${String(ms).padStart(2, "0")}`;
}

startStopBtn.onclick = () => {
  if (interval) {
    // Stop
    clearInterval(interval);
    interval = null;
    elapsed += Date.now() - startTime;
    startStopBtn.textContent = "Start";
  } else {
    // Start
    startTime = Date.now();
    interval = setInterval(update, 10);
    startStopBtn.textContent = "Stop";
  }
};

resetBtn.onclick = () => {
  clearInterval(interval);
  interval = null;
  startTime = 0;
  elapsed = 0;
  timeDisplay.textContent = "00:00.00";
  startStopBtn.textContent = "Start";
};
