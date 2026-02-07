// 1. Get data from previous nodes (Postgres)
// Assumes Postgres node returns 2 rows: 
// Row 0: Current Week (avg_sleep, etc.)
// Row 1: Previous Week (prev_sleep, etc.)
const current = items[0].json; 
const prev = items[1] ? items[1].json : {};

// Helper for trends
const getTrend = (curr, old, higherIsBetter = true) => {
  if (!old) return "new";
  const diff = curr - old;
  if (Math.abs(diff) < 0.1) return "➡️";
  if (higherIsBetter) return diff > 0 ? "↗️" : "↘️";
  return diff < 0 ? "↗️" : "↘️"; // For bad metrics like 'fatigue'
};

// 2. Metrics Analysis
const sleepTrend = getTrend(current.avg_sleep, prev.avg_sleep);
const focusTrend = getTrend(current.avg_focus, prev.avg_focus);
const scoreTrend = getTrend(current.avg_score, prev.avg_score);

// 3. Pattern Detection & Recommendations
const recommendations = [];
const insights = [];

// Sleep Logic
if (current.avg_sleep < 6.0) {
  insights.push("⚠️ Chronic sleep deprivation detected.");
  recommendations.push("🛌 Strict 11 PM bedtime this week.");
} else if (current.avg_sleep > 8.0 && current.avg_activity < 2) {
  insights.push("📉 High sleep but low energy?");
  recommendations.push("☀️ Get 10m sunlight upon waking.");
}

// Focus Logic
if (current.avg_focus < 60) {
  recommendations.push("🍅 Try 25m Pomodoro sessions tomorrow.");
} else if (current.avg_focus > 240 && current.avg_sleep < 6.5) {
  insights.push("🔥 Burnout Risk: High focus on low sleep.");
  recommendations.push("🛑 Cap focus to 3h until sleep recovers.");
}

// Mood/Activity
if (current.avg_mood < 0 && current.avg_activity < 2) {
  insights.push("🧠 Low movement is impacting mood.");
  recommendations.push("🏃 Walk 15m before starting work.");
}

// Select top 3 recommendations
const topRecs = recommendations.slice(0, 3).map((r, i) => `${i+1}. ${r}`).join("\n");

// 4. Format Message
const message = `
📅 **Weekly Review**
**Score:** ${Math.round(current.avg_score)} (${scoreTrend})

**Analysis:**
🌙 Sleep: ${Number(current.avg_sleep).toFixed(1)}h (${sleepTrend})
🎯 Focus: ${Math.round(current.avg_focus)}m (${focusTrend})
😊 Mood: ${Number(current.avg_mood).toFixed(1)}

**Insights:**
${insights.map(i => `• ${i}`).join("\n") || "• No critical alerts this week."}

**Next Week:**
${topRecs || "• Keep maintaining your current baseline!"}
`;

return [{ json: { message } }];
