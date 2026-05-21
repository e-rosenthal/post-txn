import { useState, useEffect } from 'react';

function WhoChip({ who }) {
  if (!who) return null;
  if (who === 'both') return <span className="chip-both">Both</span>;
  if (who === 'Elliot') return <span className="chip-elliot">Elliot</span>;
  if (who === 'Naomi') return <span className="chip-wife">Naomi</span>;
  return <span className="chip-both">{who}</span>;
}

function formatWhatsApp(text) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const parts = line.split(/(\*[^*]+\*)/g);
    return (
      <p key={i} className={line === '' ? 'h-2' : ''}>
        {parts.map((part, j) =>
          part.startsWith('*') && part.endsWith('*') ? (
            <strong key={j}>{part.slice(1, -1)}</strong>
          ) : (
            part
          )
        )}
      </p>
    );
  });
}

function PreviewModal({ text, onSend, onClose, sending }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Message Preview</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-4">
          {/* WhatsApp bubble */}
          <div className="bg-[#dcf8c6] rounded-2xl rounded-tl-sm p-3 text-sm text-gray-900 leading-relaxed max-h-72 overflow-y-auto">
            {formatWhatsApp(text)}
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Will be sent to both Elliot and Naomi</p>
        </div>
        <div className="p-4 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={onSend}
            disabled={sending}
            className="flex-1 py-2.5 rounded-xl bg-green-500 text-white font-semibold text-sm hover:bg-green-600 disabled:opacity-50"
          >
            {sending ? 'Sending…' : '📤 Send Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TodayView() {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewText, setPreviewText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch('/api/today')
      .then(r => r.json())
      .then(d => { setSchedule(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  async function handlePreview() {
    setPreviewing(true);
    try {
      const res = await fetch('/api/preview', { method: 'POST' });
      const data = await res.json();
      setPreviewText(data.text || data.error || 'Error');
      setShowModal(true);
    } catch {
      showToast('Failed to generate preview');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSend() {
    setSending(true);
    try {
      const res = await fetch('/api/send', { method: 'POST' });
      const data = await res.json();
      setShowModal(false);
      const allOk = data.results?.every(r => r.success);
      showToast(allOk ? '✅ Message sent to both parents!' : '⚠️ Partial send — check logs');
    } catch {
      showToast('❌ Failed to send');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!schedule) {
    return <p className="text-center text-gray-500 py-10">Could not load schedule.</p>;
  }

  const { date, dayName, blocks, extraTasks, parentActivities, soloParentTonight } = schedule;
  const dayLabel = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  const [, month, day] = date.split('-');
  const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateLabel = `${months[parseInt(month)]} ${parseInt(day)}`;

  // Insert extra tasks into blocks by time
  const allItems = [
    ...blocks.map(b => ({ ...b, type: 'block' })),
    ...extraTasks.map(t => ({ ...t, type: 'extra', label: t.task })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="space-y-3">
      {/* Date header */}
      <div className="text-center py-2">
        <p className="text-3xl font-bold text-gray-900">{dayLabel}</p>
        <p className="text-gray-500 text-sm">{dateLabel}</p>
      </div>

      {/* Solo parent banner */}
      {soloParentTonight && parentActivities.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-amber-800 text-sm">Evening Heads-Up</p>
              {parentActivities.map(a => (
                <p key={a.id} className="text-amber-700 text-sm mt-1">
                  <strong>{a.who}</strong> has {a.activity} at {a.time} —{' '}
                  <strong>{a.soloParent}</strong> is solo parenting tonight
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Schedule blocks */}
      {allItems.map((item, idx) => (
        item.type === 'extra' ? (
          <div key={idx} className="block-card border-l-4 border-orange-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{item.emoji || '📌'}</span>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.time}</p>
                </div>
              </div>
              {item.who && <WhoChip who={item.who} />}
            </div>
          </div>
        ) : (
          <div
            key={idx}
            className={`block-card ${
              item.who === 'Elliot' ? 'border-l-4 border-blue-400' :
              item.who === 'Naomi'  ? 'border-l-4 border-rose-400' :
                                      'border-l-4 border-purple-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.emoji}</span>
                <div>
                  <p className="font-semibold text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.time}</p>
                </div>
              </div>
              <WhoChip who={item.who} />
            </div>
            {item.tasks && item.tasks.length > 0 && (
              <ul className="mt-2 space-y-0.5 ml-11">
                {item.tasks.map((t, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            )}
            {item.meal && (
              <div className="mt-2 ml-11 flex items-center gap-2">
                <span className="text-xs text-gray-700">🍳 {item.meal.meal}</span>
                <WhoChip who={item.meal.cook} />
              </div>
            )}
          </div>
        )
      ))}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handlePreview}
          disabled={previewing}
          className="flex-1 py-3 rounded-2xl bg-white border border-gray-200 text-gray-700 font-semibold text-sm shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          {previewing ? '⏳ Generating…' : '👁️ Preview Message'}
        </button>
        <button
          onClick={async () => {
            setSending(true);
            try {
              const res = await fetch('/api/send', { method: 'POST' });
              const data = await res.json();
              const allOk = data.results?.every(r => r.success);
              showToast(allOk ? '✅ Sent to both parents!' : '⚠️ Partial send — check logs');
            } catch {
              showToast('❌ Failed to send');
            } finally {
              setSending(false);
            }
          }}
          disabled={sending}
          className="flex-1 py-3 rounded-2xl bg-green-500 text-white font-semibold text-sm shadow-sm hover:bg-green-600 disabled:opacity-50"
        >
          {sending ? '⏳ Sending…' : '📤 Send Now'}
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <PreviewModal
          text={previewText}
          onSend={handleSend}
          onClose={() => setShowModal(false)}
          sending={sending}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
