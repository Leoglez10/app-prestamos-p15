#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "compositions", "frames");
mkdirSync(OUT, { recursive: true });

const commonCss = `
    @font-face { font-family: "Space Grotesk"; src: url("assets/fonts/space-grotesk.woff2") format("woff2"); font-weight: 100 900; font-style: normal; font-display: block; }
    @font-face { font-family: "Inter"; src: url("assets/fonts/inter.woff2") format("woff2"); font-weight: 100 900; font-style: normal; font-display: block; }
    * { box-sizing: border-box; }
    #root { position: absolute; inset: 0; width: 1920px; height: 1080px; overflow: hidden; container-type: size; }
    .hf-ground { position: absolute; inset: 0; background: #f8fafc; }
    .hf-grid { position: absolute; inset: 0; background-image: linear-gradient(to right, rgba(37,99,235,.045) 1px, rgba(37,99,235,0) 1px), linear-gradient(to bottom, rgba(37,99,235,.045) 1px, rgba(37,99,235,0) 1px); background-size: 96px 96px; }
    .hf-shell { position: absolute; left: 70px; top: 38px; width: 1780px; height: 820px; overflow: hidden; border: 1.5px solid rgba(37,99,235,.2); border-radius: 22px; background: rgba(255,255,255,.98); }
    .hf-top { height: 98px; padding: 18px 30px; border-bottom: 1.5px solid rgba(37,99,235,.14); display: flex; align-items: center; justify-content: space-between; }
    .hf-brand { display: flex; align-items: center; gap: 14px; min-width: 300px; }
    .hf-brand img { width: 58px; height: 58px; object-fit: contain; }
    .hf-brand strong { font: 650 24px/1 "Space Grotesk", sans-serif; color: #0f172a; }
    .hf-brand small { display: block; margin-top: 6px; font: 500 14px/1 "Inter", sans-serif; color: #64748b; }
    .hf-nav { display: flex; gap: 10px; align-items: center; }
    .hf-nav span { padding: 10px 16px; border-radius: 100px; font: 600 15px/1 "Space Grotesk", sans-serif; color: #64748b; border: 1px solid rgba(37,99,235,.12); }
    .hf-nav .is-active { color: #2563eb; background: rgba(37,99,235,.08); border-color: rgba(37,99,235,.24); }
    .hf-session { min-width: 334px; display: flex; justify-content: flex-end; align-items: center; gap: 12px; }
    .hf-session-pill { padding: 10px 16px; border-radius: 100px; background: rgba(37,99,235,.07); border: 1.5px solid rgba(37,99,235,.18); font: 500 14px/1 "Inter", sans-serif; color: #0f172a; }
    .hf-logout { padding: 10px 16px; border-radius: 100px; color: #dc2626; border: 1.5px solid rgba(220,38,38,.28); font: 650 14px/1 "Space Grotesk", sans-serif; background: #fff; }
    .hf-content { position: absolute; left: 34px; right: 34px; top: 122px; bottom: 34px; overflow: hidden; }
    .hf-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 30px; margin-bottom: 20px; }
    .hf-eyebrow { color: #2563eb; font: 650 15px/1 "Space Grotesk", sans-serif; letter-spacing: .12em; text-transform: uppercase; }
    .hf-title { margin-top: 8px; color: #0f172a; font: 650 38px/1.05 "Space Grotesk", sans-serif; letter-spacing: -.025em; }
    .hf-step { padding: 9px 15px; border-radius: 100px; color: #2563eb; background: rgba(37,99,235,.08); font: 650 14px/1 "Space Grotesk", sans-serif; }
    .hf-panel { background: rgba(37,99,235,.035); border: 1.5px solid rgba(37,99,235,.18); border-radius: 16px; }
    .hf-card { background: #fff; border: 1.5px solid rgba(37,99,235,.18); border-radius: 14px; }
    .hf-label { display: block; margin-bottom: 7px; color: #475569; font: 600 15px/1 "Inter", sans-serif; }
    .hf-input { min-height: 54px; padding: 14px 18px; border: 1.5px solid rgba(37,99,235,.2); border-radius: 12px; background: #fff; color: #0f172a; font: 500 18px/1.3 "Inter", sans-serif; }
    .hf-input.is-focus { border: 2px solid #2563eb; box-shadow: 0 0 0 4px rgba(37,99,235,.08); }
    .hf-button { min-height: 50px; padding: 13px 22px; border: 0; border-radius: 100px; background: #2563eb; color: #fff; font: 650 17px/1 "Space Grotesk", sans-serif; text-align: center; }
    .hf-button.secondary { background: rgba(37,99,235,.08); color: #2563eb; border: 1.5px solid rgba(37,99,235,.2); }
    .hf-chip { display: inline-flex; align-items: center; gap: 8px; padding: 8px 13px; border-radius: 100px; background: rgba(37,99,235,.08); color: #2563eb; border: 1.5px solid rgba(37,99,235,.18); font: 650 14px/1 "Space Grotesk", sans-serif; }
    .hf-chip.green { color: #15803d; background: rgba(21,128,61,.09); border-color: rgba(21,128,61,.24); }
    .hf-chip.red { color: #b91c1c; background: rgba(220,38,38,.08); border-color: rgba(220,38,38,.22); }
    .hf-muted { color: #64748b; font: 400 16px/1.45 "Inter", sans-serif; }
    .hf-progress { position: absolute; left: 0; bottom: 0; height: 4px; background: #2563eb; border-radius: 0 4px 4px 0; }
    .hf-cursor { position: absolute; left: 1530px; top: 720px; width: 42px; height: 42px; z-index: 40; transform-origin: 5px 4px; }
    .hf-ripple { position: absolute; width: 126px; height: 126px; margin: -63px 0 0 -63px; border: 3px solid #2563eb; border-radius: 50%; opacity: 0; pointer-events: none; z-index: 35; }
    .hf-callout { padding: 14px 18px; border-left: 4px solid #2563eb; border-radius: 12px; background: rgba(37,99,235,.07); color: #0f172a; font: 550 17px/1.35 "Inter", sans-serif; }
    .hf-success { padding: 13px 17px; border-radius: 12px; background: rgba(21,128,61,.09); border: 1.5px solid rgba(21,128,61,.24); color: #166534; font: 650 16px/1.3 "Inter", sans-serif; }
    .hf-error { padding: 13px 17px; border-radius: 12px; background: rgba(220,38,38,.08); border: 1.5px solid rgba(220,38,38,.24); color: #991b1b; font: 650 16px/1.35 "Inter", sans-serif; }
    .hf-table { width: 100%; border-collapse: separate; border-spacing: 0; overflow: hidden; border: 1.5px solid rgba(37,99,235,.16); border-radius: 14px; background: #fff; }
    .hf-table th { padding: 10px 14px; text-align: left; background: rgba(37,99,235,.055); color: #64748b; font: 650 13px/1 "Space Grotesk", sans-serif; text-transform: uppercase; letter-spacing: .06em; }
    .hf-table td { padding: 12px 14px; border-top: 1px solid rgba(37,99,235,.1); color: #0f172a; font: 500 15px/1.25 "Inter", sans-serif; vertical-align: middle; }
    .hf-table td small { display: block; margin-top: 4px; color: #64748b; font-size: 12px; }
`;

