import React, { useState } from 'react';
import { UserState, PbqLab } from '../../types';
import { OFFICIAL_PBQ_LABS } from '../../data/bountiesAndPbq';
import { sound } from '../../utils/soundEngine';
import { shuffleArray } from '../../utils/shuffle';
import { useLanguage } from '../../utils/language';
import { 
  ShieldCheck, Lock, Terminal, 
  CheckCircle2, AlertTriangle, ArrowRight, X, Play,
  Award, Compass, Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { getRandomQuestionsForCert } from '../../data/officialCertQuestions';

interface CertPrepTabProps {
  userState: UserState;
  onOpenPaywallContext: (context: 'exam_simulator_lock') => void;
  onCompletePbq: (pbqId: string, gainedXp: number, gainedElo: number) => void;
  onPassCert?: (certId: string, scorePercent: number) => void;
}

const QUICK_QUESTIONS_BASE = [
  {
    q: 'Which IPsec encryption mode provides authentication, integrity, and payload confidentiality?',
    options: [
      { id: 'esp_1', text: 'ESP (Encapsulating Security Payload)', isCorrect: true },
      { id: 'esp_2', text: 'AH (Authentication Header)', isCorrect: false },
      { id: 'esp_3', text: 'IKEv1 Phase 1', isCorrect: false },
      { id: 'esp_4', text: 'TLS Record Layer', isCorrect: false }
    ],
    expl: 'ESP (IP Protocol 50) encrypts the entire IP payload, providing confidentiality, data origin authentication, and connectionless integrity.'
  },
  {
    q: 'Which security principle mandates that a user account has only the absolute minimum authorizations required?',
    options: [
      { id: 'polp_1', text: 'Principle of Least Privilege (PoLP)', isCorrect: true },
      { id: 'polp_2', text: 'Separation of Duties', isCorrect: false },
      { id: 'polp_3', text: 'Need-to-Know', isCorrect: false },
      { id: 'polp_4', text: 'Dual Control', isCorrect: false }
    ],
    expl: 'The Principle of Least Privilege dictates granting only those permissions essential to perform authorized duties.'
  },
  {
    q: 'In a Wireshark capture, which TCP flag combination alongside SYN indicates an open port during a stealth SYN scan?',
    options: [
      { id: 'syn_1', text: 'SYN-ACK', isCorrect: true },
      { id: 'syn_2', text: 'RST-ACK', isCorrect: false },
      { id: 'syn_3', text: 'FIN-PSH', isCorrect: false },
      { id: 'syn_4', text: 'URG-ACK', isCorrect: false }
    ],
    expl: 'A SYN-ACK response confirms that the target TCP port is in a LISTEN state and ready to establish a connection.'
  }
];

export const CertPrepTab: React.FC<CertPrepTabProps> = ({
  userState,
  onOpenPaywallContext,
  onCompletePbq,
  onPassCert
}) => {
  const { t, lang } = useLanguage();
  const isEn = lang === 'en';

  // Quick Domain Check modal state
  const [quickCheckCert, setQuickCheckCert] = useState<string | null>(null);
  const [activeQuickQuestions, setActiveQuickQuestions] = useState(() => 
    QUICK_QUESTIONS_BASE.map(q => ({ ...q, options: shuffleArray(q.options) }))
  );
  const [quickQuestionIndex, setQuickQuestionIndex] = useState<number>(0);
  const [quickScore, setQuickScore] = useState<number>(0);
  const [quickAnswered, setQuickAnswered] = useState<boolean>(false);
  const [quickCompleted, setQuickCompleted] = useState<boolean>(false);

  // Active Interactive PBQ Lab state
  const [activePbq, setActivePbq] = useState<PbqLab | null>(null);
  const [pbqConfigState, setPbqConfigState] = useState<{ [ruleId: string]: 'ALLOW' | 'DENY' }>({});
  const [pbqSubmitted, setPbqSubmitted] = useState<boolean>(false);
  const [pbqSuccess, setPbqSuccess] = useState<boolean>(false);

  // Post-Exam Success Celebration modal
  const [passedExamCandidate, setPassedExamCandidate] = useState<{
    id: string;
    name: string;
    code: string;
    nextStep: string;
  } | null>(null);

  // Real dynamic counts from OFFICIAL_PBQ_LABS pool
  const secPlusLabs = OFFICIAL_PBQ_LABS.filter(p => p.certification === 'CompTIA Security+');
  const ccnaLabs = OFFICIAL_PBQ_LABS.filter(p => p.certification === 'Cisco CCNA');
  const cehLabs = OFFICIAL_PBQ_LABS.filter(p => p.certification === 'CEH v13');

  const certs = [
    {
      id: 'sec_plus',
      name: 'CompTIA Security+',
      code: 'SY0-701',
      issuer: 'CompTIA',
      questionCount: 314,
      readiness: userState.readinessScore,
      totalPBQs: secPlusLabs.length,
      completedPBQs: secPlusLabs.filter(l => userState.completedPbqIds.includes(l.id)).length,
      pbqRef: secPlusLabs[0]?.id || 'pbq_secplus_firewall',
      color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
      description: 'Global standard for cybersecurity and Zero Trust. Question pool of 314 authentic questions covering defensive architecture, firewall ACL PBQs, and incident response.',
      nextStep: 'CompTIA CySA+ / Cisco CCNA'
    },
    {
      id: 'ccna',
      name: 'Cisco CCNA',
      code: '200-301',
      issuer: 'Cisco Systems',
      questionCount: 402,
      readiness: Math.round(userState.readinessScore * 0.7),
      totalPBQs: ccnaLabs.length,
      completedPBQs: ccnaLabs.filter(l => userState.completedPbqIds.includes(l.id)).length,
      pbqRef: ccnaLabs[0]?.id || 'pbq_ccna_subnetting_vlan',
      color: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10',
      description: 'OSPF routing, VLSM subnetting, VLAN switching, 802.1X security, and API network automation. Complete pool of 402 official questions.',
      nextStep: 'Cisco CCNP Enterprise / CompTIA Security+'
    },
    {
      id: 'netplus',
      name: 'CompTIA Network+',
      code: 'N10-008/009',
      issuer: 'CompTIA',
      questionCount: 300,
      readiness: Math.round(userState.readinessScore * 0.75),
      totalPBQs: 1,
      completedPBQs: userState.completedPbqIds.includes('pbq_ids_c2_mitigation') ? 1 : 0,
      pbqRef: 'pbq_ids_c2_mitigation',
      color: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
      description: 'Network topologies, OSI stack, distance-vector and link-state routing, Wi-Fi 6E, and fiber optics. 300 official exam questions.',
      nextStep: 'Cisco CCNA / CompTIA Security+'
    },
    {
      id: 'aplus_core1',
      name: 'CompTIA A+ Core 1',
      code: '220-1101',
      issuer: 'CompTIA',
      questionCount: 303,
      readiness: Math.round(userState.readinessScore * 0.8),
      totalPBQs: 1,
      completedPBQs: userState.completedPbqIds.includes('pbq_secplus_firewall') ? 1 : 0,
      pbqRef: 'pbq_secplus_firewall',
      color: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
      description: 'Hardware, mobile connectivity, networking, virtualization, and cloud infrastructure. 303 certified exam questions.',
      nextStep: 'CompTIA Network+ / Security+'
    },
    {
      id: 'aplus_core2',
      name: 'CompTIA A+ Core 2',
      code: '220-1102',
      issuer: 'CompTIA',
      questionCount: 305,
      readiness: Math.round(userState.readinessScore * 0.8),
      totalPBQs: 1,
      completedPBQs: userState.completedPbqIds.includes('pbq_secplus_firewall') ? 1 : 0,
      pbqRef: 'pbq_secplus_firewall',
      color: 'border-orange-500/40 text-orange-400 bg-orange-500/10',
      description: 'Windows/Linux/macOS operating systems, 7-step malware removal, Bash/PowerShell scripting, and operational security. 305 official questions.',
      nextStep: 'CompTIA Security+'
    },
    {
      id: 'ceh',
      name: 'Certified Ethical Hacker',
      code: 'CEH v13 AI',
      issuer: 'EC-Council',
      questionCount: 120,
      readiness: Math.round(userState.readinessScore * 0.5),
      totalPBQs: cehLabs.length,
      completedPBQs: cehLabs.filter(l => userState.completedPbqIds.includes(l.id)).length,
      pbqRef: cehLabs[0]?.id || 'pbq_ceh_killchain',
      color: 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10',
      description: 'Advanced penetration testing, Nmap enumeration, Active Directory Kerberoasting, malware memory forensics, and reverse engineering.',
      nextStep: 'OffSec OSCP / CISSP'
    }
  ];

  const handleStartPbq = (pbqId: string) => {
    sound.playTap();
    if (!userState.isPro) {
      onOpenPaywallContext('exam_simulator_lock');
      return;
    }

    const found = OFFICIAL_PBQ_LABS.find(p => p.id === pbqId) || OFFICIAL_PBQ_LABS[0];
    setActivePbq(found);
    // Initialize default states
    const initCfg: { [key: string]: 'ALLOW' | 'DENY' } = {};
    found.steps.forEach(s => {
      initCfg[s.id] = 'DENY';
    });
    setPbqConfigState(initCfg);
    setPbqSubmitted(false);
    setPbqSuccess(false);
  };

  const handleSubmitPbq = () => {
    if (!activePbq) return;

    let isAllCorrect = true;
    activePbq.steps.forEach(s => {
      if (pbqConfigState[s.id] !== s.ruleAction) {
        isAllCorrect = false;
      }
    });

    setPbqSubmitted(true);
    setPbqSuccess(isAllCorrect);

    if (isAllCorrect) {
      sound.playExploitSuccess();
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
      onCompletePbq(activePbq.id, activePbq.xpReward, activePbq.eloReward);
    } else {
      sound.playPayloadBlocked();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-3.5 sm:px-4 py-4 pb-28 space-y-4 animate-fade-in font-sans">
      {/* Header Banner */}
      <div className="rounded-2xl bg-[#0D121D] border border-zinc-800 p-5 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-mono text-zinc-400 uppercase font-bold tracking-wider">
              {t.certHeaderBadge}
            </span>
          </div>
          <span className="text-xs font-mono text-zinc-500">
            {t.certHeaderSub}
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          {t.certHeaderTitle}
        </h1>
        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
          {t.certHeaderDesc}
        </p>
      </div>

      {/* Post-Exam CPE Maintenance & Active Credentials Banner */}
      {(userState.cpeMaintenanceActive || (userState.passedCerts && userState.passedCerts.length > 0)) && (
        <div className="rounded-2xl bg-[#08131B] border border-emerald-500/30 p-4 sm:p-5 flex items-start gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
            <Award className="w-5 h-5" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-white">
                {isEn ? 'Continuous Professional Education (CPE) Active' : 'Mantenimento Competenze (CPE) Attivo'}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                {userState.passedCerts?.length || 1} {isEn ? 'CERTIFIED' : 'CERTIFICATO'}
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {isEn
                ? 'Your certification is officially achieved. To maintain field proficiency with zero burnout, complete 1 weekly real-world CVE triage instead of daily grinding.'
                : 'La tua certificazione è ufficialmente conseguita. Per mantenere la prontezza senza stress, completa 1 triage settimanale CVE invece del grinding quotidiano.'}
            </p>
          </div>
        </div>
      )}

      {/* Certifications List */}
      <div className="space-y-4">
        {certs.map((cert) => {
          const passedRecord = userState.passedCerts?.find(c => c.certId === cert.id);
          const isPassed = Boolean(passedRecord);

          return (
            <div 
              key={cert.id}
              className={`rounded-2xl bg-[#0D121D] border p-5 space-y-4 transition-all ${
                isPassed ? 'border-emerald-500/40 bg-[#0A1218]' : 'border-zinc-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold">
                      {cert.code}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">
                      {cert.issuer}
                    </span>
                    {isPassed && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {isEn ? 'CERTIFIED' : 'SUPERATO'}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    {cert.name}
                  </h2>
                </div>

                <div className="text-right font-mono">
                  <span className="text-[10px] text-zinc-500 block">{t.passProbability}</span>
                  <span className={`text-lg font-bold ${cert.readiness < 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {cert.readiness}%
                  </span>
                </div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                {cert.description}
              </p>

              {/* Status if passed: Next Roadmap */}
              {isPassed ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-emerald-300">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{isEn ? `Credential verified on ${passedRecord?.passDate}` : `Esame convalidato il ${passedRecord?.passDate}`}</span>
                  </div>
                  <div className="text-zinc-400 flex items-center gap-1.5 text-[11px]">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isEn ? 'Next Roadmap:' : 'Prossimo Obiettivo:'} <strong className="text-zinc-200">{cert.nextStep}</strong></span>
                  </div>
                </div>
              ) : (
                /* Honest PBQ Progress Bar */
                <div className="space-y-1.5 bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400">Authentic PBQ Labs</span>
                    <span className="text-emerald-400 font-bold">{cert.completedPBQs} / {cert.totalPBQs}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${cert.totalPBQs > 0 ? (cert.completedPBQs / cert.totalPBQs) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Post-Exam Claim Action & Dual Buttons */}
              <div className="flex flex-col gap-2.5 pt-1">
                {!isPassed && (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setPassedExamCandidate({
                        id: cert.id,
                        name: cert.name,
                        code: cert.code,
                        nextStep: cert.nextStep
                      });
                    }}
                    className="text-xs font-mono text-zinc-400 hover:text-emerald-400 flex items-center gap-1.5 transition-colors cursor-pointer self-start"
                  >
                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isEn ? 'I passed this official exam (+500 XP & CPE mode)' : 'Ho superato questo esame (+500 XP e modalità CPE)'}</span>
                  </button>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Option 1: Free Quick Domain Check */}
                  <button
                    onClick={() => {
                      sound.playTap();
                      const pool = getRandomQuestionsForCert(cert.id, 5);
                      const formatted = pool.length > 0 
                        ? pool.map(q => ({
                            q: q.question,
                            options: shuffleArray(q.options.map((opt, oIdx) => ({
                              id: `${q.id}_${oIdx}`,
                              text: opt,
                              isCorrect: oIdx === q.correctIndex
                            }))),
                            expl: q.explanation || `Correct answer: ${q.correctAnswer}`
                          }))
                        : QUICK_QUESTIONS_BASE.map(q => ({ ...q, options: shuffleArray(q.options) }));

                      setActiveQuickQuestions(formatted);
                      setQuickCheckCert(cert.name);
                      setQuickQuestionIndex(0);
                      setQuickScore(0);
                      setQuickAnswered(false);
                      setQuickCompleted(false);
                    }}
                    className="min-h-[48px] py-3 px-3.5 rounded-xl font-mono font-black text-xs sm:text-sm text-zinc-100 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Play className="w-4 h-4 text-zinc-300 fill-current" />
                    <span>{t.quickCheckBtn}</span>
                  </button>

                  {/* Option 2: Full Mock Exam & Interactive PBQ Lab (PRO) */}
                  <button
                    onClick={() => handleStartPbq(cert.pbqRef)}
                    className="min-h-[48px] py-3 px-4 rounded-xl font-mono font-black text-xs sm:text-sm text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98"
                  >
                    {!userState.isPro ? (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>{t.pbqLabBtnPro}</span>
                      </>
                    ) : (
                      <>
                        <Terminal className="w-4 h-4" />
                        <span>{t.pbqLabBtnActive}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* QUICK DOMAIN CHECK MODAL (FREE ACCESS) */}
      {quickCheckCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#0D121D] border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <div>
                <span className="text-xs font-mono text-zinc-400 font-bold block uppercase">
                  Rapid Diagnostic Drill (5 Questions)
                </span>
                <h3 className="font-bold text-base text-white">{quickCheckCert}</h3>
              </div>
              <button
                onClick={() => {
                  sound.playTap();
                  setQuickCheckCert(null);
                }}
                className="p-1 rounded text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!quickCompleted ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span>Question {quickQuestionIndex + 1} of {activeQuickQuestions.length}</span>
                  <span className="text-emerald-400 font-bold">Score: {quickScore}/{activeQuickQuestions.length}</span>
                </div>

                <p className="text-xs sm:text-sm text-zinc-200 font-medium leading-relaxed">
                  {activeQuickQuestions[quickQuestionIndex].q}
                </p>

                <div className="space-y-2">
                  {activeQuickQuestions[quickQuestionIndex].options.map((opt) => (
                    <button
                      key={opt.id}
                      disabled={quickAnswered}
                      onClick={() => {
                        sound.playTap();
                        const isRight = opt.isCorrect;
                        if (isRight) {
                          sound.playExploitSuccess();
                          setQuickScore(prev => prev + 1);
                        } else {
                          sound.playPayloadBlocked();
                        }
                        setQuickAnswered(true);
                      }}
                      className="w-full min-h-[50px] p-3.5 rounded-xl border border-zinc-800 bg-zinc-900 text-left text-xs sm:text-sm font-mono font-bold hover:border-zinc-700 transition-all flex items-center justify-between text-zinc-200 cursor-pointer active:scale-[0.99]"
                    >
                      <span>{opt.text}</span>
                    </button>
                  ))}
                </div>

                {quickAnswered && (
                  <div className="pt-2 animate-fade-in space-y-3">
                    <p className="text-xs text-zinc-300 bg-zinc-900 p-3.5 rounded-xl border border-zinc-800">
                      <strong className="text-white font-black">Spiegazione Tecnica:</strong> {activeQuickQuestions[quickQuestionIndex].expl}
                    </p>
                    <button
                      onClick={() => {
                        sound.playTap();
                        if (quickQuestionIndex < activeQuickQuestions.length - 1) {
                          setQuickQuestionIndex(prev => prev + 1);
                          setQuickAnswered(false);
                        } else {
                          setQuickCompleted(true);
                        }
                      }}
                      className="w-full min-h-[50px] py-3.5 px-4 rounded-xl font-mono font-black text-xs sm:text-sm text-zinc-950 bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-98"
                    >
                      <span>{quickQuestionIndex < activeQuickQuestions.length - 1 ? 'PROSSIMA DOMANDA' : 'VEDI RISULTATO'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-4 py-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-base sm:text-lg font-bold text-white">Quick Check Completed</h4>
                <p className="text-xs text-zinc-400 font-mono">
                  You answered <span className="text-emerald-400 font-bold">{quickScore}/{activeQuickQuestions.length}</span> questions correctly.
                </p>
                <button
                  onClick={() => {
                    sound.playTap();
                    setQuickCheckCert(null);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl font-mono font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 cursor-pointer transition-colors"
                >
                  Close Check
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FULL INTERACTIVE PBQ LAB MODAL (PRO EXCLUSIVE PLAYABLE) */}
      {activePbq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-2xl my-auto bg-[#0D121D] border border-zinc-800 rounded-2xl p-5 sm:p-7 shadow-xl text-zinc-100">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
              <div>
                <span className="text-xs font-mono text-zinc-400 font-bold uppercase block">
                  Simulation: {activePbq.certification}
                </span>
                <h3 className="font-bold text-base sm:text-lg text-white mt-0.5">
                  {activePbq.title}
                </h3>
              </div>
              <button
                onClick={() => {
                  sound.playTap();
                  setActivePbq(null);
                }}
                className="p-1 rounded text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scenario & Target Objective */}
            <div className="space-y-2 mb-4 bg-[#090D16] p-3.5 rounded-xl border border-white/5 text-xs text-slate-300">
              <p>
                <strong className="text-white">Exam Scenario:</strong> {activePbq.scenarioDescription}
              </p>
              <p className="text-emerald-400">
                <strong>PBQ Objective:</strong> {activePbq.targetObjective}
              </p>
            </div>

            {/* Interactive ACL Rule Table */}
            <div className="space-y-3 mb-5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                FIREWALL ACL RULE CONFIGURATION TABLE:
              </span>

              {activePbq.steps.map((step) => {
                const currentAction = pbqConfigState[step.id];

                return (
                  <div 
                    key={step.id}
                    className="p-3 rounded-xl bg-surface-light border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
                  >
                    <div className="flex-1">
                      <span className="font-bold text-white block">{step.instruction}</span>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span>SRC: <code className="text-slate-300">{step.sourceIp}</code></span>
                        <span>DST: <code className="text-slate-300">{step.destinationPort}</code></span>
                        <span>PROTO: <code className="text-slate-300">{step.protocol}</code></span>
                      </div>
                    </div>

                    {/* Action Toggle (ALLOW / DENY) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          sound.playTap();
                          setPbqConfigState(prev => ({ ...prev, [step.id]: 'ALLOW' }));
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                          currentAction === 'ALLOW'
                            ? 'bg-emerald-500 text-slate-950 shadow-neon-emerald'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        ALLOW
                      </button>
                      <button
                        onClick={() => {
                          sound.playTap();
                          setPbqConfigState(prev => ({ ...prev, [step.id]: 'DENY' }));
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                          currentAction === 'DENY'
                            ? 'bg-red-500 text-white shadow-neon-crimson'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        DENY
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Feedback & Solution */}
            {pbqSubmitted && (
              <div className={`p-4 rounded-xl border text-xs mb-4 animate-fade-in ${
                pbqSuccess 
                  ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300' 
                  : 'bg-red-950/40 border-red-500 text-red-300'
              }`}>
                <div className="flex items-center gap-2 font-bold font-mono text-sm mb-1">
                  {pbqSuccess ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>PBQ LAB PASSED (+{activePbq.xpReward} XP · +{activePbq.eloReward} ELO)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      <span>INCORRECT CONFIGURATION OR NON-COMPLIANT WITH LEAST PRIVILEGE</span>
                    </>
                  )}
                </div>
                <p className="text-slate-300 leading-relaxed mt-1">
                  {activePbq.solutionExplanation}
                </p>
              </div>
            )}

            {/* Actions */}
            {!pbqSubmitted ? (
              <button
                onClick={handleSubmitPbq}
                className="w-full py-3 px-4 rounded-xl font-mono font-bold text-xs sm:text-sm text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-colors cursor-pointer"
              >
                APPLY ACL & VERIFY PBQ COMPLIANCE
              </button>
            ) : (
              <button
                onClick={() => {
                  sound.playTap();
                  setActivePbq(null);
                }}
                className="w-full py-3 px-4 rounded-xl font-mono font-bold text-xs sm:text-sm text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-colors cursor-pointer"
              >
                CLOSE EXAM LAB
              </button>
            )}
          </div>
        </div>
      )}

      {/* POST-EXAM CELEBRATION MODAL */}
      {passedExamCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 animate-fade-in font-sans">
          <div className="relative w-full max-w-md bg-[#0D121D] border border-emerald-500/50 rounded-2xl p-5 sm:p-6 shadow-2xl text-zinc-100 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase">
                <Award className="w-4 h-4" />
                <span>{isEn ? 'OFFICIAL CERTIFICATION CONGRATULATIONS' : 'CONGRATULAZIONI PER LA CERTIFICAZIONE'}</span>
              </div>
              <button
                onClick={() => setPassedExamCandidate(null)}
                className="text-zinc-500 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span>{passedExamCandidate.name}</span>
                <Sparkles className="w-5 h-5 text-amber-400" />
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {isEn 
                  ? 'Passing the official exam is the ultimate objective! ZeroDay celebrates your real-world achievement. We will never trap you in forced daily grinding.'
                  : 'Superare l\'esame ufficiale è il vero successo! ZeroDay celebra il tuo traguardo reale senza trattenerti con pressioni o grinding forzato.'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-emerald-400">
                <span>{isEn ? 'Milestone Bonus:' : 'Bonus Traguardo:'}</span>
                <span className="font-bold">+500 XP</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span>{isEn ? 'Title Unlocked:' : 'Titolo Sbloccato:'}</span>
                <span className="font-bold">Certified: {passedExamCandidate.name}</span>
              </div>
              <div className="border-t border-zinc-800 pt-2 text-zinc-400">
                <span>{isEn ? 'Recommended Next Milestone:' : 'Prossimo Obiettivo:'}</span>
                <span className="block text-white font-bold mt-0.5">{passedExamCandidate.nextStep}</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              {isEn
                ? 'Activating CPE Maintenance mode: 1 weekly CVE scenario to keep your technical reflex sharp with zero burnout.'
                : 'Attivazione modalità CPE Maintenance: 1 scenario CVE alla settimana per mantenere i riflessi affilati senza stress.'}
            </p>

            <button
              onClick={() => {
                sound.playVictoryFanfare();
                confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
                if (onPassCert) {
                  onPassCert(passedExamCandidate.id, userState.readinessScore || 85);
                }
                setPassedExamCandidate(null);
              }}
              className="w-full py-3 px-4 rounded-xl font-mono font-bold text-xs sm:text-sm text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-colors cursor-pointer shadow-md active:scale-98"
            >
              {isEn ? 'CONFIRM & ACTIVATE CPE MAINTENANCE' : 'CONFERMA E ATTIVA MANTENIMENTO CPE'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
