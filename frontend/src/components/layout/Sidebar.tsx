import { Crown, GraduationCap, ShieldCheck, X } from 'lucide-react';
import { toast } from 'react-toastify';
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
        <div className="brand-mark">
          <GraduationCap size={22} />
        </div>
        <span>EduSync</span>
        <button className="mobile-close" aria-label="Close navigation" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <div className="workspace-label">{user.role === 'admin' ? 'ADMINISTRATION' : 'WORKSPACE'}</div>
      <nav>
        {items.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className={`nav-item ${active === label ? 'active' : ''}`}
            onClick={() => {
              setActive(label);
              onClose();
            }}
          >
            <Icon size={18} />
            <span>{label}</span>
            {label === 'Tasks' && <i className="nav-dot" />}
          </button>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <div className="upgrade-card">
        <Crown size={18} />
        <p>
          <strong>{user.role === 'admin' ? 'Admin control' : 'Go Pro'}</strong>
          <br />
          {user.role === 'admin' ? 'Manage accounts securely.' : 'Unlock AI and cloud sync.'}
        </p>
        <button
          onClick={() =>
            user.role === 'admin'
              ? setActive('Admin')
              : toast.info('Cloud integrations are ready to connect when you add provider keys.')
          }
        >
          {user.role === 'admin' ? 'Open admin' : 'Explore Pro'}
        </button>
      </div>
      <div className="profile-menu">
        <Avatar name={user.fullName} />
        <div>
          <strong>{user.fullName}</strong>
          <span>
            {user.role === 'admin'
              ? 'Administrator'
              : user.isEmailVerified
                ? 'Verified student'
                : 'Verify your email'}
          </span>
        </div>
        <IconButton label="Sign out" onClick={onLogout}>
          <X size={17} />
        </IconButton>
      </div>
    </aside>
  );
}

