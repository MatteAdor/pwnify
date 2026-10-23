import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  recordActivityAndUpdateStreak, 
  toggleStreakFreeze, 
  recordCertPassed, 
  recordSeasonArchive,
  createCleanAccountState,
  STREAK_MILESTONES 
} from '../src/utils/userDatabase';
import { 
  calculateBreachTriageRewards, 
  DAILY_BREACHES,
  getDailyBreachForDate 
} from '../src/data/dailyBreaches';
import { OFFICIAL_PBQ_LABS } from '../src/data/bountiesAndPbq';

describe('Gamification & Ethical Retention Engine', () => {

  it('Streak Engine: Consecutive daily training increments streakDays', () => {
    let state = createCleanAccountState('TestOperator');
    assert.strictEqual(state.streakDays, 0);

    // Day 1
    const res1 = recordActivityAndUpdateStreak(state, '2026-10-20');
    assert.strictEqual(res1.streakChanged, true);
    assert.strictEqual(res1.newStreak, 1);
    assert.strictEqual(res1.updatedState.streakDays, 1);
    assert.strictEqual(res1.updatedState.lastActiveDate, '2026-10-20');

    // Same day activity does not double-count streak
    const resSame = recordActivityAndUpdateStreak(res1.updatedState, '2026-10-20');
    assert.strictEqual(resSame.streakChanged, false);
    assert.strictEqual(resSame.newStreak, 1);
    assert.strictEqual(resSame.updatedState.streakDays, 1);

    // Day 2 (consecutive)
    const res2 = recordActivityAndUpdateStreak(res1.updatedState, '2026-10-21');
    assert.strictEqual(res2.streakChanged, true);
    assert.strictEqual(res2.newStreak, 2);
    assert.strictEqual(res2.updatedState.streakDays, 2);
    assert.strictEqual(res2.updatedState.lastActiveDate, '2026-10-21');
  });

  it('Streak Engine: Every 5 consecutive days earns 1 free streak shield (non-monetized)', () => {
    let state = createCleanAccountState('PersistentOperator');
    state.streakDays = 4;
    state.lastActiveDate = '2026-10-20';
    state.streakShieldsEarned = 0;

    const res = recordActivityAndUpdateStreak(state, '2026-10-21');
    assert.strictEqual(res.newStreak, 5);
    assert.strictEqual(res.shieldEarned, true);
    assert.strictEqual(res.updatedState.streakShieldsEarned, 1);
  });

  it('Streak Engine: Earned shield is consumed when missing a day, protecting the streak', () => {
    let state = createCleanAccountState('ShieldUser');
    state.streakDays = 10;
    state.lastActiveDate = '2026-10-20';
    state.streakShieldsEarned = 1;

    // Inactive on 2026-10-21, returns on 2026-10-22 (2 days diff)
    const res = recordActivityAndUpdateStreak(state, '2026-10-22');
    assert.strictEqual(res.shieldConsumed, true);
    assert.strictEqual(res.newStreak, 11); // Protected & incremented
    assert.strictEqual(res.updatedState.streakShieldsEarned, 0);
  });

  it('Streak Engine: Vacation/Freeze mode preserves streak with zero anxiety or guilt', () => {
    let state = createCleanAccountState('VacationUser');
    state.streakDays = 15;
    state.lastActiveDate = '2026-10-10';
    state.streakFreezeActive = true;
    state.streakFreezeExpiresDate = '2026-10-25';

    // Operator returns during vacation window on 2026-10-20 (10 days later)
    const res = recordActivityAndUpdateStreak(state, '2026-10-20');
    assert.strictEqual(res.freezeProtected, true);
    assert.strictEqual(res.newStreak, 16);
    assert.strictEqual(res.updatedState.streakDays, 16);
  });

  it('Streak Engine: Resets honestly to 1 when gap > 1 day and no shield or freeze available', () => {
    let state = createCleanAccountState('UnprotectedUser');
    state.streakDays = 12;
    state.lastActiveDate = '2026-10-10';
    state.streakShieldsEarned = 0;
    state.streakFreezeActive = false;
    state.isPro = false;

    // Returns 5 days later
    const res = recordActivityAndUpdateStreak(state, '2026-10-15');
    assert.strictEqual(res.shieldConsumed, false);
    assert.strictEqual(res.freezeProtected, false);
    assert.strictEqual(res.newStreak, 1);
    assert.strictEqual(res.updatedState.streakDays, 1);
  });

  it('Milestone Rewards: 7, 30, 60, 100 days award permanent titles & tangible XP bonuses', () => {
    let state = createCleanAccountState('MilestoneAchiever');
    state.streakDays = 6;
    state.lastActiveDate = '2026-10-20';
    state.xp = 500;

    // Hits 7-day milestone
    const res = recordActivityAndUpdateStreak(state, '2026-10-21');
    assert.strictEqual(res.newStreak, 7);
    assert.ok(res.milestoneUnlocked);
    assert.strictEqual(res.milestoneUnlocked?.days, 7);
    assert.strictEqual(res.milestoneUnlocked?.title, '7-Day Persistent Operative');
    assert.strictEqual(res.updatedState.xp, 600); // +100 XP
    assert.ok(res.updatedState.streakMilestonesUnlocked?.includes(7));
    assert.ok(res.updatedState.earnedTitles?.includes('7-Day Persistent Operative'));
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
