/* MFU Curriculum Landscape — prototype behaviour. No libraries. Mock data only. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } }
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- toast ---------- */
  let toastEl, toastT;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.append(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 3200);
  }
  window.proto = { toast };

  /* ---------- language: UI labels swap; Thai content never changes ---------- */
  function setLang(lang) {
    $$('[data-th]').forEach(el => {
      if (!el.dataset.en) el.dataset.en = el.textContent;
      el.textContent = lang === 'th' ? el.dataset.th : el.dataset.en;
    });
    $$('[data-th-ph]').forEach(el => {
      if (!el.dataset.enPh) el.dataset.enPh = el.placeholder;
      el.placeholder = lang === 'th' ? el.dataset.thPh : el.dataset.enPh;
    });
    document.documentElement.lang = lang === 'th' ? 'th' : 'en';
    document.documentElement.dataset.ui = lang;
    $$('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    store.set('mfu-ui-lang', lang);
  }
  $$('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
  if (store.get('mfu-ui-lang') === 'th') setLang('th');

  /* ---------- in-page tabs ---------- */
  $$('[role="tablist"]').forEach(list => {
    const tabs = $$('[role="tab"]', list);
    const activate = (t, focus) => {
      tabs.forEach(x => {
        const on = x === t;
        x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1;
        const p = document.getElementById(x.getAttribute('aria-controls')); if (p) p.hidden = !on;
      });
      if (focus) t.focus();
      if (list.dataset.hash !== undefined) history.replaceState(null, '', '#' + t.id.replace(/^tab-/, ''));
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => activate(t));
      t.addEventListener('keydown', e => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { e.preventDefault(); activate(tabs[(i + d + tabs.length) % tabs.length], true); }
      });
    });
    const fromHash = location.hash && document.getElementById('tab-' + location.hash.slice(1));
    if (fromHash && tabs.includes(fromHash)) activate(fromHash);
  });

  /* ---------- reveal panels ---------- */
  $$('[data-reveal]').forEach(btn => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open)); panel.hidden = !open;
      const lbl = btn.querySelector('[data-open-label]');
      if (lbl) { lbl.dataset.closed ??= lbl.textContent; lbl.textContent = open ? lbl.dataset.openLabel : lbl.dataset.closed; }
    });
  });

  /* ---------- sheets: provenance + "more" ---------- */
  const scrim = document.createElement('div'); scrim.className = 'scrim'; document.body.append(scrim);
  let openSheet = null, returnFocus = null;
  function show(sheet) {
    openSheet = sheet; returnFocus = document.activeElement;
    sheet.hidden = false; requestAnimationFrame(() => { sheet.classList.add('open'); scrim.classList.add('open'); });
    const f = sheet.querySelector('button, a'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 60);
  }
  function hide() {
    if (!openSheet) return;
    const s = openSheet; openSheet = null;
    s.classList.remove('open'); scrim.classList.remove('open');
    setTimeout(() => { if (!s.classList.contains('open')) s.hidden = true; }, 400);
    $$('[aria-expanded="true"][data-prov]').forEach(b => b.setAttribute('aria-expanded', 'false'));
    if (returnFocus) returnFocus.focus({ preventScroll: true });
  }
  scrim.addEventListener('click', hide);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });

  const more = $('#more-sheet');
  $$('[data-more]').forEach(b => b.addEventListener('click', () => show(more)));

  /* provenance — every figure traces to drivers, source, fetch date, method, confidence */
  const dataEl = $('#prov-data');
  const PROV = dataEl ? JSON.parse(dataEl.textContent) : {};
  const prov = $('#prov');
  const bandOf = v => v == null ? 'nil' : v >= 70 ? 'good' : v >= 55 ? 'warn' : v >= 40 ? 'serious' : 'crit';
  const bandWord = { good: 'Healthy', warn: 'Watch', serious: 'Concern', crit: 'Critical', nil: 'Not scored' };
  const dotVar = { good: '--dot-good', warn: '--dot-warning', serious: '--dot-serious', crit: '--dot-critical' };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const th = s => s ? `<span class="th" lang="th">${esc(s)}</span>` : '';

  function renderProv(d) {
    const b = d.band || bandOf(d.value);
    const big = d.value == null ? '<b class="nil">—</b>' : `<b class="band-${b}">${esc(d.value)}</b>`;
    const drivers = (d.drivers || []).map(x => {
      const nil = x.value == null;
      const bar = nil ? '<div class="drv-bar nil" aria-hidden="true"></div>'
        : `<div class="drv-bar" aria-hidden="true"><span style="width:${Math.max(2, Math.min(100, x.value))}%;background:var(${dotVar[bandOf(x.value)]})"></span></div>`;
      return `<div class="drv"><div class="drv-name">${esc(x.name)}${x.th ? ' ' + th(x.th) : ''}<small>${esc(x.note || '')}${nil && x.reason ? esc(x.reason) : ''}</small></div>
        <div class="drv-val num ${nil ? 'nil' : ''}">${nil ? '—' : esc(x.value)}</div>${bar}</div>`;
    }).join('');
    const sources = (d.sources || []).map(s => `<div class="src"><a href="#" onclick="return false">${esc(s.name)}</a><span class="faint xs">Fetched ${esc(s.fetched)}${s.tier ? ' · fallback tier: ' + esc(s.tier) : ''}</span></div>`).join('');
    const conf = d.confidence == null ? 'deterministic formula, not a model call' : `${d.confidence}${d.confidence < 0.85 ? ' — below the 0.85 gate' : ''}`;
    return `
      <div class="prov-big">${big}${d.value != null && d.unit ? `<span class="muted">${esc(d.unit)}</span>` : ''}
        <span class="chip ${b === 'warn' ? 'warn' : b === 'crit' ? 'crit' : b}"><i></i>${esc(d.bandLabel || bandWord[b])}</span></div>
      ${d.lede ? `<p class="muted sm">${d.lede}</p>` : ''}
      <dl class="prov-dl">
        ${d.completeness != null ? `<dt>Data completeness</dt><dd class="num">${esc(d.completeness)}%</dd>` : ''}
        <dt>Method version</dt><dd><code>${esc(d.method || '—')}</code></dd>
        <dt>Confidence</dt><dd>${esc(conf)}</dd>
        ${d.computed ? `<dt>Computed</dt><dd>${esc(d.computed)}</dd>` : ''}
        ${d.run ? `<dt>Run</dt><dd><code>${esc(d.run)}</code></dd>` : ''}
      </dl>
      ${drivers ? `<section><h3>Drivers <span class="faint xs">· a missing driver is left out of the average, never counted as 0</span></h3>${drivers}</section>` : ''}
      ${sources ? `<section><h3>Sources</h3>${sources}</section>` : ''}
      ${d.withheld ? `<section><h3>Withheld</h3><p class="sm muted">${esc(d.withheld)}</p></section>` : ''}
      <a class="btn quiet" href="#" onclick="return false" style="justify-self:start">See the working →</a>`;
  }
  $$('[data-prov]').forEach(btn => {
    btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', e => {
      e.preventDefault();
      const d = PROV[btn.dataset.prov]; if (!d || !prov) return;
      $('#prov-title', prov).textContent = d.title;
      $('#prov-sub', prov).innerHTML = d.sub || '';
      $('#prov-body', prov).innerHTML = renderProv(d);
      btn.setAttribute('aria-expanded', 'true');
      show(prov);
    });
  });
  $$('.prov-close').forEach(b => b.addEventListener('click', hide));

  /* ---------- rescore now ---------- */
  $$('[data-rescore]').forEach(btn => btn.addEventListener('click', () => {
    const line = btn.closest('.fresh'); const txt = line && line.querySelector('[data-fresh-text]');
    btn.disabled = true; const orig = btn.textContent; btn.textContent = 'Queued…';
    setTimeout(() => {
      btn.textContent = orig; btn.disabled = false;
      if (txt) txt.textContent = 'Scored just now · up to date';
      if (line) line.classList.add('ok');
      toast('Rescored. Composite and five dimensions recomputed from current inputs.');
    }, reduced ? 200 : 1800);
  }));

  /* ---------- selection ---------- */
  function syncSelection(root) {
    const boxes = $$('tbody input[type="checkbox"]:not(:disabled)', root);
    const n = boxes.filter(b => b.checked).length;
    const all = $('[data-select-all]', root);
    if (all) { all.checked = n && n === boxes.length; all.indeterminate = n > 0 && n < boxes.length; }
    $$('[data-selected-count]', root).forEach(el => el.textContent = n);
    $$('[data-needs-selection]', root).forEach(el => el.disabled = n === 0);
    const label = $('[data-selected-label]', root);
    if (label) label.textContent = n ? `${n} selected` : 'None selected';
  }
  $$('[data-selection]').forEach(root => {
    root.addEventListener('change', e => {
      if (e.target.matches('[data-select-all]')) $$('tbody input[type="checkbox"]:not(:disabled)', root).forEach(b => b.checked = e.target.checked);
      syncSelection(root);
    });
    syncSelection(root);
  });

  /* ---------- bulk accept: progress, kept failures, next page ---------- */
  $$('[data-bulk]').forEach(root => {
    const bar = $('[data-progress]', root), fill = bar && bar.querySelector('span');
    const status = $('[data-bulk-status]', root), fails = $('[data-bulk-fails]', root);
    const confirmBox = $('[data-confirm]', root), runBox = $('[data-running]', root), doneBox = $('[data-done]', root);
    const stopBtn = $('[data-stop]', root);
    let targets = [], stop = false, mode = 'selected';
    const arm = m => {
      mode = m;
      targets = m === 'all' ? $$('tbody tr', root).filter(r => !r.dataset.state)
        : $$('tbody tr', root).filter(r => r.querySelector('input[type="checkbox"]:checked') && !r.dataset.state);
      if (!targets.length) return;
      const total = m === 'all' ? Number(root.dataset.pending || targets.length) : targets.length;
      $('[data-confirm-text]', root).textContent = m === 'all' ? `Accept all ${total} pending? Each decision is recorded under your name.` : `Accept ${total} selected? Each decision is recorded under your name.`;
      confirmBox.hidden = false; doneBox.hidden = true;
      $('[data-confirm-go]', root).focus();
    };
    $('[data-accept-selected]', root)?.addEventListener('click', () => arm('selected'));
    $('[data-accept-all]', root)?.addEventListener('click', () => arm('all'));
    $('[data-confirm-cancel]', root)?.addEventListener('click', () => { confirmBox.hidden = true; });
    stopBtn?.addEventListener('click', () => { stop = true; stopBtn.textContent = 'Stopping…'; stopBtn.disabled = true; });
    $('[data-confirm-go]', root)?.addEventListener('click', async () => {
      confirmBox.hidden = true; runBox.hidden = false; fails.innerHTML = ''; stop = false;
      if (stopBtn) { stopBtn.disabled = false; stopBtn.textContent = 'Stop'; }
      $$('button', root.querySelector('.bulk-actions')).forEach(b => b.disabled = true);
      let ok = 0, bad = 0; const total = targets.length;
      for (let i = 0; i < total; i++) {
        if (stop) break;
        const r = targets[i];
        await new Promise(res => setTimeout(res, reduced ? 20 : 220));
        const fail = r.dataset.fail;
        r.dataset.state = fail ? 'failed' : 'accepted';
        const cell = r.querySelector('[data-decision]');
        if (fail) {
          bad++; cell.innerHTML = '<span class="chip crit"><i></i>Kept · failed</span>';
          fails.insertAdjacentHTML('beforeend', `<li><b class="th" lang="th">${esc(r.dataset.name)}</b> — ${esc(fail)}</li>`);
          const cb = r.querySelector('input[type="checkbox"]'); if (cb) { cb.checked = true; }
        } else {
          ok++; cell.innerHTML = '<span class="chip good"><i></i>Accepted</span>';
          const cb = r.querySelector('input[type="checkbox"]'); if (cb) { cb.checked = false; cb.disabled = true; }
        }
        const done = i + 1;
        fill.style.transform = `scaleX(${done / total})`;
        status.textContent = `Confirming ${done} of ${total}…`;
        status.dataset.th = `กำลังยืนยัน ${done} จาก ${total}`;
        if (document.documentElement.dataset.ui === 'th') status.textContent = status.dataset.th;
      }
      runBox.hidden = true; doneBox.hidden = false;
      const left = Math.max(0, Number(root.dataset.pending || 0) - ok);
      root.dataset.pending = left;
      $$('[data-pending-count]').forEach(el => el.textContent = left);
      $('[data-done-text]', root).textContent = `${ok} confirmed · ${bad} failed and kept for you · ${left} still pending${stop ? ' · stopped early' : ''}`;
      $$('button', root.querySelector('.bulk-actions')).forEach(b => b.disabled = false);
      syncSelection(root);
      toast(`${ok} accepted. ${bad ? bad + ' kept with the reason shown.' : ''}`);
    });
    $('[data-next-page]', root)?.addEventListener('click', () => {
      const tpl = $('template[data-next]', root); if (!tpl) return;
      const body = $('tbody', root);
      $$('tr[data-state="accepted"]', body).forEach(r => r.remove());
      body.append(tpl.content.cloneNode(true));
      tpl.remove();
      doneBox.hidden = true; fill.style.transform = 'scaleX(0)';
      $('[data-page-note]', root) && ($('[data-page-note]', root).textContent = 'Page 2 · oldest first');
      $$('input[type="checkbox"]', body).forEach(b => { if (!b.disabled) b.checked = false; });
      syncSelection(root);
    });
  });

  /* ---------- queue switcher (verify) ---------- */
  $$('[data-queue-select]').forEach(sel => sel.addEventListener('change', () => {
    const t = document.getElementById('tab-' + sel.value); if (t) t.click();
  }));

  /* ---------- review actions ---------- */
  $$('[data-review]').forEach(root => {
    const reason = $('[data-reason]', root), editor = $('[data-editor]', root), editBtn = $('[data-edit-approve]', root);
    editor?.addEventListener('input', () => { editBtn.disabled = false; });
    $('[data-approve]', root)?.addEventListener('click', () => { toast('Approved and materialised. The report now shows this block.'); nextItem(); });
    editBtn?.addEventListener('click', () => { toast('Edited and approved (1 field changed).'); nextItem(); });
    $('[data-reject]', root)?.addEventListener('click', () => {
      const box = $('[data-reject-box]', root);
      if (box.hidden) { box.hidden = false; reason.focus(); return; }
      if (!reason.value.trim()) { $('[data-reason-err]', root).hidden = false; reason.focus(); return; }
      toast('Rejected, with the reason on the record.'); nextItem();
    });
    function nextItem() {
      const cur = $('.rq-item[aria-current="true"]'); if (!cur) return;
      cur.dataset.done = 'true'; cur.removeAttribute('aria-current');
      const nx = $$('.rq-item').find(x => !x.dataset.done);
      if (nx) nx.setAttribute('aria-current', 'true');
      const left = $$('.rq-item').filter(x => !x.dataset.done).length;
      $$('[data-review-left]').forEach(el => el.textContent = left);
    }
    $$('.rq-item').forEach(it => it.addEventListener('click', () => {
      $$('.rq-item').forEach(x => x.removeAttribute('aria-current')); it.setAttribute('aria-current', 'true');
      if (matchMedia('(max-width: 960px)').matches) $('#rq-pane')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    }));
    document.addEventListener('keydown', e => {
      if (e.target.matches('input, textarea, select')) return;
      const items = $$('.rq-item'); const i = items.findIndex(x => x.getAttribute('aria-current') === 'true');
      if (e.key === 'j' || e.key === 'k') { const n = items[Math.max(0, Math.min(items.length - 1, i + (e.key === 'j' ? 1 : -1)))]; n && n.click(); }
      if (e.key === 'a') $('[data-approve]', root)?.click();
      if (e.key === 'r') $('[data-reject]', root)?.click();
    });
  });

  /* ---------- generic fake actions ---------- */
  $$('[data-fake]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); toast(b.dataset.fake); }));

  /* ---------- council export ---------- */
  $$('[data-export]').forEach(btn => btn.addEventListener('click', () => {
    const reason = $('#export-reason'); const err = $('#export-err');
    if (reason && !reason.value.trim()) { err.hidden = false; reason.focus(); return; }
    if (err) err.hidden = true;
    const orig = btn.textContent; btn.disabled = true; btn.textContent = 'Rendering PDF…';
    setTimeout(() => {
      btn.disabled = false; btn.textContent = orig;
      const list = $('#exports tbody');
      if (list) list.insertAdjacentHTML('afterbegin', `<tr><td>26 Sep 2026, just now</td><td>${esc($('#export-lang')?.value || 'TH')}</td><td class="r num">38</td><td class="r num hide-sm">1,412 kB</td><td class="hide-sm">council-pack.v3</td></tr>`);
      toast('Council pack rendered. The export is stamped with your reason and today’s methodology versions.');
    }, reduced ? 200 : 1600);
  }));

  /* ---------- search filter (programme list) ---------- */
  $$('[data-filter]').forEach(input => {
    const scope = document.getElementById(input.dataset.filter);
    const empty = $('[data-filter-empty]', scope.parentElement);
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase(); let shown = 0;
      $$('[data-search]', scope).forEach(r => { const hit = !q || r.dataset.search.toLowerCase().includes(q); r.hidden = !hit; if (hit) shown++; });
      $$('[data-group]', scope).forEach(g => { g.hidden = !$$('[data-search]', g).some(r => !r.hidden); });
      if (empty) { empty.hidden = shown > 0; const qq = $('[data-q]', empty); if (qq) qq.textContent = input.value; }
    });
  });
  $$('[data-clear-filter]').forEach(b => b.addEventListener('click', () => { const i = document.getElementById(b.dataset.clearFilter); i.value = ''; i.dispatchEvent(new Event('input')); i.focus(); }));
  /* ---------- single-row decisions ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-one]'); if (!b) return;
    const r = b.closest('tr'); const ok = b.dataset.one === 'accept';
    r.dataset.state = ok ? 'accepted' : 'rejected';
    const cb = r.querySelector('input[type="checkbox"]'); if (cb) { cb.checked = false; cb.disabled = true; }
    r.querySelector('[data-decision]').innerHTML = ok ? '<span class="chip good"><i></i>Accepted</span>' : '<span class="chip crit"><i></i>Rejected</span>';
    const root = b.closest('[data-bulk]'); if (root) { root.dataset.pending = Math.max(0, Number(root.dataset.pending) - 1); syncSelection(root); }
    toast(ok ? 'Accepted. Recorded under your name.' : 'Rejected. Recorded under your name.');
  });

  /* ---------- segmented toggles (visual state only) ---------- */
  $$('.seg').forEach(seg => seg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.dataset.fake) return;
    $$('button', seg).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  }));
})();
