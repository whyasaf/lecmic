// uygulamanın kullandığı ama TypeScript'in tanımadığı globaller: vendor/ kütüphaneleri ve
// Chrome'un yeni (henüz standart tiplerde olmayan) yapay zekâ API'leri. sadece tip denetimi için
declare const DOMPurify: {
  // RETURN_DOM_FRAGMENT ile DocumentFragment, yoksa string döner
  sanitize(html: string | Node, cfg?: Record<string, unknown>): any;
  addHook(name: string, fn: (node: Element, data?: any) => void): void;
};
declare const lamejs: any;
declare const mammoth: any;
declare const Translator: any;
declare const Summarizer: any;
declare const webkitSpeechRecognition: any;
declare const SpeechRecognition: any;
