// src/App.jsx
import { useEffect, useState, useCallback, createContext, useContext } from 'react'
import Papa from 'papaparse'
import { supabase } from './supabase'
import { TRANSLATIONS } from './i18n'
import Support from './support'

const TIERS = [[1700, 0], [1800, 100], [1900, 200], [2000, 300], [2100, 400], [2200, 500]]
const peso = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const todayPH = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })

function workDate(s) {
  if (!s) return null
  s = String(s).trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  return null
}
const num = (v) => parseFloat(String(v ?? '').replace(/[^0-9.-]/g, '')) || 0
const pick = (row, start) => {
  const k = Object.keys(row).find((k) => k.toLowerCase().replace(/[^a-z]/g, '').startsWith(start))
  return k ? row[k] : undefined
}

/* ---------- i18n Context ---------- */
const LangContext = createContext()
const useLang = () => useContext(LangContext)

/* ---------- theme ---------- */
function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])
  return [theme, setTheme]
}

function ThemeToggle({ theme, setTheme }) {
  return (
    <button
      className="icon ghost"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}

function LangToggle({ lang, setLang }) {
  return (
    <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ width: 'auto', padding: '6px 12px', borderRadius: '999px', fontSize: '14px', fontWeight: '600' }}>
      <option value="en">EN</option>
      <option value="tl">TL</option>
      <option value="ceb">CEB</option>
    </select>
  )
}

/* ---------- 24-hour countdown ---------- */
function useCountdown() {
  const calc = () => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    const end = new Date(now)
    end.setHours(24, 0, 0, 0)
    return Math.max(0, Math.floor((end - now) / 1000))
  }
  const [s, setS] = useState(calc)
  useEffect(() => {
    const t = setInterval(() => setS(calc()), 1000)
    return () => clearInterval(t)
  }, [])
  return s
}
const hms = (s) =>
  [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((n) => String(n).padStart(2, '0')).join(':')

/* ---------- admin: 2-hour upload indicator ---------- */
const CYCLE = 2 * 60 * 60

function UploadStatus({ refreshKey }) {
  const [last, setLast] = useState(undefined)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const load = () =>
      supabase.from('upload_log').select('uploaded_at')
        .order('uploaded_at', { ascending: false }).limit(1).maybeSingle()
        .then(({ data }) => setLast(data ? new Date(data.uploaded_at).getTime() : null))
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [refreshKey])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  if (last === undefined) return null
  if (last === null) return (
    <section className="card sync late">
      <div className="sync-row">
        <span className="dot" />
        <div className="sync-text">
          <strong>No upload recorded yet</strong>
          <span className="muted small">Upload a CSV to start the 2-hour cycle.</span>
        </div>
      </div>
    </section>
  )

  const elapsed = Math.max(0, Math.floor((now - last) / 1000))
  const left = CYCLE - elapsed
  const overdue = left < 0
  const state = overdue ? 'late' : left <= 15 * 60 ? 'soon' : 'ok'
  const pct = Math.min(100, (elapsed / CYCLE) * 100)
  const ago = elapsed < 3600 ? `${Math.floor(elapsed / 60)} min ago` : `${Math.floor(elapsed / 3600)}h ${String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')}m ago`
  const at = new Date(last).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })

  return (
    <section className={`card sync ${state}`}>
      <div className="sync-row">
        <span className="dot" />
        <div className="sync-text">
          <strong>{overdue ? 'Upload overdue' : state === 'soon' ? 'Upload due soon' : 'Data is up to date'}</strong>
          <span className="muted small">Last upload {at} ({ago})</span>
        </div>
        <span className="timer sync-timer">{overdue ? `+${hms(-left)} late` : `Next in ${hms(left)}`}</span>
      </div>
      <div className="bar sync-bar"><i style={{ width: pct + '%' }} /></div>
    </section>
  )
}

/* ---------- small shared pieces ---------- */
function Logo() { return <span className="logo" aria-hidden="true">🚕</span> }

