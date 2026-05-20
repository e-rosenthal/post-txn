import { useState, useEffect } from 'react';

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-blue-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function SettingsTab() {
  const [schedule, setSchedule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch('/api/schedule').then(r => r.json()).then(setSchedule);
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function setSettings(patch) {
    setSchedule(prev => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  }

  function setWhatsApp(name, value) {
    setSchedule(prev => ({
      ...prev,
      family: {
        ...prev.family,
        whatsapp: { ...prev.family.whatsapp, [name]: value },
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
      if (res.ok) showToast('✅ Settings saved!');
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

  const { settings, family } = schedule;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Settings</h2>

      {/* Timing */}
      <div className="block-card space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">⏰ Timing</h3>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Morning Briefing Time</label>
          <input
            type="time"
            value={settings.morningBriefingTime}
            onChange={e => setSettings({ morningBriefingTime: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Evening Reminder Time</label>
          <input
            type="time"
            value={settings.eveningReminderTime}
            onChange={e => setSettings({ eveningReminderTime: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Weekly Summary / Schedule Check (Sat & Sun)</label>
          <input
            type="time"
            value={settings.weeklySummaryTime || '20:00'}
            onChange={e => setSettings({ weeklySummaryTime: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <p className="text-xs text-gray-400 mt-1">
            Sat 8 PM: asks you to confirm next week if not yet done.<br />
            Sun 8 PM: same reminder + sends the full weekly summary.
          </p>
        </div>
      </div>

      {/* Toggles */}
      <div className="block-card space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">🔧 Behavior</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-900 font-medium">Auto-send morning briefing</p>
            <p className="text-xs text-gray-500">Send WhatsApp automatically each morning</p>
          </div>
          <Toggle
            checked={settings.autoSendEnabled}
            onChange={v => setSettings({ autoSendEnabled: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-900 font-medium">Shabbat-aware mode</p>
            <p className="text-xs text-gray-500">Skip Saturday sends, add Shabbat notes Thu–Fri</p>
          </div>
          <Toggle
            checked={settings.shabbatAwareMode}
            onChange={v => setSettings({ shabbatAwareMode: v })}
          />
        </div>
      </div>

      {/* WhatsApp numbers */}
      <div className="block-card space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">📱 WhatsApp Numbers</h3>
        <div>
          <label className="text-xs text-blue-600 font-medium block mb-1">Elliot</label>
          <input
            type="tel"
            value={family?.whatsapp?.Elliot || ''}
            onChange={e => setWhatsApp('Elliot', e.target.value)}
            placeholder="+1XXXXXXXXXX"
            className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="text-xs text-rose-600 font-medium block mb-1">Wife</label>
          <input
            type="tel"
            value={family?.whatsapp?.Wife || ''}
            onChange={e => setWhatsApp('Wife', e.target.value)}
            placeholder="+1XXXXXXXXXX"
            className="w-full border border-rose-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>
        <p className="text-xs text-gray-400">
          Include country code (e.g. +1 for US). Numbers must be verified in Meta's WhatsApp sandbox.
        </p>
      </div>

      {/* WhatsApp Bot */}
      <div className="block-card space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">💬 WhatsApp Chat Bot</h3>
        <p className="text-xs text-gray-500">
          Both parents can message the bot directly on WhatsApp to read or update the schedule.
          Point Meta's webhook to the URL below.
        </p>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Webhook URL</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-gray-100 rounded-lg px-3 py-2 text-gray-700 break-all">
              {window.location.origin.replace('5173', '3001')}/api/whatsapp/webhook
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin.replace('5173', '3001')}/api/whatsapp/webhook`
                );
              }}
              className="text-xs text-blue-600 hover:text-blue-800 flex-shrink-0"
            >
              Copy
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Set <code className="bg-gray-100 px-1 rounded">META_WEBHOOK_VERIFY_TOKEN</code> in your <code className="bg-gray-100 px-1 rounded">.env</code> to any secret string, then paste it in the Meta developer console when configuring the webhook.
        </p>
        <p className="text-xs text-gray-500 font-medium mt-1">
          What the bot can do via chat:
        </p>
        <ul className="text-xs text-gray-500 space-y-0.5 ml-3">
          <li>• Read today's or any date's schedule</li>
          <li>• Read this or next week's full schedule</li>
          <li>• Add / remove parent evening activities</li>
          <li>• Add / remove extra one-off tasks</li>
          <li>• Override a single day's drop-off, pickup, or bedtime</li>
          <li>• Confirm next week</li>
        </ul>
        <p className="text-xs text-amber-600">
          ⚠️ Cannot change the weekly rotation, settings, or WhatsApp numbers via chat — use the app for those.
        </p>
      </div>

      {/* Confirm Week */}
      <div className="block-card">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">✅ Confirm Next Week</h3>
        <p className="text-xs text-gray-500 mb-3">
          Once you've reviewed next week's schedule and overrides, confirm it here.
          Saturday and Sunday reminder messages won't fire once confirmed.
        </p>
        <button
          onClick={async () => {
            try {
              const res = await fetch('/api/confirm-week', { method: 'POST' });
              const data = await res.json();
              if (data.ok) showToast(`✅ Week of ${data.weekConfirmed} confirmed!`);
              else showToast('❌ Could not confirm week');
            } catch {
              showToast('❌ Could not confirm week');
            }
          }}
          className="w-full py-2.5 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600"
        >
          Confirm Next Week ✅
        </button>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-2xl bg-blue-500 text-white font-semibold hover:bg-blue-600 disabled:opacity-50 shadow-sm"
      >
        {saving ? 'Saving…' : 'Save Settings'}
      </button>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
