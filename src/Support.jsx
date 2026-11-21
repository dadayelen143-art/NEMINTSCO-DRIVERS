// src/Support.jsx
// Driver-side help: Panel 1 = call customer service, Panel 2 = end-trip guides (English / Tagalog)
import { useState } from 'react'
import './support.css'

const PHONE_DISPLAY = '0917 680 5377'
const PHONE_TEL = '+639176805377'
const HELP_URL = 'https://www.greengsm.ph/en/helps'
const FB_URL = 'https://www.facebook.com/kagreengsm'
const FB_LABEL = 'facebook.com/kagreengsm'

/* ---------- interface labels (app language: en / tl / ceb) ---------- */
const UI = {
  en: {
    title: 'Help & support',
    callTitle: 'Customer service',
    callSub: 'Having a problem you can’t fix? Call the hotline.',
    callBtn: 'Call customer service',
    copy: 'Copy number',
    copied: 'Copied!',
    afterTitle: 'After you call',
    steps: [
      'Tap “Call customer service” above.',
      'When the menu plays, press 2 for Drivers concern.',
      'Tell the agent your name, Sap Profile ID and the problem.',
      'If the agent asks for a picture, send it to the Facebook page (see Guides). The page will reply with your end-trip code.',
    ],
    fbTitle: 'Need an end-trip code?',
    fbText: 'After calling customer service, take a picture as the agent instructs and send it to our Facebook page. The page will send you the code to end the trip.',
    fbBtn: 'Open Facebook page',
    guideTitle: 'Guides',
    guideSub: 'Common problems when ending a trip.',
    forDrivers: 'For Green GSM drivers',
    forPassengers: 'For passengers (good to know)',
    fullGuide: 'Open full end-trip guide',
  },
  tl: {
    title: 'Tulong at suporta',
    callTitle: 'Customer service',
    callSub: 'May problemang hindi maayos? Tawagan ang hotline.',
    callBtn: 'Tawagan ang customer service',
    copy: 'Kopyahin ang numero',
    copied: 'Nakopya!',
    afterTitle: 'Pagkatapos tumawag',
    steps: [
      'I-tap ang “Tawagan ang customer service” sa itaas.',
      'Kapag tumugtog ang menu, pindutin ang 2 para sa Drivers concern.',
      'Sabihin sa agent ang iyong pangalan, Sap Profile ID at ang problema.',
      'Kung hihingi ang agent ng picture, ipadala ito sa Facebook page (tingnan ang Mga Gabay). Ipapadala ng page ang iyong end-trip code.',
    ],
    fbTitle: 'Kailangan ng end-trip code?',
    fbText: 'Pagkatawag sa customer service, kumuha ng picture ayon sa bilin ng agent at ipadala ito sa aming Facebook page. Ipapadala ng page ang code para matapos ang biyahe.',
    fbBtn: 'Buksan ang Facebook page',
    guideTitle: 'Mga Gabay',
    guideSub: 'Mga karaniwang problema sa pag-end ng trip.',
    forDrivers: 'Para sa mga driver ng Green GSM',
    forPassengers: 'Para sa mga pasahero (mainam malaman)',
    fullGuide: 'Buksan ang buong end-trip guide',
  },
  ceb: {
    title: 'Tabang ug suporta',
    callTitle: 'Customer service',
    callSub: 'Naay problema nga dili ma-ayo? Tawag sa hotline.',
    callBtn: 'Tawag sa customer service',
    copy: 'I-copy ang numero',
    copied: 'Na-copy na!',
    afterTitle: 'Human sa tawag',
    steps: [
      'Pindota ang “Tawag sa customer service” sa ibabaw.',
      'Kung mugawas ang menu, pindota ang 2 para sa Drivers concern.',
      'Ingna ang agent sa imong ngalan, Sap Profile ID ug ang problema.',
      'Kung mangayo ang agent og picture, ipadala kini sa Facebook page (tan-awa ang Mga Giya). Ipadala sa page ang imong end-trip code.',
    ],
    fbTitle: 'Kinahanglan og end-trip code?',
    fbText: 'Human sa tawag sa customer service, kuhaa ang picture sumala sa sugo sa agent ug ipadala kini sa among Facebook page. Ipadala sa page ang code aron mahuman ang trip.',
    fbBtn: 'Ablihi ang Facebook page',
    guideTitle: 'Mga Giya',
    guideSub: 'Kasagarang problema sa pag-end sa trip.',
    forDrivers: 'Para sa mga driver sa Green GSM',
    forPassengers: 'Para sa mga pasahero (maayo nga mahibaloan)',
    fullGuide: 'Ablihi ang tibuok end-trip guide',
  },
}

