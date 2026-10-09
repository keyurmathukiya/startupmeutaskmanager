'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, getToken, setToken } from '../src/services/api';

const NAVIGATION = [
  { id: 'all', label: 'All tasks', icon: '▦' },
  { id: 'today', label: 'Today', icon: '◷' },
  { id: 'upcoming', label: 'Upcoming', icon: '▣' },
  { id: 'completed', label: 'Completed', icon: '✓' },
];
const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['todo', 'in-progress', 'completed'];

const dateKey = (date) => {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 10);
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
};

const formatDate = (date) => new Date(`${dateKey(date)}T12:00:00`).toLocaleDateString(undefined, {
  month: 'short',
  day: 'numeric',
});

const formatEstimate = (minutes) => {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder}m`;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
};

function Icon({ name, size = 18 }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    close: <path d="m18 6-12 12M6 6l12 12" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = mode === 'login' ? await api.login(form) : await api.register(form);
      setToken(result.token);
      onAuth(result.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-lockup"><span className="brand-mark">t.</span><span>taskflow</span></div>
        <p className="eyebrow">A LITTLE MORE FOCUS</p>
        <h1>{mode === 'login' ? 'Welcome back.' : 'Make today count.'}</h1>
        <p className="auth-copy">{mode === 'login' ? 'Your day is waiting. Sign in to pick up where you left off.' : 'Create an account and give your to-dos a home.'}</p>
        <form className="auth-form" onSubmit={submit}>
          {mode === 'register' && <label>Your name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" required /></label>}
          <label>Email address<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" required /></label>
          <label>Password<input type="password" minLength={6} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>
          {error && <p className="notice error-notice" role="alert">{error}</p>}
          <button className="primary-button auth-submit" disabled={busy}>{busy ? 'One moment…' : mode === 'login' ? 'Sign in' : 'Create account'}<Icon name="chevron" /></button>
        </form>
        <p className="auth-switch">{mode === 'login' ? 'New to Taskflow?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
      </section>
      <aside className="auth-art">
        <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
        <div className="art-note"><span className="note-check"><Icon name="check" size={15} /></span><div><strong>Small steps, big momentum.</strong><span>One thing at a time.</span></div></div>
        <p className="art-caption">A clear mind starts<br />with a clear list.</p>
        <span className="art-decoration">✳</span>
      </aside>
    </main>
  );
}

function TaskForm({ task, onClose, onSave }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    goals: task?.goals || '',
    notes: task?.notes || '',
    links: task?.links?.map((link) => ({ ...link, draftId: link._id || `${Date.now()}-${Math.random()}` })) || [],
    estimateMinutes: task?.estimateMinutes ?? '',
    project: task?.project || '',
    labels: task?.labels?.join(', ') || '',
    subtasks: task?.subtasks?.map((subtask) => ({ ...subtask, draftId: subtask._id || `${Date.now()}-${Math.random()}` })) || [],
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    dueDate: task?.dueDate ? dateKey(task.dueDate) : '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    const labels = [...new Set(form.labels.split(',').map((label) => label.trim()).filter(Boolean))];
    if (labels.length > 10) {
      setError('Use 10 labels or fewer.');
      return;
    }
    if (form.links.length > 10) {
      setError('Add 10 resource links or fewer.');
      return;
    }
    const links = form.links
      .map(({ title, url }) => ({ title: title.trim(), url: url.trim() }))
      .filter((link) => link.title || link.url);
    if (links.some((link) => !link.url)) {
      setError('Add a URL for each resource link.');
      return;
    }
    setBusy(true);
    try {
      const subtasks = form.subtasks
        .map(({ title, completed }) => ({ title: title.trim(), completed }))
        .filter((subtask) => subtask.title);
      await onSave({
        ...form,
        labels,
        links,
        subtasks,
        estimateMinutes: form.estimateMinutes ? Number(form.estimateMinutes) : null,
        dueDate: form.dueDate || null,
      });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="task-modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
        <div className="modal-heading"><div><p className="eyebrow">{task ? 'MAKE IT BETTER' : 'ONE THING AT A TIME'}</p><h2 id="task-modal-title">{task ? 'Edit task' : 'Create a task'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><Icon name="close" /></button></div>
        <form onSubmit={submit} className="task-form">
          <label>What needs to get done?<input autoFocus maxLength={160} placeholder="e.g. Prepare project proposal" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
          <div className="detail-section">
            <div className="detail-section-heading"><span>Task brief</span><span className="optional">Give the task enough context to get started</span></div>
            <label>Description <span className="optional">What needs to happen?</span><textarea rows="3" maxLength={2000} placeholder="Describe the work, background, or first step…" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <label>Goal &amp; acceptance criteria <span className="optional">What does done look like?</span><textarea rows="3" maxLength={2000} placeholder="List the outcome or conditions that mean this task is complete…" value={form.goals} onChange={(event) => setForm({ ...form, goals: event.target.value })} /></label>
          </div>
          <div className="detail-section">
            <div className="detail-section-heading"><span>Resources &amp; notes</span><span className="optional">Keep the useful details close</span></div>
            <label>Notes <span className="optional">Private context for this task</span><textarea rows="3" maxLength={3000} placeholder="Decisions, reminders, people to contact…" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
            <div className="resource-editor">
              {form.links.map((link, index) => (
                <div className="resource-input-row" key={link.draftId}>
                  <label>Resource name<input aria-label={`Resource name ${index + 1}`} maxLength={80} placeholder="Design brief" value={link.title} onChange={(event) => setForm({ ...form, links: form.links.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) })} /></label>
                  <label>URL<input aria-label={`Resource URL ${index + 1}`} type="url" maxLength={2048} placeholder="https://…" value={link.url} onChange={(event) => setForm({ ...form, links: form.links.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item) })} /></label>
                  <button type="button" className="remove-subtask" onClick={() => setForm({ ...form, links: form.links.filter((_, itemIndex) => itemIndex !== index) })} aria-label={`Remove resource ${index + 1}`}>×</button>
                </div>
              ))}
              {form.links.length < 10 && <button type="button" className="add-subtask" onClick={() => setForm({ ...form, links: [...form.links, { title: '', url: '', draftId: `${Date.now()}-${Math.random()}` }] })}><Icon name="plus" size={14} />Add a resource link</button>}
            </div>
          </div>
          <div className="form-columns">
            <label>Project <span className="optional">Optional</span><input maxLength={80} placeholder="e.g. Website redesign" value={form.project} onChange={(event) => setForm({ ...form, project: event.target.value })} /></label>
            <label>Labels <span className="optional">Separate with commas</span><input maxLength={310} placeholder="design, review, launch" value={form.labels} onChange={(event) => setForm({ ...form, labels: event.target.value })} /></label>
          </div>
          <label>Estimated time <span className="optional">Optional · minutes</span><input type="number" min="1" max="10080" step="1" placeholder="e.g. 45" value={form.estimateMinutes} onChange={(event) => setForm({ ...form, estimateMinutes: event.target.value })} /></label>
          <div className="subtask-editor">
            <div className="subtask-editor-heading"><span>Subtasks</span><span className="optional">{form.subtasks.filter((subtask) => subtask.completed).length}/{form.subtasks.length} complete</span></div>
            {form.subtasks.map((subtask, index) => (
              <div className="subtask-input-row" key={subtask.draftId}>
                <input aria-label={`Complete subtask ${index + 1}`} type="checkbox" checked={subtask.completed} onChange={(event) => setForm({ ...form, subtasks: form.subtasks.map((item, itemIndex) => itemIndex === index ? { ...item, completed: event.target.checked } : item) })} />
                <input aria-label={`Subtask ${index + 1}`} maxLength={160} placeholder="Add a step…" value={subtask.title} onChange={(event) => setForm({ ...form, subtasks: form.subtasks.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) })} />
                <button type="button" className="remove-subtask" onClick={() => setForm({ ...form, subtasks: form.subtasks.filter((_, itemIndex) => itemIndex !== index) })} aria-label={`Remove subtask ${index + 1}`}>×</button>
              </div>
            ))}
            {form.subtasks.length < 30 && <button type="button" className="add-subtask" onClick={() => setForm({ ...form, subtasks: [...form.subtasks, { title: '', completed: false, draftId: `${Date.now()}-${Math.random()}` }] })}><Icon name="plus" size={14} />Add a subtask</button>}
          </div>
          <div className="form-columns">
            <label>Due date<input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
            <label>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{PRIORITIES.map((priority) => <option value={priority} key={priority}>{priority[0].toUpperCase() + priority.slice(1)}</option>)}</select></label>
          </div>
          <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{STATUSES.map((status) => <option value={status} key={status}>{status === 'todo' ? 'To do' : status === 'in-progress' ? 'In progress' : 'Completed'}</option>)}</select></label>
          {error && <p className="notice error-notice" role="alert">{error}</p>}
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? 'Saving…' : task ? 'Save changes' : 'Create task'}<Icon name="chevron" /></button></div>
        </form>
      </section>
    </div>
  );
}

function TaskRow({ task, onToggle, onEdit, onDelete }) {
  const due = task.dueDate ? dateKey(task.dueDate) : '';
  const today = dateKey(new Date());
  const overdue = due && due < today && task.status !== 'completed';
  return (
    <article className={`task-row ${task.status === 'completed' ? 'task-is-done' : ''}`}>
      <button className={`task-check ${task.status === 'completed' ? 'checked' : ''}`} onClick={() => onToggle(task)} aria-label={task.status === 'completed' ? `Reopen ${task.title}` : `Complete ${task.title}`}>
        {task.status === 'completed' && <Icon name="check" size={14} />}
      </button>
      <div className="task-content">
        <button className="task-title" onClick={() => onEdit(task)}>{task.title}</button>
        {task.description && <p className="task-description">{task.description}</p>}
        {task.goals && <p className="task-goals"><strong>Done means</strong>{task.goals}</p>}
        {task.notes && <details className="task-notes"><summary>Notes</summary><p>{task.notes}</p></details>}
        {(task.project || task.labels?.length || task.subtasks?.length > 0 || task.estimateMinutes || task.links?.length) && <TaskDetailsMeta task={task} />}
        {task.links?.length > 0 && <TaskResourceLinks links={task.links} />}
        <div className="task-meta">
          <span className={`priority-label priority-${task.priority}`}><i />{task.priority} priority</span>
          {task.status === 'in-progress' && <span className="status-label"><i />In progress</span>}
          {due && <span className={`due-label ${overdue ? 'overdue' : ''}`}><Icon name="calendar" size={14} />{overdue ? 'Overdue · ' : ''}{formatDate(due)}</span>}
        </div>
      </div>
      <TaskMenu task={task} onEdit={onEdit} onDelete={onDelete} />
    </article>
  );
}

function TaskDetailsMeta({ task }) {
  return (
    <div className="task-details-meta">
      {task.project && <span className="project-chip">▦ {task.project}</span>}
      {task.labels?.map((label) => <span className="label-chip" key={label}>{label}</span>)}
      {task.subtasks?.length > 0 && <span className="subtask-progress">{task.subtasks.filter((subtask) => subtask.completed).length}/{task.subtasks.length} steps</span>}
      {task.estimateMinutes && <span className="estimate-chip">◷ {formatEstimate(task.estimateMinutes)}</span>}
      {task.links?.length > 0 && <span className="estimate-chip">↗ {task.links.length} {task.links.length === 1 ? 'resource' : 'resources'}</span>}
    </div>
  );
}

function TaskResourceLinks({ links }) {
  return (
    <ul className="task-resource-links" aria-label="Task resources">
      {links.map((link) => (
        <li key={link._id || link.url}><a href={link.url} target="_blank" rel="noreferrer">{link.title || link.url}<Icon name="chevron" size={13} /></a></li>
      ))}
    </ul>
  );
}

function TaskBoard({ tasks, onToggle, onEdit, onDelete }) {
  const columns = [
    { id: 'todo', title: 'To do', hint: 'Ready when you are' },
    { id: 'in-progress', title: 'In progress', hint: 'Currently moving' },
    { id: 'completed', title: 'Completed', hint: 'Look at you go' },
  ];

  return (
    <div className="task-board">
      {columns.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.id);
        return (
          <section className={`board-column column-${column.id}`} key={column.id} aria-label={`${column.title} tasks`}>
            <header className="board-column-heading">
              <div><span className={`column-dot dot-${column.id}`} /><h3>{column.title}</h3></div>
              <span className="column-count">{columnTasks.length}</span>
            </header>
            <p className="board-column-hint">{column.hint}</p>
            <div className="board-column-list">
              {columnTasks.map((task) => (
                <article className={`board-task ${task.status === 'completed' ? 'task-is-done' : ''}`} key={task._id}>
                  <div className="board-task-top">
                    <span className={`priority-label priority-${task.priority}`}><i />{task.priority}</span>
                    <TaskMenu task={task} onEdit={onEdit} onDelete={onDelete} />
                  </div>
                  <button className="board-task-title" onClick={() => onEdit(task)}>{task.title}</button>
                  {task.description && <p className="board-task-description">{task.description}</p>}
                  {task.goals && <p className="board-task-goal"><strong>Done means</strong>{task.goals}</p>}
                  {task.notes && <details className="task-notes board-task-notes"><summary>Notes</summary><p>{task.notes}</p></details>}
                  {(task.project || task.labels?.length || task.estimateMinutes || task.links?.length) && <TaskDetailsMeta task={task} />}
                  {task.links?.length > 0 && <TaskResourceLinks links={task.links} />}
                  {task.subtasks?.length > 0 && <div className="board-subtask-progress"><span style={{ width: `${Math.round((task.subtasks.filter((subtask) => subtask.completed).length / task.subtasks.length) * 100)}%` }} /></div>}
                  <footer className="board-task-footer">
                    {task.dueDate
                      ? <span className={`due-label ${dateKey(task.dueDate) < dateKey(new Date()) && task.status !== 'completed' ? 'overdue' : ''}`}><Icon name="calendar" size={14} />{formatDate(task.dueDate)}</span>
                      : <span className="no-due-date">No due date</span>}
                    <button className={`task-check ${task.status === 'completed' ? 'checked' : ''}`} onClick={() => onToggle(task)} aria-label={task.status === 'completed' ? `Reopen ${task.title}` : `Complete ${task.title}`}>
                      {task.status === 'completed' && <Icon name="check" size={14} />}
                    </button>
                  </footer>
                </article>
              ))}
              {columnTasks.length === 0 && <div className="board-column-empty">No tasks here yet</div>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TaskMenu({ task, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="task-menu-wrap">
      <button className="icon-button task-menu-trigger" aria-label={`Options for ${task.title}`} onClick={() => setMenuOpen(!menuOpen)}><Icon name="more" /></button>
      {menuOpen && <><button className="menu-dismiss" aria-label="Close menu" onClick={() => setMenuOpen(false)} /><div className="task-menu"><button onClick={() => { setMenuOpen(false); onEdit(task); }}>Edit task</button><button className="delete-action" onClick={() => { setMenuOpen(false); onDelete(task); }}>Delete task</button></div></>}
    </div>
  );
}

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [activeView, setActiveView] = useState('all');
  const [layout, setLayout] = useState('list');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('');
  const [labelFilter, setLabelFilter] = useState('');
  const [query, setQuery] = useState('');
  const [modalTask, setModalTask] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!getToken()) {
      setAuthReady(true);
      return;
    }
    api.me().then(setUser).catch(() => setToken(null)).finally(() => setAuthReady(true));
  }, []);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setTasks(await api.listTasks());
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    function handleShortcuts(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (event.key === 'Escape' && modalTask !== undefined) {
        setModalTask(undefined);
        return;
      }
      const target = event.target;
      const isTyping = target instanceof HTMLElement
        && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);
      if (!event.ctrlKey && !event.metaKey && !event.altKey && !isTyping && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setModalTask(null);
      }
    }
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [modalTask]);

  const todayKey = dateKey(new Date());
  const projects = useMemo(() => [...new Set(tasks.map((task) => task.project?.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [tasks]);
  const labels = useMemo(() => [...new Set(tasks.flatMap((task) => task.labels || []))].sort((a, b) => a.localeCompare(b)), [tasks]);
  const counts = useMemo(() => ({
    all: tasks.length,
    today: tasks.filter((task) => task.dueDate && dateKey(task.dueDate) === todayKey && task.status !== 'completed').length,
    upcoming: tasks.filter((task) => task.dueDate && dateKey(task.dueDate) > todayKey && task.status !== 'completed').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
  }), [tasks, todayKey]);

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const searchableDetails = [
      task.title,
      task.description,
      task.goals,
      task.notes,
      task.project,
      ...(task.labels || []),
      ...(task.links || []).flatMap((link) => [link.title, link.url]),
    ].filter(Boolean).join(' ').toLocaleLowerCase();
    if (normalizedQuery && !searchableDetails.includes(normalizedQuery)) return false;
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
    if (projectFilter && task.project !== projectFilter) return false;
    if (labelFilter && !task.labels?.includes(labelFilter)) return false;
    if (activeView === 'today') return task.dueDate && dateKey(task.dueDate) === todayKey && task.status !== 'completed';
    if (activeView === 'upcoming') return task.dueDate && dateKey(task.dueDate) > todayKey && task.status !== 'completed';
    if (activeView === 'completed') return task.status === 'completed';
    return true;
  }), [tasks, activeView, todayKey, query, priorityFilter, projectFilter, labelFilter]);

  async function saveTask(data) {
    if (modalTask) await api.updateTask(modalTask._id, data);
    else await api.createTask(data);
    setModalTask(undefined);
    setNotice(modalTask ? 'Your task was updated.' : 'A new task is on your list.');
    await loadTasks();
  }

  async function toggleTask(task) {
    try {
      await api.updateTask(task._id, { status: task.status === 'completed' ? 'todo' : 'completed' });
      await loadTasks();
      setNotice(task.status === 'completed' ? 'Task moved back to your list.' : 'Nicely done — task completed.');
    } catch (toggleError) {
      setError(toggleError.message);
    }
  }

  async function deleteTask(task) {
    if (!window.confirm(`Delete "${task.title}"? This can’t be undone.`)) return;
    try {
      await api.deleteTask(task._id);
      await loadTasks();
      setNotice('Task deleted.');
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  function signOut() {
    setToken(null);
    setUser(null);
    setTasks([]);
  }

  if (!authReady) return <main className="loading-screen"><span className="brand-mark">t.</span><p>Getting your space ready…</p></main>;
  if (!user) return <AuthScreen onAuth={setUser} />;

  const heading = projectFilter || NAVIGATION.find((item) => item.id === activeView)?.label || 'All tasks';
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  const firstName = user.name?.trim().split(/\s+/)[0] || 'there';

  return (
    <main className="app-layout">
      <aside className="sidebar">
        <a className="brand-lockup" href="#" aria-label="Taskflow home"><span className="brand-mark">t.</span><span>taskflow</span></a>
        <button className="primary-button sidebar-add" onClick={() => setModalTask(null)}><Icon name="plus" />New task <span className="shortcut">N</span></button>
        <p className="nav-caption">WORKSPACE</p>
        <nav className="side-nav" aria-label="Task views">
          {NAVIGATION.map((item) => <button className={`nav-item ${activeView === item.id && !projectFilter ? 'active' : ''}`} key={item.id} onClick={() => { setActiveView(item.id); setProjectFilter(''); }}><span className="nav-icon">{item.icon}</span><span>{item.label}</span><span className="nav-count">{counts[item.id] || ''}</span></button>)}
        </nav>
        {projects.length > 0 && <><p className="nav-caption projects-caption">PROJECTS</p><nav className="project-nav" aria-label="Projects">{projects.map((project) => <button key={project} className={`nav-item project-nav-item ${projectFilter === project ? 'active' : ''}`} onClick={() => { setProjectFilter(project); setActiveView('all'); }}><span className="project-nav-dot" /><span>{project}</span><span className="nav-count">{tasks.filter((task) => task.project === project && task.status !== 'completed').length || ''}</span></button>)}</nav></>}
        <div className="sidebar-bottom">
          <div className="focus-card"><span className="focus-star">✳</span><strong>Make space to focus</strong><p>Progress happens one task at a time.</p><div className="focus-progress"><span style={{ width: `${tasks.length ? Math.round((counts.completed / tasks.length) * 100) : 0}%` }} /></div><span className="focus-progress-label">{counts.completed} of {tasks.length} tasks complete</span></div>
          <div className="profile-row"><span className="avatar">{firstName.charAt(0).toUpperCase()}</span><div className="profile-text"><strong>{user.name}</strong><span>{user.email}</span></div><button className="icon-button sign-out" onClick={signOut} aria-label="Sign out" title="Sign out"><Icon name="logout" /></button></div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar"><span className="date-label">{dateLabel}</span><div className="topbar-right"><span className="online-indicator" />Your personal workspace</div></header>
        <div className="content-area">
          <div className="welcome-row"><div><p className="eyebrow">{activeView === 'today' ? 'A FRESH START' : 'YOUR SPACE, YOUR PACE'}</p><h1>{activeView === 'all' ? <>Good to see you, {firstName}<span className="wave">✳</span></> : heading}</h1><p className="welcome-subtitle">{activeView === 'all' ? 'A little progress each day adds up to big results.' : activeView === 'today' ? 'Here’s what deserves your attention today.' : activeView === 'upcoming' ? 'A look at what’s coming up next.' : 'Look at everything you’ve accomplished.'}</p></div><button className="primary-button create-top" onClick={() => setModalTask(null)}><Icon name="plus" />Add a task</button></div>

          <section className="summary-grid" aria-label="Task summary">
            <article className="summary-card"><div className="summary-top"><span>On your list</span><span className="summary-symbol purple">▦</span></div><strong>{tasks.filter((task) => task.status !== 'completed').length.toString().padStart(2, '0')}</strong><span className="summary-foot">ready when you are</span></article>
            <article className="summary-card"><div className="summary-top"><span>Due today</span><span className="summary-symbol orange">◷</span></div><strong>{counts.today.toString().padStart(2, '0')}</strong><span className="summary-foot">{counts.today ? 'take them one at a time' : 'enjoy the breathing room'}</span></article>
            <article className="summary-card"><div className="summary-top"><span>Completed</span><span className="summary-symbol green"><Icon name="check" size={16} /></span></div><strong>{counts.completed.toString().padStart(2, '0')}</strong><span className="summary-foot">and counting ✨</span></article>
          </section>

          <section className="tasks-section">
            <div className="section-heading">
              <div className="section-title"><h2>{heading}</h2><span>{visibleTasks.length} {visibleTasks.length === 1 ? 'task' : 'tasks'}</span></div>
              <div className="task-toolbar">
                <label className="priority-filter"><span className="sr-only">Filter by priority</span><select aria-label="Filter by priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="all">All priorities</option>{PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority[0].toUpperCase() + priority.slice(1)} priority</option>)}</select></label>
                <label className="project-filter"><span className="sr-only">Filter by label</span><select aria-label="Filter by label" value={labelFilter} onChange={(event) => setLabelFilter(event.target.value)}><option value="">All labels</option>{labels.map((label) => <option value={label} key={label}>{label}</option>)}</select></label>
                <label className="search-box"><Icon name="search" size={17} /><input ref={searchInputRef} aria-label="Search tasks" placeholder="Find a task..." value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>Ctrl K</kbd></label>
                <div className="view-switch" role="group" aria-label="Task layout">
                  <button className={layout === 'list' ? 'selected' : ''} onClick={() => setLayout('list')} aria-pressed={layout === 'list'} title="List view"><span aria-hidden="true">☷</span><span className="sr-only">List view</span></button>
                  <button className={layout === 'board' ? 'selected' : ''} onClick={() => setLayout('board')} aria-pressed={layout === 'board'} title="Board view"><span aria-hidden="true">▦</span><span className="sr-only">Board view</span></button>
                </div>
              </div>
            </div>
            {error && <p className="notice error-notice" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><Icon name="close" size={14} /></button></p>}
            {loading && tasks.length === 0 ? <div className="task-placeholder">Gathering your tasks…</div> : visibleTasks.length ? layout === 'board' ? <TaskBoard tasks={visibleTasks} onToggle={toggleTask} onEdit={(selected) => setModalTask(selected)} onDelete={deleteTask} /> : <div className="task-list">{visibleTasks.map((task) => <TaskRow key={task._id} task={task} onToggle={toggleTask} onEdit={(selected) => setModalTask(selected)} onDelete={deleteTask} />)}</div> : <div className="empty-state"><span className="empty-illustration">{activeView === 'completed' ? '✳' : '✓'}</span><h3>{query || priorityFilter !== 'all' ? 'No matching tasks' : activeView === 'completed' ? 'Your wins will show up here' : activeView === 'today' ? 'Nothing due today' : activeView === 'upcoming' ? 'Nothing planned ahead' : 'A little room to breathe'}</h3><p>{query || priorityFilter !== 'all' ? 'Adjust your search or priority filter and try again.' : activeView === 'completed' ? 'Complete a task and take a moment to celebrate.' : 'Add a task whenever something comes to mind.'}</p>{!query && priorityFilter === 'all' && activeView !== 'completed' && <button className="secondary-button" onClick={() => setModalTask(null)}><Icon name="plus" size={16} />Create your first task</button>}</div>}
          </section>
          <footer className="page-footer"><span>Built for progress, not perfection.</span><span>Take it one task at a time <span className="footer-spark">✳</span></span></footer>
        </div>
      </section>
      {modalTask !== undefined && <TaskForm key={modalTask?._id || 'new'} task={modalTask} onClose={() => setModalTask(undefined)} onSave={saveTask} />}
      {notice && <div className="toast"><span><Icon name="check" size={15} /></span>{notice}</div>}
    </main>
  );
}
