// ============================================================
// 23ER CUP — React + Supabase
// ============================================================
// SETUP:
//
// 1. SUPABASE_URL + SUPABASE_ANON_KEY unten eintragen.
//
// 2. Turnier-Tabelle (SQL Editor):
//
//   CREATE TABLE IF NOT EXISTS tournament_state (
//     id TEXT PRIMARY KEY DEFAULT 'main',
//     players JSONB NOT NULL DEFAULT '[]',
//     bracket JSONB NOT NULL DEFAULT '[]',
//     winner_tracker JSONB NOT NULL DEFAULT '{}',
//     updated_at TIMESTAMPTZ DEFAULT NOW()
//   );
//   INSERT INTO tournament_state (id, players, bracket, winner_tracker)
//   VALUES ('main', '[]', '[]', '{}')
//   ON CONFLICT (id) DO NOTHING;
//
// 3. Admin-E-Mails-Tabelle (SQL Editor):
//
//   CREATE TABLE IF NOT EXISTS admins (
//     email TEXT PRIMARY KEY
//   );
//   -- Beispiel-Eintrag (nach Anlegen des Users in Auth → Users):
//   INSERT INTO admins (email) VALUES ('admin1@23ercup.local');
//
// 4. Admins in Supabase anlegen:
//    Dashboard → Authentication → Users → "Add user"
//    Email: z.B. admin1@23ercup.local  ← frei wählbar, nie sichtbar
//    Password: das Passwort das dieser Admin eingibt
//    → Dann die gleiche Email in die admins-Tabelle eintragen (Schritt 3)
//    → Beliebig viele Admins so anlegen
//
// 5. RLS (Row Level Security) aktivieren:
//
//   ALTER TABLE tournament_state ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "public read"  ON tournament_state FOR SELECT USING (true);
//   CREATE POLICY "admin write"  ON tournament_state FOR ALL    USING (auth.role() = 'authenticated');
//
//   ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "public read admins" ON admins FOR SELECT USING (true);
//
// ============================================================

import { useState, useEffect, useRef } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── CONFIGURE THESE ───────────────────────────────────────────
const SUPABASE_URL      = import.meta.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.REACT_APP_SUPABASE_ANON_KEY;
// ─────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DEFAULT_PLAYERS = [
  "Flosse","Lave","Adox","mango","crafterlenis","Zyntrax",
  "abbezahlen","cr8q","icedout","ahmadcbd","LostCook",
  "xinkompetenter","maurice","snowy","endercamel","ben775577",
  "Betze","Eficience","Efe","196q","nader_"
];