/* ---------- guide content (English / Tagalog) ---------- */
const GUIDES = {
  en: {
    driver: [
      { q: 'Standard End-Trip Steps', a: 'Once you arrive at the drop-off point, tap End Trip (or swipe to complete) in your driver app/dashboard, confirm the final fare and payment method (cash, card, or QR/e-wallet), and issue a receipt if requested.' },
      { q: 'Confirmation Code Prompts', a: 'If the app asks for a confirmation code to end a trip, it usually happens when a booking was made via the hotline/dispatch or requires passenger verification before closing out the meter. Check your booking details screen or ask the passenger if they received a trip code via SMS/app.' },
      { q: 'App Won’t Let You End the Trip', a: 'Check your mobile data/internet connection first, as poor signal prevents the meter from syncing. Ensure no screen overlays or phone holders are blocking the app’s navigation/back buttons, or force-close and reopen the app.' },
      { q: 'Pausing After a Trip', a: 'If you need to take a break right after ending a trip, tap the Stop Accept button in your driver app before or immediately after completing the drop-off so you aren’t auto-assigned a new passenger.' },
    ],
    passenger: [
      { q: 'How Payment Works at End Trip', a: 'For cashless bookings (card or e-wallet), the fare is processed automatically or via QR code once the driver taps End Trip. For cash rides, pay the exact amount shown on the meter/app.' },
      { q: 'Ending a Trip Early', a: 'If you need to get off before your pinned destination, inform your driver ahead of time so they can safely pull over and end the trip early. Your fare will adjust based on the actual distance and time traveled (for metered rides) or the updated route.' },
      { q: 'Driver Can’t End the Previous Trip', a: 'Never agree to pay an arbitrary flat rate or “max fare” if a driver claims their app is stuck on an old trip. Ask the driver to contact driver support, or exit safely and book another ride.' },
      { q: 'Post-Trip Ratings & Receipts', a: 'After the trip ends, you can rate your driver and view your electronic receipt directly in the Green GSM App.' },
    ],
  },
  tl: {
    driver: [
      { q: 'Karaniwang Hakbang sa Pag-End Trip', a: 'Pagdating sa drop-off point, i-tap ang End Trip (o i-swipe para makumpleto) sa iyong driver app/dashboard, kumpirmahin ang huling pamasahe at paraan ng pagbabayad (cash, card, o QR/e-wallet), at magbigay ng resibo kung hihilingin.' },
      { q: 'Paghingi ng Confirmation Code', a: 'Kung humihingi ang app ng confirmation code para matapos ang biyahe, kadalasang nangyayari ito kapag ang booking ay ginawa sa pamamagitan ng hotline/dispatch o nangangailangan ng pagpapatunay mula sa pasahero bago isara ang metro. Tingnan ang screen ng detalye ng booking o tanungin ang pasahero kung nakatanggap sila ng trip code sa SMS o app.' },
      { q: 'Ayaw Mag-End Trip ng App', a: 'Suriin muna ang iyong mobile data o koneksyon sa internet, dahil pinipigilan ng mahinang signal ang pag-sync ng metro. Siguraduhing walang screen overlay o phone holder na nakaharang sa mga button ng app, o i-force close at buksan muli ang app.' },
      { q: 'Pagpapahinga Pagkatapos ng Biyahe', a: 'Kung kailangan mong magpahinga pagkatapos mismo ng biyahe, i-tap ang button na Stop Accept sa iyong driver app bago o pagkatapos makumpleto ang drop-off upang hindi ka awtomatikong mabigyan ng bagong pasahero.' },
    ],
    passenger: [
      { q: 'Paano Gumagana ang Bayad sa End Trip', a: 'Para sa mga cashless booking (card o e-wallet), awtomatikong ipoproseso ang pamasahe o babayaran sa pamamagitan ng QR code kapag na-tap na ng driver ang End Trip. Para sa mga cash ride, bayaran ang eksaktong halagang nakalagay sa metro o app.' },
      { q: 'Maagang Pagtatapos ng Biyahe', a: 'Kung kailangan mong bumaba bago pa makarating sa iyong naka-pin na destinasyon, sabihan nang maaga ang iyong driver upang ligtas siyang makatabi at matapos nang maaga ang biyahe. Mag-a-adjust ang iyong pamasahe batay sa aktwal na distansya at oras ng biyahe (para sa metered rides) o sa nabagong ruta.' },
      { q: 'Hindi Matapos ng Driver ang Naunang Biyahe', a: 'Huwag pumayag na magbayad ng basta-bastang flat rate o “max fare” kung sasabihin ng driver na naka-stuck ang kanilang app sa lumang biyahe. Sabihan ang driver na makipag-ugnayan sa driver support, o bumaba nang ligtas at mag-book na lang ng ibang sasakyan.' },
      { q: 'Rating at Resibo Pagkatapos ng Biyahe', a: 'Pagkatapos ng biyahe, maaari mong i-rate ang iyong driver at tingnan ang iyong electronic receipt nang direkta sa Green GSM App.' },
    ],
  },
}