function shell({ p, title, eyebrow, step, body, session = true }) {
  return `
      <div class="hf-shell" id="${p}-shell">
        <div class="hf-top">
          <div class="hf-brand"><img src="public/logo-p15.png" alt=""><div><strong>Préstamos P15</strong><small>Preparatoria 15</small></div></div>
          <div class="hf-nav"><span>Inicio</span><span class="is-active">Préstamo Rápido</span><span>Inventario</span></div>
          <div class="hf-session">${session ? `<div class="hf-session-pill" id="${p}-session">Sesión: María López (9001001)</div><div class="hf-logout" id="${p}-logout">Cerrar sesión</div>` : `<div class="hf-session-pill">Acceso administrativo</div>`}</div>
        </div>
        <div class="hf-content">
          <div class="hf-heading" id="${p}-heading"><div><div class="hf-eyebrow">${eyebrow}</div><div class="hf-title">${title}</div></div><div class="hf-step">${step}</div></div>
          ${body}
        </div>
        <div class="hf-progress" style="width:${(Number(p.slice(1)) / 11 * 100).toFixed(2)}%"></div>
      </div>`;
}

function frame({ id, duration, title, eyebrow = "Préstamo Rápido", step, body, css = "", timeline, cover = false }) {
  const p = `f${id.slice(0, 2)}`;
  const content = cover ? body : shell({ p, title, eyebrow, step, body, session: id !== "02-donde-entra" && id !== "03-acceso" });
  const html = `<template>
  <style>${commonCss}
    ${css}
  </style>
  <div id="root" data-composition-id="${id}" data-width="1920" data-height="1080" data-duration="${duration}">
    <div id="${p}-ground" class="clip hf-ground" data-start="0" data-duration="${duration}" data-track-index="0"><div class="hf-grid"></div></div>
    <div id="${p}-stage" class="clip" data-start="0" data-duration="${duration}" data-track-index="1">
      ${content}
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <script>
    (function(){
      const tl = gsap.timeline({ paused: true });
      const typeText = (selector, text, at, duration) => {
        const el = document.querySelector(selector); const proxy = { n: 0 };
        tl.to(proxy, { n: text.length, duration, ease: "none", onUpdate: () => { const n = Math.floor(proxy.n); const next = text.slice(0,n); if (el && el.textContent !== next) el.textContent = next; } }, at);
      };
      ${timeline}
      window.__timelines["${id}"] = tl;
    })();
  </script>
</template>\n`;
  writeFileSync(join(OUT, `${id}.html`), html);
}

frame({
  id: "01-portada", duration: 7.211, title: "", step: "",
  cover: true,
  css: `
    .f01-cover { position:absolute; left:70px; top:38px; width:1780px; height:820px; overflow:hidden; border-radius:22px; border:1.5px solid rgba(37,99,235,.2); background:#fff; }
    .f01-diagonal { position:absolute; right:-80px; top:-120px; width:730px; height:1050px; background:rgba(37,99,235,.08); clip-path:polygon(34% 0,100% 0,100% 100%,0 100%); }
    .f01-dots { position:absolute; right:150px; top:150px; width:170px; height:170px; background-image:radial-gradient(#2563eb 5px, transparent 6px); background-size:52px 52px; opacity:.45; }
    .f01-main { position:absolute; left:110px; top:90px; width:980px; }
    .f01-logo { width:130px; height:130px; object-fit:contain; }
    .f01-kicker { margin-top:34px; color:#2563eb; font:650 18px/1 "Space Grotesk"; letter-spacing:.12em; text-transform:uppercase; }
    .f01-rule { width:76px; height:5px; border-radius:3px; margin-top:18px; background:#2563eb; }
    .f01-title { margin-top:26px; color:#0f172a; font:700 86px/.98 "Space Grotesk"; letter-spacing:-.04em; }
    .f01-sub { margin-top:28px; color:#64748b; font:500 27px/1.3 "Inter"; }
    .f01-series { position:absolute; right:110px; bottom:78px; padding:13px 22px; border-radius:100px; color:#2563eb; background:rgba(37,99,235,.08); font:650 18px/1 "Space Grotesk"; }
    .f01-progress { position:absolute; left:0; bottom:0; height:4px; width:9.09%; background:#2563eb; }
  `,
  body: `<div class="f01-cover"><div class="f01-diagonal"></div><div class="f01-dots" id="f01-dots"></div><div class="f01-main"><img id="f01-logo" class="f01-logo" src="public/logo-p15.png" alt=""><div id="f01-kicker" class="f01-kicker">Capacitación · Préstamos P15</div><div id="f01-rule" class="f01-rule"></div><div id="f01-title" class="f01-title">Préstamos<br>a alumnos</div><div id="f01-sub" class="f01-sub">Préstamo Rápido para personal autorizado</div></div><div id="f01-series" class="f01-series">Video 4 de 6 · Préstamo Rápido</div><div class="f01-progress"></div></div>`,
  timeline: `
    tl.fromTo("#f01-logo", { opacity:0, scale:.82 }, { opacity:1, scale:1, duration:.8, ease:"power3.out" }, .15);
    tl.fromTo("#f01-kicker, #f01-rule", { opacity:0, x:-28 }, { opacity:1, x:0, duration:.65, stagger:.12, ease:"power3.out" }, 1.0);
    tl.fromTo("#f01-title", { opacity:0, y:42 }, { opacity:1, y:0, duration:.9, ease:"power3.out" }, 1.65);
    tl.fromTo("#f01-sub", { opacity:0, y:24 }, { opacity:1, y:0, duration:.7, ease:"power3.out" }, 3.45);
    tl.fromTo("#f01-series", { opacity:0, x:28 }, { opacity:1, x:0, duration:.7, ease:"power3.out" }, 5.0);
  `
});

