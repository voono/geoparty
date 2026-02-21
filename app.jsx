import React, { useState, useEffect } from 'react';
import { Trophy, User, X, Check, HelpCircle, RotateCcw, Users, Clock, Sparkles, ChevronRight, AlertTriangle, Flame, Zap } from 'lucide-react';

// --- AUDIO SYSTEM (Web Audio API) ---
// Using self-contained synths so no external files are needed!
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
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.setValueAtTime(554.37, now + 0.1); // C#5
    osc.frequency.setValueAtTime(659.25, now + 0.2); // E5
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

const CATEGORIES = [
  {
    id: 'world_history',
    title: 'تاریخ جهان',
    questions: [
      { id: 'wh1', value: 100, q: 'تمدن باستانی «مایا» بیشتر در کدام منطقه جغرافیایی امروزی تمرکز داشت؟', a: 'آمریکای مرکزی', options: ['آمریکای جنوبی', 'آمریکای مرکزی', 'آفریقای شمالی', 'آسیای شرقی'] },
      { id: 'wh2', value: 200, q: 'نام پادشاهی که در نبرد واترلو از ائتلاف هفتم شکست خورد و تبعید شد؟', a: 'ناپلئون بناپارت', options: ['لویی شانزدهم', 'ناپلئون بناپارت', 'پتر کبیر', 'شارلمانی'] },
      { id: 'wh3', value: 300, q: 'طولانی‌ترین جنگ تاریخ بین کدام دو کشور رخ داد که ۳۳۵ سال طول کشید اما هیچ کشته‌ای نداشت؟', a: 'هلند و جزایر سیلی', options: ['انگلستان و فرانسه', 'هلند و جزایر سیلی', 'اسپانیا و پرتغال', 'چین و ژاپن'] },
      { id: 'wh4', value: 400, q: 'معاهده مشهور «وستفالی» که به جنگ‌های خونین سی‌ساله در اروپا پایان داد در چه سالی امضا شد؟', a: '۱۶۴۸', options: ['۱۴۹۲', '۱۶۴۸', '۱۷۸۹', '۱۸۱۵'] },
      { id: 'wh5', value: 500, q: 'نام آخرین امپراتور امپراتوری بیزانس (روم شرقی) که در جریان سقوط قسطنطنیه شمشیر به دست کشته شد؟', a: 'کنستانتین یازدهم', options: ['ژوستینیان یکم', 'کنستانتین یازدهم', 'تئودوسیوس دوم', 'باسیل دوم'] },
    ]
  },
  {
    id: 'advanced_science',
    title: 'علوم و نجوم',
    questions: [
      { id: 'as1', value: 100, q: 'کدام سیاره در منظومه شمسی کوتاه‌ترین روز (حدود ۱۰ ساعت) را دارد؟', a: 'مشتری', options: ['عطارد', 'مریخ', 'مشتری', 'زحل'] },
      { id: 'as2', value: 200, q: 'غده پینه‌آل (صنوبری) در مغز انسان وظیفه ترشح کدام هورمون خواب‌آور را بر عهده دارد؟', a: 'ملاتونین', options: ['سروتونین', 'دوپامین', 'ملاتونین', 'کورتیزول'] },
      { id: 'as3', value: 300, q: 'نام ثابت فیزیکی که رابطه بین انرژی یک فوتون و فرکانس موج آن را تعیین می‌کند؟', a: 'ثابت پلانک', options: ['ثابت بولتزمن', 'ثابت آووگادرو', 'ثابت هابل', 'ثابت پلانک'] },
      { id: 'as4', value: 400, q: 'در مدل استاندارد فیزیک ذرات بنیادی، کدام ذره حامل "نیروی هسته‌ای قوی" است؟', a: 'گلوئون', options: ['فوتون', 'بوزون دابلیو', 'گلوئون', 'گراویتون'] },
      { id: 'as5', value: 500, q: 'اولین تپ‌اختر (Pulsar) در سال ۱۹۶۷ توسط کدام اخترفیزیکدان زن کشف شد؟', a: 'جوسلین بل بورنل', options: ['ماری کوری', 'ورا روبین', 'جوسلین بل بورنل', 'سالی راید'] },
    ]
  },
  {
    id: 'world_lit',
    title: 'ادبیات و فلسفه',
    questions: [
      { id: 'wl1', value: 100, q: 'مفهوم «ابرانسان» (Übermensch) اولین بار در کدام اثر فریدریش نیچه مطرح شد؟', a: 'چنین گفت زرتشت', options: ['فراسوی نیک و بد', 'تبارشناسی اخلاق', 'چنین گفت زرتشت', 'غروب بت‌ها'] },
      { id: 'wl2', value: 200, q: 'رمان «اولیس» اثر شاهکار جیمز جویس، داستان وقایع چه شهری را در یک روز روایت می‌کند؟', a: 'دوبلین', options: ['لندن', 'پاریس', 'دوبلین', 'ادینبرو'] },
      { id: 'wl3', value: 300, q: 'کدام نمایشنامه‌نویس یونان باستان به عنوان «پدر تراژدی» شناخته می‌شود و اثر «ایرانیان» متعلق به اوست؟', a: 'آیسخولوس (اشیل)', options: ['سوفوکل', 'اوریپید', 'آریستوفان', 'آیسخولوس (اشیل)'] },
      { id: 'wl4', value: 400, q: 'سیاست‌مداری که در سال ۱۹۵۳ برنده جایزه «نوبل ادبیات» شد کیست؟', a: 'وینستون چرچیل', options: ['تئودور روزولت', 'ژان پل سارتر', 'شارل دوگل', 'وینستون چرچیل'] },
      { id: 'wl5', value: 500, q: 'در رمان «۱۹۸۴» اثر جورج اورول، نام اتاقی که در آن افراد با بزرگترین ترس خود روبرو می‌شوند چیست؟', a: 'اتاق ۱۰۱', options: ['اتاق ۲۳۷', 'اتاق ۱۰۱', 'بخش ۴۲', 'سلول صفر'] },
    ]
  },
  {
    id: 'hard_geo',
    title: 'جغرافیای پیشرفته',
    questions: [
      { id: 'hg1', value: 100, q: 'عمیق‌ترین نقطه شناخته شده در تمام اقیانوس‌های جهان چه نام دارد؟', a: 'درازگودال ماریانا', options: ['درازگودال پورتوریکو', 'درازگودال ماریانا', 'گودال تونگا', 'گودال جاوه'] },
      { id: 'hg2', value: 200, q: 'کدام کشور آفریقایی به طور کامل در دل یک کشور دیگر (آفریقای جنوبی) محصور شده است؟', a: 'لسوتو', options: ['اسواتینی', 'بوتسوانا', 'نامیبیا', 'لسوتو'] },
      { id: 'hg3', value: 300, q: 'پایتخت کشوری که کوه مشهور «کلیمانجارو» در آن قرار دارد چیست؟', a: 'دودوما (تانزانیا)', options: ['نایروبی', 'دودوما (تانزانیا)', 'کامپالا', 'کیگالی'] },
      { id: 'hg4', value: 400, q: 'تنگه «باس» (Bass Strait) کدام جزیره را از سرزمین اصلی استرالیا جدا می‌کند؟', a: 'تاسمانی', options: ['نیوزیلند', 'گینه نو', 'تاسمانی', 'کالدونیای جدید'] },
      { id: 'hg5', value: 500, q: 'دریاچه «وُستوک» که بزرگترین دریاچه کشف‌شده در زیر لایه‌های یخی است، در کدام قاره قرار دارد؟', a: 'جنوبگان (قطب جنوب)', options: ['آمریکای شمالی', 'آسیا', 'اروپا', 'جنوبگان (قطب جنوب)'] },
    ]
  },
  {
    id: 'arts_music',
    title: 'هنر و موسیقی',
    questions: [
      { id: 'am1', value: 100, q: 'کدام آهنگساز کلاسیک در دهه سوم زندگی‌اش شنوایی خود را از دست داد اما شاهکارهایی خلق کرد؟', a: 'لودویگ فان بتهوون', options: ['یوهان سباستیان باخ', 'ولفگانگ آمادئوس موتسارت', 'لودویگ فان بتهوون', 'فردریک شوپن'] },
      { id: 'am2', value: 200, q: 'کدام جنبش هنری در اوایل قرن بیستم با هنرمندانی چون دالی و ماگریت و تمرکز بر ضمیر ناخودآگاه شکل گرفت؟', a: 'سوررئالیسم', options: ['امپرسیونیسم', 'کوبیسم', 'دادائیسم', 'سوررئالیسم'] },
      { id: 'am3', value: 300, q: 'مجسمه مرمرین «دیوید» (داوود) که از شاهکارهای رنسانس در فلورانس است، اثر کیست؟', a: 'میکل‌آنژ', options: ['لئوناردو داوینچی', 'میکل‌آنژ', 'دوناتلو', 'رافائل'] },
      { id: 'am4', value: 400, q: 'اپرای عظیم «حلقه نیبلونگ» که اجرای کامل چهار بخش آن حدود ۱۵ ساعت طول می‌کشد، اثر کیست؟', a: 'ریشارد واگنر', options: ['جوزپه وردی', 'ریشارد واگنر', 'جاکومو پوچینی', 'پیوتر ایلیچ چایکوفسکی'] },
      { id: 'am5', value: 500, q: 'تکنیک نقاشی «کُیاروسکورو» (Chiaroscuro) که توسط کاراواجو به اوج رسید به چه معناست؟', a: 'تضاد شدید نور و سایه', options: ['نقاشی با نقطه', 'تضاد شدید نور و سایه', 'ترکیب رنگ‌های مکمل', 'خراشیدن رنگ از روی بوم'] },
    ]
  },
  {
    id: 'trivia_enigmas',
    title: 'معماها و دانستنی‌ها',
    questions: [
      { id: 'te1', value: 100, q: 'سخت‌ترین ماده طبیعی شناخته شده در کره زمین که از کربن خالص تشکیل شده چیست؟', a: 'الماس', options: ['گرافن', 'تیتانیوم', 'الماس', 'کوارتز'] },
      { id: 'te2', value: 200, q: 'تنها حرفی از الفبای انگلیسی که در نام هیچ‌یک از ۵۰ ایالت آمریکا وجود ندارد چیست؟', a: 'Q', options: ['X', 'Z', 'J', 'Q'] },
      { id: 'te3', value: 300, q: 'در روان‌شناسی، «سندرم استاندال» در چه مواقعی به افراد دست می‌دهد و باعث تپش قلب و سرگیجه می‌شود؟', a: 'مواجهه با آثار هنری بسیار زیبا', options: ['ترس از ارتفاع', 'مواجهه با آثار هنری بسیار زیبا', 'قرار گرفتن در تاریکی مطلق', 'شنیدن صداهای خاص'] },
      { id: 'te4', value: 400, q: 'در نظریه بازی‌ها، کدام معمای مشهور نشان می‌دهد چرا دو نفر ممکن است حتی به نفعشان باشد همکاری نکنند؟', a: 'معمای زندانی', options: ['پارادوکس مونتی هال', 'معمای زندانی', 'بازی اولتیماتوم', 'تراژدی منابع مشترک'] },
      { id: 'te5', value: 500, q: 'زبانی فراساخته که با داشتن تنها حدود ۱۲۰ تا ۱۳۷ کلمه، یکی از کوچک‌ترین زبان‌های جهان است؟', a: 'توکی پونا', options: ['اسپرانتو', 'کلینگان', 'توکی پونا', 'اینترلینگوا'] },
    ]
  }
];