// ── Global CSS ────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
:root{--neon-purple:#9146ff;--neon-cyan:#00f0ff;--neon-pink:#ff2d75;--neon-green:#00ff88;--bg-deep:#0a0a12;--bg-card:rgba(20,20,35,0.85);--bg-card-hover:rgba(40,30,80,0.9);--border-glow:rgba(145,70,255,0.3);}
html{overflow-x:hidden;}
body{font-family:'Rajdhani',sans-serif;background:var(--bg-deep);color:#e0e0f0;min-height:100vh;overflow-x:hidden;}
::-webkit-scrollbar{width:6px;height:6px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:var(--neon-purple);border-radius:3px;}
.bg-grid{position:fixed;inset:0;z-index:0;pointer-events:none;background-image:linear-gradient(rgba(145,70,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(145,70,255,0.04) 1px,transparent 1px);background-size:60px 60px;animation:gridMove 20s linear infinite;}
@keyframes gridMove{to{background-position:60px 60px;}}
.bg-orbs{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;}
.orb{position:absolute;border-radius:50%;filter:blur(80px);opacity:0.35;animation:orbFloat 12s ease-in-out infinite alternate;}
.orb:nth-child(1){width:500px;height:500px;background:var(--neon-purple);top:-10%;left:-5%;animation-duration:14s;}
.orb:nth-child(2){width:400px;height:400px;background:var(--neon-cyan);top:50%;right:-8%;animation-duration:18s;animation-delay:-4s;}
.orb:nth-child(3){width:350px;height:350px;background:var(--neon-pink);bottom:-10%;left:30%;animation-duration:16s;animation-delay:-8s;}
.orb:nth-child(4){width:300px;height:300px;background:var(--neon-green);top:20%;left:50%;animation-duration:20s;animation-delay:-2s;opacity:0.15;}
@keyframes orbFloat{0%{transform:translate(0,0) scale(1);}33%{transform:translate(40px,-60px) scale(1.1);}66%{transform:translate(-30px,40px) scale(0.9);}100%{transform:translate(20px,-20px) scale(1.05);}}
.particles{position:fixed;inset:0;z-index:1;pointer-events:none;overflow:hidden;}
.particle{position:absolute;width:2px;height:2px;border-radius:50%;animation:particleRise linear infinite;opacity:0;}
@keyframes particleRise{0%{opacity:0;transform:translateY(100vh) scale(0);}10%{opacity:1;}90%{opacity:1;}100%{opacity:0;transform:translateY(-10vh) scale(1);}}
.scanline{position:fixed;inset:0;z-index:2;pointer-events:none;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px);}
.content{position:relative;z-index:10;padding:20px 20px 60px;}
header{text-align:center;padding:30px 20px 10px;}
.title{font-family:'Orbitron',monospace;font-size:clamp(28px,5vw,56px);font-weight:900;letter-spacing:4px;background:linear-gradient(135deg,#fff 0%,var(--neon-cyan) 40%,var(--neon-purple) 70%,var(--neon-pink) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:titlePulse 3s ease-in-out infinite alternate;}
@keyframes titlePulse{0%{filter:drop-shadow(0 0 20px rgba(145,70,255,0.4));}100%{filter:drop-shadow(0 0 40px rgba(0,240,255,0.6));}}
.subtitle{font-family:'Orbitron',monospace;font-size:clamp(12px,2vw,18px);letter-spacing:8px;color:var(--neon-cyan);text-transform:uppercase;margin-top:4px;opacity:0.8;}
.twitch-btn{display:inline-flex;align-items:center;gap:10px;margin-top:18px;padding:12px 28px;background:linear-gradient(135deg,#9146ff,#6441a5);border:1px solid rgba(145,70,255,0.6);border-radius:50px;text-decoration:none;color:white;font-family:'Orbitron',monospace;font-weight:700;font-size:14px;letter-spacing:2px;box-shadow:0 0 20px rgba(145,70,255,0.4),inset 0 0 20px rgba(145,70,255,0.1);transition:all 0.4s cubic-bezier(0.175,0.885,0.32,1.275);position:relative;overflow:hidden;}
.twitch-btn::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:conic-gradient(transparent,rgba(255,255,255,0.1),transparent 30%);animation:btnSpin 3s linear infinite;}
@keyframes btnSpin{to{transform:rotate(360deg);}}
.twitch-btn:hover{transform:translateY(-3px) scale(1.05);box-shadow:0 0 40px rgba(145,70,255,0.7),0 10px 40px rgba(145,70,255,0.3);border-color:var(--neon-cyan);}
.live-dot{width:10px;height:10px;background:#ff2d2d;border-radius:50%;animation:livePulse 1.5s ease-in-out infinite;box-shadow:0 0 8px #ff2d2d;}
@keyframes livePulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.5;transform:scale(1.3);}}
.sync-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-left:8px;vertical-align:middle;transition:background 0.4s;}
.sync-dot.synced{background:#00ff88;box-shadow:0 0 6px #00ff88;}
.sync-dot.syncing{background:#ffd700;box-shadow:0 0 6px #ffd700;animation:livePulse 0.8s infinite;}
.sync-dot.error{background:#ff2d75;box-shadow:0 0 6px #ff2d75;}
.controls{display:flex;justify-content:center;gap:10px;margin:20px 0;flex-wrap:wrap;align-items:center;}
.ctrl-btn{padding:10px 22px;border:1px solid var(--border-glow);border-radius:8px;background:var(--bg-card);backdrop-filter:blur(10px);color:#c0c0e0;font-family:'Rajdhani',sans-serif;font-size:15px;font-weight:600;letter-spacing:1px;cursor:pointer;transition:all 0.3s ease;text-transform:uppercase;position:relative;overflow:hidden;}
.ctrl-btn::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--neon-purple),var(--neon-cyan));transform:scaleX(0);transition:transform 0.3s ease;}
.ctrl-btn:hover{background:var(--bg-card-hover);border-color:var(--neon-purple);color:white;transform:translateY(-2px);box-shadow:0 5px 20px rgba(145,70,255,0.3);}
.ctrl-btn:hover::after{transform:scaleX(1);}
.ctrl-btn.active{background:rgba(145,70,255,0.25);border-color:var(--neon-cyan);color:var(--neon-cyan);}
.ctrl-btn.danger:hover{background:rgba(255,45,117,0.2);border-color:var(--neon-pink);color:var(--neon-pink);}
.ctrl-btn.logout{border-color:rgba(145,70,255,0.15);color:rgba(145,70,255,0.5);font-size:13px;padding:8px 16px;}
.ctrl-btn.logout:hover{border-color:var(--neon-pink);color:var(--neon-pink);background:rgba(255,45,117,0.08);transform:none;}
.admin-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border:1px solid rgba(0,240,255,0.2);border-radius:20px;background:rgba(0,240,255,0.06);font-family:'Orbitron',monospace;font-size:10px;letter-spacing:2px;color:rgba(0,240,255,0.6);}

/* Login Modal */
.login-overlay{position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,0.75);backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;animation:fadeInOv 0.3s ease;}
@keyframes fadeInOv{from{opacity:0}to{opacity:1}}
.login-modal{background:rgba(14,14,26,0.98);border:1px solid rgba(145,70,255,0.3);border-radius:16px;padding:40px 36px;width:340px;max-width:90vw;box-shadow:0 0 60px rgba(145,70,255,0.2),0 0 120px rgba(0,240,255,0.05);animation:modalIn 0.35s cubic-bezier(0.175,0.885,0.32,1.275);position:relative;}
@keyframes modalIn{from{opacity:0;transform:translateY(20px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)}}
.login-logo{font-family:'Orbitron',monospace;font-size:11px;letter-spacing:4px;color:var(--neon-cyan);text-align:center;margin-bottom:6px;opacity:0.7;}
.login-title{font-family:'Orbitron',monospace;font-size:20px;font-weight:900;letter-spacing:2px;text-align:center;margin-bottom:28px;background:linear-gradient(135deg,#fff,var(--neon-purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.login-label{font-family:'Rajdhani',sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:rgba(145,70,255,0.7);margin-bottom:8px;display:block;}
.login-input{width:100%;background:rgba(145,70,255,0.06);border:1px solid rgba(145,70,255,0.25);border-radius:8px;color:#e0e0f0;font-family:'Rajdhani',sans-serif;font-size:16px;font-weight:600;padding:12px 14px;outline:none;letter-spacing:1px;margin-bottom:20px;transition:border-color 0.2s,box-shadow 0.2s;}
.login-input:focus{border-color:var(--neon-cyan);box-shadow:0 0 12px rgba(0,240,255,0.15);}
.login-input::placeholder{color:rgba(145,70,255,0.3);}
.login-btn{width:100%;padding:13px;border-radius:8px;border:1px solid rgba(145,70,255,0.5);background:linear-gradient(135deg,rgba(145,70,255,0.2),rgba(0,240,255,0.1));color:white;font-family:'Orbitron',monospace;font-size:13px;font-weight:700;letter-spacing:3px;cursor:pointer;transition:all 0.3s;box-shadow:0 0 20px rgba(145,70,255,0.15);}
.login-btn:hover{box-shadow:0 0 30px rgba(145,70,255,0.4);border-color:var(--neon-cyan);transform:translateY(-1px);}
.login-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none;}
.login-error{background:rgba(255,45,117,0.1);border:1px solid rgba(255,45,117,0.3);border-radius:6px;padding:9px 12px;margin-bottom:16px;font-size:13px;color:#ff8aaa;text-align:center;animation:fadeInOv 0.2s ease;}
.login-close{position:absolute;top:14px;right:14px;background:transparent;border:none;color:rgba(145,70,255,0.4);font-size:18px;cursor:pointer;padding:4px 8px;border-radius:4px;transition:color 0.2s;}
.login-close:hover{color:var(--neon-pink);}

/* Bracket */
.bracket{display:flex;align-items:center;justify-content:center;gap:0;padding:30px 10px;overflow-x:auto;min-height:70vh;}
.round{display:flex;flex-direction:column;justify-content:center;gap:0;min-width:180px;position:relative;}
.round-label{font-family:'Orbitron',monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--neon-cyan);text-align:center;margin-bottom:12px;opacity:0.7;}
.match-wrapper{display:flex;align-items:center;position:relative;}
.match{background:var(--bg-card);border:1px solid rgba(145,70,255,0.15);border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.5);backdrop-filter:blur(10px);transition:all 0.3s ease;width:170px;flex-shrink:0;position:relative;animation:matchIn 0.6s cubic-bezier(0.175,0.885,0.32,1.275) both;}
@keyframes matchIn{from{opacity:0;transform:translateY(20px) scale(0.95);}to{opacity:1;transform:translateY(0) scale(1);}}
.match::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--neon-purple),var(--neon-cyan),transparent);opacity:0;transition:opacity 0.3s;}
.match:hover::before{opacity:1;}
.match:hover{border-color:rgba(145,70,255,0.4);box-shadow:0 4px 30px rgba(145,70,255,0.2);transform:scale(1.03);}
.player{padding:10px 14px;cursor:pointer;border-bottom:1px solid rgba(145,70,255,0.08);transition:all 0.25s ease;font-family:'Rajdhani',sans-serif;font-size:15px;font-weight:600;letter-spacing:0.5px;display:flex;align-items:center;gap:8px;position:relative;overflow:hidden;}
.player:last-child{border-bottom:none;}
.player::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--neon-purple);transform:scaleY(0);transition:transform 0.25s ease;}
.player:hover{background:rgba(145,70,255,0.15);color:white;padding-left:18px;}
.player:hover::before{transform:scaleY(1);}
.player .seed{font-size:11px;color:rgba(145,70,255,0.6);font-family:'Orbitron',monospace;min-width:18px;}
.player.winner{background:linear-gradient(90deg,rgba(0,255,136,0.15),rgba(0,255,136,0.05));color:var(--neon-green);text-shadow:0 0 10px rgba(0,255,136,0.3);}
.player.winner::before{background:var(--neon-green);transform:scaleY(1);box-shadow:0 0 10px var(--neon-green);}
.player.bye{opacity:0.3;font-style:italic;cursor:default;}
.player.readonly{cursor:default;}.player.readonly:hover{background:transparent;color:inherit;padding-left:14px;}.player.readonly:hover::before{transform:scaleY(0);}
.connector{width:30px;flex-shrink:0;position:relative;}
.connector svg{position:absolute;top:0;left:0;width:100%;height:100%;overflow:visible;}
.connector svg line,.connector svg path{stroke:rgba(145,70,255,0.25);stroke-width:1.5;fill:none;}

