import { useEffect, useState, useCallback } from 'react'
import Papa from 'papaparse'
import { supabase } from './supabase'

// [minimum daily earnings, basic rate]. Total with cash advance is always ₱500.
const TIERS = [[1700, 0], [1800, 100], [1900, 200], [2000, 300], [2100, 400], [2200, 500]]
const peso = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const todayPH = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })

function workDate(s) {
  if (!s) return null
  s = String(s).trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/) // 2026-11-16
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/) // 11/16/2026 23:59 (month/day/year)
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  return null
}
const num = (v) => parseFloat(String(v ?? '').replace(/[^0-9.-]/g, '')) || 0
const pick = (row, start) => {
  const k = Object.keys(row).find((k) => k.toLowerCase().replace(/[^a-z]/g, '').startsWith(start))
  return k ? row[k] : undefined
}

/* ---------- small shared pieces ---------- */

function Logo() {
  return <span className="logo" aria-hidden="true">🚕</span>
}

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
  if (!session) return <Login />
  if (!profile) return <p className="center">Loading…</p>

  const isAdmin = profile.role === 'admin'

  return (
    <main className={isAdmin ? 'wrap wide' : 'wrap'}>
      <header className="top">
        <div className="who">
          <Logo />
          <div>
            <h1>{isAdmin ? 'Admin' : profile.full_name || 'Driver'}</h1>
            {profile.sap_profile_id && <span className="muted">ID {profile.sap_profile_id}</span>}
          </div>
        </div>
        <button className="ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </header>
      {profile.missing
        ? <p className="card">Your account isn’t set up yet. Please contact your dispatcher.</p>
        : isAdmin ? <Admin /> : <Driver />}
    </main>
  )
}

function Login() {
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
      <section className="login-copy">
        <span className="logo big-logo" aria-hidden="true">🚕</span>
        <h1 className="brand">Earn <span className="accent">Smarter.</span><br />Hit your <span className="accent">quota.</span></h1>
        <p className="muted lead">Sign in to see today’s earnings, kilometers and how close you are to the next tier. Powered by NEMINTSCO-GSM</p>
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

function Driver() {
  const [date, setDate] = useState(todayPH())
  const [rows, setRows] = useState([])
  const [updated, setUpdated] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('orders').select('pay,distance').eq('work_date', date)
    setRows(data || []); setUpdated(new Date())
  }, [date])

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t) }, [load])

  const earn = rows.reduce((s, r) => s + Number(r.pay), 0)
  const km = rows.reduce((s, r) => s + Number(r.distance), 0)
  const idx = TIERS.reduce((a, [min], i) => (earn >= min ? i : a), -1)
  const next = TIERS[idx + 1]
  const basic = idx >= 0 ? TIERS[idx][1] : 0
  const pct = Math.min(100, (earn / 2200) * 100)

  return (
    <>
      <label className="date">Date<input type="date" value={date} max={todayPH()} onChange={(e) => setDate(e.target.value)} /></label>
      <div className="driver-grid">
        <div className="col">
          <section className="card hero">
            <span className="chip">Daily quest</span>
            <span className="muted">Earnings</span>
            <strong className="big">{peso(earn)}</strong>
            <div className="bar" role="progressbar" aria-valuemin="0" aria-valuemax="2200" aria-valuenow={Math.min(earn, 2200)}>
              <i style={{ width: pct + '%' }} />
            </div>
            <p className="goal">
              {next ? <>Earn <b>{peso(next[0] - earn)}</b> more to reach the {peso(next[1])} basic rate.</>
                : <>You reached the top tier: {peso(500)} basic rate. 🎉</>}
            </p>
            <p className="reward">
              <span className="coin" aria-hidden="true">₱</span>
              {basic > 0 ? `Basic rate now: ${peso(basic)}` : 'Daily earnings of ₱1,700 unlock the first tier.'}
            </p>
          </section>
          <section className="stats">
            <Stat icon="📍" label="Distance" value={`${km.toFixed(1)} km`} />
            <Stat icon="📦" label="Trips" value={rows.length} />
          </section>
        </div>
        <section className="card tiers-card">
          <h2>Tiers</h2>
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
          <p className="muted small">Cash advance is optional. Daily cut-off is 12:00 midnight.</p>
        </section>
      </div>
      <p className="muted small center">Last updated {updated?.toLocaleTimeString()}. Records are uploaded about every 2 hours.</p>
    </>
  )
}

