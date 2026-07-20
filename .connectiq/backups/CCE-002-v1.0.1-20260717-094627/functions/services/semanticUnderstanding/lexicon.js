export const PROVIDER_PATTERN =
  /\b(AT\s*&\s*T|ATT|Spectrum|Charter|Xfinity|Comcast|Verizon|Fios|T-?Mobile|Frontier|Cox|CenturyLink|Quantum(?: Fiber)?|Google Fiber|GFiber|Lumos|Windstream|Kinetic|HughesNet|Viasat|Starlink)\b/i;

export const PAIN_PATTERNS = [
  { key: "outages", pattern: /\b(outage|outages|goes? out|keeps? dropping|disconnects?|offline|unreliable)\b/i },
  { key: "slowSpeed", pattern: /\b(slow|sluggish|buffering|takes forever|speed is bad)\b/i },
  { key: "highPrice", pattern: /\b(too expensive|costs? too much|high bill|bill is high|overpaying|price went up)\b/i },
  { key: "poorWifi", pattern: /\b(dead zone|dead spot|weak wi-?fi|wifi coverage|poor wi-?fi|signal.*weak)\b/i },
  { key: "poorSupport", pattern: /\b(bad support|poor support|customer service.*bad|can't get help|cannot get help)\b/i },
  { key: "dataCaps", pattern: /\b(data cap|data limit|overage)\b/i },
  { key: "latency", pattern: /\b(latency|lag|ping)\b/i },
  { key: "uploadSpeed", pattern: /\b(upload.*slow|slow upload|upload speed)\b/i },
  { key: "contractConcern", pattern: /\b(contract|early termination|locked in)\b/i },
];

export const USAGE_PATTERNS = [
  { key: "workFromHome", value: true, pattern: /\b(work(?:ing)? from home|remote work|home office|zoom calls?|teams calls?)\b/i },
  { key: "gaming", value: true, pattern: /\b(gam(?:e|er|ing)|playstation|xbox|steam)\b/i },
  { key: "streaming", value: true, pattern: /\b(stream(?:ing)?|netflix|hulu|youtube tv|disney\+|4k video)\b/i },
  { key: "videoConferencing", value: true, pattern: /\b(zoom|teams|webex|video conferenc)\b/i },
  { key: "uploadHeavy", value: true, pattern: /\b(upload large files|content creator|cloud backup|video editor|livestream)\b/i },
];

export const INTENT_PATTERNS = [
  { intent: "BUY_NOW", pattern: /\b(sign me up|place the order|order it|buy now|ready to order)\b/i, confidence: 0.98 },
  { intent: "SWITCH_PROVIDER", pattern: /\b(switch|change providers?|leave my provider|move away from)\b/i, confidence: 0.95 },
  { intent: "FIND_PROVIDER", pattern: /\b(what providers?|which providers?|internet available|available at my address|find internet)\b/i, confidence: 0.95 },
  { intent: "COMPARE_PROVIDERS", pattern: /\b(compare|best option|which is better|difference between)\b/i, confidence: 0.94 },
  { intent: "LOWER_BILL", pattern: /\b(lower my bill|save money|cheaper|less expensive|reduce.*bill)\b/i, confidence: 0.94 },
  { intent: "IMPROVE_RELIABILITY", pattern: /\b(more reliable|reliability|stop.*outage|keeps? dropping)\b/i, confidence: 0.91 },
  { intent: "IMPROVE_SPEED", pattern: /\b(faster|more speed|increase.*speed|gig speed)\b/i, confidence: 0.91 },
  { intent: "IMPROVE_WIFI", pattern: /\b(better wi-?fi|wifi coverage|dead zone|dead spot)\b/i, confidence: 0.91 },
  { intent: "SUPPORT_REMOTE_WORK", pattern: /\b(work from home|remote work|home office)\b/i, confidence: 0.89 },
  { intent: "SUPPORT_GAMING", pattern: /\b(gaming|gamer|low ping|latency)\b/i, confidence: 0.89 },
  { intent: "SUPPORT_STREAMING", pattern: /\b(streaming|4k|netflix|youtube tv)\b/i, confidence: 0.88 },
  { intent: "MOVE_SERVICE", pattern: /\b(moving|new house|new apartment|relocat)\b/i, confidence: 0.92 },
  { intent: "RESOLVE_OUTAGE", pattern: /\b(no internet|internet is down|outage right now|offline)\b/i, confidence: 0.93 },
];
