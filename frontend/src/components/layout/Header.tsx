import { Bell, Menu, Moon, Search, Settings, Sun } from 'lucide-react';
import { toast } from 'react-toastify';
import { Avatar } from '../common/Avatar';
import { IconButton } from '../common/IconButton';
import type { View } from '../../types/navigation';
import type { AuthUser } from '../../services/auth';

function Header({
  onMenu,
  dark,
  toggleDark,
  openCommand,
  setActive,
  user,
}: {
  onMenu: () => void;
  dark: boolean;
  toggleDark: () => void;
  openCommand: () => void;
  setActive: (view: View) => void;
  user: AuthUser;
}) {
  return (
    <header className="topbar">
      <button className="mobile-menu" aria-label="Open navigation" onClick={onMenu}>
        <Menu size={22} />
      </button>
      <button className="command-search" onClick={openCommand} aria-label="Open command palette">
        <Search size={18} />
        <span>Search or jump to a page</span>
        <kbd>⌘ K</kbd>
      </button>
      <div className="header-actions">
        <IconButton label="Open settings" onClick={() => setActive('Settings')}>
          <Settings size={19} />
        </IconButton>
        <IconButton label="Toggle theme" onClick={toggleDark}>
          {dark ? <Sun size={19} /> : <Moon size={19} />}
        </IconButton>
        <div className="notification-wrap">
          <IconButton label="Notifications" onClick={() => toast('You’re all caught up!')}>
            <Bell size={19} />
          </IconButton>
          <span />
        </div>
        <Avatar className="top-avatar" name={user.fullName} />
      </div>
    </header>
  );
}

