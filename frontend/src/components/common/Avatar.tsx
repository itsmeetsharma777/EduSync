function Avatar({ className = '', name = 'Alex Morgan' }: { className?: string; name?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  return (
    <div className={`avatar ${className}`} aria-label={name}>
      {initials || 'ES'}
    </div>
  );
}
