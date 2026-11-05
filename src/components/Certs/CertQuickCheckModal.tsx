import React, { useState } from 'react';
import { sound } from '../../utils/soundEngine';
import { shuffleArray } from '../../utils/shuffle';
import { CheckCircle2, ArrowRight, X } from 'lucide-react';
import { getRandomQuestionsForCert } from '../../data/officialCertQuestions';

interface QuickQuestion {
  q: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  expl: string;
}

const QUICK_QUESTIONS_BASE: QuickQuestion[] = [
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

interface CertQuickCheckModalProps {
  certId: string;
  certName: string;
  onClose: () => void;
}

export const CertQuickCheckModal: React.FC<CertQuickCheckModalProps> = ({
  certId,
  certName,
  onClose
}) => {
  const [activeQuestions] = useState<QuickQuestion[]>(() => {
    const pool = getRandomQuestionsForCert(certId, 5);
    if (pool.length > 0) {
      return pool.map(q => ({
        q: q.question,
        options: shuffleArray(q.options.map((opt, oIdx) => ({
          id: `${q.id}_${oIdx}`,
          text: opt,
          isCorrect: oIdx === q.correctIndex
        }))),
        expl: q.explanation || `Correct answer: ${q.correctAnswer}`
      }));
    }
    return QUICK_QUESTIONS_BASE.map(q => ({ ...q, options: shuffleArray(q.options) }));
  });

  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [answered, setAnswered] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0D121D] border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl text-zinc-100">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
          <div>
            <span className="text-xs font-mono text-zinc-400 font-bold block uppercase">
              Rapid Diagnostic Drill (5 Questions)
            </span>
            <h3 className="font-bold text-base text-white">{certName}</h3>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="p-1 rounded text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!completed ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>Question {questionIndex + 1} of {activeQuestions.length}</span>
              <span className="text-emerald-400 font-bold">Score: {score}/{activeQuestions.length}</span>
            </div>

            <p className="text-xs sm:text-sm text-zinc-200 font-medium leading-relaxed">
              {activeQuestions[questionIndex].q}
            </p>

            <div className="space-y-2">
              {activeQuestions[questionIndex].options.map((opt) => (
                <button
                  key={opt.id}
                  disabled={answered}
                  onClick={() => {
                    sound.playTap();
                    const isRight = opt.isCorrect;
                    if (isRight) {
                      sound.playExploitSuccess();
                      setScore(prev => prev + 1);
                    } else {
                      sound.playPayloadBlocked();
                    }
                    setAnswered(true);
                  }}
                  className="w-full min-h-[50px] p-3.5 rounded-xl border border-zinc-800 bg-zinc-900 text-left text-xs sm:text-sm font-mono font-bold hover:border-zinc-700 transition-all flex items-center justify-between text-zinc-200 cursor-pointer active:scale-[0.99]"
                >
                  <span>{opt.text}</span>
                </button>
              ))}
            </div>

            {answered && (
              <div className="pt-2 animate-fade-in space-y-3">
                <p className="text-xs text-zinc-300 bg-zinc-900 p-3.5 rounded-xl border border-zinc-800">
                  <strong className="text-white font-black">Spiegazione Tecnica:</strong> {activeQuestions[questionIndex].expl}
                </p>
                <button
                  onClick={() => {
                    sound.playTap();
                    if (questionIndex < activeQuestions.length - 1) {
                      setQuestionIndex(prev => prev + 1);
                      setAnswered(false);
                    } else {
                      setCompleted(true);
                    }
                  }}
                  className="w-full min-h-[50px] py-3.5 px-4 rounded-xl font-mono font-black text-xs sm:text-sm text-zinc-950 bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-98"
                >
                  <span>{questionIndex < activeQuestions.length - 1 ? 'PROSSIMA DOMANDA' : 'VEDI RISULTATO'}</span>
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
              You answered <span className="text-emerald-400 font-bold">{score}/{activeQuestions.length}</span> questions correctly.
            </p>
            <button
              onClick={() => {
                sound.playTap();
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl font-mono font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 cursor-pointer transition-colors"
            >
              Close Check
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
