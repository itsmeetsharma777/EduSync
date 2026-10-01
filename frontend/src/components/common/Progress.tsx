import { motion } from 'framer-motion';

function Progress({ value, color = 'var(--violet)' }: { value: number; color?: string }) {
  return (
    <div className="progress-track" aria-label={`${Math.round(value)}% complete`}>
      <motion.div
        className="progress-value"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, value)}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ backgroundColor: color }}
      />
    </div>
  );
}
