/* 
  Weekly Report Generator for n8n (Enhanced with Comparative Intelligence)
  Input: 
  - item[0]: Contains ALL columns (avg_sleep, prev_sleep, avg_focus, prev_focus, etc.)
  - Reason: SQL query uses a CROSS JOIN of two CTEs, resulting in a single row.
*/

// Data comes from a single row with both current and previous week columns
const data = items[0].json;

const current = {
  avg_sleep: data.avg_sleep,
  avg_focus: data.avg_focus,
  avg_mood: data.avg_mood,
  avg_activity: data.avg_activity,
  avg_score: data.avg_score
};

const prev = {
  prev_sleep: data.prev_sleep,
  prev_focus: data.prev_focus,
  prev_mood: data.prev_mood,
  prev_activity: data.prev_activity,
  prev_score: data.prev_score
};

// 1. Helper: Format Trends from SQL Diffs
const formatTrend = (val, diffUrl, higherIsBetter = true) => {
  const quantity = parseFloat(val || 0);
  const diff = parseFloat(diffUrl || 0);
  
  if (Math.abs(diff) < 0.1) return { arrow: "→", diffStr: "0.0", val: quantity };
  
  const arrow = higherIsBetter 
      ? (diff > 0 ? "↑" : "↓") 
      : (diff < 0 ? "↑" : "↓"); // e.g. lower fatigue is better regarding arrow direction? Usually higher score = better. 
                                // User example: Sleep -0.8h is ↓. Focus +15m is ↑. 
                                // So Arrow UP means "Increased", Arrow DOWN means "Decreased". 
                                // User example: Score 51 ↓ -6. Sleep 5.2h ↓ -0.8h. 
                                // So Arrow reflects the SIGN of the diff, not the "goodness".
                                // Wait, the user example:
                                // Sleep: 5.2h ↓ -0.8h (Less sleep is usually bad, arrow down matches sign)
                                // Focus: 90m ↑ +15m (More focus usually good, arrow up matches sign)
                                // Let's stick to Arrow = Sign of Diff.
  
  const sign = diff > 0 ? "+" : "";
  return { 
      arrow: diff > 0 ? "↑" : "↓", 
      diffStr: `${sign}${diff.toFixed(1)}`,
      val: quantity
  };
};

// 2. Extract & Format Data
const sleep = formatTrend(data.avg_sleep, data.sleep_diff);
const focus = formatTrend(data.avg_focus, data.focus_diff);
const mood = formatTrend(data.avg_mood, data.mood_diff);
const activity = formatTrend(data.avg_activity, data.activity_diff);
const score = formatTrend(data.avg_score, data.score_diff);

// --- Comparative Intelligence: Performance Mode ---
const finalScore = Math.round(data.avg_score || 0);
let performanceMode = "";
let modeEmoji = "";
const recommendations = [];

if (finalScore < 55) {
    performanceMode = "Recovery Mode";
    modeEmoji = "🔋";
    recommendations.push("🛑 **Full Stop:** Reduce workload by 50%. Pulse check sleep.");
} else if (finalScore < 70) {
    performanceMode = "Stabilization Mode";
    modeEmoji = "⚓";
    recommendations.push("⚖️ **Balance:** Prioritize consistency over intensity.");
} else if (finalScore < 85) {
    performanceMode = "Growth Mode";
    modeEmoji = "📈";
    recommendations.push("🚀 **Push:** Increase focus target by +15m/day.");
} else {
    performanceMode = "High Performance Mode";
    modeEmoji = "🔥";
    recommendations.push("🏆 **Peak:** Maintain this state. Don't overreach.");
}

// --- Comparative Intelligence: Strongest Area ---
const metrics = [
    { name: "Sleep", diff: data.sleep_diff, weight: 1.5 },
    { name: "Focus", diff: data.focus_diff, weight: 0.04 },
    { name: "Mood", diff: data.mood_diff, weight: 2.0 },
    { name: "Activity", diff: data.activity_diff, weight: 2.0 }
];

const strongest = metrics.reduce((best, m) => {
    const currentScore = (m.diff || 0) * m.weight;
    const bestScore = (best.diff || 0) * best.weight;
    return currentScore > bestScore ? m : best;
}, metrics[0]);

let strengthMessage = "";
if ((strongest.diff || 0) > 0.1) {
    strengthMessage = `💪 **Strongest Area:** ${strongest.name} (+${Number(strongest.diff).toFixed(1)})`;
} else {
    strengthMessage = `💪 **Steady:** Maintaining baselines.`;
}

// --- Rules Engine (Specific Insights) ---
const insights = [];
if (sleep.val < 6.0) insights.push("⚠️ **Sleep Debt:** Chronic low sleep detected.");
if (focus.val > 240 && sleep.val < 6.5) insights.push("💣 **Burnout Risk:** High output on low fuel.");
if (mood.val < 0 && activity.val < 2) insights.push("🧠 **Stagnant:** Low movement impacting mood.");

// 5. Format Telegram Message
const message = `
📊 **WEEKLY REVIEW**
📅 _${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}_

**Score:** ${Math.round(score.val)}  ${score.arrow} ${Math.round(parseFloat(score.diffStr))} vs last week
${modeEmoji} **${performanceMode}**

**Vital Stats:**
🌙 Sleep:   \`${sleep.val.toFixed(1)}h\`   ${sleep.arrow} ${sleep.diffStr}
🎯 Focus:   \`${Math.round(focus.val)}m\`    ${focus.arrow} ${focus.diffStr}
😊 Mood:    \`${mood.val.toFixed(1)}\`    ${mood.arrow} ${mood.diffStr}

${strengthMessage}

${ data.ai_analysis ? `**🧠 AI Analysis:**\n${data.ai_analysis}\n` : (insights.length > 0 ? `**🔍 Insights:**\n${insights.map(i => `• ${i}`).join("\n")}\n` : "") }
**🚀 Next Week's Mission:**
${recommendations.slice(0, 3).map((r, i) => `${i+1}. ${r}`).join("\n")}
`;

// Return data for Telegram node
return [{ json: { message } }];
