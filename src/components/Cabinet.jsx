import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api.js';
import { useToast } from './Toaster.jsx';
import { Reveal, WordReveal } from './Reveal.jsx';

function isOverdue(t) {
  if (!t.dueDate || t.status === 'done') return false;
  return new Date(t.dueDate + 'T23:59:59') < new Date();
}

const OverdueTag = () => (
  <span className="mono" style={{ fontSize: '0.56rem', color: 'var(--red)', border: '1px solid var(--red)', padding: '1px 6px', letterSpacing: '0.12em', marginLeft: 8 }}>
    OVERDUE
  </span>
);

/* ---------- auth screens ---------- */
function Bootstrap({ onDone }) {
  const [msg, setMsg] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    try {
      const me = await api.cabinetBootstrap({
        name: e.target.name.value.trim(),
        username: e.target.user.value.trim().toLowerCase(),
        password: e.target.pass.value,
      });
      setMsg({ type: 'ok', text: '> president account created. signing you in…' });
      setTimeout(() => onDone(me), 500);
    } catch (err) {
      setMsg({ type: 'err', text: `> ${err.message.toLowerCase()}` });
    }
  };
  return (
    <div className="panel brackets" style={{ maxWidth: 460, margin: '0 auto' }}>
      <i /><i /><i /><i />
      <h3 style={{ textTransform: 'uppercase', marginBottom: 8 }}>Set up the president account</h3>
      <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: 20 }}>
        Nobody's signed in yet, so this one's first. Once created you can add the rest of the cabinet from your dashboard.
      </p>
      <form onSubmit={submit}>
        <div className="field"><label>Full name</label><input name="name" required placeholder="Grace Hopper" /></div>
        <div className="field"><label>Username</label><input name="user" required placeholder="ghopper" /></div>
        <div className="field"><label>Password</label><input name="pass" type="password" autoComplete="new-password" minLength={8} required /></div>
        <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }}>Create president</button>
      </form>
      {msg && <div className={`form-msg ${msg.type}`}>{msg.text}</div>}
      <p className="mono" style={{ fontSize: '0.66rem', color: 'var(--muted)', marginTop: 14 }}>
        8+ characters, and please don't reuse a password from anywhere else.
      </p>
    </div>
  );
}

function Login({ onLogin, onNeedsPassword }) {
  const [msg, setMsg] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    try {
      const data = await api.cabinetLogin({
        username: e.target.user.value.trim().toLowerCase(),
        password: e.target.pass.value,
      });
      if (data.mustSetPassword) onNeedsPassword(data.me);
      else onLogin(data.me);
    } catch (err) {
      setMsg({ type: 'err', text: `> ${err.message.toLowerCase()}` });
    }
  };
  return (
    <div className="panel brackets" style={{ maxWidth: 460, margin: '0 auto' }}>
      <i /><i /><i /><i />
      <h3 style={{ textTransform: 'uppercase', marginBottom: 20 }}>Cabinet sign in</h3>
      <form onSubmit={submit}>
        <div className="field"><label>Username</label><input name="user" autoComplete="username" required /></div>
        <div className="field"><label>Password</label><input name="pass" type="password" autoComplete="current-password" required /></div>
        <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }}>Sign in</button>
      </form>
      {msg && <div className={`form-msg ${msg.type}`}>{msg.text}</div>}
      <p className="mono" style={{ fontSize: '0.66rem', color: 'var(--muted)', marginTop: 14 }}>
        Not on the cabinet yet? Ask your president for a username. New accounts start on password 1234.
      </p>
    </div>
  );
}

