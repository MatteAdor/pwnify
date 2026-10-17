import React, { useState } from 'react';
import { UserState, PbqLab } from '../../types';
import { OFFICIAL_PBQ_LABS } from '../../data/bountiesAndPbq';
import { sound } from '../../utils/soundEngine';
import { shuffleArray } from '../../utils/shuffle';
import { 
  ShieldCheck, Award, Lock, Sparkles, Terminal, 
  CheckCircle2, AlertTriangle, ArrowRight, X, Play, Clock, 
  HelpCircle, Shield, Check, Flame 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CertPrepTabProps {
  userState: UserState;
  onOpenPaywallContext: (context: 'exam_simulator_lock') => void;
  onCompletePbq: (pbqId: string, gainedXp: number, gainedElo: number) => void;
}

const QUICK_QUESTIONS_BASE = [
  {
    q: 'Quale modalità di cifratura IPsec fornisce autenticazione, integrità e crittografia del payload?',
    options: [
      { id: 'esp_1', text: 'ESP (Encapsulating Security Payload)', isCorrect: true },
      { id: 'esp_2', text: 'AH (Authentication Header)', isCorrect: false },
      { id: 'esp_3', text: 'IKEv1 Phase 1', isCorrect: false },
      { id: 'esp_4', text: 'TLS Record Layer', isCorrect: false }
    ],
    expl: 'ESP (IP Protocol 50) cifra l\'intero payload IP garantendo confidenzialità ed integrità.'
  },
  {
    q: 'Quale principio di sicurezza garantisce che un utente disponga solo delle autorizzazioni minime necessarie?',
    options: [
      { id: 'polp_1', text: 'Least Privilege (PoLP)', isCorrect: true },
      { id: 'polp_2', text: 'Separation of Duties', isCorrect: false },
      { id: 'polp_3', text: 'Need-to-Know', isCorrect: false },
      { id: 'polp_4', text: 'Dual Control', isCorrect: false }
    ],
    expl: 'Il principio di Least Privilege impone la concessione esclusiva dei privilegi necessari allo svolgimento della mansione.'
  },
  {
    q: 'In una cattura Wireshark, quale flag TCP congiunto a SYN indica una porta aperta in uno scan stealth?',
    options: [
      { id: 'syn_1', text: 'SYN-ACK', isCorrect: true },
      { id: 'syn_2', text: 'RST-ACK', isCorrect: false },
      { id: 'syn_3', text: 'FIN-PSH', isCorrect: false },
      { id: 'syn_4', text: 'URG-ACK', isCorrect: false }
    ],
    expl: 'La risposta SYN-ACK conferma che la porta TCP è in ascolto e pronta alla connessione.'
  }
];

export const CertPrepTab: React.FC<CertPrepTabProps> = ({
  userState,
  onOpenPaywallContext,
  onCompletePbq
}) => {
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
      readiness: userState.readinessScore,
      totalPBQs: 45,
      completedPBQs: userState.completedPbqIds.includes('pbq_secplus_firewall') ? 13 : 12,
      pbqRef: 'pbq_secplus_firewall',
      color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
      description: 'Standard globale per la sicurezza informatica e Zero Trust. Focus su architetture difensive, PBQs firewall ACL e incident response.'
    },
    {
      id: 'ccna',
      name: 'Cisco CCNA',
      code: '200-301',
      issuer: 'Cisco Systems',
      readiness: Math.min(100, userState.readinessScore + 5),
      totalPBQs: 52,
      completedPBQs: 8,
      pbqRef: 'pbq_secplus_firewall',
      color: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10',
      description: 'Routing OSPF, subnetting VLSM, switching VLAN, sicurezza 802.1X e automazione API con controller Cisco DNA Spaces.'
    },
    {
      id: 'ceh',
      name: 'Certified Ethical Hacker',
      code: 'CEH v13 AI',
      issuer: 'EC-Council',
      readiness: Math.max(20, userState.readinessScore - 8),
      totalPBQs: 60,
      completedPBQs: userState.completedPbqIds.includes('pbq_ceh_killchain') ? 7 : 6,
      pbqRef: 'pbq_ceh_killchain',
      color: 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10',
      description: 'Penetration testing avanzato, enumerazione Nmap, Active Directory Kerberoasting, malware memory analysis e reverse engineering.'
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
    <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-28 space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-surface to-[#1B2640] border border-white/10 p-5 shadow-cyber-glass">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            OFFICIAL CERTIFICATION ROADMAP
          </span>
          <span className="text-xs font-mono text-slate-400">
            SIMULATORE PBQ ESAME
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white">
          Simulatore Esami Ufficiali & Laboratori PBQ
        </h1>
        <p className="text-xs text-slate-300 mt-1">
          Addestramento certificato per CompTIA Security+, CCNA e CEH. Affronta le Performance-Based Questions (PBQs) e supera l'esame al primo tentativo senza rischiare il costo del voucher d'esame.
        </p>
      </div>

      {/* Certifications List */}
      <div className="space-y-5">
        {certs.map((cert) => (
          <div 
            key={cert.id}
            className="rounded-2xl bg-surface border border-white/10 p-5 shadow-cyber-glass space-y-4 hover:border-white/20 transition-all"
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
                <span className="text-[10px] text-slate-400 block">PROBABILITÀ SUPERAMENTO</span>
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
                <span className="text-slate-400">Laboratori PBQ simulati</span>
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
                  setActiveQuickQuestions(QUICK_QUESTIONS_BASE.map(q => ({ ...q, options: shuffleArray(q.options) })));
                  setQuickCheckCert(cert.name);
                  setQuickQuestionIndex(0);
                  setQuickScore(0);
                  setQuickAnswered(false);
                  setQuickCompleted(false);
                }}
                className="py-2.5 px-3 rounded-xl font-mono text-xs text-slate-200 bg-surface-light border border-white/10 hover:border-emerald-500/40 transition-all flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                <span>Quick Domain Check (Free)</span>
              </button>

              {/* Option 2: Full Mock Exam & Interactive PBQ Lab (PRO) */}
              <button
                onClick={() => handleStartPbq(cert.pbqRef)}
                className="py-2.5 px-3 rounded-xl font-mono font-bold text-xs text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 hover:from-emerald-300 hover:to-indigo-300 transition-all flex items-center justify-center gap-1.5 shadow-neon-emerald"
              >
                {!userState.isPro ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Laboratorio PBQ Reale (PRO)</span>
                  </>
                ) : (
                  <>
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Avvia Laboratorio PBQ Reale</span>
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
                  RAPID DIAGNOSTIC DRILL (3 DOMANDE)
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
                  <span>Domanda {quickQuestionIndex + 1} di {activeQuickQuestions.length}</span>
                  <span className="text-emerald-400">Punteggio: {quickScore}/{activeQuickQuestions.length}</span>
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
                      <strong>Spiegazione Tecnica:</strong> {activeQuickQuestions[quickQuestionIndex].expl}
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
                      <span>{quickQuestionIndex < activeQuickQuestions.length - 1 ? 'PROSSIMA DOMANDA' : 'VISUALIZZA RISULTATO'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-4 py-2">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto text-2xl">
                  🎯
                </div>
                <h4 className="text-lg font-bold text-white">Check Rapido Completato</h4>
                <p className="text-xs text-slate-300 font-mono">
                  Hai risposto correttamente a <span className="text-emerald-400 font-bold">{quickScore}/{activeQuickQuestions.length}</span> domande.
                </p>
                <button
                  onClick={() => {
                    sound.playTap();
                    setQuickCheckCert(null);
                  }}
                  className="w-full py-3 px-4 rounded-xl font-mono font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300"
                >
                  Chiudi Check
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
                  SIMULAZIONE UFFICIALE {activePbq.certification}
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
                <strong className="text-white">Scenario d'Esame:</strong> {activePbq.scenarioDescription}
              </p>
              <p className="text-emerald-400">
                <strong>Obiettivo PBQ:</strong> {activePbq.targetObjective}
              </p>
            </div>

            {/* Interactive ACL Rule Table */}
            <div className="space-y-3 mb-5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block">
                TABELLA DI CONFIGURAZIONE REGOLE FIREWALL:
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
                      <span>PBQ SUPERATA CON SUCCESSO (+{activePbq.xpReward} XP · +{activePbq.eloReward} ELO)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      <span>CONFIGURAZIONE ERRATA O NON CONFORME AL LEAST PRIVILEGE</span>
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
                APPLICA ACL & VERIFICA CONFORMITÀ PBQ
              </button>
            ) : (
              <button
                onClick={() => {
                  sound.playTap();
                  setActivePbq(null);
                }}
                className="w-full py-3.5 px-4 rounded-xl font-mono font-extrabold text-xs sm:text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-neon-emerald transition-all"
              >
                CHIUDI LABORATORIO D'ESAME
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
