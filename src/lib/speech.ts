// Utilidad de voz (Web Speech API) con voz en español

const VOICE_KEY = "mova:voice";

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const es = voices.filter((v) => v.lang.toLowerCase().startsWith("es"));
  cachedVoice =
    es.find((v) => v.lang === "es-MX") ??
    es.find((v) => v.lang === "es-419") ??
    es.find((v) => v.localService) ??
    es[0] ??
    null;
  return cachedVoice;
}

// Precarga las voces (algunos navegadores las cargan asincronamente)
export function warmupVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  pickVoice();
  window.speechSynthesis.onvoiceschanged = () => {
    pickVoice();
  };
}

export function voicePref(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(VOICE_KEY) !== "0";
}

export function setVoicePref(on: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VOICE_KEY, on ? "1" : "0");
}

export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (!voicePref()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  u.lang = voice?.lang ?? "es-MX";
  if (voice) u.voice = voice;
  u.rate = 0.98;
  u.pitch = 1.05;
  u.volume = 1;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}
