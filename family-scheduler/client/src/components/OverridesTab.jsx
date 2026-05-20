import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const EMOJI_OPTIONS = ['🏛️', '🎉', '🍕', '🏥', '🎭', '🏃', '📚', '🎓', '✈️', '🎪', '⚽', '🎵', '🛒', '💼', '🙏'];

function WhoChip({ who }) {
  if (!who) return null;
  if (who === 'both') return <span className="chip-both">Both</span>;
  if (who === 'Elliot') return <span className="chip-elliot">Elliot</span>;
  if (who === 'Wife') return <span className="chip-wife">Wife</span>;
  return null;
}

function AssignSelect({ value, onChange, label }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value === '' ? null : e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        <option value="">N/A</option>
        <option value="Elliot">Elliot</option>
        <option value="Wife">Wife</option>
        <option value="both">Both</option>
      </select>
    </div>
  );
}

export default function OverridesTab() {
  const [schedule, setSchedule] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // New activity form
  const [newActivity, setNewActivity] = useState({ who: 'Elliot', time: '19:00', activity: '', emoji: '🗓️' });
  // New task form
  const [newTask, setNewTask] = useState({ time: '09:00', who: 'Elliot', task: '', emoji: '📌' });

  useEffect(() => {
    fetch('/api/schedule').then(r => r.json()).then(setSchedule);
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function getOverride() {
    if (!schedule) return {};
    return schedule.overrides?.[selectedDate] || {};
  }

  function getDayName() {
    if (!selectedDate) return '';
    const d = new Date(selectedDate + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  }

  function getWeeklyDefault(field) {
    if (!schedule) return null;
    const dayName = getDayName();
    return schedule.weeklyAssignments?.[dayName]?.[field] ?? null;
  }

  function patchOverride(patch) {
    setSchedule(prev => ({
      ...prev,
      overrides: {
        ...prev.overrides,
        [selectedDate]: {
          ...prev.overrides?.[selectedDate],
          ...patch,
        },
      },
    }));
  }

  function getField(field) {
    const ov = getOverride();
    return ov[field] !== undefined ? ov[field] : getWeeklyDefault(field);
  }

  function otherParent(who) {
    return who === 'Elliot' ? 'Wife' : 'Elliot';
  }

  function addActivity() {
    if (!newActivity.activity.trim()) return;
    const entry = {
      id: uuidv4(),
      who: newActivity.who,
      time: newActivity.time,
      activity: newActivity.activity.trim(),
      emoji: newActivity.emoji,
      soloParent: otherParent(newActivity.who),
    };
    const existing = getOverride().parentActivities || [];
    patchOverride({ parentActivities: [...existing, entry] });
    setNewActivity({ who: 'Elliot', time: '19:00', activity: '', emoji: '🗓️' });
  }

  function removeActivity(id) {
    const existing = getOverride().parentActivities || [];
    patchOverride({ parentActivities: existing.filter(a => a.id !== id) });
  }

  function addTask() {
    if (!newTask.task.trim()) return;
    const entry = {
      id: uuidv4(),
      time: newTask.time,
      who: newTask.who,
      task: newTask.task.trim(),
      emoji: newTask.emoji,
    };
    const existing = getOverride().extraTasks || [];
    patchOverride({ extraTasks: [...existing, entry] });
    setNewTask({ time: '09:00', who: 'Elliot', task: '', emoji: '📌' });
  }

  function removeTask(id) {
    const existing = getOverride().extraTasks || [];
    patchOverride({ extraTasks: existing.filter(t => t.id !== id) });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule),
      });
      if (res.ok) showToast('✅ Overrides saved!');
      else showToast('❌ Save failed');
    } catch {
      showToast('❌ Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!schedule) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const override = getOverride();
  const activities = override.parentActivities || [];
  const extraTasks = override.extraTasks || [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Date Overrides</h2>

      {/* Date picker */}
      <div className="block-card">
        <label className="text-xs text-gray-500 block mb-1">Select Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        {selectedDate && (
          <p className="text-xs text-gray-400 mt-1 capitalize">
            {getDayName()} — weekly default applies unless overridden below
          </p>
        )}
      </div>

      {/* Assignment overrides */}
      <div className="block-card space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Assignments for {selectedDate}</h3>
        <AssignSelect
          label="🚗 Drop-off"
          value={getField('dropoff')}
          onChange={v => patchOverride({ dropoff: v })}
        />
        <AssignSelect
          label="🏫 Pickup"
          value={getField('pickup')}
          onChange={v => patchOverride({ pickup: v })}
        />
        <AssignSelect
          label="🌙 Bedtime"
          value={getField('bedtime')}
          onChange={v => patchOverride({ bedtime: v })}
        />
      </div>

      {/* Parent Activities */}
      <div className="block-card space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">🗓️ Parent Evening Activities</h3>

        {activities.map(a => (
          <div key={a.id} className="flex items-center justify-between bg-amber-50 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{a.emoji}</span>
              <div>
                <p className="text-sm font-medium text-gray-900">{a.who} — {a.activity}</p>
                <p className="text-xs text-amber-700">at {a.time} · <strong>{a.soloParent}</strong> solo parenting</p>
              </div>
            </div>
            <button
              onClick={() => removeActivity(a.id)}
              className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
            >
              ×
            </button>
          </div>
        ))}

        {/* Add activity form */}
        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
          <p className="text-xs font-medium text-gray-600">Add Activity</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Who</label>
              <select
                value={newActivity.who}
                onChange={e => setNewActivity(p => ({ ...p, who: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5"
              >
                <option>Elliot</option>
                <option>Wife</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Time</label>
              <input
                type="time"
                value={newActivity.time}
                onChange={e => setNewActivity(p => ({ ...p, time: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Activity</label>
            <input
              type="text"
              value={newActivity.activity}
              onChange={e => setNewActivity(p => ({ ...p, activity: e.target.value }))}
              placeholder="e.g. Book Club, Work dinner…"
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Emoji</label>
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {EMOJI_OPTIONS.map(e => (
                <button
                  key={e}
                  onClick={() => setNewActivity(p => ({ ...p, emoji: e }))}
                  className={`text-lg p-1 rounded-lg ${newActivity.emoji === e ? 'bg-blue-100 ring-2 ring-blue-400' : 'hover:bg-gray-100'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          {newActivity.who && (
            <p className="text-xs text-amber-600">
              → <strong>{otherParent(newActivity.who)}</strong> will be auto-assigned as solo parent
            </p>
          )}
          <button
            onClick={addActivity}
            className="w-full py-2 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600"
          >
            Add Activity
          </button>
        </div>
      </div>

      {/* Extra Tasks */}
      <div className="block-card space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">📋 Extra Tasks</h3>

        {extraTasks.map(t => (
          <div key={t.id} className="flex items-center justify-between bg-orange-50 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{t.emoji}</span>
              <div>
                <p className="text-sm font-medium text-gray-900">{t.task}</p>
                <p className="text-xs text-gray-500">{t.time} · <WhoChip who={t.who} /></p>
              </div>
            </div>
            <button
              onClick={() => removeTask(t.id)}
              className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
            >
              ×
            </button>
          </div>
        ))}

        {/* Add task form */}
        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
          <p className="text-xs font-medium text-gray-600">Add Task</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Who</label>
              <select
                value={newTask.who}
                onChange={e => setNewTask(p => ({ ...p, who: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5"
              >
                <option>Elliot</option>
                <option>Wife</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Time</label>
              <input
                type="time"
                value={newTask.time}
                onChange={e => setNewTask(p => ({ ...p, time: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Task</label>
            <input
              type="text"
              value={newTask.task}
              onChange={e => setNewTask(p => ({ ...p, task: e.target.value }))}
              placeholder="e.g. Doctor appointment…"
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Emoji</label>
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {['📌', '🏥', '🛒', '🎒', '🚗', '💊', '📞', '🏫', '🎂', '🔧'].map(e => (
                <button
                  key={e}
                  onClick={() => setNewTask(p => ({ ...p, emoji: e }))}
                  className={`text-lg p-1 rounded-lg ${newTask.emoji === e ? 'bg-blue-100 ring-2 ring-blue-400' : 'hover:bg-gray-100'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={addTask}
            className="w-full py-2 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600"
          >
            Add Task
          </button>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-2xl bg-blue-500 text-white font-semibold hover:bg-blue-600 disabled:opacity-50 shadow-sm"
      >
        {saving ? 'Saving…' : 'Save Overrides'}
      </button>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
