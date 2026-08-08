// Demo replay script — REAL gpt-realtime-translate output, harvested by
// running the actual demo audio through a live session per language
// (2026-08-08, WebSocket server mode). Only normalization applied: fragment
// joins (spaces/sentence splits) — every word is the model's.
//
// Spanish is the demo's source language; for the Español target the
// direction flips (English source clip → Spanish output), because the model
// emits nothing when target == source.

export const SOURCES_ES = [
  "Hola a todos, y bienvenidos a la demostración.",
  "Hoy vamos a hablar del futuro de la traducción en tiempo real.",
  "Esta aplicación convierte mi voz en subtítulos traducidos al instante.",
  "Gracias por acompañarnos.",
];

export const SOURCES_EN = [
  "Hello everyone, and welcome to the demo.",
  "Today we're going to talk about the future of real-time translation.",
  "This app turns my voice into translated subtitles, instantly.",
  "Thanks for joining us.",
];

export const DEMO_OUTS: Record<string, [string, string, string, string]> = {
  en: [
    "Hello everyone, and welcome to the demonstration.",
    "Today we're going to talk about the future of real-time translation.",
    "This app turns my voice into translated subtitles, instantly.",
    "Thanks for joining us.",
  ],
  es: [
    "Hola a todos. Y bienvenidos a la demostración.",
    "Hoy vamos a hablar del futuro de la traducción en tiempo real.",
    "Esta app convierte mi voz en subtítulos traducidos al instante.",
    "Gracias por acompañarnos.",
  ],
  fr: [
    "Bonjour à tous, et bienvenue à la démonstration.",
    "Aujourd'hui, nous allons parler de l'avenir de la traduction en temps réel.",
    "Cette application transforme ma voix en sous-titres traduits, instantanément.",
    "Merci de nous rejoindre.",
  ],
  de: [
    "Hallo zusammen, und willkommen zur Demonstration.",
    "Heute sprechen wir über die Zukunft der Echtzeitübersetzung.",
    "Diese Anwendung macht meine Stimme zu Untertiteln, die sofort übersetzt werden.",
    "Danke, dass Sie uns begleiten.",
  ],
  it: [
    "Ciao a tutti. Benvenuti alla dimostrazione.",
    "Oggi parleremo del futuro della traduzione in tempo reale.",
    "Questa applicazione trasforma la mia voce in sottotitoli tradotti all'istante.",
    "Grazie per essere con noi.",
  ],
  pt: [
    "Olá, pessoal. Bem-vindos à demonstração.",
    "Hoje vamos falar sobre o futuro da tradução em tempo real.",
    "Este aplicativo transforma a minha voz em legendas traduzidas na hora.",
    "Obrigado por nos acompanhar.",
  ],
  ja: [
    "こんにちは、みなさん。",
    "リアルタイム翻訳の未来について話します。",
    "このアプリは私の声を即座に翻訳字幕に変えます。",
    "ご参加ありがとうございます。",
  ],
  ko: [
    "안녕하세요 여러분.",
    "오늘 실시간 번역의 미래에 대해 이야기하겠습니다.",
    "이 앱은 제 목소리를 번역된 자막으로 즉시 바꿔 줍니다.",
    "함께해 주셔서 감사합니다.",
  ],
  zh: [
    "大家好，欢迎观看演示。",
    "今天我们来谈谈实时翻译的未来。",
    "这个应用会把我的声音瞬间转成翻译字幕。",
    "感谢你们的陪伴。",
  ],
  hi: [
    "नमस्ते दोस्तों, और स्वागत है डेमो में।",
    "आज हम बात करेंगे यथार्थ-समय अनुवाद के भविष्य की।",
    "यह ऐप मेरी आवाज़ को अनुवादित उपशीर्षों में तुरंत बदल देता है।",
    "साथ देने के लिए धन्यवाद।",
  ],
  ar: [
    "مرحبًا جميعًا ومرحبًا بكم في العرض.",
    "اليوم سنتحدث عن مستقبل الترجمة الفورية.",
    "هذا التطبيق يحول صوتي إلى ترجمات نصية مترجمة على الفور.",
    "شكرًا لانضمامكم إلينا.",
  ],
  ru: [
    "Привет всем, и добро пожаловать на демонстрацию.",
    "Сегодня мы поговорим о будущем перевода в реальном времени.",
    "Это приложение мгновенно превращает мой голос в переведённые субтитры.",
    "Спасибо, что вы с нами.",
  ],
  nl: [
    "Hallo allemaal, en welkom bij de demonstratie.",
    "Vandaag gaan we het hebben over de toekomst van vertalen in realtime.",
    "Deze app zet mijn stem direct om in vertaalde ondertitels.",
    "Bedankt dat je erbij bent.",
  ],
  pl: [
    "Cześć wszystkim, i witamy na prezentacji.",
    "Dziś porozmawiamy o przyszłości tłumaczenia na żywo.",
    "Ta aplikacja zamienia mój głos na napisy tłumaczone w czasie rzeczywistym.",
    "Dziękujemy, że jesteście z nami.",
  ],
};

export const DEMO_LATENCIES = ["0.8", "0.7", "0.9", "0.6"];
