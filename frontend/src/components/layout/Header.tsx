import { Bell, Check, CheckCircle2, Menu, Moon, Search, Settings, Sun, AlertCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { IconButton } from '../common/IconButton';
import type { View } from '../../types/navigation';

export type AppNotification = { id: string; title: string; body: string; createdAt: string; read: boolean; tone?: 'focus' | 'task' | 'win' };

export function Header({
  onMenu,
  dark,
  toggleDark,
  openCommand,
  setActive,
  active,
  syncing,
  syncError,
  notifications,
  markAllRead,
}: {
  onMenu: () => void;
  dark: boolean;
  toggleDark: () => void;
  openCommand: () => void;
  setActive: (view: View) => void;
  active: View;
  syncing: boolean;
  syncError: boolean;
  notifications: AppNotification[];
  markAllRead: () => void;
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((notification) => !notification.read).length;
  useEffect(() => {
    if (!notificationsOpen) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) setNotificationsOpen(false);
    };
    window.addEventListener('pointerdown', closeOnOutsidePress);
    return () => window.removeEventListener('pointerdown', closeOnOutsidePress);
  }, [notificationsOpen]);
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
      <nav className="top-links" aria-label="Dashboard sections">
        {(['Dashboard', 'My subjects', 'Planner', 'Analytics'] as View[]).map((view) => <button key={view} className={active === view ? 'active' : ''} onClick={() => setActive(view)}>{view === 'My subjects' ? 'Subjects' : view}</button>)}
      </nav>
      <div className={`sync-status ${syncError ? 'error' : ''}`}>
        {syncError ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
        <i />
        {syncError ? 'Save needs attention' : syncing ? 'Saving…' : 'Saved on this device'}
      </div>
      <div className="header-actions">
        <IconButton label="Open settings" onClick={() => setActive('Settings')}>
          <Settings size={18} />
        </IconButton>
        <IconButton label="Toggle theme" onClick={toggleDark}>
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </IconButton>
        <div className="notification-wrap" ref={notificationRef}>
        <IconButton label="Notifications" onClick={() => setNotificationsOpen((open) => !open)}>
          <Bell size={18} />
        </IconButton>
        {unread > 0 && <span className="notification-badge">{unread > 9 ? '9+' : unread}</span>}
        {notificationsOpen && <section className="notification-drawer" aria-label="Notifications">
          <header><div><span className="eyebrow">UPDATES</span><h3>Notifications</h3></div><button className="text-link" onClick={markAllRead} disabled={!unread}><Check size={14} /> Mark all read</button></header>
          <div className="notification-list">{notifications.length ? notifications.slice(0, 8).map((notification) => <article key={notification.id} className={!notification.read ? 'unread' : ''}><i className={notification.tone ?? 'focus'} /><div><strong>{notification.title}</strong><p>{notification.body}</p><span>{new Date(notification.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span></div></article>) : <p className="notification-empty">You’re all caught up. Your helpful study updates will appear here.</p>}</div>
        </section>}
        </div>
      </div>
    </header>
  );
}
