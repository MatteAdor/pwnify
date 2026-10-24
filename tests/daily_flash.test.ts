import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDailyFlashDraw, simulateDeterministicDraw } from '../src/utils/dailyFlash';

describe('Daily Flash Pure Logic Suite (Retention B0)', () => {
  it('deterministic draw produces identical outcome for identical (user, date, seed)', () => {
    const draw1 = simulateDeterministicDraw('user-123', '2026-10-24', 'server-secret-key-xyz');
    const draw2 = simulateDeterministicDraw('user-123', '2026-10-24', 'server-secret-key-xyz');

    assert.equal(draw1.isFlash, draw2.isFlash);
    assert.equal(draw1.xpBonus, draw2.xpBonus);
  });

  it('draw changes across calendar dates for same user', () => {
    // Collect 10 consecutive dates
    const results = [];
    for (let day = 1; day <= 10; day++) {
      const dateStr = `2026-10-${day < 10 ? '0' + day : day}`;
      results.push(simulateDeterministicDraw('user-abc', dateStr, 'seed-secret-999'));
    }

    // Must not be all identical
    const allFlash = results.every(r => r.isFlash);
    assert.equal(allFlash, false, 'Draws should vary across dates');
  });

  it('evaluates authoritative server response accurately when flash is true', () => {
    const serverPayload = {
      is_flash: true,
      xp_bonus: 50,
      draw_date: '2026-10-24'
    };

    const res = evaluateDailyFlashDraw(serverPayload, '2026-10-24');
    assert.equal(res.isFlash, true);
    assert.equal(res.xpBonus, 50);
    assert.equal(res.source, 'server_authoritative');
  });

  it('evaluates authoritative server response accurately when flash is false', () => {
    const serverPayload = {
      is_flash: false,
      xp_bonus: 0,
      draw_date: '2026-10-24'
    };

    const res = evaluateDailyFlashDraw(serverPayload, '2026-10-24');
    assert.equal(res.isFlash, false);
    assert.equal(res.xpBonus, 0);
    assert.equal(res.source, 'server_authoritative');
  });

  it('fails open to standard daily when server response is null or network fails', () => {
    const res = evaluateDailyFlashDraw(null, '2026-10-24');
    assert.equal(res.isFlash, false);
    assert.equal(res.xpBonus, 0);
    assert.equal(res.source, 'standard_fallback');
    assert.match(res.message, /Daily standard attivo/);
  });
});
