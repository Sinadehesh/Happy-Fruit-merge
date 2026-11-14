// Plays Zombie Bomber headless, level after level, to check the balance (needs Playwright).
//   node tools/bomber_balance.js [levels, default 100] [good|sloppy] [first level, default 1] [seed, default 1]
// Two automated players: "good" drops often, thinks often and aims well; "sloppy" is slower and aims worse. Both
// merge by dropping onto a bomb of the same size, throw where a blast does the most (kills, and wearing tough
// zombies down), and spend every coin on the cheapest upgrade (or mastery star). They use no boosters, revives or ads, so real
// players have it a bit easier. A lost level is played again (coins picked up are kept); after 6 losses in a row
// the run stops there. Prints a summary for every 10 levels: play time a level, tries, losses, the lowest base
// health, 3-star wins, the threat level and the upgrades.
// To check late levels without playing up to them, start with upgrades and a threat level, e.g. everything maxed:
//   UP=8,12,20,16 THREAT=1.2 node tools/bomber_balance.js 10 good 300
// and MASTERY=30,25,15,10 for the mastery stars a player would have bought by then.
// VERBOSE=1 also prints every try (kills, time, coins, the biggest bomb merged...).
const { openGame } = require('./bomber_media/page');
const LEVELS = +(process.argv[2] || 100), SKILL = process.argv[3] || 'good', FIRST = +(process.argv[4] || 1), SEED = +(process.argv[5] || 1);
const START = { level: FIRST, coins: 0, tut: true, flags: { starter: 1, boosterHint: 1 } };
if (process.env.UP) { const [soldiers, weapons, base, bombs] = process.env.UP.split(',').map(Number); START.up = { soldiers, weapons, base, bombs }; START.bestTier = 11; }
if (process.env.THREAT) START.threat = +process.env.THREAT;
if (process.env.MASTERY) { const [soldiers, weapons, base, bombs] = process.env.MASTERY.split(',').map(Number); START.mastery = { soldiers, weapons, base, bombs }; }