frame({
  id: "02-donde-entra", duration: 14.869, title: "¿Dónde entra?", step: "01 · Inicio",
  body: `<div class="f02-cards"><div class="hf-card f02-card" id="f02-prof"><div class="f02-icon">P</div><div><h3>Soy Profesor</h3><p>Solicita y devuelve equipo desde el kiosko.</p></div></div><div class="hf-card f02-card" id="f02-rapid"><div class="f02-icon rapid">R</div><div><h3>Préstamo Rápido</h3><p id="f02-copy">Registro de préstamos a alumnos. Requiere código administrativo.</p></div><div id="f02-halo" class="f02-halo"></div></div></div><div id="f02-note" class="hf-callout f02-note">Para quien atiende el mostrador</div><svg id="f02-cursor" class="hf-cursor" viewBox="0 0 24 24"><path d="M5 2L5 20L10 15.5L13 22L16 20.5L13 14.5L19.5 14Z" fill="#0f172a" stroke="#fff" stroke-width="1.4"/></svg>`,
  css: `
    .f02-cards { display:flex; gap:32px; margin-top:26px; }
    .f02-card { position:relative; flex:1; min-height:310px; padding:42px; display:flex; align-items:flex-start; gap:26px; overflow:hidden; }
    .f02-icon { width:74px; height:74px; border-radius:18px; flex:0 0 74px; display:grid; place-items:center; background:rgba(100,116,139,.1); color:#64748b; font:700 34px/1 "Space Grotesk"; }
    .f02-icon.rapid { background:rgba(37,99,235,.1); color:#2563eb; }
    .f02-card h3 { margin:6px 0 13px; color:#0f172a; font:650 36px/1 "Space Grotesk"; }
    .f02-card p { max-width:520px; margin:0; color:#64748b; font:450 21px/1.5 "Inter"; }
    .f02-halo { position:absolute; inset:8px; border-radius:12px; border:4px solid #2563eb; opacity:0; }
    .f02-note { position:absolute; right:46px; bottom:20px; width:520px; opacity:0; }
  `,
  timeline: `
    tl.fromTo("#f02-heading", { opacity:0, y:-22 }, { opacity:1, y:0, duration:.65, ease:"power3.out" }, .1);
    tl.fromTo("#f02-prof", { opacity:0, x:-48 }, { opacity:1, x:0, duration:.75, ease:"power3.out" }, .8);
    tl.fromTo("#f02-rapid", { opacity:0, x:48 }, { opacity:1, x:0, duration:.75, ease:"power3.out" }, 1.15);
    tl.fromTo("#f02-cursor", { opacity:0, x:0, y:0 }, { opacity:1, x:-940, y:-350, duration:1.2, ease:"power2.inOut" }, 4.2);
    tl.to("#f02-prof", { opacity:.42, duration:.5, ease:"power2.out" }, 6.0);
    tl.to("#f02-cursor", { x:-280, y:-350, duration:1.35, ease:"power2.inOut" }, 6.35);
    tl.to("#f02-halo", { opacity:1, duration:.55, ease:"power3.out" }, 7.45);
    tl.fromTo("#f02-copy", { opacity:.25 }, { opacity:1, duration:.7, ease:"power3.out" }, 10.45);
    tl.fromTo("#f02-note", { opacity:0, y:22 }, { opacity:1, y:0, duration:.65, ease:"power3.out" }, 12.15);
  `
});

frame({
  id: "03-acceso", duration: 16.213, title: "Acceso administrativo", step: "02 · Acceso",
  body: `<div class="f03-wrap"><div class="hf-card f03-login" id="f03-login"><div class="f03-lock">✓</div><h3>Acceso administrativo</h3><p>Solo personal autorizado</p><label class="hf-label">Código de acceso</label><div class="hf-input is-focus"><span id="f03-code"></span><span class="f03-caret"></span></div><div class="hf-button" id="f03-enter">Acceder a préstamos</div></div><div id="f03-security" class="hf-panel f03-security"><div class="f03-security-title">La sesión queda abierta</div><div class="hf-muted">Incluso si cierras la aplicación.</div><div class="f03-badge"><span>Sesión: María López (9001001)</span><b id="f03-close">Cerrar sesión</b></div></div></div><div id="f03-ripple" class="hf-ripple"></div><svg id="f03-cursor" class="hf-cursor" viewBox="0 0 24 24"><path d="M5 2L5 20L10 15.5L13 22L16 20.5L13 14.5L19.5 14Z" fill="#0f172a" stroke="#fff" stroke-width="1.4"/></svg>`,
  css: `
    .f03-wrap { display:flex; gap:34px; align-items:stretch; height:500px; }
    .f03-login { width:660px; padding:34px 42px; }
    .f03-lock { width:50px; height:50px; border-radius:14px; display:grid; place-items:center; color:#2563eb; background:rgba(37,99,235,.09); font:700 26px/1 "Space Grotesk"; }
    .f03-login h3 { margin:18px 0 6px; color:#0f172a; font:650 30px/1 "Space Grotesk"; }
    .f03-login p { margin:0 0 28px; color:#b91c1c; font:600 16px/1 "Inter"; }
    .f03-login .hf-button { margin-top:20px; }
    .f03-caret { display:inline-block; width:3px; height:22px; margin-left:4px; background:#2563eb; vertical-align:-4px; }
    .f03-security { flex:1; padding:54px; display:flex; flex-direction:column; justify-content:center; opacity:0; }
    .f03-security-title { color:#0f172a; font:650 38px/1.08 "Space Grotesk"; margin-bottom:15px; }
    .f03-badge { margin-top:42px; padding:20px 24px; border-radius:14px; background:#fff; border:1.5px solid rgba(37,99,235,.18); display:flex; align-items:center; justify-content:space-between; font:550 17px/1 "Inter"; }
    .f03-badge b { color:#dc2626; font:650 16px/1 "Space Grotesk"; }
  `,
  timeline: `
    tl.fromTo("#f03-heading", { opacity:0, y:-20 }, { opacity:1, y:0, duration:.6, ease:"power3.out" }, .1);
    tl.fromTo("#f03-login", { opacity:0, scale:.96 }, { opacity:1, scale:1, duration:.75, ease:"power3.out" }, .7);
    typeText("#f03-code", "9001001", 2.3, 1.9);
    tl.fromTo("#f03-cursor", { opacity:0, x:0, y:0 }, { opacity:1, x:-1150, y:-245, duration:1.1, ease:"power2.inOut" }, 4.15);
    tl.to("#f03-enter, #f03-cursor", { scale:.92, duration:.11, ease:"power1.in" }, 5.35);
    tl.to("#f03-enter, #f03-cursor", { scale:1, duration:.32, ease:"power3.out" }, 5.46);
    tl.to("#f03-login", { opacity:.28, scale:.985, duration:.65, ease:"power3.out" }, 6.2);
    tl.fromTo("#f03-security", { opacity:0, x:45 }, { opacity:1, x:0, duration:.85, ease:"power3.out" }, 7.15);
    tl.fromTo("#f03-close", { opacity:.25 }, { opacity:1, duration:.6, ease:"power3.out" }, 10.45);
    tl.to("#f03-close", { color:"#991b1b", duration:.35, ease:"power2.out" }, 13.6);
  `
});