function GuideGroup({ title, items, openFirst }) {
  return (
    <div className="guide-group">
      <h3>{title}</h3>
      {items.map((it, i) => (
        <details key={it.q} className="acc" open={openFirst && i === 0}>
          <summary>{it.q}</summary>
          <p>{it.a}</p>
        </details>
      ))}
    </div>
  )
}

export default function Support({ lang = 'en' }) {
  const u = UI[lang] || UI.en
  const [gl, setGl] = useState(lang === 'tl' ? 'tl' : 'en') // guides only exist in en / tl
  const [copied, setCopied] = useState(false)
  const g = GUIDES[gl]

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PHONE_DISPLAY.replace(/\s/g, ''))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (_) { /* clipboard not available: the number is still shown on screen */ }
  }

  return (
    <section className="support" aria-labelledby="support-title">
      <h2 id="support-title" className="support-title">{u.title}</h2>
      <div className="support-grid">
        {/* ---------- Panel 1: customer service ---------- */}
        <article className="card call-panel">
          <div className="panel-head">
            <span className="ico" aria-hidden="true">🎧</span>
            <div>
              <h2>{u.callTitle}</h2>
              <p className="muted small">{u.callSub}</p>
            </div>
          </div>

          <a className="call-btn" href={`tel:${PHONE_TEL}`}>
            <span aria-hidden="true">📞</span>
            <span>
              {u.callBtn}
              <small>{PHONE_DISPLAY}</small>
            </span>
          </a>
          <button type="button" className="ghost mini copy-btn" onClick={copy}>
            {copied ? u.copied : u.copy}
          </button>

          <h3 className="after-title">{u.afterTitle}</h3>
          <ol className="call-steps">
            {u.steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
        </article>

        {/* ---------- Panel 2: guides ---------- */}
        <article className="card guide-panel">
          <div className="panel-head">
            <span className="ico" aria-hidden="true">📖</span>
            <div>
              <h2>{u.guideTitle}</h2>
              <p className="muted small">{u.guideSub}</p>
            </div>
            <div className="seg" role="group" aria-label="Guide language">
              <button type="button" className={gl === 'en' ? 'mini primary' : 'mini ghost'} onClick={() => setGl('en')}>English</button>
              <button type="button" className={gl === 'tl' ? 'mini primary' : 'mini ghost'} onClick={() => setGl('tl')}>Tagalog</button>
            </div>
          </div>

          <div className="fb-card">
            <span className="fb-ico" aria-hidden="true">💬</span>
            <div>
              <strong>{u.fbTitle}</strong>
              <p>{u.fbText}</p>
              <a className="fb-btn" href={FB_URL} target="_blank" rel="noopener noreferrer">
                {u.fbBtn} ↗<small>{FB_LABEL}</small>
              </a>
            </div>
          </div>

          <GuideGroup title={u.forDrivers} items={g.driver} openFirst />
          <GuideGroup title={u.forPassengers} items={g.passenger} />

          <a className="guide-link" href={HELP_URL} target="_blank" rel="noopener noreferrer">
            {u.fullGuide} ↗
          </a>
        </article>
      </div>
    </section>
  )
}