(async () => {
  const g = await openGame({ save: START, seed: SEED, dpr: 1 });
  const page = g.page;
  const res = await page.evaluate(async ({ LEVELS, SKILL }) => {
    window.requestAnimationFrame = () => 0;   // stop the real loop; we drive it
    await new Promise(r => setTimeout(r, 100));
    const DT = 1 / 60;
    const P = SKILL === 'good' ? { dropEvery: 0.6, thinkEvery: 1.5, minKills: 3, aim: 20, look: 4 } : { dropEvery: 1.0, thinkEvery: 2.4, minKills: 2, aim: 40, look: 2 };
    const results = [];
    const buy = () => {   // spend coins on the cheapest upgrade, again and again
      for (; !window.__noBuy;) {
        const opts = Object.keys(UPGRADES).map(k => ({ k, p: nextPrice(k) })).sort((a, b) => a.p - b.p);   // a maxed track: mastery stars
        if (save.coins < opts[0].p) break;
        save.coins -= opts[0].p;
        if (isMaxed(opts[0].k)) save.mastery[opts[0].k]++; else save.up[opts[0].k]++;
      }
      writeSave(); setupBase();
    };
    let tries = 0;
    startLevel(save.level);
    let dropT = 0, thinkT = 0, simT = 0, levelStart = 0, maxAlive = 0, minHp = 1, endHp = 1;
    while (results.length < 400) {
      update(DT, DT); simT += DT;
      if (state === 'play') {
        maxAlive = Math.max(maxAlive, zombies.filter(z => !z.dead).length); minHp = Math.min(minHp, baseHP / baseMax); endHp = baseHP / baseMax;
        dropT -= DT; thinkT -= DT;
        if (dropT <= 0 && !jammed && dropCd <= 0) {
          // drop on top of a matching bomb if there is one
          const same = bayBombs().filter(b => b.tier === currentTier && !b.isDropping);
          dropperX = same.length ? L.bay.x + same[Math.floor(Math.random() * same.length)].position.x : L.bay.x + 40 + Math.random() * (L.bay.w - 80);
          dropperX = clampDropX(dropperX); tryDrop(); dropT = P.dropEvery * (0.8 + Math.random() * 0.4);
        }
        if (thinkT <= 0) {
          thinkT = P.thinkEvery * (0.8 + Math.random() * 0.4);
          const alive = zombies.filter(z => !z.dead && z.x < W - 10);
          const bombs = bayBombs().filter(b => !b.isDropping && !b.isGrowing && !b.isMerging).sort((a, b) => b.tier - a.tier).slice(0, P.look);
          if (alive.length && bombs.length) {
            // best target and bomb: most kills; urgent if zombies are at the base or the bay is full
            const urgent = alive.some(z => z.x < 200) || jammed || overT > 0.3 || bombs.length > 12;
            let best = null;
            for (const b of bombs) {
              const R = blastRadius(b.tier), dmg = blastDamage(b.tier);
              for (const a of alive) {
                // like a player: kills count, and so does wearing the tough ones down for the next bomb
                let kills = 0, worth = 0;
                for (const z of alive) {
                  if (Math.abs(z.x - a.x) > R + 12 * z.type.size) continue;
                  if (z.hp <= dmg) { kills++; worth += 1; } else worth += dmg / z.hp;
                }
                const near = a.x < 200 ? 2 : 0;
                const score = kills * 2 + worth * 2 + near - b.tier * 0.3;
                if (!best || score > best.score) best = { b, x: a.x - 8, kills, worth, score };
              }
            }
            if (best && (best.kills >= P.minKills || best.worth >= P.minKills + 1 || (urgent && best.worth >= 0.6) || (urgent && alive.some(z => z.x < 170)))) {
              const b = best.b;
              Composite.remove(engine.world, b);
              throwBomb(b.tier, L.bay.x + b.position.x, L.bay.y - 20, clamp(best.x + (Math.random() * 2 - 1) * P.aim, 24, W - 8)); dropT = Math.max(dropT, 0.9);
            }
          }
        }
      } else if (state === 'shop' || state === 'won') {
        results.push({ level, result: 'cleared', threat: +(save.threat || 1).toFixed(2), tries: tries + 1, hp: Math.round(endHp * 100), minHp: Math.round(minHp * 100), time: Math.round(simT - levelStart), stars, coins: save.coins, kills, total: totalZombies, maxAlive, best: bestMerge, up: Object.values(save.up).join(',') + (Object.values(save.mastery).some(Boolean) ? ' +' + Object.values(save.mastery).join(',') : '') });
        tries = 0;
        if (results.filter(r => r.result === 'cleared').length >= LEVELS || state === 'won') break;
        buy(); startLevel(save.level); levelStart = simT; maxAlive = 0; minHp = 1; endHp = 1;
      } else if (state === 'over' && stateT > 1.5) {
        tries++;
        results.push({ level, result: 'LOST', threat: +(save.threat || 1).toFixed(2), tries, kills, total: totalZombies, time: Math.round(simT - levelStart), coins: save.coins, maxAlive, best: bestMerge, up: Object.values(save.up).join(',') + (Object.values(save.mastery).some(Boolean) ? ' +' + Object.values(save.mastery).join(',') : '') });
        if (tries >= 6) break;
        openShop(); buy(); startLevel(save.level); levelStart = simT; maxAlive = 0; minHp = 1; endHp = 1;
      }
      if (simT - levelStart > 600) { results.push({ level, result: 'STUCK', waveState, alive: zombies.filter(z => !z.dead).length, timers: timers.length, thrown: thrown.length }); break; }
    }
    return results;
  }, { LEVELS, SKILL });
  const lines = [];
  for (let b = 0; b < LEVELS; b += 10) {
    const rs = res.filter(r => r.level >= FIRST + b && r.level < FIRST + b + 10);
    if (!rs.length) continue;
    const cl = rs.filter(r => r.result === 'cleared'), lost = rs.filter(r => r.result !== 'cleared');
    const t = rs.reduce((s, r) => s + (r.time || 0), 0), last = rs[rs.length - 1];
    lines.push(`  ${String(FIRST + b).padStart(3)}-${String(FIRST + b + 9).padEnd(3)}  ${String(Math.round(t / Math.max(1, cl.length))).padStart(9)}  ${(cl.reduce((s, r) => s + r.tries, 0) / Math.max(1, cl.length)).toFixed(2).padStart(6)}  ${String(lost.length).padStart(6)}  ${String(Math.min(...cl.map(r => r.minHp), 100)).padStart(9)}  ${String(cl.filter(r => r.stars === 3).length).padStart(6)}  ${(rs.reduce((s, r) => s + (r.threat || 1), 0) / rs.length).toFixed(2).padStart(6)}  ${String(last.up).padStart(14)}`);
  }
  if (process.env.VERBOSE) res.forEach(r => console.log(JSON.stringify(r)));   // every try, one line each
  const lostAt = res.filter(r => r.result !== 'cleared').map(r => r.level);
  console.log(`${SKILL} player, levels ${FIRST}-${FIRST + LEVELS - 1}, seed ${SEED}`);
  console.log('  levels   play s/level  tries  losses  low base%  3-star  threat  upgrades (sol, wpn, base, bombs)');
  console.log(lines.join('\n'));
  console.log(`  ${res.filter(r => r.result === 'cleared').length} levels cleared in ${Math.round(res.reduce((s, r) => s + (r.time || 0), 0) / 60)} min of play, ${lostAt.length} losses${lostAt.length ? ' (levels ' + lostAt.join(', ') + ')' : ''}${res.some(r => r.result === 'STUCK') ? ', STUCK' : ''}`);
  if (g.errors().length) console.log(g.errors().join('\n'));
  await g.close();
})();