/* Champion */
.champion-display{display:none;position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.85);backdrop-filter:blur(20px);align-items:center;justify-content:center;flex-direction:column;gap:20px;animation:fadeInOv 0.5s ease;}
.champion-display.active{display:flex;}
.trophy{font-size:80px;animation:trophyB 1s ease infinite;}
@keyframes trophyB{0%,100%{transform:translateY(0) rotate(0deg);}25%{transform:translateY(-20px) rotate(-5deg);}75%{transform:translateY(-10px) rotate(5deg);}}
.champion-name{font-family:'Orbitron',monospace;font-size:clamp(32px,6vw,64px);font-weight:900;background:linear-gradient(135deg,#ffd700,#ffaa00,#fff,#ffd700);background-size:300% 300%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:goldS 2s ease infinite;}
@keyframes goldS{0%{background-position:0% 50%;}50%{background-position:100% 50%;}100%{background-position:0% 50%;}}
.champion-sub{font-family:'Orbitron',monospace;font-size:14px;letter-spacing:6px;color:var(--neon-cyan);}
.champion-close{margin-top:20px;padding:12px 30px;background:transparent;border:1px solid rgba(255,215,0,0.4);border-radius:50px;color:#ffd700;font-family:'Orbitron',monospace;font-size:13px;letter-spacing:2px;cursor:pointer;transition:all 0.3s;}
.champion-close:hover{background:rgba(255,215,0,0.1);box-shadow:0 0 30px rgba(255,215,0,0.3);}
.confetti-piece{position:fixed;width:8px;height:8px;z-index:1001;animation:confettiF linear forwards;pointer-events:none;}
@keyframes confettiF{0%{transform:translateY(-10vh) rotate(0deg);opacity:1;}100%{transform:translateY(110vh) rotate(720deg);opacity:0;}}

/* Edit Panel */
.edit-panel{position:fixed;top:0;right:0;bottom:0;width:320px;z-index:500;background:rgba(10,10,18,0.97);border-left:1px solid rgba(145,70,255,0.25);backdrop-filter:blur(20px);display:flex;flex-direction:column;animation:panelIn 0.3s cubic-bezier(0.175,0.885,0.32,1.275);box-shadow:-10px 0 40px rgba(0,0,0,0.6);}
@keyframes panelIn{from{transform:translateX(100%);opacity:0;}to{transform:translateX(0);opacity:1;}}
.edit-panel-header{padding:20px 18px 14px;border-bottom:1px solid rgba(145,70,255,0.15);display:flex;align-items:center;justify-content:space-between;}
.edit-panel-title{font-family:'Orbitron',monospace;font-size:13px;letter-spacing:3px;color:var(--neon-cyan);text-transform:uppercase;}
.edit-panel-count{font-family:'Orbitron',monospace;font-size:11px;color:rgba(145,70,255,0.7);background:rgba(145,70,255,0.1);border:1px solid rgba(145,70,255,0.2);border-radius:20px;padding:2px 10px;}
.edit-panel-list{flex:1;overflow-y:auto;padding:10px 0;}
.edit-player-row{display:flex;align-items:center;gap:8px;padding:6px 14px;transition:background 0.2s;}
.edit-player-row:hover{background:rgba(145,70,255,0.07);}
.edit-player-num{font-family:'Orbitron',monospace;font-size:10px;color:rgba(145,70,255,0.5);min-width:22px;text-align:right;}
.edit-player-input{flex:1;background:rgba(0,240,255,0.05);border:1px solid rgba(145,70,255,0.2);border-radius:6px;color:#e0e0f0;font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:600;padding:5px 10px;outline:none;letter-spacing:0.5px;transition:border-color 0.2s,box-shadow 0.2s;}
.edit-player-input:focus{border-color:var(--neon-cyan);box-shadow:0 0 8px rgba(0,240,255,0.2);}
.delete-btn{width:26px;height:26px;border-radius:6px;border:1px solid rgba(255,45,117,0.2);background:transparent;color:rgba(255,45,117,0.5);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0;}
.delete-btn:hover{background:rgba(255,45,117,0.15);border-color:var(--neon-pink);color:var(--neon-pink);}
.edit-panel-add{padding:12px 14px;border-top:1px solid rgba(145,70,255,0.15);display:flex;gap:8px;}
.add-input{flex:1;background:rgba(0,255,136,0.05);border:1px solid rgba(0,255,136,0.2);border-radius:6px;color:#e0e0f0;font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:600;padding:8px 12px;outline:none;letter-spacing:0.5px;transition:border-color 0.2s,box-shadow 0.2s;}
.add-input:focus{border-color:var(--neon-green);box-shadow:0 0 8px rgba(0,255,136,0.2);}
.add-input::placeholder{color:rgba(0,255,136,0.3);}
.add-btn{padding:8px 14px;border-radius:6px;border:1px solid rgba(0,255,136,0.3);background:rgba(0,255,136,0.08);color:var(--neon-green);cursor:pointer;font-family:'Orbitron',monospace;font-size:13px;font-weight:700;transition:all 0.2s;flex-shrink:0;}
.add-btn:hover{background:rgba(0,255,136,0.18);box-shadow:0 0 12px rgba(0,255,136,0.2);}
.edit-panel-footer{padding:14px;border-top:1px solid rgba(145,70,255,0.15);display:flex;gap:8px;}
.save-btn{flex:1;padding:11px;border-radius:8px;border:1px solid rgba(0,240,255,0.4);background:rgba(0,240,255,0.1);color:var(--neon-cyan);cursor:pointer;font-family:'Orbitron',monospace;font-size:12px;letter-spacing:2px;transition:all 0.2s;}
.save-btn:hover{background:rgba(0,240,255,0.2);box-shadow:0 0 16px rgba(0,240,255,0.2);}
.cancel-btn{padding:11px 16px;border-radius:8px;border:1px solid rgba(145,70,255,0.2);background:transparent;color:rgba(145,70,255,0.7);cursor:pointer;font-family:'Orbitron',monospace;font-size:12px;letter-spacing:1px;transition:all 0.2s;}
.cancel-btn:hover{border-color:var(--neon-pink);color:var(--neon-pink);}
.bracket-dimmed{filter:brightness(0.4);pointer-events:none;transition:filter 0.3s;}
@media(max-width:900px){.bracket{flex-direction:column;align-items:center;gap:30px;}.connector{display:none;}.round{min-width:auto;width:100%;max-width:350px;}.match{width:100%;}.edit-panel{width:100%;}}
`;

// ── Helpers ───────────────────────────────────────────────────
function getRoundName(roundIndex, totalRounds) {
  const r = totalRounds - roundIndex;
  if (r === 1) return "FINALE";
  if (r === 2) return "HALBFINALE";
  if (r === 3) return "VIERTELFINALE";
  return `RUNDE ${roundIndex + 1}`;
}

function buildBracket(players) {
  let p = [...players];
  while (p.length % 2 !== 0) p.push("BYE");
  const bracket = [[]];
  const winnerTracker = {};
  for (let i = 0; i < p.length; i += 2) bracket[0].push([p[i], p[i + 1]]);
  for (let m = 0; m < bracket[0].length; m++) {
    const match = bracket[0][m];
    if (match[0] === "BYE" && match[1] !== "BYE") autoAdvance(bracket, winnerTracker, 0, m, match[1]);
    else if (match[1] === "BYE" && match[0] !== "BYE") autoAdvance(bracket, winnerTracker, 0, m, match[0]);
  }
  return { bracket, winnerTracker };
}

function autoAdvance(bracket, winnerTracker, r, m, player) {
  winnerTracker[`${r}-${m}`] = player;
  if (!bracket[r + 1]) {
    const nextLen = Math.ceil(bracket[r].length / 2);
    bracket[r + 1] = Array.from({ length: nextLen }, () => ["", ""]);
  }
  bracket[r + 1][Math.floor(m / 2)][m % 2] = player;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function spawnConfetti() {
  const colors = ["#ffd700","#ff2d75","#00f0ff","#9146ff","#00ff88","#ff6b35"];
  for (let i = 0; i < 80; i++) {
    const c = document.createElement("div");
    c.className = "confetti-piece";
    c.style.left = Math.random() * 100 + "vw";
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDuration = (2 + Math.random() * 3) + "s";
    c.style.animationDelay = (Math.random() * 1.5) + "s";
    c.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
    const sz = (5 + Math.random() * 8) + "px";
    c.style.width = c.style.height = sz;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 5000);
  }
}

// ── Particles ─────────────────────────────────────────────────
function Particles() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const colors = ["#9146ff","#00f0ff","#ff2d75","#00ff88"];
    for (let i = 0; i < 50; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      p.style.left = Math.random() * 100 + "vw";
      p.style.animationDuration = (8 + Math.random() * 12) + "s";
      p.style.animationDelay = (Math.random() * 10) + "s";
      const sz = (1 + Math.random() * 3) + "px";
      p.style.width = p.style.height = sz;
      const col = colors[Math.floor(Math.random() * colors.length)];
      p.style.background = col;
      p.style.boxShadow = `0 0 6px ${col}, 0 0 12px ${col}`;
      c.appendChild(p);
    }
  }, []);
  return <div className="particles" ref={ref} />;
}

// ── Login Modal ───────────────────────────────────────────────
function LoginModal({ onClose, onSuccess }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleLogin() {
    const pw = password.trim();
    if (!pw) return;
    setLoading(true);
    setError("");

    try {
      // Fetch all admin emails from public admins table
      const { data: adminRows, error: fetchErr } = await supabase
        .from("admins")
        .select("email");

      if (fetchErr || !adminRows || adminRows.length === 0) {
        setError("Keine Admins konfiguriert.");
        setLoading(false);
        return;
      }

      // Try each email with the entered password — first match wins
      let loggedIn = false;
      for (const row of adminRows) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: row.email,
          password: pw,
        });
        if (!signInErr) { loggedIn = true; break; }
      }

      if (loggedIn) {
        onSuccess();
      } else {
        setError("Falsches Passwort.");
      }
    } catch {
      setError("Fehler beim Login.");
    }
    setLoading(false);
  }

  return (
    <div className="login-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="login-modal">
        <button className="login-close" onClick={onClose}>✕</button>
        <div className="login-logo">23ER CUP</div>
        <div className="login-title">ADMIN LOGIN</div>
        <label className="login-label">Passwort</label>
        {error && <div className="login-error">{error}</div>}
        <input
          className="login-input"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(""); }}
          onKeyDown={e => { if (e.key === "Enter") handleLogin(); if (e.key === "Escape") onClose(); }}
          autoFocus
        />
        <button className="login-btn" onClick={handleLogin} disabled={loading}>
          {loading ? "PRÜFE…" : "EINLOGGEN"}
        </button>
      </div>
    </div>
  );
}

// ── Bracket components ────────────────────────────────────────
function PlayerRow({ player, pi, isWinner, isAdmin, onAdvance }) {
  if (player === "BYE") return <div className="player bye"><span className="seed">—</span>BYE</div>;
  if (player === "")    return <div className="player" style={{ cursor:"default" }}><span className="seed">?</span><span style={{ opacity:0.3 }}>TBD</span></div>;
  const clickable = isAdmin && !isWinner;
  return (
    <div
      className={`player${isWinner ? " winner" : ""}${!isAdmin ? " readonly" : ""}`}
      onClick={clickable ? onAdvance : undefined}
      style={!isAdmin ? { cursor:"default" } : undefined}
    >
      <span className="seed">{pi + 1}</span>{player}
    </div>
  );
}

function Match({ match, r, m, winnerTracker, isAdmin, onAdvance, style }) {
  const key = `${r}-${m}`;
  return (
    <div className="match" style={style}>
      {match.map((player, pi) => (
        <PlayerRow
          key={pi}
          player={player}
          pi={pi}
          isWinner={winnerTracker[key] === player && player !== "" && player !== "BYE"}
          isAdmin={isAdmin}
          onAdvance={() => onAdvance(r, m, player)}
        />
      ))}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────
export default function App() {
  const [players, setPlayers]               = useState(DEFAULT_PLAYERS);
  const [bracket, setBracket]               = useState([]);
  const [winnerTracker, setWinnerTracker]   = useState({});
  const [champion, setChampion]             = useState(null);

  // Auth
  const [isAdmin, setIsAdmin]               = useState(false);
  const [showLogin, setShowLogin]           = useState(false);

  // Edit panel
  const [editMode, setEditMode]             = useState(false);
  const [editPlayers, setEditPlayers]       = useState([]);
  const [addName, setAddName]               = useState("");

  // Sync
  const [syncStatus, setSyncStatus]         = useState("synced");
  const [loaded, setLoaded]                 = useState(false);
  const isSaving                            = useRef(false);
  const addInputRef                         = useRef(null);

  // Inject CSS once
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Restore session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setIsAdmin(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAdmin(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load tournament data
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("tournament_state")
        .select("*")
        .eq("id", "main")
        .single();

      if (error || !data) {
        setSyncStatus("error");
        const { bracket: b, winnerTracker: w } = buildBracket(DEFAULT_PLAYERS);
        setBracket(b); setWinnerTracker(w); setLoaded(true);
        return;
      }

      if (data.players && data.players.length > 0) {
        setPlayers(data.players);
        setBracket(data.bracket || []);
        setWinnerTracker(data.winner_tracker || {});
      } else {
        const { bracket: b, winnerTracker: w } = buildBracket(DEFAULT_PLAYERS);
        setBracket(b); setWinnerTracker(w);
        await saveToSupabase(DEFAULT_PLAYERS, b, w);
      }
      setSyncStatus("synced");
      setLoaded(true);
    }
    load();
  }, []);

  // Polling — alle 3 Sekunden live aktualisieren
  useEffect(() => {
    const poll = async () => {
      if (isSaving.current) return;
      const { data, error } = await supabase
        .from("tournament_state")
        .select("players, bracket, winner_tracker")
        .eq("id", "main")
        .single();
      if (error || !data) return;
      setPlayers(data.players || []);
      setBracket(data.bracket || []);
      setWinnerTracker(data.winner_tracker || {});
    };
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, []);

  // ── DB save ───────────────────────────────────────────────────
  async function saveToSupabase(pl, br, wt) {
    isSaving.current = true;
    setSyncStatus("syncing");
    const { error } = await supabase
      .from("tournament_state")
      .upsert({ id: "main", players: pl, bracket: br, winner_tracker: wt, updated_at: new Date().toISOString() });
    isSaving.current = false;
    setSyncStatus(error ? "error" : "synced");
    if (error) console.error("Supabase save error:", error);
  }

  // ── Auth ──────────────────────────────────────────────────────
  async function handleLogout() {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setEditMode(false);
  }

  // ── Bracket actions ───────────────────────────────────────────
  function handleAdvance(r, m, player) {
    if (!player || player === "BYE") return;
    const key    = `${r}-${m}`;
    const newWT  = { ...winnerTracker, [key]: player };
    const newBr  = bracket.map(round => round.map(match => [...match]));

    if (newBr[r].length === 1) {
      setChampion(player); setWinnerTracker(newWT); setBracket(newBr);
      spawnConfetti(); saveToSupabase(players, newBr, newWT); return;
    }
    if (!newBr[r + 1]) {
      newBr[r + 1] = Array.from({ length: Math.ceil(newBr[r].length / 2) }, () => ["", ""]);
    }
    newBr[r + 1][Math.floor(m / 2)][m % 2] = player;
    setBracket(newBr); setWinnerTracker(newWT);
    saveToSupabase(players, newBr, newWT);
  }

  function handleShuffle() {
    const shuffled = shuffle(players);
    const { bracket: b, winnerTracker: w } = buildBracket(shuffled);
    setPlayers(shuffled); setBracket(b); setWinnerTracker(w); setChampion(null);
    saveToSupabase(shuffled, b, w);
  }

  function handleReset() {
    const { bracket: b, winnerTracker: w } = buildBracket(players);
    setBracket(b); setWinnerTracker(w); setChampion(null);
    saveToSupabase(players, b, w);
  }

  // ── Edit panel ────────────────────────────────────────────────
  function openEditMode()  { setEditPlayers([...players]); setAddName(""); setEditMode(true); }
  function cancelEditMode(){ setEditMode(false); setEditPlayers([]); setAddName(""); }

  function saveEditMode() {
    const cleaned = editPlayers.map(p => p.trim()).filter(p => p && p !== "BYE");
    if (cleaned.length < 2) return;
    const { bracket: b, winnerTracker: w } = buildBracket(cleaned);
    setPlayers(cleaned); setBracket(b); setWinnerTracker(w); setChampion(null);
    saveToSupabase(cleaned, b, w);
    setEditMode(false); setEditPlayers([]); setAddName("");
  }

  function handleEditNameChange(idx, val) {
    setEditPlayers(prev => prev.map((p, i) => i === idx ? val : p));
  }

  function handleDeletePlayer(idx) {
    setEditPlayers(prev => prev.filter((_, i) => i !== idx));
  }

  function handleAddPlayer() {
    const name = addName.trim();
    if (!name) return;
    setEditPlayers(prev => [...prev, name]);
    setAddName("");
    addInputRef.current?.focus();
  }

  // ── Render ────────────────────────────────────────────────────
  const totalRounds = bracket.length;

  if (!loaded) return (
    <>
      <div className="bg-grid" />
      <div className="bg-orbs"><div className="orb"/><div className="orb"/><div className="orb"/><div className="orb"/></div>
      <div className="scanline" />
      <div className="content" style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"80vh" }}>
        <div style={{ fontFamily:"'Orbitron',monospace", color:"var(--neon-cyan)", letterSpacing:"4px", fontSize:"14px" }}>LOADING…</div>
      </div>
    </>
  );

  return (
    <>
      <div className="bg-grid" />
      <div className="bg-orbs"><div className="orb"/><div className="orb"/><div className="orb"/><div className="orb"/></div>
      <Particles />
      <div className="scanline" />

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={() => setShowLogin(false)} />}

      {/* Champion */}
      <div className={`champion-display${champion ? " active" : ""}`}>
        <div className="trophy">🏆</div>
        <div className="champion-sub">CHAMPION</div>
        <div className="champion-name">{champion?.toUpperCase()}</div>
        <button className="champion-close" onClick={() => setChampion(null)}>CLOSE</button>
      </div>

      <div className="content">
        <header>
          <div className="logo-area">
            <div className="title">23ER CUP</div>
            <div className="subtitle">Open Championship</div>
          </div>
          <a className="twitch-btn" href="https://www.twitch.tv/lave23g" target="_blank" rel="noreferrer">
            <div className="live-dot" /><span>TWITCH.TV/LAVE23G</span>
          </a>
        </header>

        <div className="controls">
          {/* Admin tools */}
          {isAdmin && !editMode && (
            <>
              <button className="ctrl-btn" onClick={openEditMode}>✏️ Edit</button>
              <button className="ctrl-btn" onClick={handleShuffle}>🔀 Shuffle</button>
              <button className="ctrl-btn danger" onClick={handleReset}>🔄 Reset</button>
            </>
          )}
          {isAdmin && editMode && (
            <button className="ctrl-btn active">✏️ Edit Mode aktiv</button>
          )}

          {/* Auth button */}
          {!isAdmin
            ? <button className="ctrl-btn" onClick={() => setShowLogin(true)}>🔐 Admin</button>
            : <>
                <span className="admin-badge">⚡ ADMIN</span>
                <button className="ctrl-btn logout" onClick={handleLogout}>Logout</button>
              </>
          }

          <span className={`sync-dot ${syncStatus}`}
            title={syncStatus === "synced" ? "Sync OK" : syncStatus === "syncing" ? "Speichern…" : "Sync-Fehler"} />
        </div>

        {/* Edit Panel */}
        {editMode && isAdmin && (
          <div className="edit-panel">
            <div className="edit-panel-header">
              <span className="edit-panel-title">✏️ Spieler</span>
              <span className="edit-panel-count">{editPlayers.length} Spieler</span>
            </div>
            <div className="edit-panel-list">
              {editPlayers.map((p, idx) => (
                <div className="edit-player-row" key={idx}>
                  <span className="edit-player-num">{idx + 1}</span>
                  <input
                    className="edit-player-input"
                    value={p}
                    onChange={e => handleEditNameChange(idx, e.target.value)}
                    spellCheck={false}
                  />
                  <button className="delete-btn" onClick={() => handleDeletePlayer(idx)}>✕</button>
                </div>
              ))}
            </div>
            <div className="edit-panel-add">
              <input
                ref={addInputRef}
                className="add-input"
                placeholder="Neuer Spieler…"
                value={addName}
                onChange={e => setAddName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddPlayer()}
                spellCheck={false}
              />
              <button className="add-btn" onClick={handleAddPlayer}>＋</button>
            </div>
            <div className="edit-panel-footer">
              <button className="save-btn" onClick={saveEditMode}>💾 SPEICHERN</button>
              <button className="cancel-btn" onClick={cancelEditMode}>✖</button>
            </div>
          </div>
        )}

        <div className={`bracket${editMode ? " bracket-dimmed" : ""}`}>
          {bracket.map((round, r) => (
            <div key={r} style={{ display:"contents" }}>
              {r > 0 && <div className="connector" style={{ alignSelf:"stretch" }} />}
              <div className="round">
                <div className="round-label">{getRoundName(r, totalRounds)}</div>
                {round.map((match, m) => {
                  const gap = Math.pow(2, r) * 8;
                  return (
                    <div className="match-wrapper" key={m}>
                      <Match
                        match={match} r={r} m={m}
                        winnerTracker={winnerTracker}
                        isAdmin={isAdmin}
                        onAdvance={handleAdvance}
                        style={{ marginTop: m === 0 ? 0 : gap, marginBottom: gap }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