function SetPassword({ member, onDone }) {
  const [msg, setMsg] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    const p1 = e.target.p1.value;
    const p2 = e.target.p2.value;
    if (p1 !== p2) { setMsg({ type: 'err', text: "> passwords don't match." }); return; }
    try {
      const data = await api.cabinetSetPassword(p1);
      setMsg({ type: 'ok', text: '> password set. loading your dashboard…' });
      setTimeout(() => onDone(data.me), 500);
    } catch (err) {
      setMsg({ type: 'err', text: `> ${err.message.toLowerCase()}` });
    }
  };
  return (
    <div className="panel brackets" style={{ maxWidth: 460, margin: '0 auto' }}>
      <i /><i /><i /><i />
      <h3 style={{ textTransform: 'uppercase', marginBottom: 8 }}>Hey {member.name} — pick a real password</h3>
      <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: 20 }}>You're still on the default one. Set your own and you're in.</p>
      <form onSubmit={submit}>
        <div className="field"><label>New password</label><input name="p1" type="password" autoComplete="new-password" minLength={8} required /></div>
        <div className="field"><label>Confirm password</label><input name="p2" type="password" autoComplete="new-password" minLength={8} required /></div>
        <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }}>Set password</button>
      </form>
      {msg && <div className={`form-msg ${msg.type}`}>{msg.text}</div>}
    </div>
  );
}

