const STOP_COLORS = ['#c4532a', '#d99a2b', '#7d8f3a', '#2f6b4f', '#2f6f73', '#41658a', '#7a4f7d', '#a8442f', '#1f3b2d'];
const MODE = {auto: {icon: '🚗', label: 'Huurauto'}, trein: {icon: '🚆', label: 'Trein'}, vlucht: {icon: '✈', label: 'Vliegtuig'}};
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const commonsUrl = (path, width) => `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/${width}px-${path.split('/').pop()}`;

function photoImg(data, key, sizes, extra = '') {
  const p = data.photos[key];
  const srcset = [500, 960, 1920].map(w => `${commonsUrl(p.path, w)} ${w}w`).join(', ');
  return `<img src="${commonsUrl(p.path, 960)}" srcset="${srcset}" sizes="${sizes}" alt="${esc(p.caption)}" loading="lazy" decoding="async" ${extra} onerror="this.onerror=null;this.removeAttribute('srcset');this.src='${commonsUrl(p.path, 500)}'">`;
}
function photoCredit(data, key) {
  const p = data.photos[key];
  return `<a href="${esc(p.page)}" target="_blank" rel="noopener">Foto: ${esc(p.credit)} · ${esc(p.license)}</a>`;
}
const bouwsteenLink = (b, cls = 'bouwsteen-link') => b ? `<a class="${cls}" href="${esc(b.url)}" target="_blank" rel="noopener">Bouwsteen: ${esc(b.title)} ↗</a>` : '';

