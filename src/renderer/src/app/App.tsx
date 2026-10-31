import { Clock3, Folder, Search, Settings, Terminal } from 'lucide-react'
import { ForjaMark } from '../../../shared/ui/forja-mark'
import { Shortcut } from '../shared/ui/Shortcut'
import styles from './Shell.module.css'

const actions = [
  { label: 'Open project folder', icon: Folder, keys: ['Ctrl', 'K', 'then', 'Ctrl', 'O'] },
  { label: 'Recent projects', icon: Clock3, keys: ['Ctrl', 'R'] },
  { label: 'Show All Commands', icon: Terminal, keys: ['Ctrl', 'Shift', 'P'] },
]

export function App() {
  return (
    <div className={styles.shell}>
      <header className={styles.titlebar}>
        <div className={styles.brand}>
          <ForjaMark className={styles.brandMark} />
          <span>FORJA</span>
          <span className={styles.version}>v2.0</span>
        </div>
        <div className={styles.commandArea}>
          <button disabled className={styles.command} aria-label="Command palette">
            <Search size={14} strokeWidth={1.5} />
            <span className={styles.commandLabel}>Forja</span>
            <Shortcut keys={['Ctrl+Shift+P']} compact />
          </button>
        </div>
        <button
          disabled
          className={`${styles.iconButton} ${styles.settings}`}
          aria-label="Settings"
        >
          <Settings size={15} strokeWidth={1.5} />
        </button>
      </header>
      <main className={styles.main}>
        <section className={styles.welcome} aria-label="Welcome to Forja">
          <div className={styles.identity}>
            <div className={styles.emblem}>
              <ForjaMark className={styles.emblemMark} />
            </div>
            <h1 className={styles.wordmark}>FORJA</h1>
          </div>
          <div className={styles.actions}>
            {actions.map(({ label, icon: Icon, keys }) => (
              <button key={label} disabled className={styles.action}>
                <span className={styles.actionIcon}>
                  <Icon size={17} strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span className={styles.actionLabel}>{label}</span>
                <Shortcut keys={keys} />
              </button>
            ))}
          </div>
        </section>
      </main>
      <footer className={styles.statusbar}>
        <span role="status" className={styles.projectStatus} lang="pt-BR">
          <span className={styles.statusDot} />
          Sem projeto
        </span>
        <span>UTF-8</span>
      </footer>
    </div>
  )
}
