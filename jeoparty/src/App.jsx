import React, { useState, useEffect, useRef } from 'react';
import { Trophy, User, X, Check, HelpCircle, RotateCcw, Users, Clock, Sparkles, ChevronLeft, AlertTriangle, Flame, Zap, Star, Crown, Shield } from 'lucide-react';

// --- AUDIO SYSTEM (Web Audio API) ---
const initAudio = () => {
    if (typeof window !== 'undefined' && !window.audioCtx) {
        window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (window.audioCtx?.state === 'suspended') {
        window.audioCtx.resume();
    }
};

const playSound = (type) => {
    if (!window.audioCtx) return;
    const ctx = window.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'tick') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'correct') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.1);
        osc.frequency.setValueAtTime(659.25, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
    } else if (type === 'dailyDouble') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.5);
        osc.frequency.linearRampToValueAtTime(1200, now + 1.0);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0, now + 1.5);
        osc.start(now);
        osc.stop(now + 1.5);
    } else if (type === 'mandatory') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.setValueAtTime(150, now + 0.2);
        osc.frequency.setValueAtTime(200, now + 0.4);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
    }
};

import { ALL_CATEGORIES } from './questions.js';

/* ─── Player colour palette ─── */
const PLAYER_COLORS = [
    { bg: 'from-indigo-600 to-violet-700', border: 'border-indigo-500', accent: '#6366f1', glow: 'rgba(99,102,241,0.45)', text: 'text-indigo-400' },
    { bg: 'from-rose-600 to-pink-700', border: 'border-rose-500', accent: '#f43f5e', glow: 'rgba(244,63,94,0.45)', text: 'text-rose-400' },
    { bg: 'from-emerald-600 to-teal-700', border: 'border-emerald-500', accent: '#10b981', glow: 'rgba(16,185,129,0.45)', text: 'text-emerald-400' },
    { bg: 'from-amber-500 to-orange-600', border: 'border-amber-500', accent: '#f59e0b', glow: 'rgba(245,158,11,0.45)', text: 'text-amber-400' },
    { bg: 'from-sky-500 to-cyan-600', border: 'border-sky-500', accent: '#0ea5e9', glow: 'rgba(14,165,233,0.45)', text: 'text-sky-400' },
    { bg: 'from-fuchsia-600 to-purple-700', border: 'border-fuchsia-500', accent: '#d946ef', glow: 'rgba(217,70,239,0.45)', text: 'text-fuchsia-400' },
];

/* ─── Rank medal emoji ─── */
const MEDALS = ['🥇', '🥈', '🥉'];

/* ─── Score Popup Component ─── */
const ScorePopup = ({ value, positive }) => (
    <div
        className={`absolute -top-8 left-1/2 -translate-x-1/2 font-black text-lg pointer-events-none z-50 animate-slide-in-up ${positive ? 'text-green-400' : 'text-red-400'}`}
        style={{ animation: 'floatUp 1.2s ease forwards' }}
    >
        {positive ? '+' : ''}{value}
    </div>
);