frame({
  id: "04-tipo-persona", duration: 15.829, title: "Nuevo préstamo", step: "03 · Persona",
  body: `<div class="hf-panel f04-form"><div class="f04-row"><div><span class="hf-label">Registrar préstamo para</span><div class="f04-toggle"><button id="f04-alumno" class="is-on">Alumno</button><button id="f04-profesor">Profesor</button></div></div><div id="f04-mode" class="f04-mode">Alumno</div></div><div class="f04-fields"><div><label id="f04-name-label" class="hf-label">Nombre del Alumno</label><div class="hf-input">Diego Ramírez</div></div><div><label id="f04-code-label" class="hf-label">Código UDG del Alumno</label><div class="hf-input">219876543</div></div></div><div id="f04-note" class="hf-callout">Autorizado en mostrador por María López</div></div><svg id="f04-cursor" class="hf-cursor" viewBox="0 0 24 24"><path d="M5 2L5 20L10 15.5L13 22L16 20.5L13 14.5L19.5 14Z" fill="#0f172a" stroke="#fff" stroke-width="1.4"/></svg>`,
  css: `
    .f04-form { height:500px; padding:40px 46px; }
    .f04-row { display:flex; align-items:center; justify-content:space-between; }
    .f04-toggle { display:flex; gap:4px; padding:5px; width:390px; background:rgba(37,99,235,.07); border:1.5px solid rgba(37,99,235,.17); border-radius:100px; }
    .f04-toggle button { flex:1; border:0; border-radius:100px; padding:13px; background:transparent; color:#64748b; font:650 17px/1 "Space Grotesk"; }
    .f04-toggle .is-on { background:#2563eb; color:#fff; }
    .f04-mode { color:#2563eb; font:700 54px/1 "Space Grotesk"; }
    .f04-fields { margin-top:54px; display:grid; grid-template-columns:1.4fr 1fr; gap:30px; }
    .f04-note { width:540px; margin-top:42px; opacity:0; }
  `,
  timeline: `
    tl.fromTo("#f04-heading, #f04-shell", { opacity:0, y:20 }, { opacity:1, y:0, duration:.7, stagger:.12, ease:"power3.out" }, .1);
    tl.fromTo(".f04-fields > div", { opacity:0, y:24 }, { opacity:1, y:0, duration:.6, stagger:.16, ease:"power3.out" }, 1.5);
    tl.fromTo("#f04-cursor", { opacity:0, x:0, y:0 }, { opacity:1, x:-970, y:-500, duration:1.1, ease:"power2.inOut" }, 3.5);
    tl.to("#f04-alumno", { backgroundColor:"transparent", color:"#64748b", duration:.3 }, 5.05);
    tl.to("#f04-profesor", { backgroundColor:"#2563eb", color:"#ffffff", duration:.3 }, 5.05);
    tl.set("#f04-name-label", { textContent:"Nombre del Profesor" }, 5.05);
    tl.set("#f04-code-label", { textContent:"Código del Profesor" }, 5.05);
    tl.set("#f04-mode", { textContent:"Profesor" }, 5.05);
    tl.to("#f04-mode", { color:"#0f172a", duration:.45, ease:"power2.out" }, 6.1);
    tl.to("#f04-cursor", { x:-1160, y:-500, duration:1.05, ease:"power2.inOut" }, 9.5);
    tl.to("#f04-profesor", { backgroundColor:"transparent", color:"#64748b", duration:.3 }, 10.6);
    tl.to("#f04-alumno", { backgroundColor:"#2563eb", color:"#ffffff", duration:.3 }, 10.6);
    tl.set("#f04-name-label", { textContent:"Nombre del Alumno" }, 10.6);
    tl.set("#f04-code-label", { textContent:"Código UDG del Alumno" }, 10.6);
    tl.set("#f04-mode", { textContent:"Alumno", color:"#2563eb" }, 10.6);
    tl.fromTo("#f04-note", { opacity:0, y:20 }, { opacity:1, y:0, duration:.7, ease:"power3.out" }, 12.4);
  `
});

