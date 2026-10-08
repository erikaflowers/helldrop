import { useAppState } from '../../core/store.jsx';
import './Sidebar.css';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '\u229E' },
  { id: 'audio-banks', label: 'Audio Banks', icon: '\u266B' },
  { id: 'replace', label: 'Replace Audio', icon: '\u21C4' },
  { id: 'export', label: 'Export Mod', icon: '\u2197' },
  { id: 'settings', label: 'Settings', icon: '\u2699' },
];

function Sidebar() {
  const { sidebarCollapsed } = useAppState();

  const sidebarClass = [
    'sidebar',
    sidebarCollapsed ? 'sidebar--collapsed' : '',
  ].filter(Boolean).join(' ');

  return (
    <aside className={sidebarClass}>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className="sidebar-nav-item"
            title={sidebarCollapsed ? item.label : undefined}
          >
            <span className="sidebar-nav-icon">{item.icon}</span>
            {!sidebarCollapsed && (
              <span className="sidebar-nav-label">{item.label}</span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
