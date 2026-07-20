const RULES=[
 ["orderReadiness",/\b(sign me up|place (?:the )?order|buy|ready to (?:switch|move forward)|schedule install)\b/i,.97],
 ["objection",/\b(too expensive|not interested|think about it|happy with|contract|cancel|trust|concern|why should i)\b/i,.94],
 ["recommendation",/\b(best|recommend|which provider|which plan|compare|alternative|option|choose|fiber|cable)\b/i,.92],
 ["knowledge",/\b(what is|how does|difference|explain|can i|does it|do you offer|how long)\b/i,.88],
 ["discovery",/\b(pay|bill|provider|internet|wifi|wi-fi|slow|drop|stream|gaming|work from home|moving|address|price|reliability|speed)\b/i,.86],
 ["handoff",/\b(human|person|representative|agent|call me|talk to someone)\b/i,.98],
];
export function analyzeIntent(message="",context={}){const text=String(message).trim();const matches=RULES.filter(([,r])=>r.test(text)).map(([intent,,confidence])=>({intent,confidence}));if(!matches.length)matches.push({intent:"discovery",confidence:.55});matches.sort((a,b)=>b.confidence-a.confidence);if(context.stage==="OBJECTION"&&!matches.some(i=>i.intent==="objection"))matches.unshift({intent:"objection",confidence:.74});return{primary:matches[0].intent,intents:matches,analyzedAt:new Date().toISOString()};}