frame({
  id: "05-persona", duration: 20.864, title: "La persona: se escribe una vez", step: "04 · Autocompletar",
  body: `<div class="f05-layout"><div class="hf-panel f05-form"><label class="hf-label">Nombre del Alumno</label><div id="f05-name" class="hf-input is-focus"></div><div id="f05-suggestions" class="f05-suggestions"><div id="f05-s1" class="f05-suggestion"><div><b>Diego Ramírez</b><small>219876543</small></div><span>Ya prestó antes</span></div><div id="f05-s2" class="f05-suggestion"><div><b>Diego Hernández</b><small>9001222</small></div><span class="dir">Directorio</span></div></div><label class="hf-label f05-code-label">Código UDG del Alumno</label><div id="f05-code" class="hf-input"></div><div id="f05-new" class="hf-error f05-new">Sin coincidencias · se guardará como alumno nuevo</div></div><div class="hf-card f05-tip"><div class="hf-eyebrow">Dos fuentes</div><h3>Directorio</h3><p>Profesores registrados</p><h3>Ya prestó antes</h3><p>Personas del historial</p><div id="f05-autofill" class="hf-success">Nombre + código se llenan solos</div></div></div><svg id="f05-cursor" class="hf-cursor" viewBox="0 0 24 24"><path d="M5 2L5 20L10 15.5L13 22L16 20.5L13 14.5L19.5 14Z" fill="#0f172a" stroke="#fff" stroke-width="1.4"/></svg>`,
  css: `
    .f05-layout { display:grid; grid-template-columns:1.45fr .75fr; gap:30px; height:520px; }
    .f05-form { padding:26px 30px; position:relative; }
    .f05-suggestions { position:absolute; left:30px; top:102px; width:calc(100% - 60px); z-index:5; background:#fff; border:1.5px solid rgba(37,99,235,.2); border-radius:12px; overflow:hidden; }
    .f05-suggestion { padding:13px 16px; display:flex; align-items:center; justify-content:space-between; border-top:1px solid rgba(37,99,235,.1); }
    .f05-suggestion:first-child { border-top:0; }
    .f05-suggestion b { display:block; color:#0f172a; font:600 16px/1.1 "Inter"; }
    .f05-suggestion small { color:#64748b; font:400 12px/1 "Inter"; }
    .f05-suggestion span { padding:6px 9px; border-radius:100px; background:rgba(37,99,235,.08); color:#2563eb; font:650 11px/1 "Space Grotesk"; }
    .f05-suggestion span.dir { color:#15803d; background:rgba(21,128,61,.08); }
    .f05-code-label { margin-top:180px; }
    .f05-new { margin-top:20px; opacity:0; }
    .f05-tip { padding:34px; }
    .f05-tip h3 { margin:32px 0 8px; color:#0f172a; font:650 27px/1 "Space Grotesk"; }
    .f05-tip p { margin:0; color:#64748b; font:450 16px/1.3 "Inter"; }
    .f05-autofill { margin-top:44px; opacity:0; }
  `,
  timeline: `
    tl.fromTo("#f05-shell", { opacity:0 }, { opacity:1, duration:.6, ease:"power3.out" }, .1);
    typeText("#f05-name", "Die", 1.55, 1.6);
    tl.fromTo("#f05-suggestions", { opacity:0, y:-14 }, { opacity:1, y:0, duration:.55, ease:"power3.out" }, 3.15);
    tl.fromTo("#f05-s1, #f05-s2", { opacity:0, x:-20 }, { opacity:1, x:0, duration:.45, stagger:.22, ease:"power3.out" }, 3.55);
    tl.fromTo("#f05-cursor", { opacity:0, x:0, y:0 }, { opacity:1, x:-1090, y:-430, duration:1.1, ease:"power2.inOut" }, 5.55);
    tl.to("#f05-s1", { backgroundColor:"rgba(37,99,235,.08)", duration:.3 }, 6.75);
    tl.set("#f05-name", { textContent:"Diego Ramírez" }, 7.15);
    tl.set("#f05-code", { textContent:"219876543" }, 7.15);
    tl.to("#f05-suggestions", { opacity:0, duration:.35 }, 7.15);
    tl.fromTo("#f05-autofill", { opacity:0, y:18 }, { opacity:1, y:0, duration:.6, ease:"power3.out" }, 8.2);
    tl.set("#f05-name, #f05-code", { textContent:"" }, 12.85);
    typeText("#f05-name", "Persona nueva", 13.0, 2.4);
    tl.fromTo("#f05-new", { opacity:0, y:18 }, { opacity:1, y:0, duration:.6, ease:"power3.out" }, 15.5);
    typeText("#f05-code", "219000777", 17.0, 2.4);
  `
});

frame({
  id: "06-catalogo-cuenta", duration: 19.84, title: "El objeto: la parte que sí cuenta", step: "05 · Inventario",
  body: `<div class="f06-split"><div class="hf-panel f06-form"><label class="hf-label">Objeto Prestado</label><div id="f06-object" class="hf-input is-focus">Cable HDMI 3 m</div><div id="f06-option" class="f06-option"><div><b>Cable HDMI 3 m</b><small>HDMI · a granel</small></div><span>4 de 6 disponibles</span></div><div id="f06-chip" class="hf-chip green f06-chip">Cable HDMI 3 m <b>×</b></div><div id="f06-notice" class="hf-success f06-notice">Se registrará 1 objeto contra el inventario. La devolución lo actualizará automáticamente.</div><div id="f06-register" class="hf-button f06-register">Registrar Préstamo</div></div><div class="f06-bridge"><svg viewBox="0 0 170 100"><path id="f06-path" d="M10 50 C55 50 70 20 95 20 C120 20 130 50 160 50"/></svg><b>mismo equipo</b></div><div class="hf-panel f06-inventory"><div class="hf-eyebrow">Inventario real</div><div class="hf-card f06-equipment"><div><h3>Cable HDMI 3 m</h3><p>HDMI · a granel</p></div><span id="f06-status" class="hf-chip green">Disponible</span></div><div id="f06-thesis" class="f06-thesis">DEL CATÁLOGO<br><b>SÍ CUENTA</b></div></div></div><svg id="f06-cursor" class="hf-cursor" viewBox="0 0 24 24"><path d="M5 2L5 20L10 15.5L13 22L16 20.5L13 14.5L19.5 14Z" fill="#0f172a" stroke="#fff" stroke-width="1.4"/></svg>`,
  css: `
    .f06-split { display:grid; grid-template-columns:1fr 180px 1fr; align-items:stretch; height:520px; }
    .f06-form, .f06-inventory { padding:28px 30px; }
    .f06-option { margin-top:8px; padding:13px 16px; border-radius:12px; background:#fff; border:1.5px solid rgba(37,99,235,.2); display:flex; align-items:center; justify-content:space-between; }
    .f06-option b, .f06-equipment h3 { margin:0; color:#0f172a; font:650 18px/1.1 "Space Grotesk"; }
    .f06-option small, .f06-equipment p { display:block; margin-top:5px; color:#64748b; font:450 13px/1 "Inter"; }
    .f06-option span { color:#15803d; font:650 13px/1 "Inter"; }
    .f06-chip { margin-top:18px; opacity:0; }
    .f06-notice { margin-top:18px; opacity:0; }
    .f06-register { margin-top:18px; opacity:0; }
    .f06-bridge { display:flex; flex-direction:column; align-items:center; justify-content:center; color:#2563eb; font:650 13px/1 "Space Grotesk"; }
    .f06-bridge svg { width:170px; height:100px; }
    .f06-bridge path { fill:none; stroke:#2563eb; stroke-width:4; stroke-linecap:round; }
    .f06-equipment { margin-top:70px; padding:24px; display:flex; align-items:center; justify-content:space-between; }
    .f06-thesis { margin-top:52px; color:#64748b; font:650 24px/1.15 "Space Grotesk"; letter-spacing:.04em; opacity:0; }
    .f06-thesis b { color:#2563eb; font-size:44px; }
  `,
  timeline: `
    const path=document.querySelector("#f06-path"); const len=path.getTotalLength(); gsap.set(path,{strokeDasharray:len,strokeDashoffset:len});
    tl.fromTo("#f06-shell", { opacity:0 }, { opacity:1, duration:.65, ease:"power3.out" }, .1);
    tl.fromTo(".f06-form, .f06-inventory", { opacity:0, y:26 }, { opacity:1, y:0, duration:.7, stagger:.18, ease:"power3.out" }, .8);
    tl.to(path,{strokeDashoffset:0,duration:1.1,ease:"power2.inOut"},3.0);
    tl.fromTo("#f06-cursor", { opacity:0, x:0, y:0 }, { opacity:1, x:-1240, y:-470, duration:1.15, ease:"power2.inOut" }, 5.0);
    tl.fromTo("#f06-chip", { opacity:0, scale:.9 }, { opacity:1, scale:1, duration:.55, ease:"power3.out" }, 7.05);
    tl.fromTo("#f06-notice", { opacity:0, y:18 }, { opacity:1, y:0, duration:.6, ease:"power3.out" }, 9.35);
    tl.fromTo("#f06-register", { opacity:0, y:16 }, { opacity:1, y:0, duration:.55, ease:"power3.out" }, 12.0);
    tl.to("#f06-cursor", { x:-1160, y:-210, duration:.9, ease:"power2.inOut" }, 13.2);
    tl.to("#f06-register, #f06-cursor", { scale:.93, duration:.11, ease:"power1.in" }, 14.15);
    tl.to("#f06-register, #f06-cursor", { scale:1, duration:.3, ease:"power3.out" }, 14.26);
    tl.set("#f06-status", { textContent:"Prestado" }, 14.65);
    tl.to("#f06-status", { backgroundColor:"rgba(220,38,38,.08)", borderColor:"rgba(220,38,38,.24)", color:"#b91c1c", duration:.45, ease:"power2.out" }, 14.65);
    tl.fromTo("#f06-thesis", { opacity:0, x:26 }, { opacity:1, x:0, duration:.75, ease:"power3.out" }, 16.25);
  `
});