function Stat({ icon, label, value }) {
  return (
    <div className="card stat">
      <span className="ico" aria-hidden="true">{icon}</span>
      <div>
        <span className="muted">{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  )
}

/* ---------- app shell ---------- */
export default function App() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [theme, setTheme] = useTheme()
  const [lang, setLang] = useState('en')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return setProfile(null)
    supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => setProfile(data || { missing: true }))
  }, [session])

  if (session === undefined) return <p className="center">Loading…</p>
  if (!session) return <Login theme={theme} setTheme={setTheme} lang={lang} setLang={setLang} />
  if (!profile) return <p className="center">Loading…</p>

  const isAdmin = profile.role === 'admin'

  return (
    <LangContext.Provider value={TRANSLATIONS[lang]}>
      <main className={isAdmin ? 'wrap wide' : 'wrap'}>
        <header className="top">
          <div className="who">
            <Logo />
            <div>
              <h1>{isAdmin ? 'Admin' : profile.full_name || 'Driver'}</h1>
              {profile.sap_profile_id && <span className="muted">ID {profile.sap_profile_id}</span>}
            </div>
          </div>
          <div className="top-right">
            <LangToggle lang={lang} setLang={setLang} />
            <ThemeToggle theme={theme} setTheme={setTheme} />
            <button className="ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
          </div>
        </header>
        {profile.missing
          ? <p className="card">Your account isn't set up yet. Please contact your dispatcher.</p>
          : isAdmin ? <Admin /> : <Driver profile={profile} lang={lang} />}
      </main>
    </LangContext.Provider>
  )
}

function Login({ theme, setTheme, lang, setLang }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setErr(error.message)
    setBusy(false)
  }

  return (
    <main className="wrap login">
      <div className="login-tools">
        <LangToggle lang={lang} setLang={setLang} />
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>
      <section className="login-copy">
        <span className="logo big-logo" aria-hidden="true">🚕</span>
        <h1 className="brand">Earn <span className="accent">Smarter.</span><br />Hit your <span className="accent">quota.</span></h1>
        <p className="muted lead">Sign in to see today's earnings, kilometers and how close you are to the next tier. Powered by NEMINTSCO-GSM</p>
      </section>
      <form className="card login-card" onSubmit={submit}>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {err && <p className="err">{err}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  )
}

