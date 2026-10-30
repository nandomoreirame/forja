import styles from './Shortcut.module.css'

export function Shortcut({ keys, compact = false }: { keys: string[]; compact?: boolean }) {
  return <span className={compact ? styles.compact : styles.shortcut} aria-hidden="true">
    {keys.map((key, index) => key === 'then'
      ? <span key={index} className={styles.separator}>then</span>
      : <kbd key={index}>{key}</kbd>)}
  </span>
}
