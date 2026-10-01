import { GraduationCap, LogOut, ShieldCheck, X } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { IconButton } from '../common/IconButton';
import { nav } from '../../config/navigation';
import type { View } from '../../types/navigation';
import type { AuthUser } from '../../services/auth';

export function Sidebar({
  active,
  setActive,
  collapsed,
  onClose,
  user,
  onLogout,
}: {
  active: View;
  setActive: (view: View) => void;
  collapsed: boolean;
  onClose: () => void;
  user: AuthUser;
  onLogout: () => void;
}) {
  const items = user.role === 'admin' ? [...nav, { label: 'Admin' as View, icon: ShieldCheck }] : nav;
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-open' : ''}`} aria-label="Primary navigation">
      <div className="brand">
        <span className="brand-mark"><GraduationCap size={21} /></span>
        <strong>EduSync</strong>
        <button className="mobile-close" aria-label="Close navigation" onClick={onClose}><X size={19} /></button>
      </div>
      <div className="workspace-label">{user.role === 'admin' ? 'ADMINISTRATION' : 'STUDY WORKSPACE'}</div>
      <nav>
        {items.map(({ label, icon: Icon }) => (
          <button key={label} className={`nav-item ${active === label ? 'active' : ''}`} onClick={() => { setActive(label); onClose(); }}>
            <Icon size={17} />
            <span>{label}</span>
            {label === 'Tasks' && <i className="nav-dot" />}
          </button>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-footer">
        <div><SparkIcon /><strong>Study principle</strong></div>
        <p>Make the next action small enough that you can start it now.</p>
        <button onClick={() => setActive('Planner')}>Open planner →</button>
      </div>
      <div className="profile-menu">
        <Avatar name={user.fullName} />
        <div>
          <strong>{user.fullName}</strong>
          <span>{user.role === 'admin' ? 'Administrator' : user.isEmailVerified ? 'Verified student' : 'Email not verified'}</span>
        </div>
        <IconButton label="Sign out" onClick={onLogout}><LogOut size={16} /></IconButton>
      </div>
    </aside>
  );
}

function SparkIcon() {
  return <span style={{ color: 'var(--accent)', fontSize: 15 }}>✦</span>;
}