const App = () => {
    // Game States: 'setup', 'playing', 'gameover'
    const [gameState, setGameState] = useState('setup');

    // Setup State
    const [playerCount, setPlayerCount] = useState(4);
    const [playerNames, setPlayerNames] = useState(Array(6).fill(''));
    const [selectedCategories, setSelectedCategories] = useState(ALL_CATEGORIES.slice(0, 6).map(c => c.id));

    // Main Game State
    const [gameCategories, setGameCategories] = useState([]);
    const [players, setPlayers] = useState([]);
    const [dailyDoubles, setDailyDoubles] = useState([]);
    const [mandatoryQuestions, setMandatoryQuestions] = useState([]);
    const [activePlayerIndex, setActivePlayerIndex] = useState(0);
    const [answeredQuestions, setAnsweredQuestions] = useState([]);

    // Question Modal State
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [currentAnsweringIndex, setCurrentAnsweringIndex] = useState(0);
    const [attemptedPlayers, setAttemptedPlayers] = useState([]);
    const [eliminatedOptions, setEliminatedOptions] = useState([]);
    const [questionStatus, setQuestionStatus] = useState('unanswered');
    const [showAnswer, setShowAnswer] = useState(false);
    const [showDDSplash, setShowDDSplash] = useState(false);
    const [showMandatorySplash, setShowMandatorySplash] = useState(false);
    const [timeLeft, setTimeLeft] = useState(40);

    // Score breakdown
    const [answerDetails, setAnswerDetails] = useState(null);

    // Initialize Game
    const startGame = () => {
        if (selectedCategories.length < 1) {
            alert('لطفاً حداقل ۱ دسته سوال انتخاب کنید.');
            return;
        }

        initAudio();
        const newPlayers = Array.from({ length: playerCount }).map((_, i) => ({
            id: i + 1,
            name: playerNames[i].trim() || `بازیکن ${i + 1}`,
            score: 0,
            streak: 0,
        }));
        setPlayers(newPlayers);

        const chosenCategories = ALL_CATEGORIES.filter(c => selectedCategories.includes(c.id)).map(cat => {
            const q100 = cat.questions.filter(q => q.value === 100);
            const q200 = cat.questions.filter(q => q.value === 200);
            const q300 = cat.questions.filter(q => q.value === 300);
            const q400 = cat.questions.filter(q => q.value === 400);
            const q500 = cat.questions.filter(q => q.value === 500);
            const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)] || arr[0];
            return {
                ...cat,
                questions: [
                    pickRandom(q100),
                    pickRandom(q200),
                    pickRandom(q300),
                    pickRandom(q400),
                    pickRandom(q500),
                ].filter(Boolean),
            };
        });

        setGameCategories(chosenCategories);

        const dds = [];
        const mqs = [];
        chosenCategories.forEach(cat => {
            const qIds = cat.questions.map(q => q.id);
            if (qIds.length === 0) return;
            const ddIndex = Math.floor(Math.random() * qIds.length);
            dds.push(qIds[ddIndex]);
            const remainingIds = qIds.filter((_, i) => i !== ddIndex);
            if (remainingIds.length > 0) {
                mqs.push(remainingIds[Math.floor(Math.random() * remainingIds.length)]);
            }
        });

        setDailyDoubles(dds);
        setMandatoryQuestions(mqs);
        setGameState('playing');
        setActivePlayerIndex(0);
        setAnsweredQuestions([]);
    };

    const toggleCategory = (id) => {
        setSelectedCategories(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    // Timer Effect
    useEffect(() => {
        if (currentQuestion && !showAnswer && !showDDSplash && !showMandatorySplash && timeLeft > 0) {
            const timerId = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
            return () => clearTimeout(timerId);
        } else if (currentQuestion && !showAnswer && !showDDSplash && !showMandatorySplash && timeLeft === 0) {
            handleTimeoutOrPass();
        }
    }, [currentQuestion, showAnswer, showDDSplash, showMandatorySplash, timeLeft]);

    // Tick Sound for last 10s
    useEffect(() => {
        if (currentQuestion && !showAnswer && !showDDSplash && !showMandatorySplash && timeLeft <= 10 && timeLeft > 0) {
            playSound('tick');
        }
    }, [timeLeft, currentQuestion, showAnswer, showDDSplash, showMandatorySplash]);

    // Handle Question Selection
    const handleQuestionClick = (categoryTitle, question) => {
        if (answeredQuestions.includes(question.id)) return;
        const isDD = dailyDoubles.includes(question.id);
        const isMandatory = mandatoryQuestions.includes(question.id);
        const effectiveValue = isDD ? question.value * 2 : question.value;
        setCurrentQuestion({ ...question, category: categoryTitle, isDD, isMandatory, effectiveValue });
        setShowAnswer(false);
        setCurrentAnsweringIndex(activePlayerIndex);
        setAttemptedPlayers([]);
        setEliminatedOptions([]);
        setQuestionStatus('unanswered');
        setAnswerDetails(null);
        setTimeLeft(40);
        if (isDD) {
            playSound('dailyDouble');
            setShowDDSplash(true);
            setTimeout(() => setShowDDSplash(false), 2500);
        } else if (isMandatory) {
            playSound('mandatory');
            setShowMandatorySplash(true);
            setTimeout(() => setShowMandatorySplash(false), 4000);
        }
    };

    const handlePenalty = (isPass) => {
        const isMainPlayer = currentAnsweringIndex === activePlayerIndex;
        let penalty = 0;
        if (currentQuestion.isMandatory && isMainPlayer) {
            penalty = currentQuestion.effectiveValue * 2;
        } else if (!isPass) {
            penalty = currentQuestion.effectiveValue;
        }
        const newPlayers = [...players];
        newPlayers[currentAnsweringIndex].streak = 0;
        if (penalty > 0) newPlayers[currentAnsweringIndex].score -= penalty;
        setPlayers(newPlayers);
    };

    const proceedToNextPlayer = () => {
        const newAttempted = [...attemptedPlayers, currentAnsweringIndex];
        setAttemptedPlayers(newAttempted);
        if (newAttempted.length >= players.length) {
            setQuestionStatus('failed');
            setShowAnswer(true);
        } else {
            setCurrentAnsweringIndex((currentAnsweringIndex + 1) % players.length);
            setTimeLeft(40);
        }
    };

    const handleTimeoutOrPass = () => {
        playSound('wrong');
        handlePenalty(true);
        proceedToNextPlayer();
    };

    const handleOptionClick = (option) => {
        if (option === currentQuestion.a) {
            playSound('correct');
            const newPlayers = [...players];
            const p = newPlayers[currentAnsweringIndex];
            p.streak += 1;
            const isStreakActive = p.streak >= 3;
            const hasSpeedBonus = timeLeft >= 30;
            const speedBonus = hasSpeedBonus ? Math.floor(currentQuestion.effectiveValue * 0.2) : 0;
            const baseEarned = currentQuestion.effectiveValue + speedBonus;
            const totalEarned = isStreakActive ? Math.floor(baseEarned * 1.5) : baseEarned;
            p.score += totalEarned;
            setPlayers(newPlayers);
            setQuestionStatus('correct');
            setAnswerDetails({ speedBonus, isStreakActive, totalEarned });
            setShowAnswer(true);
        } else {
            playSound('wrong');
            handlePenalty(false);
            setEliminatedOptions(prev => [...prev, option]);
            proceedToNextPlayer();
        }
    };

    const finishQuestion = () => {
        setAnsweredQuestions([...answeredQuestions, currentQuestion.id]);
        setCurrentQuestion(null);
        setShowAnswer(false);
        setActivePlayerIndex((activePlayerIndex + 1) % players.length);
        if (answeredQuestions.length + 1 === gameCategories.length * 5) {
            setGameState('gameover');
        }
    };

    const handleNameChange = (index, value) => {
        const newNames = [...playerNames];
        newNames[index] = value;
        setPlayerNames(newNames);
    };

    const resetToSetup = () => {
        setGameState('setup');
        setPlayerNames(Array(6).fill(''));
        setPlayerCount(4);
    };

    const timerPercent = (timeLeft / 40) * 100;
    const timerColor = timeLeft <= 10 ? '#ef4444' : timeLeft >= 30 ? '#22c55e' : '#6366f1';

    /* ════════════════════════════════════════
       SETUP SCREEN
    ════════════════════════════════════════ */
    if (gameState === 'setup') {
        return (
            <div dir="rtl" className="min-h-screen bg-[#060b1a] text-white flex items-center justify-center p-4 relative overflow-hidden select-none">
                {/* Starfield BG */}
                <div className="starfield" />

                {/* Ambient blobs */}
                <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none" />
                <div className="fixed bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-900/20 blur-[100px] pointer-events-none" />

                <div className="relative z-10 w-full max-w-lg animate-zoom-in">
                    {/* Header Card */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-5 relative"
                            style={{ background: 'linear-gradient(145deg, #1a1f4e, #2d3390)', boxShadow: '0 0 40px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' }}>
                            <Trophy className="w-12 h-12 text-yellow-400 glow-gold" />
                            <div className="absolute inset-0 rounded-3xl border border-indigo-500/40" />
                        </div>
                        <h1 className="text-5xl font-black mb-2" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            جئوپاردی
                        </h1>
                        <p className="text-indigo-300/70 text-lg font-medium tracking-wide">بازی دانش و رقابت</p>
                        <div className="flex justify-center gap-1 mt-3">
                            {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
                        </div>
                    </div>

                    {/* Main Setup Card */}
                    <div className="rounded-3xl p-8 space-y-8" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>

                        {/* Player Count */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <label className="flex items-center gap-2 font-bold text-base text-slate-200">
                                    <div className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30">
                                        <Users size={18} className="text-indigo-400" />
                                    </div>
                                    تعداد بازیکنان
                                </label>
                                <div className="px-4 py-1.5 rounded-full font-black text-xl text-indigo-300"
                                    style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.15))', border: '1px solid rgba(99,102,241,0.4)' }}>
                                    {playerCount} نفر
                                </div>
                            </div>
                            <div className="relative">
                                <input
                                    type="range" min="2" max="6" value={playerCount}
                                    onChange={(e) => setPlayerCount(parseInt(e.target.value))}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-slate-500 mt-1 px-1">
                                    {[2, 3, 4, 5, 6].map(n => (
                                        <span key={n} className={playerCount === n ? 'text-indigo-400 font-bold' : ''}>{n}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Player Names */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 font-bold text-base text-slate-200 mb-3">
                                <div className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30">
                                    <User size={18} className="text-rose-400" />
                                </div>
                                اسامی بازیکنان
                            </label>
                            {Array.from({ length: playerCount }).map((_, i) => {
                                const col = PLAYER_COLORS[i];
                                return (
                                    <div key={i} className="relative group">
                                        <div className={`absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gradient-to-br ${col.bg} flex items-center justify-center text-xs font-black text-white`}>
                                            {i + 1}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder={`بازیکن ${i + 1}`}
                                            value={playerNames[i]}
                                            onChange={(e) => handleNameChange(i, e.target.value)}
                                            className="w-full rounded-xl py-3 pr-12 pl-4 text-white outline-none transition-all duration-200 font-medium placeholder-slate-600"
                                            style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                border: `1px solid rgba(255,255,255,0.08)`,
                                            }}
                                            onFocus={e => { e.target.style.border = `1px solid ${col.accent}`; e.target.style.background = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = `0 0 0 3px ${col.glow}`; }}
                                            onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.boxShadow = 'none'; }}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Category Selection */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <label className="flex items-center gap-2 font-bold text-base text-slate-200">
                                    <div className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30">
                                        <HelpCircle size={18} className="text-amber-400" />
                                    </div>
                                    دسته‌بندی‌های سوالات
                                </label>
                                <div className="px-3 py-1 rounded-full text-sm font-bold"
                                    style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: '#fbbf24' }}>
                                    {selectedCategories.length} / {ALL_CATEGORIES.length}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto p-1">
                                {ALL_CATEGORIES.map(cat => {
                                    const selected = selectedCategories.includes(cat.id);
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => toggleCategory(cat.id)}
                                            className={`px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${selected ? 'text-white scale-105' : 'text-slate-400 hover:text-white'
                                                }`}
                                            style={selected ? {
                                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                                border: '1px solid #6366f1',
                                                boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
                                            } : {
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                            }}
                                        >
                                            {cat.title}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Start Button */}
                        <button
                            onClick={startGame}
                            className="w-full py-4 rounded-2xl font-black text-xl text-white flex items-center justify-center gap-3 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                            style={{
                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #9333ea)',
                                boxShadow: '0 8px 30px rgba(99,102,241,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
                            }}
                        >
                            <Sparkles className="w-5 h-5" />
                            شروع رقابت
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Footer hints */}
                    <div className="mt-6 flex flex-wrap justify-center gap-6 text-xs text-slate-600">
                        <span className="flex items-center gap-1"><Zap size={12} className="text-indigo-400" /> پاسخ زیر ۱۰ ثانیه = ۲۰٪ امتیاز بیشتر</span>
                        <span className="flex items-center gap-1"><Flame size={12} className="text-orange-500" /> ۳ پاسخ صحیح پشت سر هم = x۱.۵</span>
                    </div>
                </div>
            </div>
        );
    }

    /* ════════════════════════════════════════
       GAME OVER SCREEN
    ════════════════════════════════════════ */
    if (gameState === 'gameover') {
        const sorted = [...players].sort((a, b) => b.score - a.score);
        const winner = sorted[0];
        return (
            <div dir="rtl" className="min-h-screen bg-[#060b1a] text-white flex items-center justify-center p-4 relative overflow-hidden select-none">
                <div className="starfield" />
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(234,179,8,0.15) 0%, transparent 60%)' }} />
                </div>

                <div className="relative z-10 w-full max-w-lg animate-zoom-in">
                    {/* Crown + Trophy */}
                    <div className="text-center mb-8">
                        <div className="relative inline-block">
                            <div className="w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-4"
                                style={{ background: 'linear-gradient(145deg, #92400e, #d97706, #fbbf24)', boxShadow: '0 0 60px rgba(234,179,8,0.6), 0 0 120px rgba(234,179,8,0.2)' }}>
                                <Trophy className="w-16 h-16 text-white" style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))' }} />
                            </div>
                        </div>
                        <h2 className="text-5xl font-black mb-2" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            پایان رقابت!
                        </h2>
                        <p className="text-slate-400 text-lg">برنده: <span className="font-bold text-yellow-400">{winner?.name}</span></p>
                    </div>

                    {/* Scoreboard */}
                    <div className="rounded-3xl p-6 space-y-3 mb-6"
                        style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
                        {sorted.map((p, i) => {
                            const col = PLAYER_COLORS[players.findIndex(pl => pl.id === p.id)];
                            const isWinner = i === 0;
                            return (
                                <div
                                    key={p.id}
                                    className={`rounded-2xl p-4 flex items-center justify-between transition-all animate-slide-in-up`}
                                    style={{
                                        animationDelay: `${i * 0.1}s`,
                                        background: isWinner
                                            ? 'linear-gradient(135deg, rgba(234,179,8,0.15), rgba(245,158,11,0.08))'
                                            : 'rgba(255,255,255,0.03)',
                                        border: isWinner ? '1px solid rgba(234,179,8,0.4)' : '1px solid rgba(255,255,255,0.05)',
                                        boxShadow: isWinner ? '0 0 30px rgba(234,179,8,0.15)' : 'none',
                                    }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-black ${isWinner ? 'bg-yellow-500 text-yellow-900' : 'bg-white/10 text-white'}`}>
                                            {MEDALS[i] || i + 1}
                                        </div>
                                        <div>
                                            <div className={`font-bold text-lg ${isWinner ? 'text-yellow-300' : 'text-white'}`}>{p.name}</div>
                                        </div>
                                    </div>
                                    <div className={`text-2xl font-black ${p.score < 0 ? 'text-red-400' : isWinner ? 'text-yellow-400' : col.text}`}>
                                        {p.score}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button
                        onClick={resetToSetup}
                        className="w-full py-4 rounded-2xl font-black text-xl text-white flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 8px 30px rgba(99,102,241,0.5)' }}
                    >
                        <RotateCcw className="w-5 h-5" />
                        بازی جدید
                    </button>
                </div>
            </div>
        );
    }

    /* ════════════════════════════════════════
       MAIN GAME SCREEN
    ════════════════════════════════════════ */
    return (
        <div dir="rtl" className="min-h-screen bg-[#060b1a] text-white p-3 md:p-5 relative select-none">
            <div className="starfield" />
            <div className="fixed top-0 left-0 right-0 h-[300px] pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />

            <div className="relative z-10 max-w-[1600px] mx-auto">

                {/* ── HEADER ── */}
                <header className="mb-5 flex flex-col lg:flex-row items-center gap-4">
                    {/* Logo */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(145deg, #1a1f4e, #2d3390)', border: '1px solid rgba(99,102,241,0.5)', boxShadow: '0 0 20px rgba(99,102,241,0.3)' }}>
                            <Trophy className="w-7 h-7 text-yellow-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black leading-none"
                                style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                جئوپاردی فارسی
                            </h1>
                            <p className="text-indigo-400 text-xs font-medium mt-0.5 flex items-center gap-1">
                                <ChevronLeft size={12} />
                                نوبت: <span className="font-bold text-white">{players[activePlayerIndex]?.name}</span>
                            </p>
                        </div>
                    </div>

                    {/* Player Cards */}
                    <div className="flex flex-wrap justify-center gap-2 flex-1">
                        {players.map((p, idx) => {
                            const col = PLAYER_COLORS[idx];
                            const isActive = activePlayerIndex === idx;
                            return (
                                <div
                                    key={p.id}
                                    className={`relative rounded-2xl px-4 py-3 min-w-[90px] flex flex-col items-center transition-all duration-300 ${isActive ? 'scale-105' : 'opacity-60'}`}
                                    style={{
                                        background: isActive
                                            ? `linear-gradient(145deg, rgba(${hexToRgb(col.accent)},0.2), rgba(${hexToRgb(col.accent)},0.05))`
                                            : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${isActive ? col.accent : 'rgba(255,255,255,0.07)'}`,
                                        boxShadow: isActive ? `0 0 20px ${col.glow}, 0 4px 15px rgba(0,0,0,0.3)` : '0 2px 8px rgba(0,0,0,0.2)',
                                    }}
                                >
                                    {/* Active indicator ring */}
                                    {isActive && (
                                        <div className="absolute -inset-[3px] rounded-[18px] opacity-30 animate-pulse-border"
                                            style={{ background: `linear-gradient(135deg, ${col.accent}, transparent)`, zIndex: -1 }} />
                                    )}
                                    {/* Streak flame */}
                                    {p.streak >= 3 && (
                                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                                            style={{ background: '#1a0800', border: '1.5px solid #f97316' }}>
                                            <Flame className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                                        </div>
                                    )}
                                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${col.bg} flex items-center justify-center text-xs font-black text-white mb-1.5`}>
                                        {idx + 1}
                                    </div>
                                    <div className="text-xs font-medium truncate max-w-[80px] text-slate-300">{p.name}</div>
                                    <div className={`text-lg font-black mt-0.5 ${p.score < 0 ? 'text-red-400' : col.text}`}>
                                        {p.score.toLocaleString('fa-IR')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </header>

                {/* ── GAME BOARD ── */}
                <main className="flex gap-2 md:gap-3 justify-center flex-wrap">
                    {gameCategories.map((cat, catIdx) => (
                        <div key={cat.id} className="flex flex-col gap-2 md:gap-3 flex-1 min-w-[110px] max-w-[190px]">
                            {/* Category Header */}
                            <div className="rounded-2xl flex items-center justify-center h-16 md:h-20 text-center px-2"
                                style={{
                                    background: 'linear-gradient(145deg, #0f172a, #1e2444)',
                                    border: '1px solid rgba(99,102,241,0.3)',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
                                }}>
                                <h2 className="font-black text-xs md:text-sm text-indigo-200 line-clamp-3 leading-tight">
                                    {cat.title}
                                </h2>
                            </div>

                            {/* Question Buttons */}
                            {cat.questions.map(q => {
                                const isAnswered = answeredQuestions.includes(q.id);
                                const isDD = dailyDoubles.includes(q.id);
                                const isMQ = mandatoryQuestions.includes(q.id);
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => handleQuestionClick(cat.title, q)}
                                        disabled={isAnswered}
                                        className={`h-16 sm:h-20 rounded-2xl font-black text-2xl md:text-3xl flex items-center justify-center transition-all duration-200 relative overflow-hidden group ${isAnswered ? 'board-card-answered cursor-not-allowed' : 'board-card'}`}
                                    >
                                        {!isAnswered && (
                                            <>
                                                <span className="text-yellow-400 font-black relative z-10 group-hover:scale-110 transition-transform duration-200">
                                                    {q.value}
                                                </span>
                                                {(isDD || isMQ) && (
                                                    <div className="absolute top-1.5 right-1.5">
                                                        {isDD ? <Sparkles size={10} className="text-yellow-300 opacity-80" /> : <AlertTriangle size={10} className="text-red-400 opacity-80" />}
                                                    </div>
                                                )}
                                                {/* Shine sweep */}
                                                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
                                            </>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </main>

                {/* ── FOOTER HINTS ── */}
                <footer className="mt-6 flex flex-wrap justify-center gap-6 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5"><Zap size={12} className="text-indigo-400" /> پاسخ زیر ۱۰ ثانیه = ۲۰٪ امتیاز بیشتر</span>
                    <span className="flex items-center gap-1.5"><Flame size={12} className="text-orange-500" /> ۳ پاسخ صحیح متوالی = ضریب ۱.۵</span>
                    <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-yellow-400" /> سوال جایزه‌دار = ۲ برابر امتیاز</span>
                    <span className="flex items-center gap-1.5"><AlertTriangle size={12} className="text-red-400" /> سوال اجباری = جریمه سنگین</span>
                </footer>
            </div>

            {/* ════════════════════════════════
          QUESTION MODAL
      ════════════════════════════════ */}
            {currentQuestion && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6"
                    style={{ background: 'rgba(4,7,17,0.92)', backdropFilter: 'blur(16px)' }}>
                    <div
                        className="w-full max-w-2xl rounded-3xl overflow-hidden animate-zoom-in"
                        style={{
                            background: 'linear-gradient(145deg, #0d1339, #111827)',
                            border: `1px solid ${currentQuestion.isMandatory ? 'rgba(239,68,68,0.5)' : currentQuestion.isDD ? 'rgba(234,179,8,0.5)' : 'rgba(99,102,241,0.4)'}`,
                            boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 40px ${currentQuestion.isMandatory ? 'rgba(239,68,68,0.2)' : currentQuestion.isDD ? 'rgba(234,179,8,0.2)' : 'rgba(99,102,241,0.2)'}`,
                        }}
                    >
                        {/* Modal Header */}
                        <div className="px-6 py-4 flex items-center justify-between relative overflow-hidden"
                            style={{
                                background: currentQuestion.isMandatory
                                    ? 'linear-gradient(135deg, #7f1d1d, #991b1b)'
                                    : currentQuestion.isDD
                                        ? 'linear-gradient(135deg, #78350f, #92400e)'
                                        : 'linear-gradient(135deg, #1e1b4b, #312e81)',
                                borderBottom: `1px solid ${currentQuestion.isMandatory ? 'rgba(239,68,68,0.3)' : currentQuestion.isDD ? 'rgba(234,179,8,0.3)' : 'rgba(99,102,241,0.3)'}`,
                            }}>
                            {/* Shine */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                            <div>
                                <div className="text-xs text-slate-400 mb-0.5 uppercase tracking-widest font-medium">دسته‌بندی</div>
                                <div className="font-black text-lg text-white">{currentQuestion.category}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                {currentQuestion.isDD && <Sparkles size={18} className="text-yellow-400 animate-pulse" />}
                                {currentQuestion.isMandatory && <AlertTriangle size={18} className="text-red-400 animate-pulse" />}
                                <div className="px-4 py-2 rounded-full font-black text-lg"
                                    style={{
                                        background: currentQuestion.isMandatory ? 'rgba(239,68,68,0.2)' : currentQuestion.isDD ? 'rgba(234,179,8,0.2)' : 'rgba(99,102,241,0.2)',
                                        border: `1px solid ${currentQuestion.isMandatory ? 'rgba(239,68,68,0.5)' : currentQuestion.isDD ? 'rgba(234,179,8,0.5)' : 'rgba(99,102,241,0.5)'}`,
                                        color: currentQuestion.isMandatory ? '#fca5a5' : currentQuestion.isDD ? '#fcd34d' : '#a5b4fc',
                                    }}>
                                    {currentQuestion.effectiveValue} امتیاز
                                </div>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 md:p-8 min-h-[320px] flex flex-col">
                            {/* DD / Mandatory Splash */}
                            {showDDSplash ? (
                                <div className="flex-1 flex flex-col items-center justify-center animate-zoom-in">
                                    <div className="w-28 h-28 rounded-full flex items-center justify-center mb-6"
                                        style={{ background: 'linear-gradient(145deg, #92400e, #d97706)', boxShadow: '0 0 60px rgba(234,179,8,0.6)' }}>
                                        <Sparkles className="w-14 h-14 text-white" />
                                    </div>
                                    <h2 className="text-4xl font-black text-yellow-400 mb-3 text-glow-gold">سوال جایزه‌دار!</h2>
                                    <p className="text-slate-400 text-center text-lg">امتیاز این سوال دو برابر محاسبه می‌شود</p>
                                </div>
                            ) : showMandatorySplash ? (
                                <div className="flex-1 flex flex-col items-center justify-center animate-zoom-in">
                                    <div className="w-28 h-28 rounded-full flex items-center justify-center mb-6"
                                        style={{ background: 'linear-gradient(145deg, #7f1d1d, #dc2626)', boxShadow: '0 0 60px rgba(239,68,68,0.6)' }}>
                                        <AlertTriangle className="w-14 h-14 text-white" />
                                    </div>
                                    <h2 className="text-4xl font-black text-red-400 mb-3">سوال اجباری!</h2>
                                    <p className="text-slate-300 text-center leading-relaxed">
                                        پاسخ اشتباه یا پاس دادن = <span className="text-red-400 font-black">{currentQuestion.effectiveValue * 2} امتیاز</span> جریمه
                                    </p>
                                </div>
                            ) : !showAnswer ? (
                                /* ── Active Question ── */
                                <div className="flex-1 flex flex-col">
                                    {/* Timer & Current Player */}
                                    <div className="flex flex-col gap-3 mb-6">
                                        {/* Current answering player */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {(() => {
                                                    const col = PLAYER_COLORS[currentAnsweringIndex];
                                                    return (
                                                        <>
                                                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${col.bg} flex items-center justify-center text-sm font-black text-white`}>
                                                                {currentAnsweringIndex + 1}
                                                            </div>
                                                            <span className="font-bold text-white">{players[currentAnsweringIndex]?.name}</span>
                                                            {players[currentAnsweringIndex]?.streak >= 3 && (
                                                                <Flame size={16} className="text-orange-500 animate-pulse" />
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock size={16} className={`${timeLeft <= 10 ? 'text-red-400 animate-timer-pulse' : 'text-slate-400'}`} />
                                                <span className={`font-black text-2xl ${timeLeft <= 10 ? 'text-red-400 animate-timer-pulse' : timeLeft >= 30 ? 'text-green-400' : 'text-white'}`}>
                                                    {timeLeft}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Timer bar */}
                                        <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                            <div
                                                className="absolute inset-y-0 right-0 rounded-full transition-all duration-1000 ease-linear"
                                                style={{
                                                    width: `${timerPercent}%`,
                                                    background: timeLeft <= 10
                                                        ? 'linear-gradient(90deg, #ef4444, #f87171)'
                                                        : timeLeft >= 30
                                                            ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                                                            : 'linear-gradient(90deg, #4f46e5, #818cf8)',
                                                    boxShadow: `0 0 10px ${timerColor}`,
                                                }}
                                            />
                                        </div>

                                        {/* Warning badge */}
                                        {(currentQuestion.isMandatory || true) && (
                                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold"
                                                style={{
                                                    background: currentQuestion.isMandatory && currentAnsweringIndex === activePlayerIndex
                                                        ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                                    border: `1px solid ${currentQuestion.isMandatory && currentAnsweringIndex === activePlayerIndex ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                                                    color: currentQuestion.isMandatory && currentAnsweringIndex === activePlayerIndex ? '#fca5a5' : '#fcd34d',
                                                }}>
                                                <AlertTriangle size={12} />
                                                {currentQuestion.isMandatory && currentAnsweringIndex === activePlayerIndex
                                                    ? `خطر: پاسخ اشتباه یا پاس = ${currentQuestion.effectiveValue * 2} امتیاز منفی`
                                                    : `هشدار: پاسخ اشتباه = ${currentQuestion.effectiveValue} امتیاز منفی`}
                                            </div>
                                        )}
                                    </div>

                                    {/* Question Text */}
                                    <div className="flex-1 flex flex-col justify-center">
                                        <h3 className="text-xl md:text-2xl font-bold text-center leading-relaxed text-white mb-8">
                                            {currentQuestion.q}
                                        </h3>

                                        {/* Options Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {currentQuestion.options.map((opt, i) => {
                                                const isEliminated = eliminatedOptions.includes(opt);
                                                const letters = ['الف', 'ب', 'ج', 'د'];
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => handleOptionClick(opt)}
                                                        disabled={isEliminated}
                                                        className={`relative p-4 rounded-2xl font-bold text-base text-right transition-all duration-200 flex items-center gap-3 overflow-hidden group ${isEliminated
                                                                ? 'cursor-not-allowed opacity-30'
                                                                : 'hover:scale-[1.02] active:scale-[0.98] hover:-translate-y-0.5'
                                                            }`}
                                                        style={isEliminated ? {
                                                            background: 'rgba(239,68,68,0.05)',
                                                            border: '1px solid rgba(239,68,68,0.15)',
                                                        } : {
                                                            background: 'linear-gradient(145deg, rgba(99,102,241,0.12), rgba(99,102,241,0.05))',
                                                            border: '1px solid rgba(99,102,241,0.3)',
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                                        }}
                                                    >
                                                        {!isEliminated && (
                                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500 skew-x-12" />
                                                        )}
                                                        <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-black border ${isEliminated
                                                                ? 'border-red-800/50 text-red-800'
                                                                : 'border-indigo-500/60 text-indigo-300 bg-indigo-900/30'
                                                            }`}>
                                                            {letters[i]}
                                                        </div>
                                                        <span className={isEliminated ? 'text-slate-700 line-through' : 'text-white'}>{opt}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* ── Answer Revealed ── */
                                <div className="flex-1 flex flex-col items-center justify-center animate-zoom-in">
                                    {questionStatus === 'correct' ? (
                                        <div className="w-14 h-14 rounded-full bg-green-900/50 border border-green-500/50 flex items-center justify-center mb-4">
                                            <Check className="w-8 h-8 text-green-400" />
                                        </div>
                                    ) : (
                                        <div className="w-14 h-14 rounded-full bg-red-900/30 border border-red-500/30 flex items-center justify-center mb-4">
                                            <X className="w-8 h-8 text-red-400" />
                                        </div>
                                    )}
                                    <p className={`text-sm uppercase tracking-widest font-bold mb-4 ${questionStatus === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
                                        {questionStatus === 'correct' ? `✓ پاسخ صحیح — ${players[currentAnsweringIndex]?.name}` : '✗ کسی پاسخ درست نداد'}
                                    </p>
                                    <h3 className="text-3xl md:text-4xl font-black text-yellow-400 text-glow-gold text-center mb-6 leading-tight">
                                        {currentQuestion.a}
                                    </h3>

                                    {/* Score Breakdown */}
                                    {questionStatus === 'correct' && answerDetails && (
                                        <div className="w-full max-w-xs rounded-2xl p-4 animate-slide-in-up"
                                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                            <p className="font-bold text-slate-300 mb-3 pb-2 border-b border-white/10 text-sm">جزئیات امتیاز</p>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between text-slate-300">
                                                    <span>امتیاز پایه:</span>
                                                    <span className="font-bold text-white">+{currentQuestion.effectiveValue}</span>
                                                </div>
                                                {answerDetails.speedBonus > 0 && (
                                                    <div className="flex justify-between text-indigo-300">
                                                        <span className="flex items-center gap-1"><Zap size={12} /> پاداش سرعت:</span>
                                                        <span className="font-bold">+{answerDetails.speedBonus}</span>
                                                    </div>
                                                )}
                                                {answerDetails.isStreakActive && (
                                                    <div className="flex justify-between text-orange-400">
                                                        <span className="flex items-center gap-1"><Flame size={12} /> ضریب دور بُرد:</span>
                                                        <span className="font-bold">×۱.۵</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-green-400 font-black text-lg">
                                                <span>مجموع دریافتی:</span>
                                                <span>+{answerDetails.totalEarned}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        {!showDDSplash && !showMandatorySplash && (
                            <div className="px-6 py-4 border-t flex justify-center"
                                style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                                {!showAnswer ? (
                                    <button
                                        onClick={handleTimeoutOrPass}
                                        className="px-8 py-3 rounded-2xl font-bold text-slate-300 hover:text-white transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                                    >
                                        <X size={16} />
                                        {currentQuestion.isMandatory && currentAnsweringIndex === activePlayerIndex
                                            ? `نمی‌داند (پاس + ${currentQuestion.effectiveValue * 2} جریمه)`
                                            : 'نمی‌داند — پاس به نفر بعدی'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={finishQuestion}
                                        className="px-10 py-3 rounded-2xl font-black text-lg text-white flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
                                        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 6px 20px rgba(99,102,241,0.4)' }}
                                    >
                                        ادامه بازی
                                        <ChevronLeft size={20} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─── Helper: hex colour to rgb triple ─── */
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
}

export default App;
