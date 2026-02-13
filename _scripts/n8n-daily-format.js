// Daily Review Formatter
// Input: 
// - item[0] = Today's Log (from SQL)
// - item[0].ai_analysis = Output from AI Agent (optional)

const today = items[0].json;
const val = (v) => parseFloat(v || 0);

const score = Math.round(today.final_score || 0);
const sleep = val(today.sleep_hours);
const focus = val(today.focus_minutes);
const mood = val(today.mood);

// --- 1. Advanced Mode Classification ---
let mode = "⚓ Steady Mode";
let modeEmoji = "⚓";

if (focus > 240 && score > 80) {
    mode = "🔥 High Output Mode";
    modeEmoji = "🔥";
} else if (focus > 180 && mood > 2) {
    mode = "🧠 Deep Focus Mode";
    modeEmoji = "🧠";
} else if (score > 75 && sleep > 7) {
    mode = "🔋 Growth Mode";
    modeEmoji = "🔋";
} else if (sleep < 6 || score < 50) {
    mode = "🧯 Recovery Mode";
    modeEmoji = "🧯";
}

// --- 3. Extract AI Data (Robust) ---
const findAI = (item) => item ? (item.ai_analysis || item.output || item.text || item.response || item.answer || item.result) : "";
const aiText = findAI(today) || (items.length > 1 ? findAI(items[1].json) : "");

// --- 4. Format Message ---
const message = `
📝 **DAILY REVIEW**
📅 _${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}_

**Score:** ${score}
${modeEmoji} **${mode}**

**Highlights:**
🌙 Sleep:   \`${sleep.toFixed(1)}h\`
🎯 Focus:   \`${Math.round(focus)}m\`
😊 Mood:    \`${mood.toFixed(1)}\`
🏃 Activity: \`${val(today.activity_level)}\`


${ aiText ? `**🤖 AI Insight:**\n${aiText}` : "" }
`;

return [{ json: { message } }];