frame({
  id: "07-varios-texto", duration: 20.053, title: "Varios objetos y texto libre", step: "06 · Límite",
  body: `<div class="f07-layout"><div class="hf-panel f07-form"><label class="hf-label">Objeto Prestado</label><div class="f07-chips"><span id="f07-c1" class="hf-chip green">Cable HDMI 3 m <b>×</b></span><span id="f07-c2" class="hf-chip green">Adaptador USB-C <b>×</b></span><span id="f07-c3" class="hf-chip green">Control remoto <b>×</b></span></div><div id="f07-count" class="hf-success f07-count">Se registrarán 3 objetos contra el inventario, cada uno se devuelve por separado.</div><label class="hf-label f07-manual-label">Objeto Prestado</label><div id="f07-manual" class="hf-input is-focus"></div><div id="f07-free" class="hf-error f07-free">Sin coincidencias en el inventario · se guardará como texto libre</div></div><div class="f07-right"><div class="hf-card f07-rule"><span class="f07-dot yes"></span><div><b>Catálogo</b><small>Actualiza inventario</small></div></div><div class="hf-card f07-rule"><span class="f07-dot no"></span><div><b>A mano</b><small>No descuenta nada</small></div></div><div id="f07-thesis" class="hf-callout">Solo cuenta lo que eliges del catálogo.</div></div></div>`,
  css: `
    .f07-layout { display:grid; grid-template-columns:1.35fr .65fr; gap:30px; height:520px; }
    .f07-form { padding:28px 30px; }
    .f07-chips { display:flex; gap:10px; min-height:62px; flex-wrap:wrap; }
    .f07-count { margin-top:18px; opacity:0; }
    .f07-manual-label { margin-top:34px; }
    .f07-free { margin-top:14px; opacity:0; }
    .f07-right { display:flex; flex-direction:column; gap:18px; }
    .f07-rule { padding:28px; display:flex; gap:20px; align-items:center; min-height:125px; }
    .f07-dot { width:24px; height:24px; border-radius:50%; flex:0 0 24px; }
    .f07-dot.yes { background:#15803d; }.f07-dot.no { background:#dc2626; }
    .f07-rule b { color:#0f172a; font:650 26px/1 "Space Grotesk"; }
    .f07-rule small { display:block; margin-top:8px; color:#64748b; font:450 16px/1 "Inter"; }
    #f07-thesis { margin-top:auto; opacity:0; }
  `,
  timeline: `
    tl.fromTo("#f07-shell", { opacity:0 }, { opacity:1, duration:.65, ease:"power3.out" }, .1);
    tl.fromTo("#f07-c1, #f07-c2, #f07-c3", { opacity:0, y:28, scale:.92 }, { opacity:1, y:0, scale:1, duration:.55, stagger:.7, ease:"power3.out" }, 1.0);
    tl.fromTo("#f07-count", { opacity:0, y:16 }, { opacity:1, y:0, duration:.65, ease:"power3.out" }, 5.4);
    tl.fromTo(".f07-rule", { opacity:0, x:32 }, { opacity:1, x:0, duration:.6, stagger:.22, ease:"power3.out" }, 7.6);
    typeText("#f07-manual", "cargador prestado por el alumno", 12.7, 3.3);
    tl.fromTo("#f07-free", { opacity:0, y:15 }, { opacity:1, y:0, duration:.6, ease:"power3.out" }, 16.2);
    tl.fromTo("#f07-thesis", { opacity:0, y:18 }, { opacity:1, y:0, duration:.65, ease:"power3.out" }, 18.0);
  `
});