/* ---------- member board ---------- */
function MemberBoard({ user, tasks, reload }) {
  const toast = useToast();
  const mine = tasks.filter((t) => t.assignedTo === user.username);
  const cols = [['todo', 'To Do'], ['in-progress', 'In Progress'], ['done', 'Done']];

  const setStatus = async (id, status) => {
    try {
      await api.setTaskStatus(id, status);
      toast(status === 'done' ? 'Nice work — task marked done' : 'Task updated');
      reload();
    } catch (err) {
      toast(err.message, 'err');
    }
  };

  return (
    <div className="panel">
      <div className="panel-title">My tasks <span className="tag">{mine.length} assigned</span></div>
      {mine.length === 0 ? (
        <div className="empty">no tasks assigned yet — check back after the next cabinet meeting.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {cols.map(([key, label]) => {
            const colTasks = mine.filter((t) => t.status === key);
            return (
              <div key={key} style={{ background: 'var(--bg-2)', padding: 14 }}>
                <div className="mono" style={{ fontSize: '0.64rem', letterSpacing: '0.14em', color: 'var(--muted)', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
                  {label.toUpperCase()} <span style={{ color: 'var(--green)' }}>{colTasks.length}</span>
                </div>
                {colTasks.length === 0 && <div className="empty" style={{ padding: '16px 8px' }}>empty</div>}
                {colTasks.map((t) => (
                  <motion.div
                    key={t.id}
                    layout
                    style={{
                      background: 'var(--bg-1)', padding: 14, marginBottom: 12,
                      borderLeft: `2px solid ${t.status === 'done' ? 'var(--green)' : isOverdue(t) ? 'var(--red)' : 'var(--cyan)'}`,
                      border: '1px solid var(--line)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: 5 }}>
                      {t.title}{isOverdue(t) && <OverdueTag />}
                    </div>
                    {t.description && <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 10 }}>{t.description}</div>}
                    <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--muted)', marginBottom: 10 }}>
                      <span>{t.priority} priority</span>
                      <span>{t.dueDate ? new Date(t.dueDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'no due date'}</span>
                    </div>
                    <div className="mono" style={{ fontSize: '0.62rem', color: 'var(--muted)', marginBottom: 10 }}>from {t.assignedBy}</div>
                    <select
                      value={t.status}
                      onChange={(e) => setStatus(t.id, e.target.value)}
                      style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '7px 8px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}
                    >
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </motion.div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- president dashboard ---------- */
function PresidentDash({ user, members, tasks, events, reload }) {
  const toast = useToast();
  const [editEventId, setEditEventId] = useState(null);
  const [eventForm, setEventForm] = useState({ name: '', date: '', tag: '', description: '' });

  const done = tasks.filter((t) => t.status === 'done').length;
  const inprog = tasks.filter((t) => t.status === 'in-progress').length;
  const overdue = tasks.filter(isOverdue).length;

  const completionCounts = {};
  members.forEach((m) => { completionCounts[m.username] = 0; });
  tasks.filter((t) => t.status === 'done').forEach((t) => { completionCounts[t.assignedTo] = (completionCounts[t.assignedTo] || 0) + 1; });
  const maxCompleted = Math.max(1, ...Object.values(completionCounts));

  const assignTask = async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      await api.createTask({
        title: f.title.value.trim(),
        description: f.desc.value.trim(),
        assignedTo: f.assignee.value,
        dueDate: f.due.value,
        priority: f.priority.value,
      });
      toast('Task assigned');
      f.reset();
      reload();
    } catch (err) {
      toast(err.message, 'err');
    }
  };

  const addMember = async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      await api.addMember({
        name: f.name.value.trim(),
        position: f.position.value.trim(),
        username: f.user.value.trim().toLowerCase(),
      });
      toast('Member added — they log in with password 1234');
      f.reset();
      reload();
    } catch (err) {
      toast(err.message, 'err');
    }
  };

  const removeMember = async (id) => {
    try {
      await api.removeMember(id);
      reload();
    } catch (err) {
      toast(err.message, 'err');
    }
  };

  const deleteTask = async (id) => {
    try {
      await api.deleteTask(id);
      reload();
    } catch (err) {
      toast(err.message, 'err');
    }
  };

  const saveEvent = async (e) => {
    e.preventDefault();
    try {
      await api.saveEvent(editEventId ? { id: editEventId, ...eventForm } : eventForm);
      toast(editEventId ? 'Event updated' : "Event posted! It's live on the public page");
      setEditEventId(null);
      setEventForm({ name: '', date: '', tag: '', description: '' });
      reload();
    } catch (err) {
      toast(err.message, 'err');
    }
  };

  const deleteEvent = async (id) => {
    try {
      await api.deleteEvent(id);
      reload();
    } catch (err) {
      toast(err.message, 'err');
    }
  };

  const nameFor = (username) => (members.find((m) => m.username === username) || {}).name || username;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      {/* stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        {[[members.length, 'Cabinet members'], [tasks.length, 'Total tasks'], [inprog, 'In progress'], [overdue, 'Overdue', overdue > 0]].map(([n, l, warn]) => (
          <div key={l} className="panel" style={{ padding: 18 }}>
            <div className="mono" style={{ fontSize: '1.7rem', fontWeight: 700, color: warn ? 'var(--red)' : 'var(--green)' }}>{n}</div>
            <div className="mono" style={{ fontSize: '0.6rem', letterSpacing: '0.16em', color: 'var(--muted)', textTransform: 'uppercase' }}>{l}</div>
          </div>
        ))}
      </div>

      {/* assign */}
      <div className="panel brackets">
        <i /><i /><i /><i />
        <div className="panel-title">Assign a task <span className="tag">assign_task()</span></div>
        <form onSubmit={assignTask}>
          <div className="form-grid">
            <div className="field"><label>Title</label><input name="title" required placeholder="Book the room for hack night" /></div>
            <div className="field">
              <label>Assign to</label>
              <select name="assignee" required defaultValue="">
                <option value="" disabled>Select cabinet member…</option>
                {members.filter((m) => m.id !== user.id).map((m) => (
                  <option key={m.id} value={m.username}>{m.name} — {m.position || 'Cabinet'}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field"><label>Description</label><textarea name="desc" placeholder="Details, deadline context, links…" /></div>
          <div className="form-grid">
            <div className="field"><label>Due date</label><input name="due" type="date" /></div>
            <div className="field">
              <label>Priority</label>
              <select name="priority" defaultValue="med">
                <option value="low">Low</option>
                <option value="med">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <button className="btn primary" disabled={members.length <= 1}>Assign task</button>
          {members.length <= 1 && (
            <p className="mono" style={{ fontSize: '0.66rem', color: 'var(--muted)', marginTop: 12 }}>
              Add at least one cabinet member below before assigning tasks.
            </p>
          )}
        </form>
      </div>

      {/* team leaderboard */}
      <div className="panel">
        <div className="panel-title">Team leaderboard <span className="tag">tasks completed</span></div>
        {members.map((m) => {
          const c = completionCounts[m.username] || 0;
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, fontSize: '0.85rem' }}>
              <span style={{ width: 130, flexShrink: 0 }}>{m.name}</span>
              <div style={{ flex: 1, height: 6, background: 'var(--bg-2)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(c / maxCompleted) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  style={{ height: '100%', background: 'var(--grad-circuit)' }}
                />
              </div>
              <span className="mono" style={{ width: 26, textAlign: 'right', color: 'var(--muted)', fontSize: '0.74rem' }}>{c}</span>
            </div>
          );
        })}
      </div>

      {/* roster */}
      <div className="panel">
        <div className="panel-title">Cabinet roster <span className="tag">{members.length} member(s)</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data" style={{ marginBottom: 22 }}>
            <thead><tr><th>Name</th><th>Username</th><th>Position</th><th>Status</th><th /></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td className="mono">{m.username}</td>
                  <td>{m.position || '—'}</td>
                  <td className="mono" style={{ color: m.mustSetPassword ? 'var(--amber)' : 'var(--green)', fontSize: '0.72rem' }}>
                    {m.mustSetPassword ? 'awaiting first login' : m.role === 'president' ? 'president' : 'active'}
                  </td>
                  <td>{m.id !== user.id && <button className="btn danger sm" onClick={() => removeMember(m.id)}>remove</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: 14 }}>Add a cabinet member</h4>
        <form onSubmit={addMember}>
          <div className="form-grid">
            <div className="field"><label>Name</label><input name="name" required /></div>
            <div className="field"><label>Position</label><input name="position" required placeholder="VP of Events" /></div>
          </div>
          <div className="field"><label>Username</label><input name="user" required placeholder="whatever they'll log in with" /></div>
          <button className="btn ghost brackets"><i /><i /><i /><i />Add member</button>
          <p className="mono" style={{ fontSize: '0.66rem', color: 'var(--muted)', marginTop: 12 }}>
            New members log in with the default password 1234 and set their own on first sign-in.
          </p>
        </form>
      </div>

      {/* all tasks */}
      <div className="panel">
        <div className="panel-title">All tasks <span className="tag">org-wide view</span></div>
        {tasks.length === 0 ? (
          <div className="empty">no tasks assigned yet — use the form above.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data">
              <thead><tr><th>Task</th><th>Assigned to</th><th>Priority</th><th>Due</th><th>Status</th><th /></tr></thead>
              <tbody>
                {tasks.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((t) => (
                  <tr key={t.id}>
                    <td style={{ color: isOverdue(t) ? 'var(--red)' : 'inherit' }}>{t.title}{isOverdue(t) && <OverdueTag />}</td>
                    <td>{nameFor(t.assignedTo)}</td>
                    <td className="mono" style={{ fontSize: '0.74rem' }}>{t.priority}</td>
                    <td className="mono" style={{ fontSize: '0.74rem' }}>{t.dueDate || '—'}</td>
                    <td className="mono" style={{ fontSize: '0.74rem', color: t.status === 'done' ? 'var(--green)' : 'var(--muted)' }}>{t.status}</td>
                    <td><button className="btn danger sm" onClick={() => deleteTask(t.id)}>delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* events manager */}
      <div className="panel">
        <div className="panel-title">"What's coming up" <span className="tag">public events feed</span></div>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 18 }}>
          Whatever you post here shows up live in the public Events section — no redeploy needed.
        </p>
        <form onSubmit={saveEvent}>
          <div className="form-grid">
            <div className="field"><label>Event name</label><input required value={eventForm.name} onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })} placeholder="Hack Night: Build a Bot in 3 Hours" /></div>
            <div className="field"><label>Date</label><input required type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} /></div>
          </div>
          <div className="form-grid">
            <div className="field"><label>Tag</label><input value={eventForm.tag} onChange={(e) => setEventForm({ ...eventForm, tag: e.target.value })} placeholder="social / build / careers / talk" /></div>
            <div className="field"><label>Description</label><input value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} placeholder="One line about the event" /></div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn primary">{editEventId ? 'Update event' : 'Post event'}</button>
            {editEventId && (
              <button type="button" className="btn ghost" onClick={() => { setEditEventId(null); setEventForm({ name: '', date: '', tag: '', description: '' }); }}>
                cancel edit
              </button>
            )}
          </div>
        </form>
        {events.length > 0 && (
          <div style={{ marginTop: 22, overflowX: 'auto' }}>
            <table className="data">
              <thead><tr><th>Event</th><th>Date</th><th>Tag</th><th /></tr></thead>
              <tbody>
                {events.slice().sort((a, b) => new Date(a.date) - new Date(b.date)).map((ev) => (
                  <tr key={ev.id}>
                    <td>{ev.name}</td>
                    <td className="mono" style={{ fontSize: '0.74rem' }}>{ev.date || '—'}</td>
                    <td>{ev.tag || '—'}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn ghost sm" onClick={() => { setEditEventId(ev.id); setEventForm({ name: ev.name || '', date: ev.date || '', tag: ev.tag || '', description: ev.description || '' }); }}>edit</button>
                      <button className="btn danger sm" onClick={() => deleteEvent(ev.id)}>delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- root section ---------- */
export default function Cabinet() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [needsPassword, setNeedsPassword] = useState(null);
  const [cabinetExists, setCabinetExists] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);

  /* Only an authenticated officer can pull cabinet data — the server decides
     what this account is allowed to see (officers get only their own tasks). */
  const reload = useCallback(async () => {
    try {
      const data = await api.cabinetState();
      setUser(data.me);
      setMembers(data.members || []);
      setTasks(data.tasks || []);
      setEvents(data.events || []);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let live = true;
    api.publicData()
      .then((data) => { if (live) setCabinetExists(!!data.cabinetExists); })
      .catch(() => { if (live) setCabinetExists(false); });
    // Resume a signed-in officer session if the tab still holds a valid token.
    reload();
    return () => { live = false; };
  }, [reload]);

  const signOut = () => {
    api.cabinetLogout();
    setUser(null);
    setMembers([]);
    setTasks([]);
    setEvents([]);
  };

  const isPresident = user?.role === 'president';

  return (
    <section id="cabinet" className="block" data-aurora="#ff3b30" style={{ background: 'rgba(10,15,22,0.72)', borderTop: '1px solid var(--line)' }}>
      <div className="container">
        <div className="section-head">
          <Reveal><div className="eyebrow red">Officers only</div></Reveal>
          <WordReveal text="Cabinet dashboard." />
          <Reveal delay={0.15}>
            <p>Sign in to see tasks assigned to you.</p>
          </Reveal>
          <Reveal delay={0.25}>
            <p className="mono" style={{ fontSize: '0.68rem', color: 'var(--green)', marginTop: 14 }}>
              ● SECURED — accounts are hashed and every change is authorised on the server.
            </p>
          </Reveal>
        </div>

        {cabinetExists === null && !user ? (
          <div className="empty">establishing uplink…</div>
        ) : needsPassword ? (
          <SetPassword member={needsPassword} onDone={(m) => { setNeedsPassword(null); setUser(m); reload(); }} />
        ) : !user ? (
          !cabinetExists ? (
            <Reveal><Bootstrap onDone={(m) => { setUser(m); setCabinetExists(true); reload(); }} /></Reveal>
          ) : (
            <Reveal><Login onLogin={(m) => { setUser(m); toast(`Welcome back, ${m.name.split(' ')[0]}`); reload(); }} onNeedsPassword={setNeedsPassword} /></Reveal>
          )
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 30, paddingBottom: 20, borderBottom: '1px solid var(--line)' }}>
              <div>
                <h3 style={{ textTransform: 'uppercase', fontSize: '1.3rem' }}>
                  Welcome, {user.name}
                  <span className="mono" style={{ fontSize: '0.6rem', letterSpacing: '0.14em', color: 'var(--green)', border: '1px solid var(--green)', padding: '3px 9px', marginLeft: 12, verticalAlign: 'middle' }}>
                    {isPresident ? 'PRESIDENT' : (user.position || 'CABINET').toUpperCase()}
                  </span>
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                  {isPresident ? 'Assign tasks and manage your cabinet below.' : "Here's what's on your plate."}
                </p>
              </div>
              <button className="btn ghost sm" onClick={signOut}>Sign out</button>
            </div>
            {isPresident
              ? <PresidentDash user={user} members={members} tasks={tasks} events={events} reload={reload} />
              : <MemberBoard user={user} tasks={tasks} reload={reload} />}
          </div>
        )}
      </div>
    </section>
  );
}
