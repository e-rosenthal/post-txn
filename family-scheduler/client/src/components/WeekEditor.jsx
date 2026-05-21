import { useState, useEffect } from 'react';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };

function AssignSelect({ value, onChange, allowNull }) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value === '' ? null : e.target.value)}
      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
    >
      {allowNull && <option value="">N/A</option>}
      <option value="Elliot">Elliot</option>
      <option value="Naomi">Naomi</option>
      <option value="both">Both</option>
    </select>
  );
}

// Returns the Mon–Sun dates for the current week (Sun=0 based)
function getThisWeekDates() {
  const today = new Date();
  const day = today.getDay(); // 0=Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

const WEEK_DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function WeekEditor() {
  const [schedule, setSchedule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const weekDates = getThisWeekDates(); // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]

  useEffect(() => {
    fetch('/api/schedule').then(r => r.json()).then(setSchedule);
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function setDayField(day, field, value) {
    setSchedule(prev => ({
      ...prev,
      weeklyAssignments: {
        ...prev.weeklyAssignments,
        [day]: { ...prev.weeklyAssignments[day], [field]: value },
      },
    }));
  }

  function setMeal(date, field, value) {
    setSchedule(prev => ({
      ...prev,
      meals: {
        ...(prev.meals || {}),
        [date]: {
          ...(prev.meals?.[date] || { meal: '', cook: 'Elliot' }),
          [field]: value,
        },
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule),
      });
      if (res.ok) showToast('✅ Schedule saved!');
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

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Weekly Assignments</h2>

      {/* Shared times */}
      <div className="block-card">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Shared Times</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Drop-off Time</label>
            <input
              type="time"
              value={schedule.dropoffTime}
              onChange={e => setSchedule(p => ({ ...p, dropoffTime: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Pickup Time</label>
            <input
              type="time"
              value={schedule.pickupTime}
              onChange={e => setSchedule(p => ({ ...p, pickupTime: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>
      </div>

      {/* Day assignments */}
      <div className="space-y-2">
        {DAYS.map(day => {
          const isWeekend = day === 'saturday' || day === 'sunday';
          const a = schedule.weeklyAssignments[day] || {};
          return (
            <div key={day} className="block-card">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-gray-900">{DAY_LABELS[day]}</span>
                {isWeekend && <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Weekend</span>}
              </div>
              <div className={`grid gap-3 ${isWeekend ? 'grid-cols-1' : 'grid-cols-3'}`}>
                {!isWeekend && (
                  <>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">🚗 Drop-off</label>
                      <AssignSelect value={a.dropoff} onChange={v => setDayField(day, 'dropoff', v)} allowNull />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">🏫 Pickup</label>
                      <AssignSelect value={a.pickup} onChange={v => setDayField(day, 'pickup', v)} allowNull />
                    </div>
                  </>
                )}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">🌙 Bedtime</label>
                  <AssignSelect value={a.bedtime} onChange={v => setDayField(day, 'bedtime', v)} allowNull={false} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* This week's meals */}
      <div className="block-card space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">🍽️ This Week's Dinners</h3>
        <p className="text-xs text-gray-400">Plan what's for dinner each night and who's cooking.</p>
        {weekDates.map((date, i) => {
          const dayName = WEEK_DAY_ORDER[i];
          const mealEntry = schedule.meals?.[date] || { meal: '', cook: 'Elliot' };
          return (
            <div key={date} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">
                  {DAY_LABELS[dayName]} <span className="font-normal text-gray-400">{date.slice(5)}</span>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <input
                    type="text"
                    value={mealEntry.meal || ''}
                    onChange={e => setMeal(date, 'meal', e.target.value)}
                    placeholder="What's for dinner?"
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <select
                    value={mealEntry.cook || 'Elliot'}
                    onChange={e => setMeal(date, 'cook', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="Elliot">Elliot</option>
                    <option value="Naomi">Naomi</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-2xl bg-blue-500 text-white font-semibold hover:bg-blue-600 disabled:opacity-50 shadow-sm"
      >
        {saving ? 'Saving…' : 'Save Schedule'}
      </button>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