frame({
  id: "08-registrar", duration: 15.595, title: "Registrar y dejar constancia", step: "07 · Confirmar",
  body: `<div class="f08-layout"><div class="hf-panel f08-form"><label class="hf-label">Observaciones (opcional)</label><div class="hf-input">Préstamo para laboratorio 2</div><div class="f08-actions"><div class="hf-button secondary">Limpiar</div><div id="f08-register" class="hf-button">Registrar Préstamo</div></div><div id="f08-success" class="hf-success f08-success">Préstamo de Diego Ramírez registrado (3 objetos).</div><div id="f08-reset" class="hf-input f08-reset">Nombre del Alumno</div></div><div class="hf-card f08-history"><div class="hf-eyebrow">Historial</div><div id="f08-row1" class="f08-row"><b>Cable HDMI 3 m</b><small>219876543 · autorizó María López</small></div><div id="f08-row2" class="f08-row"><b>Adaptador USB-C</b><small>219876543 · autorizó María López</small></div><div id="f08-row3" class="f08-row"><b>Control remoto</b><small>219876543 · autorizó María López</small></div></div></div><svg id="f08-cursor" class="hf-cursor" viewBox="0 0 24 24"><path d="M5 2L5 20L10 15.5L13 22L16 20.5L13 14.5L19.5 14Z" fill="#0f172a" stroke="#fff" stroke-width="1.4"/></svg>`,
  css: `
    .f08-layout { display:grid; grid-template-columns:.9fr 1.1fr; gap:30px; height:520px; }
    .f08-form { padding:30px; }
    .f08-actions { display:flex; justify-content:flex-end; gap:14px; margin-top:28px; }
    .f08-success { margin-top:24px; opacity:0; }
    .f08-reset { margin-top:24px; color:#94a3b8; opacity:0; }
    .f08-history { padding:28px; }
    .f08-row { margin-top:16px; padding:17px 19px; border-radius:12px; background:rgba(37,99,235,.045); border:1.5px solid rgba(37,99,235,.14); }
    .f08-row b { color:#0f172a; font:650 17px/1 "Space Grotesk"; }
    .f08-row small { display:block; margin-top:7px; color:#64748b; font:450 13px/1 "Inter"; }
  `,
  timeline: `
    tl.fromTo("#f08-shell", { opacity:0 }, { opacity:1, duration:.6, ease:"power3.out" }, .1);
    tl.fromTo("#f08-cursor", { opacity:0, x:0, y:0 }, { opacity:1, x:-1130, y:-400, duration:1.0, ease:"power2.inOut" }, 1.2);
    tl.to("#f08-register, #f08-cursor", { scale:.92, duration:.11, ease:"power1.in" }, 2.45);
    tl.to("#f08-register, #f08-cursor", { scale:1, duration:.32, ease:"power3.out" }, 2.56);
    tl.set("#f08-register", { textContent:"Registrando..." }, 2.9);
    tl.set("#f08-register", { textContent:"Registrar Préstamo" }, 4.05);
    tl.fromTo("#f08-success", { opacity:0, y:16 }, { opacity:1, y:0, duration:.6, ease:"power3.out" }, 4.1);
    tl.fromTo("#f08-row1, #f08-row2, #f08-row3", { opacity:0, x:28 }, { opacity:1, x:0, duration:.52, stagger:.42, ease:"power3.out" }, 6.15);
    tl.fromTo("#f08-reset", { opacity:0, y:16 }, { opacity:1, y:0, duration:.6, ease:"power3.out" }, 9.7);
    tl.to("#f08-row1 small, #f08-row2 small, #f08-row3 small", { color:"#2563eb", duration:.55, stagger:.22, ease:"power3.out" }, 11.65);
  `
});

frame({
  id: "09-historial", duration: 16.491, title: "Encontrar un préstamo después", step: "08 · Historial",
  body: `<div class="f09-controls"><div id="f09-active" class="hf-chip">En préstamo · 4</div><div id="f09-old" class="hf-chip red">Más de 1 día · 2</div><div class="hf-chip">Devueltos · 8</div><div class="hf-chip">Todos · 12</div><div id="f09-search" class="hf-input f09-search"></div></div><table class="hf-table f09-table"><thead><tr><th>Persona</th><th>Objeto</th><th>Tiempo</th><th>Estado</th></tr></thead><tbody><tr id="f09-row1"><td>Diego Ramírez<small>219876543 · autorizó María López</small></td><td>Cable HDMI 3 m</td><td id="f09-time1">hace 2 días</td><td><span class="hf-chip red">Más de 1 día</span></td></tr><tr id="f09-row2"><td>Andrea Torres<small>218880001 · autorizó María López</small></td><td>Control remoto</td><td>hace 3 h</td><td><span class="hf-chip">En préstamo</span></td></tr><tr id="f09-row3"><td>Diego Ramírez<small>219876543 · autorizó María López</small></td><td>Adaptador USB-C</td><td>hace 2 días</td><td><span class="hf-chip red">Más de 1 día</span></td></tr></tbody></table><svg id="f09-cursor" class="hf-cursor" viewBox="0 0 24 24"><path d="M5 2L5 20L10 15.5L13 22L16 20.5L13 14.5L19.5 14Z" fill="#0f172a" stroke="#fff" stroke-width="1.4"/></svg>`,
  css: `
    .f09-controls { display:flex; align-items:center; gap:10px; margin-bottom:18px; }
    .f09-search { margin-left:auto; width:430px; height:48px; min-height:48px; color:#0f172a; }
    .f09-table td { height:84px; }
    #f09-time1 { color:#b91c1c; font-weight:700; }
  `,
  timeline: `
    tl.fromTo("#f09-shell", { opacity:0 }, { opacity:1, duration:.6, ease:"power3.out" }, .1);
    tl.fromTo(".f09-controls > div", { opacity:0, y:-18 }, { opacity:1, y:0, duration:.45, stagger:.12, ease:"power3.out" }, .8);
    tl.fromTo("#f09-row1, #f09-row2, #f09-row3", { opacity:0, y:18 }, { opacity:1, y:0, duration:.52, stagger:.25, ease:"power3.out" }, 2.2);
    tl.fromTo("#f09-cursor", { opacity:0, x:0, y:0 }, { opacity:1, x:-1290, y:-510, duration:1.0, ease:"power2.inOut" }, 4.45);
    tl.to("#f09-old, #f09-cursor", { scale:.93, duration:.11, ease:"power1.in" }, 5.55);
    tl.to("#f09-old, #f09-cursor", { scale:1, duration:.3, ease:"power3.out" }, 5.66);
    tl.to("#f09-row2", { opacity:.12, y:-10, duration:.55, ease:"power3.out" }, 6.15);
    tl.to("#f09-time1", { color:"#dc2626", scale:1.08, duration:.45, ease:"power3.out" }, 8.2);
    tl.to("#f09-time1", { scale:1, duration:.4, ease:"power3.out" }, 8.65);
    typeText("#f09-search", "Ramírez", 10.8, 2.2);
    tl.to("#f09-row2", { opacity:0, duration:.35 }, 13.15);
    tl.to("#f09-row3", { opacity:.18, duration:.35 }, 13.4);
  `
});

