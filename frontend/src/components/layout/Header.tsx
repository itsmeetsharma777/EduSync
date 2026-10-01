import { Bell, CheckCircle2, Menu, Moon, Search, Settings, Sun, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { Avatar } from '../common/Avatar';
import { IconButton } from '../common/IconButton';
import type { View } from '../../types/navigation';
import type { AuthUser } from '../../services/auth';

export function Header({
  onMenu,
  dark,
  toggleDark,
  openCommand,
  setActive,
  user,
  syncing,
  syncError,
}: {
  onMenu: () => void;
  dark: boolean;
  toggleDark: () => void;
  openCommand: () => void;
  setActive: (view: View) => void;
  user: AuthUser;
  syncing: boolean;
  syncError: boolean;
}) {
  return (
    <header className="topbar">
      <button className="mobile-menu" aria-label="Open navigation" onClick={onMenu}>
        <Menu size={20} />
      </button>
      <button className="command-search" onClick={openCommand} aria-label="Open command palette">
        <Search size={17} />
        <span>Search or jump to a page</span>
        <kbd>⌘ K</kbd>
      </button>
      <div className={`sync-status ${syncError ? 'error' : ''}`}>
        {syncError ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
        <i />
        {syncError ? 'Sync needs attention' : syncing ? 'Saving…' : 'Saved'}
      </div>
      <div className="header-actions">
        <IconButton label="Open settings" onClick={() => setActive('Settings')}>
          <Settings size={18} />
        </IconButton>
        <IconButton label="Toggle theme" onClick={toggleDark}>
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </IconButton>
        <IconButton label="Notifications" onClick={() => toast('You’re all caught up.')}>
          <Bell size={18} />
        </IconButton>
        <Avatar className="top-avatar" name={user.fullName} />
      </div>
    </header>
  );
}