/* ---------- admin ---------- */

function Admin() {
  const [tab, setTab] = useState('drivers')
  return (
    <>
      <nav className="tabs">
        <button className={tab === 'drivers' ? 'primary' : 'ghost'} onClick={() => setTab('drivers')}>All drivers</button>
        <button className={tab === 'upload' ? 'primary' : 'ghost'} onClick={() => setTab('upload')}>Upload CSV</button>
      </nav>
      {tab === 'drivers' ? <Drivers /> : <Upload />}
    </>
  )
}

function Drivers() {
  const [date, setDate] = useState(todayPH())
  const [orders, setOrders] = useState([])
  const [people, setPeople] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null) // null | 'day' | 'before'
  const [beforeCount, setBeforeCount] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    let all = [], from = 0
    for (;;) { // Supabase returns max 1000 rows per request, so page through
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
    let q = supabase.from('orders').delete({ count: 'exact' })
    q = confirm === 'day' ? q.eq('work_date', date) : q.lt('work_date', date)
    const { error, count } = await q
    setDeleting(false); setConfirm(null)
    if (error) return setNotice('Delete failed: ' + error.message)
    if (!count) return setNotice('Nothing was deleted. Check that your admin account has delete permission on the orders table.')
    setNotice(`Deleted ${count.toLocaleString()} orders.`)
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
                  <td data-label="Driver" className="name">{d.name}</td>
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

      <section className="card danger">
        <h2>Clean up data</h2>
        <p className="muted">Delete old orders to keep the app fast. This can’t be undone, so export a CSV first if you need a copy.</p>
        <div className="row">
          <button className="del" disabled={!orders.length} onClick={() => setConfirm('day')}>
            Delete {date} ({orders.length.toLocaleString()} orders)
          </button>
          <button className="del ghost-del" onClick={askBefore}>Delete everything before {date}</button>
        </div>
      </section>

      {confirm && (
        <div className="overlay" role="dialog" aria-modal="true" onClick={() => !deleting && setConfirm(null)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h2>{confirm === 'day' ? `Delete ${date}?` : `Delete before ${date}?`}</h2>
            <p>
              {confirm === 'day'
                ? <>This permanently deletes <b>{orders.length.toLocaleString()} orders</b> for {date}. Driver accounts are not affected.</>
                : <>This permanently deletes <b>{beforeCount.toLocaleString()} orders</b> dated before {date}. Driver accounts are not affected.</>}
            </p>
            <div className="row end">
              <button className="ghost" disabled={deleting} onClick={() => setConfirm(null)}>Cancel</button>
              <button className="del" disabled={deleting} onClick={doDelete}>{deleting ? 'Deleting…' : 'Yes, delete'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Upload() {
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
        setMsg(`Done. ${rows.length} orders saved${skipped ? `, ${skipped} rows skipped (missing Order ID, Sap Profile Id or Create Time)` : ''}.`)
        setBusy(false); e.target.value = ''
      },
      error: (er) => { setBusy(false); setMsg('Could not read file: ' + er.message) },
    })
  }

  return (
    <section className="card">
      <h2>Upload CSV</h2>
      <p className="muted">Upload the latest export. Orders already saved are updated, not duplicated, so overlapping files are fine.</p>
      <input type="file" accept=".csv" onChange={onFile} disabled={busy} />
      {msg && <p>{msg}</p>}
    </section>
  )
}