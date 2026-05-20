import { useState } from 'react';
import TodayView from './components/TodayView';
import WeekEditor from './components/WeekEditor';
import OverridesTab from './components/OverridesTab';
import SettingsTab from './components/SettingsTab';

const TABS = [
  { id: 'today',    label: '📅 Today'    },
  { id: 'week',     label: '📆 Week'     },
  { id: 'overrides',label: '✏️ Overrides' },
  { id: 'settings', label: '⚙️ Settings'  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('today');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-safe-top sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 py-4">
            <span className="text-2xl">🏠</span>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-none">Family Scheduler</h1>
              <p className="text-xs text-gray-500">Rosenthal Family</p>
            </div>
          </div>
          {/* Tab bar */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-3">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`tab-btn ${activeTab === t.id ? 'tab-btn-active' : 'tab-btn-inactive'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-4">
        {activeTab === 'today'     && <TodayView />}
        {activeTab === 'week'      && <WeekEditor />}
        {activeTab === 'overrides' && <OverridesTab />}
        {activeTab === 'settings'  && <SettingsTab />}
      </div>
    </div>
  );
}
