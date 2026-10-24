import { GraduationCap, Mail, X } from 'lucide-react';
import { nav } from '../../config/navigation';
import type { View } from '../../types/navigation';

export function Sidebar({
  active,
  setActive,
  collapsed,
  onClose,
  onContact,
}: {
  active: View;
  setActive: (view: View) => void;
  collapsed: boolean;
  onClose: () => void;
  onContact: () => void;
}) {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-open' : ''}`} aria-label="Primary navigation">
      <div className="brand">
        <span className="brand-mark"><GraduationCap size={21} /></span>
        <strong>EduSync</strong>
        <button className="mobile-close" aria-label="Close navigation" onClick={onClose}><X size={19} /></button>
      </div>
      <div className="workspace-label">OPEN STUDY WORKSPACE</div>
      <nav>
        {nav.map(({ label, icon: Icon }) => (
          <button key={label} title={label} aria-label={label} className={`nav-item ${active === label ? 'active' : ''}`} onClick={() => { setActive(label); onClose(); }}>
            <Icon size={17} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-footer">
        <div><SparkIcon /><strong>Study principle</strong></div>
        <p>Make the next action small enough that you can start it now.</p>
        <button onClick={() => setActive('Planner')}>Open planner →</button>
      </div>
      <div className="profile-menu developer-credit"><button className="contact-button" onClick={onContact}><Mail size={15} /><span>Contact us</span></button></div>
    </aside>
  );
}

function SparkIcon() {
  return <span style={{ color: 'var(--accent)', fontSize: 15 }}>✦</span>;
}