const App = () => {
  // Game States: 'setup', 'playing', 'gameover'
  const [gameState, setGameState] = useState('setup');

  // Setup State
  const [playerCount, setPlayerCount] = useState(4);
  const [playerNames, setPlayerNames] = useState(Array(6).fill(''));

  // Main Game State
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

  // Details for Breakdown of Score
  const [answerDetails, setAnswerDetails] = useState(null);

  // Initialize Game
  const startGame = () => {
    initAudio(); // Initialize Audio Context on user interaction
    const newPlayers = Array.from({ length: playerCount }).map((_, i) => ({
      id: i + 1,
      name: playerNames[i].trim() || `بازیکن ${i + 1}`,
      score: 0,
      streak: 0 // New: Track consecutive correct answers
    }));
    setPlayers(newPlayers);

    const dds = [];
    const mqs = [];

    CATEGORIES.forEach(cat => {
      const qIds = cat.questions.map(q => q.id);

      const ddIndex = Math.floor(Math.random() * qIds.length);
      dds.push(qIds[ddIndex]);

      const remainingIds = qIds.filter((_, i) => i !== ddIndex);
      const mqIndex = Math.floor(Math.random() * remainingIds.length);
      mqs.push(remainingIds[mqIndex]);
    });

    setDailyDoubles(dds);
    setMandatoryQuestions(mqs);
    setGameState('playing');
    setActivePlayerIndex(0);
    setAnsweredQuestions([]);
  };

  // Timer Effect
  useEffect(() => {
    if (currentQuestion && !showAnswer && !showDDSplash && !showMandatorySplash && timeLeft > 0) {
      const timerId = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timerId);
    } else if (currentQuestion && !showAnswer && !showDDSplash && !showMandatorySplash && timeLeft === 0) {
      handleTimeoutOrPass();
    }
  }, [currentQuestion, showAnswer, showDDSplash, showMandatorySplash, timeLeft]);

  // Tick Sound Effect for last 10 seconds
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
    setCurrentAnsweringIndex(activePlayerIndex); // Active player gets first try
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

  // Centralized Penalty Logic
  const handlePenalty = (isPass) => {
    const isMainPlayer = currentAnsweringIndex === activePlayerIndex;
    let penalty = 0;

    if (currentQuestion.isMandatory && isMainPlayer) {
      penalty = currentQuestion.effectiveValue * 2;
    } else if (!isPass) {
      penalty = currentQuestion.effectiveValue;
    }

    const newPlayers = [...players];
    // Break the streak!
    newPlayers[currentAnsweringIndex].streak = 0;

    if (penalty > 0) {
      newPlayers[currentAnsweringIndex].score -= penalty;
    }
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
    handlePenalty(true); // true = action was a pass/timeout
    proceedToNextPlayer();
  };

  const handleOptionClick = (option) => {
    if (option === currentQuestion.a) {
      // Correct Answer
      playSound('correct');
      const newPlayers = [...players];
      const p = newPlayers[currentAnsweringIndex];

      // Streak Calculation
      p.streak += 1;
      const isStreakActive = p.streak >= 3;

      // Speed Bonus (within first 10s -> timeLeft >= 30)
      const hasSpeedBonus = timeLeft >= 30;
      const speedBonus = hasSpeedBonus ? Math.floor(currentQuestion.effectiveValue * 0.2) : 0;

      // Total Earned Calculation
      const baseEarned = currentQuestion.effectiveValue + speedBonus;
      const totalEarned = isStreakActive ? Math.floor(baseEarned * 1.5) : baseEarned;

      p.score += totalEarned;
      setPlayers(newPlayers);

      setQuestionStatus('correct');
      setAnswerDetails({
        speedBonus,
        isStreakActive,
        totalEarned
      });
      setShowAnswer(true);
    } else {
      // Wrong Answer
      playSound('wrong');
      handlePenalty(false); // false = action was a wrong guess
      setEliminatedOptions(prev => [...prev, option]);
      proceedToNextPlayer();
    }
  };

  const finishQuestion = () => {
    setAnsweredQuestions([...answeredQuestions, currentQuestion.id]);
    setCurrentQuestion(null);
    setShowAnswer(false);

    setActivePlayerIndex((activePlayerIndex + 1) % players.length);

    if (answeredQuestions.length + 1 === CATEGORIES.length * 5) {
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

  // --- SETUP SCREEN ---
  if (gameState === 'setup') {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans select-none">
        <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 w-full max-w-lg shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl rounded-full -mr-16 -mt-16"></div>

          <div className="text-center mb-10 relative z-10">
            <div className="inline-block p-4 bg-yellow-500/10 rounded-2xl mb-4">
              <Trophy className="w-16 h-16 text-yellow-400" />
            </div>
            <h1 className="text-4xl font-black bg-gradient-to-l from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-2">
              جئوپاردی پیشرفته
            </h1>
            <p className="text-slate-400">تنظیمات بازی جدید</p>
          </div>

          <div className="mb-8 relative z-10">
            <div className="flex justify-between items-center mb-4">
              <label className="text-lg font-bold flex items-center gap-2">
                <Users className="text-blue-400" size={20} />
                تعداد بازیکنان:
              </label>
              <span className="text-2xl font-black text-blue-400">{playerCount} نفر</span>
            </div>
            <input
              type="range"
              min="2" max="6"
              value={playerCount}
              onChange={(e) => setPlayerCount(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div className="space-y-3 mb-10 relative z-10">
            {Array.from({ length: playerCount }).map((_, i) => (
              <div key={i} className="relative">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="text"
                  placeholder={`نام بازیکن ${i + 1}`}
                  value={playerNames[i]}
                  onChange={(e) => handleNameChange(i, e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pr-12 pl-4 text-white focus:border-blue-500 focus:bg-slate-900 transition-all outline-none"
                />
              </div>
            ))}
          </div>

          <button
            onClick={startGame}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 py-4 rounded-xl font-bold text-xl transition-all shadow-lg shadow-blue-600/30 flex justify-center items-center gap-2 relative z-10"
          >
            شروع رقابت
            <ChevronRight />
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN GAME SCREEN ---
  return (
    <div dir="rtl" className="min-h-screen bg-slate-900 text-slate-100 p-4 font-sans select-none">
      <header className="max-w-7xl mx-auto mb-8 flex flex-col xl:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-yellow-500 rounded-xl shadow-lg shadow-yellow-500/20">
            <Trophy className="text-slate-900 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-l from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              جئوپاردی فارسی
            </h1>
            <p className="text-blue-400 font-bold mt-1 text-sm flex items-center gap-1">
              <ChevronRight size={16} /> نوبت انتخاب سوال: {players[activePlayerIndex]?.name}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 w-full xl:w-auto">
          {players.map((p, idx) => (
            <div
              key={p.id}
              className={`px-4 py-3 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center min-w-[100px] relative ${activePlayerIndex === idx
                  ? 'bg-blue-600/20 border-blue-500 scale-105 shadow-lg shadow-blue-500/20'
                  : 'bg-slate-800 border-slate-700 opacity-70'
                }`}
            >
              {/* Flame Icon for Winning Streak */}
              {p.streak >= 3 && (
                <div title="دور بُرد! (ضریب ۱.۵ برای امتیازات)" className="absolute -top-3 -right-2 bg-slate-900 p-1 rounded-full border border-orange-500">
                  <Flame className="text-orange-500 animate-pulse w-5 h-5 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                </div>
              )}

              <div className="flex items-center gap-2 mb-1">
                <User size={14} className={activePlayerIndex === idx ? 'text-blue-400' : 'text-slate-400'} />
                <span className="font-medium text-sm truncate max-w-[80px]">{p.name}</span>
              </div>
              <div className={`text-xl font-bold ${p.score < 0 ? 'text-red-400' : 'text-yellow-400'}`}>{p.score}</div>
            </div>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {CATEGORIES.map(cat => (
          <div key={cat.id} className="flex flex-col gap-3">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center shadow-md flex items-center justify-center h-16">
              <h2 className="font-bold text-sm md:text-base text-blue-300 line-clamp-2">{cat.title}</h2>
            </div>
            {cat.questions.map(q => (
              <button
                key={q.id}
                onClick={() => handleQuestionClick(cat.title, q)}
                disabled={answeredQuestions.includes(q.id)}
                className={`h-20 sm:h-24 rounded-xl text-2xl font-black transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center border-b-4 ${answeredQuestions.includes(q.id)
                    ? 'bg-slate-800/50 border-transparent text-slate-700 cursor-not-allowed'
                    : 'bg-blue-700 hover:bg-blue-600 border-blue-900 text-yellow-400 shadow-lg'
                  }`}
              >
                {answeredQuestions.includes(q.id) ? '' : q.value}
              </button>
            ))}
          </div>
        ))}
      </main>

      <footer className="max-w-7xl mx-auto mt-8 flex flex-col md:flex-row justify-between items-center text-slate-500 text-xs md:text-sm border-t border-slate-800 pt-6 gap-2">
        <p className="flex items-center gap-1"><Zap size={14} className="text-blue-400" /> پاسخ زیر ۱۰ ثانیه = ۲۰٪ امتیاز بیشتر</p>
        <p className="flex items-center gap-1"><Flame size={14} className="text-orange-500" /> ۳ پاسخ صحیح متوالی = دور بُرد (ضریب ۱.۵ برابر)</p>
      </footer>

      {/* Question Modal */}
      {currentQuestion && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 w-full max-w-3xl rounded-3xl border border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">

            {/* Header Modal */}
            <div className={`p-4 flex justify-between items-center text-white ${currentQuestion.isMandatory ? 'bg-red-700' : currentQuestion.isDD ? 'bg-orange-600' : 'bg-blue-600'}`}>
              <span className="font-bold uppercase tracking-widest">{currentQuestion.category}</span>
              <span className="bg-slate-900/40 text-white px-3 py-1 rounded-full font-bold flex items-center gap-1">
                {currentQuestion.isMandatory && <AlertTriangle size={16} className="text-red-300" />}
                {currentQuestion.isDD && <Sparkles size={16} className="text-yellow-400" />}
                {currentQuestion.effectiveValue} امتیاز
              </span>
            </div>

            <div className="p-8 md:p-12 min-h-[350px] flex flex-col justify-center relative">

              {showDDSplash ? (
                <div className="flex flex-col items-center justify-center animate-in zoom-in duration-500">
                  <Sparkles className="w-24 h-24 text-yellow-400 mb-6 animate-pulse" />
                  <h2 className="text-5xl font-black text-yellow-400 mb-4 text-center">سوال جایزه‌دار!</h2>
                  <p className="text-2xl text-blue-200 text-center">امتیاز این سوال دو برابر محاسبه می‌شود</p>
                </div>
              ) : showMandatorySplash ? (
                <div className="flex flex-col items-center justify-center animate-in zoom-in duration-500">
                  <AlertTriangle className="w-24 h-24 text-red-500 mb-6 animate-pulse" />
                  <h2 className="text-5xl font-black text-red-500 mb-4 text-center">سوال اجباری!</h2>
                  <p className="text-xl text-red-200 text-center max-w-lg leading-relaxed">
                    بازیکن اصلی باید به این سوال پاسخ دهد. در صورت <span className="font-bold text-white">پاسخ اشتباه</span> یا <span className="font-bold text-white">رد کردن سوال</span>، <span className="font-bold text-red-400">{currentQuestion.effectiveValue * 2} امتیاز</span> جریمه خواهد شد!
                  </p>
                </div>
              ) : (
                <>
                  {!showAnswer && (
                    <div className="absolute top-6 left-6 right-6 flex flex-col items-center">
                      <div className="bg-slate-900/50 px-6 py-2 rounded-full border border-slate-700 text-center mb-4 relative">
                        {players[currentAnsweringIndex]?.streak >= 3 && (
                          <Flame className="absolute -left-3 top-1/2 -translate-y-1/2 text-orange-500 animate-pulse w-6 h-6" />
                        )}
                        <span className="text-slate-400 text-sm">فرصت پاسخگویی:</span>
                        <div className="text-xl font-bold text-blue-400 mt-1">{players[currentAnsweringIndex]?.name}</div>
                      </div>

                      <div className="w-full max-w-sm flex items-center gap-3">
                        <Clock className={timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-blue-400'} size={24} />
                        <div className="flex-1 h-3 bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-1000 ease-linear ${timeLeft <= 10 ? 'bg-red-500' : (timeLeft >= 30 ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]' : 'bg-blue-500')}`}
                            style={{ width: `${(timeLeft / 40) * 100}%` }}
                          />
                        </div>
                        <span className={`font-mono font-bold text-xl min-w-[40px] text-center ${timeLeft >= 30 ? 'text-green-400' : ''}`}>
                          {timeLeft}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className={`text-center ${!showAnswer ? 'mt-28' : ''}`}>
                    {!showAnswer ? (
                      <>
                        <div className="mb-6 flex justify-center">
                          <span className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 
                              ${currentQuestion.isMandatory && currentAnsweringIndex === activePlayerIndex
                              ? 'bg-red-900/50 text-red-400 border border-red-800'
                              : 'bg-orange-900/50 text-orange-400 border border-orange-800'}`}>
                            <AlertTriangle size={16} />
                            {currentQuestion.isMandatory && currentAnsweringIndex === activePlayerIndex
                              ? `خطر: پاسخ اشتباه یا پاس دادن ${currentQuestion.effectiveValue * 2} امتیاز منفی دارد!`
                              : `هشدار: پاسخ اشتباه ${currentQuestion.effectiveValue} امتیاز منفی دارد!`}
                          </span>
                        </div>

                        <h3 className="text-2xl md:text-3xl font-bold leading-relaxed mb-6">
                          {currentQuestion.q}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 w-full max-w-2xl mx-auto">
                          {currentQuestion.options.map((opt, i) => {
                            const isEliminated = eliminatedOptions.includes(opt);
                            return (
                              <button
                                key={i}
                                onClick={() => handleOptionClick(opt)}
                                disabled={isEliminated}
                                className={`p-4 rounded-xl font-bold text-lg md:text-xl transition-all border-2
                                  ${isEliminated
                                    ? 'bg-red-900/20 border-red-900/50 text-slate-500 line-through cursor-not-allowed opacity-50'
                                    : 'bg-blue-800/50 hover:bg-blue-600 border-blue-500 text-white hover:scale-105 active:scale-95 shadow-md'
                                  }`}
                              >
                                {opt}
                              </button>
                            )
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="animate-in slide-in-from-bottom-4 duration-500 flex flex-col items-center">
                        <p className={`mb-4 uppercase text-sm tracking-widest font-bold ${questionStatus === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
                          {questionStatus === 'correct' ? `پاسخ صحیح توسط ${players[currentAnsweringIndex].name} داده شد!` : 'کسی پاسخ صحیح نداد!'}
                        </p>

                        <h3 className="text-3xl md:text-5xl font-black text-yellow-400 leading-tight mb-8">
                          {currentQuestion.a}
                        </h3>

                        {/* Breakdown of Score Details */}
                        {questionStatus === 'correct' && answerDetails && (
                          <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-2xl w-full max-w-sm">
                            <p className="text-slate-300 font-bold mb-3 border-b border-slate-700 pb-2">جزئیات امتیاز:</p>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>امتیاز پایه سوال:</span>
                                <span className="font-bold">+{currentQuestion.effectiveValue}</span>
                              </div>
                              {answerDetails.speedBonus > 0 && (
                                <div className="flex justify-between text-blue-300">
                                  <span className="flex items-center gap-1"><Zap size={14} /> پاداش سرعت (زیر ۱۰ ثانیه):</span>
                                  <span className="font-bold">+{answerDetails.speedBonus}</span>
                                </div>
                              )}
                              {answerDetails.isStreakActive && (
                                <div className="flex justify-between text-orange-400">
                                  <span className="flex items-center gap-1"><Flame size={14} /> ضریب دور بُرد:</span>
                                  <span className="font-bold">x۱.۵</span>
                                </div>
                              )}
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between text-lg text-green-400 font-black">
                              <span>مجموع دریافتی:</span>
                              <span>+{answerDetails.totalEarned}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Actions Footer */}
            {!showDDSplash && !showMandatorySplash && (
              <div className="p-6 bg-slate-900/50 border-t border-slate-700 flex flex-wrap justify-center gap-4">
                {!showAnswer ? (
                  <button
                    onClick={handleTimeoutOrPass}
                    className="px-8 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-colors shadow-md w-full sm:w-auto"
                  >
                    {currentQuestion.isMandatory && currentAnsweringIndex === activePlayerIndex
                      ? `نمی‌داند (پاس به نفر بعدی و ${currentQuestion.effectiveValue * 2} امتیاز جریمه)`
                      : 'نمی‌داند (پاس دادن به نفر بعدی بدون جریمه)'}
                  </button>
                ) : (
                  <button
                    onClick={finishQuestion}
                    className="flex items-center gap-2 px-10 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-colors text-lg"
                  >
                    ادامه بازی
                    <ChevronRight size={20} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameState === 'gameover' && (
        <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-4 z-[60]">
          <div className="text-center w-full max-w-lg">
            <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-6 animate-bounce drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]" />
            <h2 className="text-5xl font-black mb-6">پایان رقابت!</h2>
            <div className="grid gap-3 mb-8">
              {players.sort((a, b) => b.score - a.score).map((p, i) => (
                <div key={p.id} className={`p-4 rounded-2xl border flex justify-between items-center ${i === 0 ? 'bg-yellow-500/10 border-yellow-500 scale-105 shadow-xl' : 'bg-slate-800 border-slate-700'}`}>
                  <div className="flex items-center gap-4">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${i === 0 ? 'bg-yellow-500 text-slate-900' : 'bg-slate-700'}`}>
                      {i + 1}
                    </span>
                    <span className="text-xl font-bold">{p.name}</span>
                  </div>
                  <span className={`text-2xl font-black ${p.score < 0 ? 'text-red-400' : 'text-yellow-400'}`}>{p.score}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={resetToSetup}
                className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold text-xl transition-transform hover:scale-105 shadow-lg shadow-blue-500/20"
              >
                <RotateCcw />
                شروع یک بازی جدید
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;