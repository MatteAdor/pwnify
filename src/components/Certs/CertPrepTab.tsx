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

      {/* Certifications List */}
      <div className="space-y-4">
        {certs.map((cert) => (
          <div 
            key={cert.id}
            className="rounded-2xl bg-[#0D121D] border border-zinc-800 p-5 space-y-4"
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

            {/* PBQ Progress Bar */}
            <div className="space-y-1.5 bg-zinc-900 p-3 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">PBQ Labs</span>
                <span className="text-emerald-400 font-bold">{cert.completedPBQs} / {cert.totalPBQs}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
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
        ))}
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
    </div>
  );
};