function renderVacation(data) {
  validateVacation(data);
  const {trip, stops, days, pricing} = data;
  const hotelNights = stops.reduce((sum, stop) => sum + stop.nights, 0);
  const year = new Date(trip.startDate + 'T00:00:00Z').getUTCFullYear();
  const utc = iso => new Date(iso + 'T00:00:00Z');
  const fmt = (date, opts) => date.toLocaleDateString('nl-NL', {...opts, timeZone: 'UTC'});
  const dateAt = offset => new Date(Date.parse(trip.startDate + 'T00:00:00Z') + offset * 86400000);
  const dateLabel = date => fmt(date, {day: 'numeric', month: 'long'});
  const euro = (n, digits = 2) => new Intl.NumberFormat('nl-NL', {style: 'currency', currency: trip.currency, minimumFractionDigits: digits, maximumFractionDigits: digits}).format(n);
  const color = i => STOP_COLORS[i % STOP_COLORS.length];
  const month = date => fmt(date, {month: 'short'}).replace('.', '');
  const shortRange = (a, b) => a.getUTCMonth() === b.getUTCMonth()
    ? `${a.getUTCDate()}–${b.getUTCDate()} ${month(b)}` : `${a.getUTCDate()} ${month(a)} – ${b.getUTCDate()} ${month(b)}`;

  let nightsBefore = 0;
  const stays = stops.map(s => {
    const stay = {first: nightsBefore + 1, last: nightsBefore + s.nights, firstDay: nightsBefore,
      arrival: dateLabel(dateAt(nightsBefore)), departure: dateLabel(dateAt(nightsBefore + s.nights)),
      arrivalDate: dateAt(nightsBefore), departureDate: dateAt(nightsBefore + s.nights)};
    nightsBefore += s.nights;
    return stay;
  });
  const dayColor = d => d.stop !== null ? color(d.stop) : '#5d6b78';
  const modeIcon = t => (MODE[t.mode] || MODE.auto).icon;
  const totalPP = pricing.groups.reduce((n, g) => n + g.total, 0);
  const totalAll = totalPP * pricing.persons;

  // Hero slideshow and texts
  const slides = document.getElementById('heroSlides');
  slides.innerHTML = stops.map((s, i) => `<div class="slide${i === 0 ? ' active' : ''}">${photoImg(data, s.photo, '100vw', i === 0 ? 'fetchpriority="high" loading="eager"' : '')}</div>`).join('');
  const caption = document.getElementById('heroCaption');
  let slide = 0;
  const showSlide = i => {
    slides.children[slide].classList.remove('active');
    slide = i;
    slides.children[slide].classList.add('active');
    caption.innerHTML = `<span class="hero-caption-stop">${String(i + 1).padStart(2, '0')} · ${esc(stops[i].name)}</span>${photoCredit(data, stops[i].photo)}`;
  };
  showSlide(0);
  clearInterval(window.heroTimer);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) window.heroTimer = setInterval(() => showSlide((slide + 1) % stops.length), 6500);
  document.getElementById('routeSummary').innerHTML = stops.map((s, i) => `<span>${esc(s.name)}</span>${i < stops.length - 1 ? '<i>✦</i>' : ''}`).join('');

  const start = utc(trip.startDate), end = utc(trip.endDate);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const countdown = document.getElementById('countdown');
  if (today < start) {
    const left = Math.round((start - today) / 86400000);
    countdown.innerHTML = `<strong>${left}</strong><span>${left === 1 ? 'dag' : 'dagen'} tot vertrek</span>`;
  } else if (today <= end) {
    countdown.innerHTML = `<strong>Dag ${Math.round((today - start) / 86400000) + 1}</strong><span>we zijn onderweg!</span>`;
  } else countdown.innerHTML = `<strong>♡</strong><span>wat een reis was het</span>`;

  const distance = (data.route.distanceLabel.match(/\d[\d.]*/) || [''])[0];
  const view = {...trip, year: String(year), heroFirst: trip.heroTitle[0], heroLast: trip.heroTitle[1],
    dateRange: `${fmt(start, {day: 'numeric', month: 'long'})} — ${fmt(end, {day: 'numeric', month: 'long', year: 'numeric'})}`,
    dayCount: days.length, nightCount: days.length - 1, stopCount: stops.length, travelerCount: trip.travelers, distanceShort: distance,
    perPersonShort: euro(totalPP, 0), routeDescription: data.route.lineDescription, distanceLabel: data.route.distanceLabel,
    pricingBasis: `${pricing.basis}. Alle bedragen komen uit het reisvoorstel.`,
    grandTotal: euro(totalAll), grandTotalNote: `${euro(totalPP)} per persoon, landarrangement en vluchten samen`};
  document.querySelectorAll('[data-trip-text]').forEach(el => { el.textContent = view[el.dataset.tripText]; });
  document.title = trip.title;

  // Overview: stays ribbon, calendar and travel legs
  document.getElementById('ribbon').innerHTML = stops.map((s, i) =>
    `<button type="button" class="ribbon-stop" style="--c:${color(i)};flex:${s.nights}" data-day="${stays[i].firstDay + 1}">
      <span class="ribbon-num">${i + 1}</span><b>${esc(s.name)}</b><small>${shortRange(stays[i].arrivalDate, stays[i].departureDate)}</small></button>`).join('');

  const weekdays = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
  const lead = (start.getUTCDay() + 6) % 7;
  let cal = weekdays.map(w => `<div class="cal-head">${w}</div>`).join('') + '<div class="cal-empty"></div>'.repeat(lead);
  cal += days.map(d => {
    const date = utc(d.date), t = d.transport;
    return `<button type="button" class="cal-day${t ? ' is-travel' : ''}" style="--c:${dayColor(d)}" data-day="${d.n}" aria-label="Dag ${d.n}, ${fmt(date, {weekday: 'long', day: 'numeric', month: 'long'})}: ${esc(d.title)}">
      <span class="cal-top"><span class="cal-date">${date.getUTCDate()}<small>${month(date)}</small></span><span class="cal-n">dag ${d.n}</span></span>
      <span class="cal-place">${esc(d.loc)}</span>
      <span class="cal-title">${esc(d.title)}</span>
      ${t ? `<span class="cal-travel">${modeIcon(t)} ${esc(t.duration)}</span>` : ''}
    </button>`;
  }).join('');
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = cal;

  const legs = days.filter(d => d.transport);
  document.getElementById('legs').innerHTML = legs.map(d => {
    const t = d.transport;
    return `<button type="button" class="leg" data-day="${d.n}" style="--c:${dayColor(d)}">
      <span class="leg-icon">${modeIcon(t)}</span>
      <span class="leg-route"><small>Dag ${d.n} · ${fmt(utc(d.date), {weekday: 'short', day: 'numeric', month: 'short'})}</small><b>${esc(t.from)} → ${esc(t.to)}</b>${t.detail ? `<em>${esc(t.detail)}</em>` : ''}</span>
      <span class="leg-time"><b>${esc(t.duration)}</b>${t.distance ? `<small>${esc(t.distance)}</small>` : ''}</span>
    </button>`;
  }).join('');

  // Day viewer
  const strip = document.getElementById('dayStrip');
  strip.innerHTML = days.map(d => {
    const date = utc(d.date);
    return `<button type="button" role="tab" class="strip-day" data-day="${d.n}" style="--c:${dayColor(d)}" aria-label="Dag ${d.n}: ${esc(d.title)}">
      <small>${fmt(date, {weekday: 'short'}).replace('.', '')}</small><b>${date.getUTCDate()}</b><span>${esc(d.loc)}</span>${d.transport ? `<i>${modeIcon(d.transport)}</i>` : ''}</button>`;
  }).join('');
  const dayView = document.getElementById('dayView');
  const prevBtn = document.getElementById('prevDay'), nextBtn = document.getElementById('nextDay');
  let current = 1;

  function transportBlock(t) {
    return `<div class="transport">
      <div class="transport-line">
        <span class="transport-end"><small>Van</small><b>${esc(t.from)}</b></span>
        <span class="transport-track" aria-hidden="true"><span class="transport-icon">${modeIcon(t)}</span></span>
        <span class="transport-end to"><small>Naar</small><b>${esc(t.to)}</b></span>
      </div>
      <div class="transport-facts">
        <span><small>Reistijd</small><b>${esc(t.duration)}</b></span>
        ${t.distance ? `<span><small>Afstand</small><b>${esc(t.distance)}</b></span>` : ''}
        <span><small>Vervoer</small><b>${(MODE[t.mode] || MODE.auto).label}</b></span>
      </div>
      ${t.detail ? `<p class="transport-detail">${esc(t.detail)}</p>` : ''}
    </div>`;
  }

  function renderDay(n, focusTab) {
    current = Math.min(Math.max(1, n), days.length);
    const d = days[current - 1], date = utc(d.date), si = d.stop, stop = si !== null ? stops[si] : null;
    const c = dayColor(d);
    const nightInfo = stop
      ? `<a class="tonight" href="#hotel-${si + 1}" style="--c:${c}"><span class="tonight-icon">🛏️</span><span><small>Vannacht · nacht ${esc(d.night)}</small><b>${esc(stop.hotel)}</b><em>${esc(stop.name)} · ${stays[si].arrival} – ${stays[si].departure}</em></span><span class="tonight-arrow">→</span></a>`
      : `<div class="tonight quiet"><span class="tonight-icon">${d.n === days.length ? '🏠' : '✈'}</span><span><small>Vannacht</small><b>${d.n === days.length ? 'Weer thuis' : 'In het vliegtuig naar huis'}</b><em>Geen hotelovernachting</em></span></div>`;
    dayView.style.setProperty('--c', c);
    dayView.innerHTML = `
      <figure class="day-photo" id="dayPhoto">
        ${photoImg(data, d.photo, '(max-width: 900px) 100vw, 55vw', 'loading="eager"')}
        <span class="day-badge"><small>Dag</small>${String(d.n).padStart(2, '0')}<small>van ${days.length}</small></span>
        <figcaption><span>${esc(data.photos[d.photo].caption)}</span>${photoCredit(data, d.photo)}</figcaption>
      </figure>
      <div class="day-body">
        <p class="day-date">${fmt(date, {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}</p>
        <h3>${esc(d.title)}</h3>
        <p class="day-place"><span class="pin" aria-hidden="true">●</span> ${stop ? `${esc(stop.name)} <small>${esc(stop.sub)}</small>` : esc(d.loc)}</p>
        ${d.transport ? transportBlock(d.transport) : `<p class="day-travel-chip">${esc(d.travel)}</p>`}
        <p class="day-desc">${esc(d.desc)}</p>
        <ol class="day-todo">${d.todo.map(item => `<li>${esc(item)}</li>`).join('')}</ol>
        <blockquote class="day-notes"><small>Goed om te weten</small>${esc(d.notes)}</blockquote>
        ${nightInfo}
        ${bouwsteenLink(d.bouwsteen)}
      </div>`;
    dayView.classList.remove('enter'); void dayView.offsetWidth; dayView.classList.add('enter');
    const prev = days[current - 2], next = days[current];
    prevBtn.disabled = !prev; nextBtn.disabled = !next;
    prevBtn.innerHTML = prev ? `<span>← Vorige dag</span><b>Dag ${prev.n} · ${esc(prev.title)}</b>` : '<span>Start van de reis</span><b>Dag 1</b>';
    nextBtn.innerHTML = next ? `<span>Volgende dag →</span><b>Dag ${next.n} · ${esc(next.title)}</b>` : '<span>Einde van de reis</span><b>Thuis ♡</b>';
    strip.querySelectorAll('.strip-day').forEach(b => {
      const active = Number(b.dataset.day) === current;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active);
      if (active) {
        strip.scrollTo({left: b.offsetLeft - strip.offsetLeft - (strip.clientWidth - b.offsetWidth) / 2, behavior: 'smooth'});
        if (focusTab) b.focus({preventScroll: true});
      }
    });
    document.getElementById('dayProgress').style.width = (current / days.length * 100) + '%';
    if (location.hash.startsWith('#dag-') || location.hash === '#dagen') history.replaceState(null, '', '#dag-' + current);
    attachSwipe();
  }
  function openDay(n) {
    renderDay(n);
    history.replaceState(null, '', '#dag-' + current);
    document.getElementById('dagen').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  }
  function attachSwipe() {
    const photo = document.getElementById('dayPhoto');
    let x0 = null;
    photo.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, {passive: true});
    photo.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) renderDay(current + (dx < 0 ? 1 : -1));
    });
  }
  const openFromClick = e => { const b = e.target.closest('[data-day]'); if (b) openDay(Number(b.dataset.day)); };
  prevBtn.onclick = () => renderDay(current - 1);
  nextBtn.onclick = () => renderDay(current + 1);
  strip.onclick = e => { const b = e.target.closest('[data-day]'); if (b) renderDay(Number(b.dataset.day)); };
  strip.onkeydown = e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); renderDay(current + (e.key === 'ArrowRight' ? 1 : -1), true); }
  };
  calendar.onclick = openFromClick;
  document.getElementById('ribbon').onclick = openFromClick;
  document.getElementById('legs').onclick = openFromClick;
  if (!window.dayKeysBound) {
    window.dayKeysBound = true;
    document.addEventListener('keydown', e => {
      if (!window.dayKeyHandler || e.target.closest('input, textarea, select') || e.altKey || e.ctrlKey || e.metaKey) return;
      window.dayKeyHandler(e);
    });
  }
  window.dayKeyHandler = e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const r = document.getElementById('dagen').getBoundingClientRect();
    if (r.top > innerHeight * .5 || r.bottom < innerHeight * .3) return;
    e.preventDefault();
    renderDay(current + (e.key === 'ArrowRight' ? 1 : -1));
  };
  const fromHash = () => { const m = location.hash.match(/^#dag-(\d+)$/); return m ? Number(m[1]) : null; };
  renderDay(fromHash() || 1);
  if (fromHash()) document.getElementById('dagen').scrollIntoView();
  window.onhashchange = () => { const n = fromHash(); if (n) openDay(n); };

  // Route map
  let map;
  const markers = [];
  const routeList = document.getElementById('routeList');
  routeList.innerHTML = stops.map((s, i) => `<button type="button" class="route-stop" data-stop="${i}" style="--c:${color(i)}"><span class="route-num">${i + 1}</span><span><b>${esc(s.name)}</b><small>${stays[i].arrival} – ${stays[i].departure} · ${s.nights} ${s.nights === 1 ? 'nacht' : 'nachten'}</small></span></button>`).join('');
  const mapEl = document.getElementById('map');
  if (window.L && !mapEl._leaflet_id) {
    mapEl.innerHTML = '';
    map = L.map('map', {scrollWheelZoom: false});
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19
    }).addTo(map).on('tileerror', () => { document.getElementById('mapStatus').textContent = 'Kaartachtergrond niet geladen. Gebruik de lijst of de Google Maps-link.'; });
    const points = stops.map(s => [s.lat, s.lon]);
    const lastCar = stops.length - 1;
    L.polyline(points.slice(0, lastCar), {color: '#1f6fb2', weight: 4, opacity: .9, dashArray: '2,9', lineCap: 'round'}).addTo(map);
    L.polyline(points.slice(lastCar - 1), {color: '#7b5ea7', weight: 4, opacity: .9, dashArray: '10,8'}).addTo(map).bindTooltip('Trein Boston → New York');
    stops.forEach((s, i) => markers.push(L.marker([s.lat, s.lon], {
      title: `${i + 1}. ${s.name}`, alt: s.name,
      icon: L.divIcon({className: '', html: `<div class="map-label" style="--c:${color(i)}">${i + 1}</div>`, iconSize: [30, 30], iconAnchor: [15, 15]})
    }).addTo(map).bindPopup(`<b>${i + 1}. ${esc(s.name)}</b><br>${esc(s.hotel)}<br>${stays[i].arrival} – ${stays[i].departure} · ${s.nights} ${s.nights === 1 ? 'nacht' : 'nachten'}`)));
    const showAll = () => map.fitBounds(points, {padding: [35, 35]});
    showAll();
    document.getElementById('showRoute').onclick = showAll;
  } else if (!window.L) {
    mapEl.innerHTML = '<div class="map-fallback"><b>De interactieve kaart is niet geladen.</b><p>Gebruik de lijst en de link naar Google Maps.</p></div>';
    document.getElementById('showRoute').hidden = true;
  }
  routeList.onclick = e => {
    const b = e.target.closest('[data-stop]');
    if (!b || !map) return;
    const i = Number(b.dataset.stop);
    map.setView([stops[i].lat, stops[i].lon], 9); markers[i].openPopup();
  };
  document.getElementById('googleMapsRoute').href = data.route.googleMapsUrl;

  // Stays
  document.getElementById('hotelSummary').innerHTML = `
    <div><strong>${stops.length}</strong><span>verblijven</span></div>
    <div><strong>${hotelNights}</strong><span>hotelnachten</span></div>
    <div><strong>1</strong><span>nacht in het vliegtuig</span></div>
    <div><strong>2</strong><span>tweepersoonskamers</span></div>`;
  document.getElementById('hotelList').innerHTML = stops.map((s, i) => `
    <li class="hotel" id="hotel-${i + 1}" style="--c:${color(i)}">
      <div class="hotel-photo">${photoImg(data, s.photo, '(max-width: 700px) 100vw, 340px')}<span class="hotel-num">${i + 1}</span></div>
      <div class="hotel-info">
        <p class="hotel-city">${esc(s.name)} <small>${esc(s.sub)}</small></p>
        <h3>${esc(s.hotel)}</h3>
        <p class="hotel-desc">${esc(s.hotelDescription)}</p>
        <div class="hotel-dates">
          <span><small>Inchecken</small><b>${fmt(stays[i].arrivalDate, {weekday: 'short', day: 'numeric', month: 'short'})}</b></span>
          <span class="hotel-nights">${s.nights} ${s.nights === 1 ? 'nacht' : 'nachten'}</span>
          <span><small>Uitchecken</small><b>${fmt(stays[i].departureDate, {weekday: 'short', day: 'numeric', month: 'short'})}</b></span>
        </div>
        <div class="hotel-links">
          ${bouwsteenLink(s.bouwsteen, '')}
          <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + ', ' + s.sub.replace(/ · /g, ', '))}" target="_blank" rel="noopener">Op de kaart ↗</a>
          <button type="button" class="link-button" data-day="${stays[i].firstDay + 1}">Naar dag ${stays[i].firstDay + 1} →</button>
        </div>
      </div>
      <div class="hotel-price"><small>Inbegrepen</small><p>${esc(s.included)}</p></div>
    </li>`).join('');
  document.getElementById('hotelList').onclick = openFromClick;

  // Prices
  document.getElementById('priceGroups').innerHTML = pricing.groups.map(g => `
    <div class="price-group" style="--c:${g.color}">
      <h3>${esc(g.title)} <small>per persoon</small></h3>
      ${g.rows.map(([name, amount]) => `<div class="price-row"><span>${esc(name)}</span><span>${euro(amount)}</span></div>`).join('')}
      <div class="price-row price-total"><span>${esc(g.totalLabel)}</span><span>${euro(g.total)}</span></div>
      <div class="price-row price-all"><span>Voor ${pricing.persons} personen</span><span>${euro(g.total * pricing.persons)}</span></div>
    </div>`).join('') + `
    <div class="price-group price-grand">
      <div class="price-row"><span>Totaal per persoon</span><span>${euro(totalPP)}</span></div>
      <div class="price-row price-total"><span>Totaal voor ${pricing.persons} personen</span><span>${euro(totalAll)}</span></div>
    </div>`;
  let angle = 0;
  document.querySelector('.budget-ring').style.background = `conic-gradient(${pricing.groups.map(g => { const from = angle; angle += g.total / totalPP * 100; return `${g.color} ${from}% ${angle}%`; }).join(',')})`;
  document.getElementById('ringLegend').innerHTML = pricing.groups.map(g => `<span><i style="background:${g.color}"></i>${esc(g.title)} ${Math.round(g.total / totalPP * 100)}%</span>`).join('');
  document.getElementById('localCosts').innerHTML = pricing.local.map(l => `<div class="local-cost"><b>${esc(l.amount)}</b><span>${esc(l.item)}</span><small>${esc(l.note)}</small></div>`).join('');

  // Flights and schedule
  document.getElementById('flightCards').innerHTML = data.flights.map(f => `
    <div class="flight-card">
      <p class="flight-meta">${esc(f.date)} · ${esc(f.airline)} · ${esc(f.number)}</p>
      <div class="flight-line">
        <span><b>${esc(f.departure)}</b><small>${esc(f.from)}</small></span>
        <span class="flight-track" aria-hidden="true"><i>✈</i><small>${esc(f.duration)}</small></span>
        <span class="to"><b>${esc(f.arrival)}</b><small>${esc(f.to)}</small></span>
      </div>
      ${f.warning ? `<p class="flight-warning">⚠ ${esc(f.warning)}</p>` : ''}
    </div>`).join('');
  document.getElementById('flightNotes').innerHTML = data.flightNotes.map(n => `<li>${esc(n)}</li>`).join('');
  const shortDate = iso => fmt(utc(iso), {day: 'numeric', month: 'short'});
  document.getElementById('schedule').innerHTML = `<thead><tr><th>Onderdeel</th><th>Start</th><th>Einde</th><th>Nachten</th><th>Inbegrepen</th></tr></thead><tbody>`
    + data.schedule.map(([name, from, to, nights, incl]) => `<tr><td>${esc(name)}</td><td>${shortDate(from)}</td><td>${shortDate(to)}</td><td>${esc(nights)}</td><td>${esc(incl)}</td></tr>`).join('')
    + `</tbody><tfoot><tr><td>Totaal</td><td>${shortDate(trip.startDate)}</td><td>${shortDate(trip.endDate)}</td><td>${days.length - 1}</td><td></td></tr></tfoot>`;

  // Practical, attention points, agency and credits
  document.getElementById('practicalGrid').innerHTML = data.practical.map(p => `<article><div class="pict">${esc(p.icon)}</div><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p></article>`).join('');
  document.getElementById('attention').innerHTML = `<h3>Nog na te vragen bij Riksja</h3><ul>${data.attention.map(a => `<li>${esc(a)}</li>`).join('')}</ul>`;
  document.getElementById('sourceLinks').innerHTML = data.agency.links.map(s => `<a target="_blank" rel="noopener" href="${esc(s.url)}">${esc(s.title)} ↗</a>`).join(' · ');
  const ct = data.agency.contact;
  document.getElementById('contactCard').innerHTML = `<small>Jouw reisspecialist</small><b>${esc(ct.name)} · ${esc(ct.company)}</b>
    <a href="tel:${esc(ct.phone.replace(/[^\d+]/g, '').replace('+310', '+31'))}">${esc(ct.phone)}</a><a href="mailto:${esc(ct.email)}">${esc(ct.email)}</a><a href="${esc(ct.web)}" target="_blank" rel="noopener">${esc(ct.web.replace(/^https:\/\/(www\.)?/, ''))}</a>`;
  document.getElementById('agencyGrid').innerHTML = data.agency.why.map(w => `<article><h3>${esc(w.title)}</h3><p>${esc(w.text)}</p></article>`).join('');
  document.getElementById('photoCredits').innerHTML = Object.values(data.photos).map(p => `<li>${esc(p.caption)}: <a href="${esc(p.page)}" target="_blank" rel="noopener">${esc(p.credit)}</a>, ${esc(p.license)}</li>`).join('');

  document.getElementById('dataStatus').hidden = true;
}