frame({
  id: "10-devolver", duration: 20.395, title: "Devolver protege el inventario", step: "09 · Cerrar ciclo",
  body: `<div id="f10-error" class="hf-error f10-error">Este préstamo está ligado al inventario. Márcalo como devuelto antes de eliminarlo.</div><div class="f10-split"><div class="hf-panel f10-side"><div class="hf-eyebrow">Historial</div><div class="hf-card f10-loan"><div><h3>Cable HDMI 3 m</h3><p>Diego Ramírez · hace 2 días</p></div><span id="f10-loan-state" class="hf-chip red">En préstamo</span></div><div class="f10-actions"><div id="f10-return" class="hf-button">Devolver</div><div id="f10-trash" class="f10-trash">⌫</div></div></div><div class="f10-link"><span></span><b>mismo registro</b></div><div class="hf-panel f10-side"><div class="hf-eyebrow">Inventario</div><div class="hf-card f10-loan"><div><h3>Cable HDMI 3 m</h3><p>HDMI · a granel</p></div><span id="f10-stock-state" class="hf-chip red">Prestado</span></div><div id="f10-ok" class="hf-success f10-ok">Inventario actualizado automáticamente</div></div></div><svg id="f10-cursor" class="hf-cursor" viewBox="0 0 24 24"><path d="M5 2L5 20L10 15.5L13 22L16 20.5L13 14.5L19.5 14Z" fill="#0f172a" stroke="#fff" stroke-width="1.4"/></svg>`,
  css: `
    .f10-error { position:absolute; left:260px; right:260px; top:0; z-index:10; text-align:center; opacity:0; }
    .f10-split { display:grid; grid-template-columns:1fr 160px 1fr; gap:0; height:500px; padding-top:48px; }
    .f10-side { padding:30px; }
    .f10-loan { margin-top:78px; padding:26px; display:flex; align-items:center; justify-content:space-between; }
    .f10-loan h3 { margin:0; color:#0f172a; font:650 24px/1 "Space Grotesk"; }
    .f10-loan p { margin:9px 0 0; color:#64748b; font:450 15px/1 "Inter"; }
    .f10-actions { margin-top:28px; display:flex; gap:14px; justify-content:flex-end; }
    .f10-trash { width:52px; height:52px; border-radius:14px; display:grid; place-items:center; border:1.5px solid rgba(220,38,38,.25); color:#dc2626; font:700 24px/1 "Space Grotesk"; background:#fff; }
    .f10-link { display:flex; flex-direction:column; align-items:center; justify-content:center; color:#2563eb; font:650 12px/1 "Space Grotesk"; }
    .f10-link span { width:110px; height:4px; border-radius:2px; background:#2563eb; margin-bottom:14px; }
    .f10-ok { margin-top:28px; opacity:0; }
  `,
  timeline: `
    tl.fromTo("#f10-shell", { opacity:0 }, { opacity:1, duration:.6, ease:"power3.out" }, .1);
    tl.fromTo(".f10-side", { opacity:0, y:24 }, { opacity:1, y:0, duration:.65, stagger:.2, ease:"power3.out" }, 1.0);
    tl.fromTo(".f10-link", { opacity:0, scale:.8 }, { opacity:1, scale:1, duration:.55, ease:"power3.out" }, 2.4);
    tl.fromTo("#f10-cursor", { opacity:0, x:0, y:0 }, { opacity:1, x:-1160, y:-340, duration:1.15, ease:"power2.inOut" }, 5.1);
    tl.to("#f10-return, #f10-cursor", { scale:.92, duration:.11, ease:"power1.in" }, 7.05);
    tl.to("#f10-return, #f10-cursor", { scale:1, duration:.3, ease:"power3.out" }, 7.16);
    tl.set("#f10-loan-state", { textContent:"Devuelto" }, 8.0);
    tl.set("#f10-stock-state", { textContent:"Disponible" }, 8.0);
    tl.to("#f10-loan-state, #f10-stock-state", { backgroundColor:"rgba(21,128,61,.09)", borderColor:"rgba(21,128,61,.25)", color:"#15803d", duration:.55, ease:"power3.out" }, 8.0);
    tl.fromTo("#f10-ok", { opacity:0, y:16 }, { opacity:1, y:0, duration:.6, ease:"power3.out" }, 10.0);
    tl.set("#f10-loan-state", { textContent:"En préstamo", backgroundColor:"rgba(220,38,38,.08)", borderColor:"rgba(220,38,38,.22)", color:"#b91c1c" }, 13.35);
    tl.to("#f10-cursor", { x:-980, y:-340, duration:.9, ease:"power2.inOut" }, 13.55);
    tl.to("#f10-trash, #f10-cursor", { scale:.9, duration:.11, ease:"power1.in" }, 14.55);
    tl.to("#f10-trash, #f10-cursor", { scale:1, duration:.3, ease:"power3.out" }, 14.66);
    tl.fromTo("#f10-error", { opacity:0, y:-18 }, { opacity:1, y:0, duration:.65, ease:"power3.out" }, 15.2);
  `
});

frame({
  id: "11-cierre", duration: 4, title: "", step: "", cover: true,
  body: `<div class="f11-card"><div class="f11-ring r1"></div><div class="f11-ring r2"></div><img id="f11-logo" src="public/logo-p15.png" alt=""><div class="f11-copy"><div id="f11-line1">Del catálogo cuenta.</div><div id="f11-line2">A mano, no.</div></div><div class="f11-meta">Préstamos P15 · Video 4 de 6</div><div class="hf-progress" style="width:100%"></div></div>`,
  css: `
    .f11-card { position:absolute; left:70px; top:38px; width:1780px; height:820px; overflow:hidden; border-radius:22px; border:1.5px solid rgba(37,99,235,.2); background:#fff; display:flex; align-items:center; padding:0 140px; }
    .f11-ring { position:absolute; border-radius:50%; border:3px solid rgba(37,99,235,.16); }
    .f11-ring.r1 { width:760px; height:760px; right:-170px; top:30px; }.f11-ring.r2 { width:520px; height:520px; right:-50px; top:150px; }
    #f11-logo { width:148px; height:148px; object-fit:contain; position:relative; z-index:2; }
    .f11-copy { margin-left:80px; position:relative; z-index:2; color:#0f172a; font:700 74px/.98 "Space Grotesk"; letter-spacing:-.04em; }
    #f11-line2 { color:#2563eb; margin-top:12px; }
    .f11-meta { position:absolute; left:140px; bottom:66px; color:#64748b; font:550 18px/1 "Inter"; }
  `,
  timeline: `
    tl.fromTo("#f11-logo, .f11-ring", { opacity:0, scale:.9 }, { opacity:1, scale:1, duration:.7, stagger:.08, ease:"power3.out" }, .05);
    tl.fromTo("#f11-line1", { opacity:0, y:24 }, { opacity:1, y:0, duration:.55, ease:"power3.out" }, .8);
    tl.fromTo("#f11-line2", { opacity:0, y:24 }, { opacity:1, y:0, duration:.55, ease:"power3.out" }, 1.35);
    tl.fromTo(".f11-meta", { opacity:0 }, { opacity:1, duration:.45, ease:"power2.out" }, 1.9);
  `
});

console.log("✓ built 11 Préstamo Rápido frames");