/* ---------- driver ---------- */
function Driver({ profile, lang }) {
  const t = useLang()
  const [date, setDate] = useState(todayPH())
  const [rows, setRows] = useState([])
  const [history, setHistory] = useState([])
  const [updated, setUpdated] = useState(null)
  const left = useCountdown()
  const isToday = date === todayPH()

  const load = useCallback(async () => {
    const { data: todayData } = await supabase.from('orders').select('pay,distance')
      .eq('work_date', date).eq('sap_profile_id', profile.sap_profile_id)
    setRows(todayData || [])

    // Fetch history for the last 30 days
    const past30 = new Date(); past30.setDate(past30.getDate() - 30)
    const past30Str = past30.toLocaleDateString('en-CA')
    const { data: histData } = await supabase.from('orders').select('work_date,pay')
      .eq('sap_profile_id', profile.sap_profile_id).gte('work_date', past30Str)
    setHistory(histData || [])

    setUpdated(new Date())
  }, [date, profile.sap_profile_id])

  useEffect(() => {
    load()

    const channel = supabase.channel('driver-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `sap_profile_id=eq.${profile.sap_profile_id}` }, () => {
        load()
      }).subscribe()

    return () => supabase.removeChannel(channel)
  }, [load, profile.sap_profile_id])

  const earn = rows.reduce((s, r) => s + Number(r.pay), 0)
  const km = rows.reduce((s, r) => s + Number(r.distance), 0)
  const idx = TIERS.reduce((a, [min], i) => (earn >= min ? i : a), -1)
  const next = TIERS[idx + 1]
  const basic = idx >= 0 ? TIERS[idx][1] : 0
  const pct = Math.min(100, (earn / 2200) * 100)

  // Streak
  const dailyMap = {}
  history.forEach((h) => { dailyMap[h.work_date] = (dailyMap[h.work_date] || 0) + Number(h.pay) })

  let streak = 0
  const todayObj = new Date()

  for (let i = 0; i < 30; i++) {
    const d = new Date(); d.setDate(todayObj.getDate() - i)
    const dStr = d.toLocaleDateString('en-CA')
    if (dailyMap[dStr] >= 1700) streak++
    else if (i > 0) break
  }

  return (
    <>
      <label className="date">Date<input type="date" value={date} max={todayPH()} onChange={(e) => setDate(e.target.value)} /></label>

      <section className="stats" style={{ marginBottom: 14 }}>
        <Stat icon="🔥" label={t.streak} value={`${streak} ${t.daysHit}`} />
      </section>

      <div className="driver-grid">
        <div className="col">
          <section className="card hero">
            <div className="hero-top">
              <span className="chip">{t.dailyQuest}</span>
              <span className="timer">⏱ {isToday ? hms(left) : t.dayClosed}</span>
            </div>
            <span className="muted">{t.earnings}</span>
            <strong className="big">{peso(earn)}</strong>
            <div className="bar" role="progressbar" aria-valuemin="0" aria-valuemax="2200" aria-valuenow={Math.min(earn, 2200)}>
              <i style={{ width: pct + '%' }} />
            </div>
            <p className="goal">
              {next ? <>Earn <b>{peso(next[0] - earn)}</b> {t.earnMore} {peso(next[1])} {t.basicRate}</>
                : <>{t.topTier}</>}
            </p>
            <p className="reward">
              <span className="coin" aria-hidden="true">₱</span>
              {basic > 0 ? `${t.basicRateNow} ${peso(basic)}` : t.unlockFirst}
            </p>
          </section>
          <section className="stats">
            <Stat icon="📍" label={t.distance} value={`${km.toFixed(1)} km`} />
            <Stat icon="📦" label={t.trips} value={rows.length} />
          </section>
        </div>
        <section className="card tiers-card">
          <h2>{t.tiers}</h2>
          <ul className="tiers">
            {[...TIERS].reverse().map(([min, b]) => {
              const on = earn >= min
              return (
                <li key={min} className={on ? 'on' : ''}>
                  <span>{min === 2200 ? '₱2,200 and above' : peso(min).replace('.00', '')}</span>
                  <span>{b === 500 ? '₱500 basic' : b === 0 ? '₱0' : `${peso(b).replace('.00', '')} basic + ${peso(500 - b).replace('.00', '')} cash advance`}</span>
                </li>
              )
            })}
          </ul>
          <p className="muted small">{t.cashAdvance}</p>
        </section>
      </div>

      <Support lang={lang} />

      <p className="muted small center">{t.lastUpdated} {updated?.toLocaleTimeString()}. {t.recordsUploaded}</p>
    </>
  )
}

/* ---------- admin ---------- */
function Admin() {
  const [tab, setTab] = useState('drivers')
  const [synced, setSynced] = useState(0)
  return (
    <>
      <UploadStatus refreshKey={synced} />
      <nav className="tabs">
        <button className={tab === 'drivers' ? 'primary' : 'ghost'} onClick={() => setTab('drivers')}>All drivers</button>
        <button className={tab === 'upload' ? 'primary' : 'ghost'} onClick={() => setTab('upload')}>Upload CSV</button>
        <button className={tab === 'create' ? 'primary' : 'ghost'} onClick={() => setTab('create')}>New driver</button>
      </nav>
      {tab === 'drivers' && <Drivers />}
      {tab === 'upload' && <Upload onUploaded={() => setSynced((n) => n + 1)} />}
      {tab === 'create' && <CreateDriver />}
    </>
  )
}

