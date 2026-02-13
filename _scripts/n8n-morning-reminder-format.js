// Morning Reminder Formatter
// Input: items[] = rows from tracking_items (today's habits & tasks)

const allItems = items.map(i => i.json);

const habits = allItems.filter(i => i.type === 'habit');
const tasks = allItems.filter(i => i.type === 'task');

const today = new Date();
const dateStr = today.toLocaleDateString('en-GB', { 
  weekday: 'long', day: 'numeric', month: 'long' 
});

// Priority emoji helper
const prioIcon = (p) => {
  if (p === 'high') return '🔴';
  if (p === 'medium') return '🟡';
  if (p === 'low') return '🔵';
  return '';
};

// Time formatter
const fmtTime = (t) => t ? ` (${t})` : '';
const fmtDuration = (m) => m > 0 ? ` ~${m}m` : '';

// --- Build Habits Section ---
let habitsSection = '';
if (habits.length > 0) {
  habitsSection = `\n✅ **Habits (${habits.length})**\n`;
  habits.forEach((h, i) => {
    habitsSection += `  ${i + 1}. ${prioIcon(h.priority)} ${h.title}${fmtTime(h.target_time)}${fmtDuration(h.duration_minutes)}\n`;
  });
} else {
  habitsSection = '\n✅ **Habits:** _None scheduled_\n';
}

// --- Build Tasks Section ---
let tasksSection = '';
if (tasks.length > 0) {
  tasksSection = `\n📋 **Tasks (${tasks.length})**\n`;
  tasks.forEach((t, i) => {
    tasksSection += `  ${i + 1}. ${prioIcon(t.priority)} ${t.title}${fmtTime(t.target_time)}${fmtDuration(t.duration_minutes)}\n`;
  });
} else {
  tasksSection = '\n📋 **Tasks:** _None scheduled_\n';
}

// --- Calculate total focus time ---
const totalMinutes = allItems.reduce((sum, i) => sum + (i.duration_minutes || 0), 0);
const focusLine = totalMinutes > 0 ? `\n⏱ **Planned Focus:** ~${totalMinutes}m` : '';

// --- Assemble the message ---
const message = `☀️ **GOOD MORNING**
📅 _${dateStr}_
${habitsSection}${tasksSection}${focusLine}

🔗 [Log your day](http://localhost:3000/daily)
💪 _Make it count!_`;

return [{ json: { message } }];
