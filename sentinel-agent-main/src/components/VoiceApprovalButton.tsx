import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, CheckCircle, ShieldCheck, Sparkles, Volume2, AlertOctagon, Lock, Download, FileText, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfigDiffViewer } from './ConfigDiffViewer';

// Types for SpeechRecognition API cross-browser support
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceApprovalButtonProps {
  onApprove: () => void;
  isAwaitingApproval: boolean;
  isResolved: boolean;
  postMortemUrl?: string | null;
  original_state?: string;
  proposed_state?: string;
  originalState?: string;
  proposedState?: string;
}

export const VoiceApprovalButton: React.FC<VoiceApprovalButtonProps> = React.memo(({
  onApprove,
  isAwaitingApproval,
  isResolved,
  postMortemUrl,
  original_state,
  proposed_state,
  originalState,
  proposedState,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [voiceSuccess, setVoiceSuccess] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API if supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }

        const cleanTranscript = currentTranscript.trim().toLowerCase();
        setTranscript(cleanTranscript);

        // Check if approval target phrase is recognized
        if (
          cleanTranscript.includes('action approved') ||
          cleanTranscript.includes('approve fix') ||
          cleanTranscript.includes('approved') ||
          cleanTranscript.includes('approve') ||
          cleanTranscript.includes('execute fix')
        ) {
          triggerApprovalByVoice(cleanTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        if (event.error === 'not-allowed') {
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        // Auto restart if still in listening state and awaiting approval
        if (isListening && isAwaitingApproval) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('Speech recognition init error:', err);
      setSpeechSupported(false);
    }
  }, [isAwaitingApproval]);

  // Auto-activate voice listener when phase reaches AWAITING_APPROVAL
  useEffect(() => {
    if (isAwaitingApproval && speechSupported && !isListening) {
      startListening();
    }
  }, [isAwaitingApproval]);

  const startListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
      setTranscript('');
    } catch (err) {
      console.warn('Recognition start exception:', err);
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
      setIsListening(false);
    } catch (err) {
      console.warn('Recognition stop exception:', err);
    }
  };

  const triggerApprovalByVoice = (detectedPhrase: string) => {
    setVoiceSuccess(true);
    stopListening();
    onApprove();
    setTimeout(() => setVoiceSuccess(false), 3000);
  };

  const handleManualClick = () => {
    stopListening();
    onApprove();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={`glass-panel rounded-xl p-5 shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden font-mono transition-all duration-500 ${
        isAwaitingApproval
          ? 'border-emerald-500/80 glow-emerald'
          : isResolved
          ? 'border-emerald-900/60'
          : 'border-slate-800/80'
      }`}
    >
      {/* Background Animated Gradient Stream */}
      <AnimatePresence>
        {isAwaitingApproval && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-cyan-500/15 to-emerald-400/10 animate-pulse pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className="z-10 w-full flex flex-col items-center">
        {/* Status Header */}
        <div className="flex items-center justify-between w-full mb-4 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
            <h3 className="text-xs uppercase tracking-widest font-bold text-emerald-400 text-glow-emerald">
              AI Voice Control & Human Governance Console
            </h3>
          </div>

          {/* Microphone Status Badge */}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={isListening ? stopListening : startListening}
              className={`flex items-center gap-2 px-3 py-1 rounded-md text-[11px] font-bold border transition-all ${
                isListening
                  ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 glow-emerald animate-pulse'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title={speechSupported ? 'Toggle Voice Recognition' : 'Browser Web Speech API Unavailable'}
            >
              {isListening ? (
                <>
                  <Mic className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                  <span>MIC ACTIVE (LISTENING)</span>
                </>
              ) : (
                <>
                  <MicOff className="w-3.5 h-3.5 text-slate-500" />
                  <span>MIC INACTIVE</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Live Audio Equalizer & Transcript Box */}
        <div className="w-full mb-4 p-3 rounded-xl bg-slate-950/90 border border-slate-800/80 text-xs min-h-[50px] flex items-center justify-between px-4">
          <div className="flex items-center gap-3 w-full justify-center">
            {isListening ? (
              <div className="flex items-center gap-3 text-emerald-400 font-mono">
                {/* Audio Equalizer Waves */}
                <div className="flex items-center gap-1">
                  <span className="w-1 h-4 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-6 bg-emerald-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-3 bg-emerald-500 rounded-full animate-bounce" />
                  <span className="w-1 h-5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.25s]" />
                </div>
                <span>
                  {transcript ? (
                    <>Speech Recognized: <span className="font-bold underline text-emerald-300 text-glow-emerald">"{transcript}"</span></>
                  ) : (
                    <>Speak governance prompt <span className="font-bold underline text-emerald-300 text-glow-emerald">"Action Approved"</span> into microphone...</>
                  )}
                </span>
              </div>
            ) : isAwaitingApproval ? (
              <span className="text-amber-400 flex items-center gap-2 font-bold tracking-wide">
                <AlertOctagon className="w-4 h-4 shrink-0 animate-pulse text-amber-400" />
                GOVERNANCE INTERVENTION REQUIRED: Say "Action Approved" or click Fix Button below
              </span>
            ) : isResolved ? (
              <span className="text-emerald-400 flex items-center gap-2 font-bold">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Incident Resolution Authorized & Saved to CockroachDB Vector Index!
              </span>
            ) : (
              <span className="text-slate-500 italic flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-600" />
                Voice approval triggers automatically when agent reaches approval proposal step.
              </span>
            )}
          </div>
        </div>

        {/* Infrastructure Config Git Diff Viewer (Placed directly above Approve Fix button) */}
        <div className="w-full max-w-2xl mb-4">
          <ConfigDiffViewer
            original_state={original_state ?? originalState}
            proposed_state={proposed_state ?? proposedState}
          />
        </div>

        {/* Massive Glowing Cyberpunk "APPROVE FIX" Button */}
        <div className="relative group w-full max-w-md">
          {/* Animated Pulsing Halo Ring */}
          {isAwaitingApproval && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
              className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500 opacity-80 blur-md group-hover:opacity-100 transition duration-1000"
            />
          )}

          <motion.button
            whileHover={isAwaitingApproval ? { scale: 1.03, y: -2 } : {}}
            whileTap={isAwaitingApproval ? { scale: 0.97 } : {}}
            onClick={handleManualClick}
            disabled={!isAwaitingApproval}
            className={`relative w-full py-3.5 sm:py-5 px-4 sm:px-8 rounded-xl font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 sm:gap-3 border shadow-2xl ${
              isAwaitingApproval
                ? 'bg-gradient-to-r from-emerald-950 via-cyan-950 to-emerald-950 hover:from-emerald-900 hover:to-cyan-900 text-emerald-300 border-emerald-400 glow-emerald-lg text-base sm:text-lg lg:text-xl cursor-pointer'
                : isResolved
                ? 'bg-slate-900/90 border-emerald-800 text-emerald-400 text-xs sm:text-sm cursor-default'
                : 'bg-slate-950/80 border-slate-800/80 text-slate-600 text-sm cursor-not-allowed opacity-60'
            }`}
          >
            {isAwaitingApproval ? (
              <>
                <ShieldCheck className="w-7 h-7 text-emerald-400 animate-pulse" />
                <span className="text-glow-emerald tracking-wider font-extrabold text-xl">
                  APPROVE FIX
                </span>
                <Mic className="w-5 h-5 text-emerald-400 animate-bounce ml-2" />
              </>
            ) : isResolved ? (
              <>
                <CheckCircle className="w-6 h-6 text-emerald-400" />
                <span>FIX EXECUTED & VERIFIED NOMINAL</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5 text-slate-600" />
                <span>AWAITING INCIDENT PROPOSAL</span>
              </>
            )}
          </motion.button>
        </div>

        {/* Subtitle instructions */}
        <p className="text-[11px] text-slate-500 mt-3 font-mono">
          {speechSupported
            ? '⚡ Voice Control Active: Web Speech API active (Phrase target: "Action Approved")'
            : '⚠️ Speech API unavailable in this browser. Use manual approval button above.'}
        </p>

        {/* Glowing Download S3 Post-Mortem Button when Resolved */}
        {isResolved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-4 flex flex-col items-center gap-2"
          >
            <a
              href={postMortemUrl || '#'}
              download="Incident_Post_Mortem_INC-8891.md"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-950 via-purple-950 to-emerald-950 hover:from-cyan-900 hover:to-emerald-900 text-cyan-300 border border-cyan-400 glow-cyan font-mono font-bold text-sm flex items-center gap-2.5 transition-all shadow-xl cursor-pointer group"
            >
              <Download className="w-5 h-5 text-cyan-400 group-hover:animate-bounce" />
              <span>Download S3 Post-Mortem (.md)</span>
              <ExternalLink className="w-4 h-4 text-cyan-500 group-hover:text-cyan-300 ml-1" />
            </a>
            <span className="text-[10px] text-cyan-400/80 font-mono flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Generated by Claude 3.5 Sonnet & Archived to AWS S3 (`sentinel-agent-postmortems`)
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});