function Drivers() {
  const [date, setDate] = useState(todayPH())
  const [orders, setOrders] = useState([])
  const [people, setPeople] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)
  const [beforeCount, setBeforeCount] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState('')
  const [addDriverSap, setAddDriverSap] = useState(null)

  // delete driver
  const [removeFor, setRemoveFor] = useState(null) // { sap, name }
  const [removeData, setRemoveData] = useState(false)
  const [removing, setRemoving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    let all = [], from = 0
    for (;;) {
      const { data } = await supabase.from('orders').select('sap_profile_id,pay,distance')
        .eq('work_date', date).order('order_id').range(from, from + 999)
      all = all.concat(data || [])
      if (!data || data.length < 1000) break
      from += 1000
    }
    const { data: p } = await supabase.from('profiles').select('full_name,sap_profile_id').eq('role', 'driver')
    setOrders(all); setPeople(p || []); setLoading(false)
  }, [date])

  useEffect(() => { load() }, [load])

  const map = new Map(people.map((p) => [p.sap_profile_id, { sap: p.sap_profile_id, name: p.full_name || '—', earn: 0, km: 0, trips: 0 }]))
  orders.forEach((o) => {
    const d = map.get(o.sap_profile_id) || { sap: o.sap_profile_id, name: 'Not registered', earn: 0, km: 0, trips: 0 }
    d.earn += Number(o.pay); d.km += Number(o.distance); d.trips++
    map.set(o.sap_profile_id, d)
  })
  const all = [...map.values()].sort((a, b) => b.earn - a.earn)
  const list = all.filter((d) => (d.name + d.sap).toLowerCase().includes(q.toLowerCase()))
  const basicOf = (e) => TIERS.reduce((b, [min, r]) => (e >= min ? r : b), 0)
  const total = all.reduce((s, d) => s + d.earn, 0)
  const km = all.reduce((s, d) => s + d.km, 0)
  const qualified = all.filter((d) => d.earn >= 1700).length

  const exportCsv = () => {
    const csv = Papa.unparse(list.map((d) => ({ Date: date, 'Sap Profile Id': d.sap, Name: d.name, Trips: d.trips, Km: d.km.toFixed(2), Earnings: d.earn.toFixed(2), 'Basic rate': basicOf(d.earn) })))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `drivers_${date}.csv`; a.click()
  }

  const askBefore = async () => {
    const { count } = await supabase.from('orders').select('order_id', { count: 'exact', head: true }).lt('work_date', date)
    setBeforeCount(count || 0); setConfirm('before')
  }

  const doDelete = async () => {
    setDeleting(true); setNotice('')
    let query = supabase.from('orders').delete({ count: 'exact' })
    query = confirm === 'day' ? query.eq('work_date', date) : query.lt('work_date', date)
    const { error, count } = await query
    setDeleting(false); setConfirm(null)
    if (error) return setNotice('Delete failed: ' + error.message)
    if (!count) return setNotice('Nothing was deleted. Check your permissions.')
    setNotice(`Deleted ${count.toLocaleString()} orders.`)
    load()
  }

  const doRemove = async () => {
    setRemoving(true); setNotice('')
    const { error } = await supabase.rpc('admin_delete_driver', {
      p_sap_profile_id: removeFor.sap,
      p_delete_data: removeData,
    })
    setRemoving(false)
    if (error) { setRemoveFor(null); return setNotice('Could not delete driver: ' + error.message) }
    setNotice(`${removeFor.name} was removed.`)
    setRemoveFor(null); setRemoveData(false)
    load()
  }

  return (
    <>
      <div className="row">
        <label className="date">Date<input type="date" value={date} max={todayPH()} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="date grow">Search<input placeholder="Name or ID" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <button className="ghost" onClick={load}>Refresh</button>
        <button className="ghost" onClick={exportCsv}>Export CSV</button>
      </div>

      {/* Clean up data section */}
      <section className="card danger" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '18px', margin: 0 }}>Clean up data</h2>
            <p className="muted small" style={{ margin: '4px 0 0 0' }}>Delete old orders manually. Note: 60-day auto-cleanup is already active.</p>
          </div>
          <div className="row end" style={{ margin: 0 }}>
            <button className="del" disabled={!orders.length} onClick={() => setConfirm('day')}>
              Delete {date} ({orders.length.toLocaleString()} orders)
            </button>
            <button className="del ghost-del" onClick={askBefore}>Delete before {date}</button>
          </div>
        </div>
      </section>

      <section className="stats four">
        <Stat icon="💰" label="Total earnings" value={peso(total)} />
        <Stat icon="📍" label="Total distance" value={`${km.toFixed(1)} km`} />
        <Stat icon="🛵" label="Drivers with trips" value={all.filter((d) => d.trips).length} />
        <Stat icon="⭐" label="Reached ₱1,700" value={qualified} />
      </section>

      {notice && <p className="card notice">{notice}</p>}

      <section className="card">
        {loading ? <p className="muted">Loading…</p> : (
          <table className="tbl">
            <thead><tr><th>Driver</th><th>ID</th><th>Trips</th><th>Km</th><th>Earnings</th><th>Basic rate</th></tr></thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.sap} className={d.earn >= 1700 ? 'on' : ''}>
                  <td data-label="Driver" className="name">
                    <span>{d.name}</span>
                    {d.name === 'Not registered' ? (
                      <button className="mini primary" onClick={() => setAddDriverSap(d.sap)}>+ Add</button>
                    ) : (
                      <button className="mini ghost-del" onClick={() => setRemoveFor({ sap: d.sap, name: d.name })}>Delete</button>
                    )}
                  </td>
                  <td data-label="ID">{d.sap}</td>
                  <td data-label="Trips">{d.trips}</td>
                  <td data-label="Km">{d.km.toFixed(1)}</td>
                  <td data-label="Earnings" className="earn">{peso(d.earn)}</td>
                  <td data-label="Basic rate">{peso(basicOf(d.earn))}</td>
                </tr>
              ))}
              {!list.length && <tr className="empty"><td colSpan="6" className="muted">No records for this date.</td></tr>}
            </tbody>
          </table>
        )}
      </section>

      {confirm && (
        <div className="overlay" role="dialog" aria-modal="true" onClick={() => !deleting && setConfirm(null)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h2>{confirm === 'day' ? `Delete ${date}?` : `Delete before ${date}?`}</h2>
            <p>
              {confirm === 'day'
                ? <>This permanently deletes <b>{orders.length.toLocaleString()} orders</b> for {date}.</>
                : <>This permanently deletes <b>{beforeCount.toLocaleString()} orders</b> dated before {date}.</>}
            </p>
            <div className="row end">
              <button className="ghost" disabled={deleting} onClick={() => setConfirm(null)}>Cancel</button>
              <button className="del" disabled={deleting} onClick={doDelete}>{deleting ? 'Deleting…' : 'Yes, delete'}</button>
            </div>
          </div>
        </div>
      )}

      {addDriverSap && (
        <div className="overlay" role="dialog" aria-modal="true" onClick={() => setAddDriverSap(null)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h2>Add driver account</h2>
            <p className="muted">Sap Profile ID: <b>{addDriverSap}</b></p>
            <CreateDriver initialSap={addDriverSap} onDone={() => { setAddDriverSap(null); load() }} />
          </div>
        </div>
      )}

      {removeFor && (
        <div className="overlay" role="dialog" aria-modal="true" onClick={() => !removing && setRemoveFor(null)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h2>Delete {removeFor.name}?</h2>
            <p>This removes their login and profile (ID {removeFor.sap}). They will no longer be able to sign in.</p>
            <label style={{ flexDirection: 'row', alignItems: 'center', gap: 10, fontWeight: 500 }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={removeData} onChange={(e) => setRemoveData(e.target.checked)} />
              Also delete their order history
            </label>
            <div className="row end">
              <button className="ghost" disabled={removing} onClick={() => setRemoveFor(null)}>Cancel</button>
              <button className="del" disabled={removing} onClick={doRemove}>{removing ? 'Deleting…' : 'Yes, delete driver'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Upload({ onUploaded }) {
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const onFile = (e) => {
    const file = e.target.files[0]; if (!file) return
    setBusy(true); setMsg('Reading file…')
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async ({ data }) => {
        const map = new Map(); let skipped = 0
        data.forEach((r) => {
          const order_id = String(pick(r, 'orderid') ?? '').trim()
          const sap = String(pick(r, 'sapprofileid') ?? '').trim()
          const created = pick(r, 'createtime'), done = pick(r, 'completedtime')
          const wd = workDate(created) || workDate(done)
          if (!order_id || !sap || !wd) return skipped++
          map.set(order_id, {
            order_id, sap_profile_id: sap, work_date: wd,
            created_time: created ?? null, completed_time: done ?? null,
            distance: num(pick(r, 'distance')), pay: num(pick(r, 'totalpay')),
          })
        })
        const rows = [...map.values()]
        for (let i = 0; i < rows.length; i += 500) {
          const { error } = await supabase.from('orders').upsert(rows.slice(i, i + 500), { onConflict: 'order_id' })
          if (error) { setBusy(false); return setMsg('Upload failed: ' + error.message) }
        }
        await supabase.from('upload_log').insert({ rows_count: rows.length })
        onUploaded?.()
        setMsg(`Done. ${rows.length} orders saved${skipped ? `, ${skipped} rows skipped.` : ''}.`)
        setBusy(false); e.target.value = ''
      },
      error: (er) => { setBusy(false); setMsg('Could not read file: ' + er.message) },
    })
  }

  return (
    <section className="card">
      <h2>Upload CSV</h2>
      <p className="muted">Upload the latest export. Orders already saved are updated, not duplicated.</p>
      <input type="file" accept=".csv" onChange={onFile} disabled={busy} />
      {msg && <p>{msg}</p>}
    </section>
  )
}

function CreateDriver({ initialSap = '', onDone }) {
  const [form, setForm] = useState({ full_name: '', sap_profile_id: initialSap, email: '', password: '' })
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const genPassword = () => {
    const c = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let p = ''
    for (let i = 0; i < 10; i++) p += c[Math.floor(Math.random() * c.length)]
    setForm({ ...form, password: p }); setShow(true)
  }

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr(''); setMsg('')

    const { error } = await supabase.rpc('admin_create_driver', {
      p_email: form.email,
      p_password: form.password,
      p_full_name: form.full_name,
      p_sap_profile_id: form.sap_profile_id,
    })

    setBusy(false)
    if (error) return setErr(error.message)

    setMsg(`Driver created successfully!\nEmail: ${form.email}\nPassword: ${form.password}`)
    setForm({ full_name: '', sap_profile_id: '', email: '', password: '' })
    onDone?.()
  }

  return (
    <div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>Full name<input value={form.full_name} onChange={set('full_name')} required /></label>
        <label>Sap Profile ID<input value={form.sap_profile_id} onChange={set('sap_profile_id')} required /></label>
        <label>Email<input type="email" value={form.email} onChange={set('email')} required /></label>
        <label>
          Password
          <div className="pw-row">
            <input type={show ? 'text' : 'password'} value={form.password} onChange={set('password')} minLength={6} required />
            <button type="button" className="ghost icon" onClick={() => setShow((s) => !s)}>{show ? '🙈' : '👁️'}</button>
            <button type="button" className="ghost" onClick={genPassword}>Generate</button>
          </div>
        </label>
        {err && <p className="err">{err}</p>}
        {msg && <p className="creds">{msg}</p>}
        <div className="row end">
          {onDone && <button type="button" className="ghost" onClick={onDone}>Cancel</button>}
          <button className="primary" disabled={busy}>{busy ? 'Creating…' : 'Create driver'}</button>
        </div>
      </form>
    </div>
  )
}