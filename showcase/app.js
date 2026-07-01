const canvas = document.getElementById("mesh");
const ctx = canvas.getContext("2d");
const nodes = [];
let width = 0;
let height = 0;
let raf = 0;

const metrics = {
  totalRequests: 400,
  availability: 99.25,
  p95Latency: 313.47,
  cacheHitRate: 46.75,
  fallbackSuccess: 96.7,
};

function resize() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  seedNodes();
}

function seedNodes() {
  nodes.length = 0;
  const count = Math.max(34, Math.floor((width * height) / 30000));
  const labels = ["cache", "breaker", "primary", "backup", "redis", "fallback"];
  for (let i = 0; i < count; i += 1) {
    nodes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 2.4 + 1.2,
      label: labels[i % labels.length],
    });
  }
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(8, 11, 16, 0.34)";
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < nodes.length; i += 1) {
    const a = nodes[i];
    a.x += a.vx;
    a.y += a.vy;
    if (a.x < -20) a.x = width + 20;
    if (a.x > width + 20) a.x = -20;
    if (a.y < -20) a.y = height + 20;
    if (a.y > height + 20) a.y = -20;

    for (let j = i + 1; j < nodes.length; j += 1) {
      const b = nodes[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 150) {
        const alpha = (1 - distance / 150) * 0.22;
        ctx.strokeStyle = `rgba(98, 214, 255, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  nodes.forEach((node, index) => {
    const hue = index % 3 === 0 ? "86, 240, 166" : index % 3 === 1 ? "98, 214, 255" : "255, 209, 102";
    ctx.fillStyle = `rgba(${hue}, 0.86)`;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
    ctx.fill();
  });

  raf = requestAnimationFrame(draw);
}

function animateCounts() {
  const counters = document.querySelectorAll("[data-count]");
  counters.forEach((counter) => {
    const target = Number(counter.dataset.count);
    const suffix = counter.dataset.suffix || "";
    const start = performance.now();
    const duration = 900;

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      counter.textContent = `${value.toFixed(target >= 100 ? 0 : 2)}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  });
}

function paintGauges() {
  document.querySelectorAll(".gauge").forEach((gauge) => {
    const value = Number(gauge.dataset.value);
    const ring = gauge.querySelector(".ring");
    ring.style.setProperty("--value", String(Math.min(value, 100)));
  });
}

function addMetricSignature() {
  const brand = document.querySelector(".brand");
  brand.title = `${metrics.totalRequests} requests, ${metrics.availability}% availability, ${metrics.p95Latency} ms P95`;
}

window.addEventListener("resize", resize);
resize();
draw();
animateCounts();
paintGauges();
addMetricSignature();

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelAnimationFrame(raf);
  } else {
    draw();
  }
});
