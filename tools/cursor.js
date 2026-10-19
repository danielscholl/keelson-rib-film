// Visible cursor and click ripple for headless captures. Use with ctx.addInitScript({ path }).
(() => {
  if (window.__demoCursor) return;
  const add = () => {
    const c = document.createElement("div");
    window.__demoCursor = c;
    c.innerHTML =
      '<svg width="28" height="28" viewBox="0 0 24 24"><path d="M4 2 L4 20 L9 15 L12.5 22 L15.5 20.5 L12 13.8 L19 13.8 Z" fill="white" stroke="#0d1429" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, {
      position: "fixed", left: "0", top: "0", zIndex: 2147483647, pointerEvents: "none",
      transform: "translate(50vw,55vh)", filter: "drop-shadow(0 2px 3px rgba(0,0,0,.5))",
    });
    document.body.appendChild(c);
    document.addEventListener("mousemove", (e) => {
      c.style.transform = `translate(${e.clientX - 4}px,${e.clientY - 2}px)`;
    }, true);
    document.addEventListener("mousedown", (e) => {
      const r = document.createElement("div");
      Object.assign(r.style, {
        position: "fixed", left: `${e.clientX - 18}px`, top: `${e.clientY - 18}px`, width: "36px", height: "36px",
        borderRadius: "50%", border: `3px solid ${window.__demoAccent || "#9b8eff"}`, zIndex: 2147483646,
        pointerEvents: "none", transition: "all .45s ease-out",
      });
      document.body.appendChild(r);
      requestAnimationFrame(() => { r.style.transform = "scale(1.8)"; r.style.opacity = "0"; });
      setTimeout(() => r.remove(), 600);
    }, true);
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", add) : add();
})();