// Solid header once the hero has scrolled away
const topbar = document.getElementById('topbar');
const onScroll = () => topbar.classList.toggle('solid', scrollY > 60);
addEventListener('scroll', onScroll, {passive: true});
onScroll();

function validateVacation(data) {
  if (data.schemaVersion !== 1 || !data.trip || !Array.isArray(data.stops) || !Array.isArray(data.days) || !data.pricing || !Array.isArray(data.flights) || !Array.isArray(data.schedule) || !Array.isArray(data.practical) || !data.agency || !data.photos) throw new Error('Onbekende indeling van de reisgegevens.');
  const iso = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T00:00:00Z'));
  if (!iso(data.trip.startDate) || !iso(data.trip.endDate) || !Number.isInteger(data.trip.travelers) || data.trip.travelers < 1) throw new Error('Controleer de reisdatums en het aantal reizigers.');
  const expectedDays = (Date.parse(data.trip.endDate) - Date.parse(data.trip.startDate)) / 86400000 + 1;
  if (data.days.length !== expectedDays) throw new Error('Het aantal dagen past niet bij de reisdatums.');
  if (!data.stops.length || data.stops.some(s => !Number.isInteger(s.nights) || s.nights < 1 || !Number.isFinite(s.lat) || !Number.isFinite(s.lon))) throw new Error('Controleer de nachten en kaartlocaties van de verblijven.');
  const missingPhoto = [...data.stops, ...data.days].find(x => !data.photos[x.photo]?.path);
  if (missingPhoto) throw new Error(`Foto "${missingPhoto.photo}" ontbreekt in photos.`);
  const hotelSequence = data.stops.flatMap((s, i) => Array(s.nights).fill(i));
  for (const [i, d] of data.days.entries()) {
    if (d.n !== i + 1 || !iso(d.date) || Date.parse(d.date) !== Date.parse(data.trip.startDate) + i * 86400000 || !Array.isArray(d.todo) || typeof d.notes !== 'string') throw new Error('Controleer de volgorde en beschrijving van de reisdagen.');
    if (d.transport !== null && (typeof d.transport !== 'object' || !d.transport.from || !d.transport.to || !d.transport.duration)) throw new Error(`Controleer de reisgegevens (transport) van dag ${d.n}.`);
    const stop = hotelSequence[i] ?? null;
    if (d.stop !== stop) throw new Error('De hotelnachten sluiten niet aan op het dagprogramma.');
    if (stop !== null) { const first = hotelSequence.indexOf(stop); if (d.night !== ((i - first + 1) + '/' + data.stops[stop].nights)) throw new Error('De nachtnummering klopt niet.'); }
  }
  for (const g of data.pricing.groups) {
    const sum = g.rows.reduce((n, [, amount]) => n + amount, 0);
    if (Math.abs(sum - g.total) > 0.005) throw new Error(`De prijsregels van "${g.title}" tellen niet op tot ${g.total}.`);
  }
}

function showLoadError(error) {
  const status = document.getElementById('dataStatus');
  status.hidden = false;
  status.innerHTML = `<strong>De reisgegevens konden niet worden geopend.</strong><p>${esc(error?.message || '')} Probeer opnieuw. Heb je de website rechtstreeks vanaf je computer geopend? Kies dan het bijbehorende vakantie.json-bestand.</p><button type="button" id="retryData" class="chip-button">Opnieuw proberen</button> <label class="chip-button">Reisbestand kiezen <input id="chooseData" type="file" accept=".json,application/json"></label>`;
  document.getElementById('retryData').addEventListener('click', loadVacation);
  document.getElementById('chooseData').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try { renderVacation(JSON.parse(await file.text())); } catch (err) { console.error(err); showLoadError(err); }
  });
}

async function loadVacation() {
  try {
    const response = await fetch(new URL('vakantie.json', document.baseURI), {cache: 'no-cache'});
    if (!response.ok) throw new Error('Reisbestand niet beschikbaar (' + response.status + ').');
    renderVacation(await response.json());
  } catch (error) { console.error(error); showLoadError(error); }
}
loadVacation();
