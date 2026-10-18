import React, { useState } from 'react';
import { UserState, PbqLab } from '../../types';
import { OFFICIAL_PBQ_LABS } from '../../data/bountiesAndPbq';
import { sound } from '../../utils/soundEngine';
import { shuffleArray } from '../../utils/shuffle';
import { useLanguage } from '../../utils/language';
import { 
  ShieldCheck, Lock, Terminal, 
  CheckCircle2, AlertTriangle, ArrowRight, X, Play 
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { getRandomQuestionsForCert } from '../../data/officialCertQuestions';

interface CertPrepTabProps {
  userState: UserState;
  onOpenPaywallContext: (context: 'exam_simulator_lock') => void;
  onCompletePbq: (pbqId: string, gainedXp: number, gainedElo: number) => void;
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
  onCompletePbq
}) => {
  const { t } = useLanguage();
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

  const certs = [
    {
      id: 'sec_plus',
      name: 'CompTIA Security+',
      code: 'SY0-701',
      issuer: 'CompTIA',
      questionCount: 314,
      readiness: userState.readinessScore,
      totalPBQs: 45,
      completedPBQs: userState.completedPbqIds.filter(id => id.includes('secplus') || id.includes('firewall')).length,
      pbqRef: 'pbq_secplus_firewall',
      color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
      description: 'Global standard for cybersecurity and Zero Trust. Question pool of 314 authentic questions covering defensive architecture, firewall ACL PBQs, and incident response.'
    },
    {
      id: 'ccna',
      name: 'Cisco CCNA',
      code: '200-301',
      issuer: 'Cisco Systems',
      questionCount: 402,
      readiness: Math.round(userState.readinessScore * 0.7),
      totalPBQs: 52,
      completedPBQs: userState.completedPbqIds.filter(id => id.includes('ccna') || id.includes('router') || id.includes('vlan')).length,
      pbqRef: 'pbq_secplus_firewall',
      color: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10',
      description: 'OSPF routing, VLSM subnetting, VLAN switching, 802.1X security, and API network automation. Complete pool of 402 official questions.'
    },
    {
      id: 'netplus',
      name: 'CompTIA Network+',
      code: 'N10-008/009',
      issuer: 'CompTIA',
      questionCount: 300,
      readiness: Math.round(userState.readinessScore * 0.75),
      totalPBQs: 40,
      completedPBQs: userState.completedPbqIds.filter(id => id.includes('net') || id.includes('packet')).length,
      pbqRef: 'pbq_secplus_firewall',
      color: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
      description: 'Network topologies, OSI stack, distance-vector and link-state routing, Wi-Fi 6E, and fiber optics. 300 official exam questions.'
    },
    {
      id: 'aplus_core1',
      name: 'CompTIA A+ Core 1',
      code: '220-1101',
      issuer: 'CompTIA',
      questionCount: 303,
      readiness: Math.round(userState.readinessScore * 0.8),
      totalPBQs: 35,
      completedPBQs: userState.completedPbqIds.filter(id => id.includes('ap1')).length,
      pbqRef: 'pbq_secplus_firewall',
      color: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
      description: 'Hardware, mobile connectivity, networking, virtualization, and cloud infrastructure. 303 certified exam questions.'
    },
    {
      id: 'aplus_core2',
      name: 'CompTIA A+ Core 2',
      code: '220-1102',
      issuer: 'CompTIA',
      questionCount: 305,
      readiness: Math.round(userState.readinessScore * 0.8),
      totalPBQs: 35,
      completedPBQs: userState.completedPbqIds.filter(id => id.includes('ap2')).length,
      pbqRef: 'pbq_secplus_firewall',
      color: 'border-orange-500/40 text-orange-400 bg-orange-500/10',
      description: 'Windows/Linux/macOS operating systems, 7-step malware removal, Bash/PowerShell scripting, and operational security. 305 official questions.'
    },
    {
      id: 'ceh',
      name: 'Certified Ethical Hacker',
      code: 'CEH v13 AI',
      issuer: 'EC-Council',
      questionCount: 120,
      readiness: Math.round(userState.readinessScore * 0.5),
      totalPBQs: 60,
      completedPBQs: userState.completedPbqIds.filter(id => id.includes('ceh') || id.includes('killchain')).length,
      pbqRef: 'pbq_ceh_killchain',
      color: 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10',
      description: 'Advanced penetration testing, Nmap enumeration, Active Directory Kerberoasting, malware memory forensics, and reverse engineering.'
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
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-6 py-6 pb-32 space-y-7">
      {/* Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#0B1222] to-[#070C18] border border-white/10 p-5 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.12)] overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1.5 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            {t.certHeaderBadge}
          </span>
          <span className="text-xs font-mono text-slate-400">
            {t.certHeaderSub}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {t.certHeaderTitle}
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
          {t.certHeaderDesc}
        </p>
      </div>

      {/* Certifications List */}
      <div className="space-y-6">
        {certs.map((cert) => (
          <div 
            key={cert.id}
            className="rounded-3xl bg-[#0B1120]/90 border border-white/10 p-5 sm:p-6 shadow-[0_15px_40px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)] space-y-4 hover:border-white/20 transition-all duration-300 backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${cert.color}`}>
                    {cert.code}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {cert.issuer}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">
                  {cert.name}
                </h2>
              </div>

              <div className="text-right font-mono">
                <span className="text-[10px] text-slate-400 block">{t.passProbability}</span>
                <span className={`text-xl font-extrabold ${cert.readiness < 50 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {cert.readiness}%
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {cert.description}
            </p>

            {/* PBQ Progress Bar */}
            <div className="space-y-1.5 bg-[#090D16] p-3 rounded-xl border border-white/5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">PBQ Labs</span>
                <span className="text-emerald-400 font-bold">{cert.completedPBQs} / {cert.totalPBQs}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(cert.completedPBQs / cert.totalPBQs) * 100}%` }}
                />
              </div>
            </div>

            {/* Dual Action Buttons (Free Quick Check vs Pro Official PBQ Lab) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
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
                className="py-2.5 px-3 rounded-xl font-mono text-xs text-slate-200 bg-surface-light border border-white/10 hover:border-emerald-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                <span>{t.quickCheckBtn}</span>
              </button>

              {/* Option 2: Full Mock Exam & Interactive PBQ Lab (PRO) */}
              <button
                onClick={() => handleStartPbq(cert.pbqRef)}
                className="py-2.5 px-3 rounded-xl font-mono font-bold text-xs text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 hover:from-emerald-300 hover:to-indigo-300 transition-all flex items-center justify-center gap-1.5 shadow-neon-emerald cursor-pointer"
              >
                {!userState.isPro ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>{t.pbqLabBtnPro}</span>
                  </>
                ) : (
                  <>
                    <Terminal className="w-3.5 h-3.5" />
                    <span>{t.pbqLabBtnActive}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* QUICK DOMAIN CHECK MODAL (FREE ACCESS) */}
      {quickCheckCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#131B2E] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                  RAPID DIAGNOSTIC DRILL (5 QUESTIONS)
                </span>
                <h3 className="font-bold text-base text-white">{quickCheckCert}</h3>
              </div>
              <button
                onClick={() => {
                  sound.playTap();
                  setQuickCheckCert(null);
                }}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!quickCompleted ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Question {quickQuestionIndex + 1} of {activeQuickQuestions.length}</span>
                  <span className="text-emerald-400">Score: {quickScore}/{activeQuickQuestions.length}</span>
                </div>

                <p className="text-xs sm:text-sm text-slate-200 font-semibold leading-relaxed">
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
                      className="w-full p-3 rounded-xl border border-white/10 bg-[#090D16] text-left text-xs font-mono hover:border-emerald-500/40 transition-all flex items-center justify-between text-slate-300"
                    >
                      <span>{opt.text}</span>
                    </button>
                  ))}
                </div>

                {quickAnswered && (
                  <div className="pt-2 animate-fade-in space-y-3">
                    <p className="text-xs text-slate-300 bg-surface-light p-3 rounded-xl border border-white/5">
                      <strong>Technical Explanation:</strong> {activeQuickQuestions[quickQuestionIndex].expl}
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
                      className="w-full py-3 px-4 rounded-xl font-mono font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 flex items-center justify-center gap-2"
                    >
                      <span>{quickQuestionIndex < activeQuickQuestions.length - 1 ? 'NEXT QUESTION' : 'VIEW RESULT'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-4 py-2">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-white">Quick Check Completed</h4>
                <p className="text-xs text-slate-300 font-mono">
                  You answered <span className="text-emerald-400 font-bold">{quickScore}/{activeQuickQuestions.length}</span> questions correctly.
                </p>
                <button
                  onClick={() => {
                    sound.playTap();
                    setQuickCheckCert(null);
                  }}
                  className="w-full py-3 px-4 rounded-xl font-mono font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-2xl my-auto bg-[#131B2E] border border-emerald-500/50 rounded-2xl p-5 sm:p-7 shadow-2xl text-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                  OFFICIAL SIMULATION: {activePbq.certification}
                </span>
                <h3 className="font-extrabold text-base sm:text-lg text-white mt-1">
                  {activePbq.title}
                </h3>
              </div>
              <button
                onClick={() => {
                  sound.playTap();
                  setActivePbq(null);
                }}
                className="p-1 rounded text-slate-400 hover:text-white"
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
                className="w-full py-3.5 px-4 rounded-xl font-mono font-extrabold text-xs sm:text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-neon-emerald transition-all"
              >
                APPLY ACL & VERIFY PBQ COMPLIANCE
              </button>
            ) : (
              <button
                onClick={() => {
                  sound.playTap();
                  setActivePbq(null);
                }}
                className="w-full py-3.5 px-4 rounded-xl font-mono font-extrabold text-xs sm:text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-neon-emerald transition-all"
              >
                CLOSE EXAM LAB
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
