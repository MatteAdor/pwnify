import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  recordCertPassed, 
  recordSeasonArchive,
  createCleanAccountState,
  STREAK_MILESTONES 
} from '../src/utils/userDatabase';
import { 
  calculateBreachTriageRewards, 
  DAILY_BREACHES 
} from '../src/data/dailyBreaches';
import { OFFICIAL_PBQ_LABS } from '../src/data/bountiesAndPbq';
import { applyLearningActivity } from '../src/utils/streakSync';
import { getStreakThresholdTitle, activateStreakFreeze } from '../src/utils/streakEngine';

describe('Gamification & Ethical Retention Engine (Unified Server-Authoritative B0)', () => {

  it('Streak Engine: Consecutive daily training increments streakDays by exactly 1', () => {
    let state = createCleanAccountState('TestOperator');
    state.userTimezone = 'UTC';
    assert.strictEqual(state.streakDays, 0);

    // Day 1: 2026-10-20
    const day1 = Date.UTC(2026, 9, 20, 10, 0, 0);
    const s1 = applyLearningActivity(state, { nowMs: day1 });
    assert.strictEqual(s1.streakDays, 1);
    assert.strictEqual(s1.lastActiveDate, '2026-10-20');

    // Same day activity does not double-count streak
    const sSame = applyLearningActivity(s1, { nowMs: day1 + 3600000 });
    assert.strictEqual(sSame.streakDays, 1);
    assert.strictEqual(sSame.lastActiveDate, '2026-10-20');

    // Day 2 (consecutive): 2026-10-21
    const day2 = Date.UTC(2026, 9, 21, 10, 0, 0);
    const s2 = applyLearningActivity(s1, { nowMs: day2 });
    assert.strictEqual(s2.streakDays, 2);
    assert.strictEqual(s2.lastActiveDate, '2026-10-21');
  });

  it('Unified Streak: Every action (Daily, node, PBQ, ranked) increments streak by exactly 1 day, once per day', () => {
    let state = createCleanAccountState('MultiActionUser');
    state.userTimezone = 'UTC';
    const day1 = Date.UTC(2026, 9, 20, 9, 0, 0);

    // 1. Action: Daily Breach triage
    const afterDaily = applyLearningActivity(state, { nowMs: day1 });
    assert.strictEqual(afterDaily.streakDays, 1, 'First action of the day sets streak to 1');

    // 2. Action: Skill Tree node completed 1 hour later (same day)
    const afterNode = applyLearningActivity(afterDaily, { nowMs: day1 + 3600000 });
    assert.strictEqual(afterNode.streakDays, 1, 'Skill node on same day must NOT double increment streak');

    // 3. Action: PBQ Lab completed 2 hours later (same day)
    const afterPbq = applyLearningActivity(afterNode, { nowMs: day1 + 7200000, isPbqPerfect: true });
    assert.strictEqual(afterPbq.streakDays, 1, 'PBQ lab on same day must NOT increment streak past 1');
    assert.strictEqual(afterPbq.streakShieldCount, 1, '100% PBQ awards earned shield slot');

    // 4. Action: Ranked Match won 3 hours later (same day)
    const afterRanked = applyLearningActivity(afterPbq, { nowMs: day1 + 10800000 });
    assert.strictEqual(afterRanked.streakDays, 1, 'Ranked match on same day must NOT increment streak past 1');

    // 5. Action: Next day arrives (Oct 21) -> user completes any action -> increments to 2
    const day2 = Date.UTC(2026, 9, 21, 10, 0, 0);
    const nextDayAction = applyLearningActivity(afterRanked, { nowMs: day2 });
    assert.strictEqual(nextDayAction.streakDays, 2, 'Action on next consecutive day increments streak by exactly 1');
  });

  it('Streak Engine: Every 5 consecutive days earns 1 free streak shield (non-monetized)', () => {
    let state = createCleanAccountState('PersistentOperator');
    state.userTimezone = 'UTC';
    state.streakDays = 4;
    state.lastActiveDate = '2026-10-20';
    state.lastActiveTimestamp = Date.UTC(2026, 9, 20, 10, 0, 0);
    state.streakShieldCount = 0;

    const day21 = Date.UTC(2026, 9, 21, 10, 0, 0);
    const res = applyLearningActivity(state, { nowMs: day21 });
    assert.strictEqual(res.streakDays, 5);
    assert.strictEqual(res.streakShieldCount, 1, 'Earns 1 free shield at 5-day consistency');
  });

  it('Streak Engine: Earned shield is consumed when missing a day, protecting the streak', () => {
    let state = createCleanAccountState('ShieldUser');
    state.userTimezone = 'UTC';
    state.streakDays = 10;
    state.lastActiveDate = '2026-10-20';
    state.lastActiveTimestamp = Date.UTC(2026, 9, 20, 10, 0, 0);
    state.streakShieldCount = 1;
    state.streakShieldActive = true;

    // Inactive on 2026-10-21, returns on 2026-10-22 (2 days diff)
    const day22 = Date.UTC(2026, 9, 22, 10, 0, 0);
    const res = applyLearningActivity(state, { nowMs: day22 });
    assert.strictEqual(res.streakDays, 11, 'Protected & incremented via consumed shield');
    assert.strictEqual(res.streakShieldCount, 0, 'Shield was consumed');
  });

  it('Streak Engine: Vacation/Freeze mode preserves streak with zero anxiety or guilt', () => {
    let state = createCleanAccountState('VacationUser');
    state.userTimezone = 'UTC';
    state.streakDays = 15;
    state.lastActiveDate = '2026-10-10';
    state.lastActiveTimestamp = Date.UTC(2026, 9, 10, 10, 0, 0);
    state.freezeUntilDate = '2026-10-25';

    // Operator returns during vacation window on 2026-10-20 (10 days later)
    const day20 = Date.UTC(2026, 9, 20, 10, 0, 0);
    const res = applyLearningActivity(state, { nowMs: day20 });
    assert.strictEqual(res.streakDays, 16, 'Streak preserved and continued through freeze');
  });

  it('Streak Engine: Resets honestly to 1 when gap > 1 day and no shield or freeze available', () => {
    let state = createCleanAccountState('UnprotectedUser');
    state.userTimezone = 'UTC';
    state.streakDays = 12;
    state.lastActiveDate = '2026-10-10';
    state.lastActiveTimestamp = Date.UTC(2026, 9, 10, 10, 0, 0);
    state.streakShieldCount = 0;
    state.streakShieldActive = false;
    state.freezeUntilDate = null;
    state.isPro = false;

    // Returns 5 days later
    const day15 = Date.UTC(2026, 9, 15, 10, 0, 0);
    const res = applyLearningActivity(state, { nowMs: day15 });
    assert.strictEqual(res.streakDays, 1, 'Resets honestly to 1');
  });

  it('Milestone Rewards: 7, 30, 60, 100 days award permanent titles & tangible XP bonuses', () => {
    assert.strictEqual(getStreakThresholdTitle(7)?.title, '7-Day Persistent Operative');
    assert.strictEqual(getStreakThresholdTitle(30)?.title, 'Monthly Defcon Sentinel');
    assert.strictEqual(getStreakThresholdTitle(60)?.title, 'ZeroDay Red Team Veteran');
    assert.strictEqual(getStreakThresholdTitle(100)?.title, 'Centurion Elite Vanguard');
    assert.strictEqual(STREAK_MILESTONES.length, 4);
    assert.strictEqual(STREAK_MILESTONES[0].days, 7);
    assert.strictEqual(STREAK_MILESTONES[1].days, 30);
    assert.strictEqual(STREAK_MILESTONES[2].days, 60);
    assert.strictEqual(STREAK_MILESTONES[3].days, 100);
  });

  it('Controlled Surprise: Daily breach rewards are transparent, non-monetized, with declared odds', () => {
    const incident = DAILY_BREACHES[0];

    // Rapid triage (< 30s) without anomaly roll (randomSeed = 0.50 >= 0.15)
    const rewardNormal = calculateBreachTriageRewards(incident, 22, false, 0.50);
    assert.strictEqual(rewardNormal.isSpeedBonusEarned, true);
    assert.strictEqual(rewardNormal.speedBonusXp, 20);
    assert.strictEqual(rewardNormal.classifiedDossierDiscovered, false);
    assert.strictEqual(rewardNormal.totalXp, incident.xpReward + 20);

    // Rapid triage with 15% classified dossier roll (randomSeed = 0.05 < 0.15)
    const rewardAnomaly = calculateBreachTriageRewards(incident, 18, false, 0.05);
    assert.strictEqual(rewardAnomaly.classifiedDossierDiscovered, true);
    assert.strictEqual(rewardAnomaly.dossierBonusXp, 50);
    assert.strictEqual(rewardAnomaly.totalXp, incident.xpReward + 20 + 50);

    // Pro user 2x multiplier applies transparently to all rewards
    const rewardPro = calculateBreachTriageRewards(incident, 18, true, 0.05);
    assert.strictEqual(rewardPro.totalXp, (incident.xpReward + 20 + 50) * 2);
  });

  it('PBQ Simulation Catalog: Authentic PBQ labs for CompTIA Security+, Cisco CCNA, and CEH', () => {
    assert.ok(OFFICIAL_PBQ_LABS.length >= 6);

    const secPlusLabs = OFFICIAL_PBQ_LABS.filter(l => l.certification === 'CompTIA Security+');
    const ccnaLabs = OFFICIAL_PBQ_LABS.filter(l => l.certification === 'Cisco CCNA');
    const cehLabs = OFFICIAL_PBQ_LABS.filter(l => l.certification === 'CEH v13');

    assert.ok(secPlusLabs.length >= 3, 'Must have at least 3 Security+ PBQ labs');
    assert.ok(ccnaLabs.length >= 1, 'Must have at least 1 CCNA PBQ lab');
    assert.ok(cehLabs.length >= 1, 'Must have at least 1 CEH PBQ lab');

    // Validate CCNA lab structure
    const ccnaLab = ccnaLabs.find(l => l.id === 'pbq_ccna_subnetting_vlan');
    assert.ok(ccnaLab, 'Cisco CCNA Subnetting & VLAN ACL lab must exist');
    assert.strictEqual(ccnaLab.steps.length, 4);
  });

  it('Post-Exam Journey: Passing exam unlocks next roadmap & activates CPE maintenance mode', () => {
    let state = createCleanAccountState('GraduateOperator');
    state.readinessScore = 88;

    const afterPass = recordCertPassed(state, 'sec_plus', 88);
    assert.strictEqual(afterPass.cpeMaintenanceActive, true);
    assert.ok(afterPass.passedCerts?.some(c => c.certId === 'sec_plus'));
    assert.ok(afterPass.earnedTitles?.includes('Certified: sec_plus'));
    assert.strictEqual(afterPass.xp, 500); // 500 XP milestone
  });

  it('Seasonal Reset: Preserves permanent status & archives season history without wiping identity', () => {
    let state = createCleanAccountState('LeagueRanker');
    state.elo = 1450;
    state.xp = 3200;

    const archived = recordSeasonArchive(state, 'Season 1', 2, 'APT Operator', 3200);
    assert.strictEqual(archived.leagueHistory?.length, 1);
    assert.strictEqual(archived.leagueHistory?.[0].seasonId, 'Season 1');
    assert.strictEqual(archived.leagueHistory?.[0].rankPosition, 2);
    assert.ok(archived.earnedTitles?.includes('Season 1 Top 3 Veteran'));
    // ELO and XP identity preserved
    assert.strictEqual(archived.elo, 1450);
  });

  it('Daily Breach Catalog: 16 authentic CVE incidents available worldwide', () => {
    assert.strictEqual(DAILY_BREACHES.length, 16);
    const incidentIds = DAILY_BREACHES.map(b => b.id);
    assert.ok(incidentIds.includes('breach_heartbleed'));
    assert.ok(incidentIds.includes('breach_regresshion'));
    assert.ok(incidentIds.includes('breach_spring4shell'));
    assert.ok(incidentIds.includes('breach_dirty_pipe'));
    assert.ok(incidentIds.includes('breach_pwnkit'));
    assert.ok(incidentIds.includes('breach_shellshock'));
    assert.ok(incidentIds.includes('breach_solarwinds'));
    assert.ok(incidentIds.includes('breach_citrix_bleed'));
  });

});
