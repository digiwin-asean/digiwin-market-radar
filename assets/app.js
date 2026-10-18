// 鼎捷市場Radar dashboard. Static: reads data/index.json and data/<date>/<layer>.json written by n8n.
(() => {
  const LAYERS = {
    'vn-local': { zh: '越南在地', en: 'Vietnam, local manufacturers', country: '越南', countryEn: 'Vietnam', kind: '在地', kindEn: 'Local' },
    'vn-huashang': { zh: '越南華商', en: 'Vietnam, Chinese-owned manufacturers', country: '越南', countryEn: 'Vietnam', kind: '華商', kindEn: 'Chinese-owned' },
    'th-local': { zh: '泰國在地', en: 'Thailand, local manufacturers', country: '泰國', countryEn: 'Thailand', kind: '在地', kindEn: 'Local' },
    'th-huashang': { zh: '泰國華商', en: 'Thailand, Chinese-owned manufacturers', country: '泰國', countryEn: 'Thailand', kind: '華商', kindEn: 'Chinese-owned' },
  };
  const ORDER = ['vn-local', 'vn-huashang', 'th-local', 'th-huashang'];
  const TABS = [
    { id: 'new', zh: '今日新訊', en: "What's new" },
    { id: 'heat', zh: '主題熱力圖', en: 'Topic heatmap' },
    { id: 'industry', zh: '產業地圖', en: 'Industry map' },
    { id: 'ideas', zh: '機會表', en: 'Content ideas' },
    { id: 'invest', zh: '投資動態', en: 'Investment' },
  ];
  const DEPT_EN = {
    經營管理: 'Management', 生產製造: 'Production', 生管排程: 'Planning', 倉儲物流: 'Warehouse', 採購供應鏈: 'Procurement',
    品質: 'Quality', 財務成本: 'Finance & cost', 業務訂單: 'Sales & orders', 人資: 'HR', 'IT/數位轉型': 'IT & digital', '法規/ESG/關務': 'Compliance & ESG',
  };
  const FORMAT_ZH = { blog: '部落格', EDM: 'EDM', webinar: '線上研討會', event: '實體活動' };

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (url) => (/^https?:\/\//i.test(String(url || '')) ? esc(url) : '#');
  const dayUrl = (date, slug, tab) => `day.html?date=${encodeURIComponent(date)}&layer=${encodeURIComponent(slug)}${tab ? `#${tab}` : ''}`;
  const zhDate = (date) => {
    const [y, m, d] = date.split('-').map(Number);
    const w = '日一二三四五六'[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    return `${y}年${m}月${d}日（${w}）`;
  };
  const $ = (selector, root = document) => root.querySelector(selector);

  async function getJSON(path) {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    return res.json();
  }

  function radarMark() {
    return `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="none" stroke="#00AFF0" stroke-width="2"/><circle cx="16" cy="16" r="8.5" fill="none" stroke="#00AFF0" stroke-opacity=".55" stroke-width="1.5"/><path class="radar-sweep" d="M16 16 L16 2 A14 14 0 0 1 28.1 9 Z" fill="#00E1FF" fill-opacity=".45"/><circle cx="21.5" cy="11" r="2.2" fill="#FF5A6E"/></svg>`;
  }

  function chrome(index) {
    const updated = index && index.generated_at ? new Date(index.generated_at) : null;
    const stamp = updated ? updated.toLocaleString('zh-TW', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
    $('#topbar').innerHTML = `<div class="wrap"><a class="brand" href="./">${radarMark()}<span>鼎捷市場Radar</span></a>${stamp ? `<span class="updated">最近更新 ${esc(stamp)}（越南時間）</span>` : ''}</div>`;
    if (index && index.sample) {
      $('#banner').innerHTML = '<div class="sample-banner"><div class="wrap"><strong>樣本資料</strong>：標題取自 2026-10-18 真實新聞，分類與痛點為人工示範，尚非 Claude 產出。<span class="en">Sample data for preview.</span></div></div>';
    }
  }

  function footer() {
    $('#footer').innerHTML = `<div class="wrap">
      <p>鼎捷數智 Digiwin 越南。資料每天 06:30 收集、07:30 由 AI 分類與摘要後更新（越南時間）。</p>
      <p>標示「AI翻譯」的摘要由 AI 從越南文、泰文或英文翻譯整理，請以原文為準。本頁只公開摘要與統計，公司層級的商機資料僅留存在內部系統。</p>
      <p class="en">Summaries marked AI translated were produced by AI from Vietnamese, Thai or English sources; check the original article.</p></div>`;
  }

  // ---------- home ----------

  function quadrant(slug, day, extra = '') {
    const meta = LAYERS[slug];
    const entry = day && day.layers[slug];
    if (!entry) {
      return `<section class="quad empty ${extra}"><div><h2>${meta.zh}<span class="en">${meta.en}</span></h2></div><p class="summary">尚無報告。</p></section>`;
    }
    const highlights = (entry.highlights || []).map((text) => `<li>${esc(text)}</li>`).join('');
    return `<section class="quad ${extra}">
      <div><h2>${meta.zh}<span class="en">${meta.en}</span></h2><div class="date">${esc(zhDate(day.date))}</div></div>
      <div class="figures">
        <div class="figure"><b>${entry.items}</b><span>相關文章</span></div>
        <div class="figure new"><b>${entry.newPains}</b><span>新痛點</span></div>
        <div class="figure"><b>${entry.repeatPains}</b><span>重複出現</span></div>
      </div>
      <p class="summary">${esc(entry.summary_zh)}</p>
      ${highlights ? `<ul>${highlights}</ul>` : ''}
      <a class="open" href="${dayUrl(day.date, slug)}">查看${meta.zh}儀表板</a>
    </section>`;
  }

  function archive(days) {
    const byMonth = new Map();
    for (const day of days) {
      const key = day.date.slice(0, 7);
      if (!byMonth.has(key)) byMonth.set(key, new Map());
      byMonth.get(key).set(day.date, day);
    }
    return [...byMonth.entries()].map(([month, map]) => {
      const [y, m] = month.split('-').map(Number);
      const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
      const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const cells = ['日', '一', '二', '三', '四', '五', '六'].map((d) => `<div class="dow">${d}</div>`);
      for (let i = 0; i < first; i += 1) cells.push('<div></div>');
      for (let d = 1; d <= total; d += 1) {
        const date = `${month}-${String(d).padStart(2, '0')}`;
        const day = map.get(date);
        const links = day ? ORDER.filter((slug) => day.layers[slug]).map((slug) => `<a href="${dayUrl(date, slug)}">${LAYERS[slug].zh} ${day.layers[slug].items}</a>`).join('') : '';
        cells.push(`<div class="day${day ? ' has' : ''}"><div class="n">${d}</div>${links}</div>`);
      }
      return `<div class="month"><h3>${y}年${m}月</h3><div class="cal">${cells.join('')}</div></div>`;
    }).join('');
  }

  async function renderHome() {
    const index = await getJSON('data/index.json');
    chrome(index);
    const day = index.days[0];
    $('#main').innerHTML = `<div class="wrap">
      <section class="hero">
        <h1>越南與泰國製造業，每天早上的市場訊號</h1>
        <p>每天收集新聞、招聘與社群資訊，由 AI 按部門整理出製造業的新痛點與重複出現的需求。四個視角：越南與泰國，各分在地企業與華商（台、陸、港、新、馬資）。</p>
      </section>
      <div class="board" role="group" aria-label="四個視角">
        <div class="corner"></div>
        <div class="axis col">在地企業 <span class="en">Local</span></div>
        <div class="axis col">華商 <span class="en">Chinese-owned</span></div>
        <div class="axis row">越南</div>${quadrant('vn-local', day)}${quadrant('vn-huashang', day)}
        <div class="axis row row-2">泰國</div>${quadrant('th-local', day, 'row-2')}${quadrant('th-huashang', day, 'row-2')}
      </div>
      <section class="archive">
        <h2 class="section-title">歷史紀錄</h2>
        <p class="section-note">每天一份報告，每個視角各一份。點日期中的視角名稱開啟當天的儀表板。</p>
        ${archive(index.days)}
      </section>
    </div>`;
    footer();
  }

  // ---------- day ----------

  function painCard(pain, items, isNew) {
    const refs = (pain.itemIds || []).map((id) => items.get(id)).filter(Boolean).slice(0, 3)
      .map((item) => `<li><a href="${safeUrl(item.url)}" target="_blank" rel="noopener">${esc(item.summary_zh || item.title)}</a> <span class="en">${esc(item.source)}</span></li>`).join('');
    const departments = (pain.departments || []).map((d) => `<span class="badge">${esc(d)}</span>`).join(' ');
    return `<article class="pain${isNew ? ' is-new' : ''}">
      <span class="code">${esc(pain.code)}</span><h3>${esc(pain.text_zh)}</h3>
      ${pain.text_en ? `<span class="en">${esc(pain.text_en)}</span>` : ''}
      <div class="meta">${departments}<span>${isNew ? `${pain.count} 篇提及` : `累計 ${pain.count} 次`}</span>${pain.aiTranslated ? '<span class="badge ai">AI翻譯</span>' : ''}</div>
      ${pain.quote ? `<blockquote>${esc(pain.quote)}</blockquote>` : ''}
      ${refs ? `<ul class="refs">${refs}</ul>` : ''}
    </article>`;
  }

  function itemRow(item) {
    const pain = item.painCode ? `<span class="badge">${esc(item.painCode)}</span>` : '';
    return `<li><a href="${safeUrl(item.url)}" target="_blank" rel="noopener">${esc(item.summary_zh || item.title)}</a>
      ${item.title && item.summary_zh ? `<span class="orig">${esc(item.title)}</span>` : ''}
      <div class="src"><span>${esc(item.source)}</span>${item.departments.map((d) => `<span class="badge">${esc(d)}</span>`).join('')}${pain}${item.huashang ? '<span class="badge hs">華商</span>' : ''}${item.aiTranslated ? '<span class="badge ai">AI翻譯</span>' : ''}</div></li>`;
  }

  function tabNew(data, items) {
    const kpi = (n, zh, en, cls = '') => `<div class="kpi ${cls}"><b>${n}</b><span>${zh}</span> <span class="en">${en}</span></div>`;
    const seen = new Set();
    const ongoing = [...data.rising, ...data.recurring].filter((p) => !seen.has(p.code) && seen.add(p.code));
    return `<div class="kpis">${kpi(data.stats.items, '相關文章', 'articles')}${kpi(data.stats.newPains, '新痛點', 'new pains', 'new')}${kpi(data.stats.repeatPains, '重複出現', 'recurring')}${kpi(data.stats.rising, '持續升溫', 'rising')}</div>
      <p class="lede">${esc(data.summary_zh)}</p><p class="en">${esc(data.summary_en)}</p>
      <div class="cols">
        <div class="col"><h2>今日第一次出現 <span class="en">First seen today</span></h2>
          ${data.newPains.length ? data.newPains.map((p) => painCard(p, items, true)).join('') : '<p class="empty-note">今天沒有新的痛點。</p>'}</div>
        <div class="col"><h2>重複出現與升溫 <span class="en">Recurring and rising</span></h2>
          ${ongoing.length ? ongoing.map((p) => painCard(p, items, false)).join('') : '<p class="empty-note">還沒有重複出現的痛點。累積幾天資料後會出現在這裡。</p>'}</div>
      </div>
      <h2 class="section-title" style="margin-top:28px">今日文章 <span class="en">Today's articles</span></h2>
      <p class="section-note">依重要性排序，點標題開啟原文。</p>
      ${data.items.length ? `<ul class="list">${data.items.map(itemRow).join('')}</ul>` : '<p class="empty-note">今天沒有相關文章。</p>'}`;
  }

  // Five shades; the top shade needs at least 5 articles so a quiet day does not look hot.
  function level(n, max) {
    if (!n) return '';
    return `l${Math.min(5, Math.max(1, Math.ceil((n / Math.max(max, 5)) * 5)))}`;
  }

  function tabHeat(data, items) {
    const { rows, cols, cells, ranking } = data.heatmap;
    if (!cols.length) return '<p class="empty-note">今天沒有可繪製的資料。</p>';
    const max = Math.max(...Object.values(cells).map((c) => c.items), 1);
    const head = cols.map((c) => `<th scope="col">${esc(c.label)}</th>`).join('');
    const body = rows.map((row) => `<tr><th scope="row">${esc(row)}<small>${esc(DEPT_EN[row] || '')}</small></th>${cols.map((col) => {
      const cell = cells[`${row}|${col.key}`];
      return cell
        ? `<td><button class="cell ${level(cell.items, max)}" data-n="${cell.items}" data-key="${esc(`${row}|${col.key}`)}" aria-pressed="false" aria-label="${esc(row)}、${esc(col.label)}：${cell.items} 篇">${cell.items}</button></td>`
        : '<td><span class="cell" aria-hidden="true"></span></td>';
    }).join('')}</tr>`).join('');
    const top = ranking[0] ? ranking[0].items : 1;
    const bars = ranking.map((r) => `<div class="bar"><span>${esc(r.department)}</span><div class="track"><div class="fill" style="width:${Math.round((r.items / top) * 100)}%"></div></div><b>${r.items}</b></div>`).join('');
    return `<div class="heat-layout">
      <div>
        <div class="scroll"><table class="heat"><thead><tr><th></th>${head}</tr></thead><tbody>${body}</tbody></table>
          <div class="legend">少 <i style="background:var(--heat-1)"></i><i style="background:var(--heat-2)"></i><i style="background:var(--heat-3)"></i><i style="background:var(--heat-4)"></i><i style="background:var(--heat-5)"></i> 多　數字為文章數，一篇文章可屬兩個部門。</div></div>
        <h2 class="section-title" style="margin-top:26px">各部門文章數 <span class="en">Articles by department</span></h2>
        <div class="bars">${bars}</div>
      </div>
      <aside class="side" id="side" aria-live="polite"><h3>點一格查看文章</h3><p class="sub">選一個部門與來源的交叉格，這裡會列出相關文章與痛點。</p></aside>
    </div>`;
  }

  function bindHeat(data, items) {
    const side = $('#side');
    document.querySelectorAll('.cell[data-key]').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.cell[aria-pressed="true"]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
        button.setAttribute('aria-pressed', 'true');
        const key = button.dataset.key;
        const [row, col] = key.split('|');
        const list = (data.heatmap.cells[key]?.ids || []).map((id) => items.get(id)).filter(Boolean);
        side.innerHTML = `<h3>${esc(row)}</h3><p class="sub">${esc(col)}，${list.length} 篇</p><ul class="list">${list.map(itemRow).join('')}</ul>`;
      });
    });
  }

  function tabIndustry(data) {
    const { rows, cols, cells } = data.industryMap;
    const values = Object.values(cells);
    if (!values.length) return '<p class="empty-note">今天的文章沒有標示產業。</p>';
    const max = Math.max(...values, 1);
    const used = cols.filter((col) => rows.some((row) => cells[`${row}|${col}`]));
    const body = rows.map((row) => `<tr><th scope="row">${esc(row)}</th>${used.map((col) => {
      const n = cells[`${row}|${col}`] || 0;
      return `<td>${n ? `<span class="cell ${level(n, max)}" style="display:inline-grid;place-items:center">${n}</span>` : '<span class="cell" aria-hidden="true"></span>'}</td>`;
    }).join('')}</tr>`).join('');
    return `<p class="section-note">重點產業與部門的交叉：數字為同時標示該產業與部門的文章數。</p>
      <div class="scroll"><table class="heat cjk-head"><thead><tr><th></th>${used.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function tabIdeas(data) {
    if (!data.opportunities.length) return '<p class="empty-note">今天沒有可轉成內容的痛點。</p>';
    const kind = { new: ['今日新出現', 'kind-new'], rising: ['持續升溫', 'kind-rising'], recurring: ['重複出現', ''] };
    const rows = data.opportunities.map((o) => `<tr>
      <td><b>${esc(o.pain_code)}</b></td>
      <td>${esc(o.pain_zh)}<div class="en">${esc(o.pain_en)}</div></td>
      <td>${o.departments.map((d) => `<span class="badge">${esc(d)}</span>`).join(' ')}</td>
      <td class="nowrap"><span class="${kind[o.kind][1]}">${kind[o.kind][0]}</span></td>
      <td class="num">${o.count}</td>
      <td>${o.angle_zh ? `${esc(o.angle_zh)}<div class="en">${esc(o.why_en)}</div>` : '<span class="en">尚無建議</span>'}</td>
      <td class="nowrap">${esc(FORMAT_ZH[o.format] || '')}</td></tr>`).join('');
    return `<p class="section-note">把今天的痛點轉成內容題目。AI 建議的切角排在前面，其餘痛點可由行銷團隊補上。</p>
      <div class="scroll"><table class="data"><thead><tr><th>代碼</th><th>痛點</th><th>部門</th><th class="nowrap">狀態</th><th class="nowrap">次數</th><th class="wide">內容切角</th><th class="nowrap">形式</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function tabInvest(data) {
    const inv = data.investment || { total: 0, byProvince: [], byType: {} };
    if (!inv.total) return '<p class="empty-note">目前沒有已收集的投資、消防或環評訊號。</p>';
    const types = Object.entries(inv.byType).sort((a, b) => b[1] - a[1]);
    const top = inv.byProvince[0] ? inv.byProvince[0].total : 1;
    const rows = inv.byProvince.map((p) => `<tr><td class="nowrap">${esc(p.province)}</td><td class="num">${p.total}</td><td><div class="track" style="height:10px;background:var(--paper);border-radius:5px;min-width:80px"><div class="fill" style="height:10px;border-radius:5px;background:var(--mfg);width:${Math.round((p.total / top) * 100)}%"></div></div></td><td>${Object.entries(p.byType).map(([t, n]) => `<span class="badge">${esc(t)} ${n}</span>`).join(' ')}</td></tr>`).join('');
    return `<p class="section-note">${esc(inv.scope)}的公司層級訊號統計（累計），依省市分布。</p>
      <div class="kpis">${types.slice(0, 4).map(([t, n]) => `<div class="kpi"><b>${n}</b><span>${esc(t)}</span></div>`).join('')}</div>
      <div class="scroll"><table class="data"><thead><tr><th class="nowrap">省市</th><th class="nowrap">件數</th><th></th><th>訊號類型</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="note">只顯示數量。公司名稱、稅號與來源連結僅保存在內部系統，由行銷團隊審核後再交給業務。越南省市已依 2025 年 7 月合併後的 34 個省市歸類。</p>`;
  }

  async function renderDay() {
    const params = new URLSearchParams(location.search);
    const index = await getJSON('data/index.json');
    chrome(index);
    const slug = LAYERS[params.get('layer')] ? params.get('layer') : 'vn-local';
    const dates = index.days.map((d) => d.date);
    const date = dates.includes(params.get('date')) ? params.get('date') : index.latest;
    const meta = LAYERS[slug];
    document.title = `${meta.zh} ${date}｜鼎捷市場Radar`;

    let data;
    try {
      data = await getJSON(`data/${date}/${slug}.json`);
    } catch {
      $('#main').innerHTML = `<div class="wrap"><p class="loading">${esc(zhDate(date))}沒有${meta.zh}的報告。<a href="./">回到首頁</a></p></div>`;
      footer();
      return;
    }
    const items = new Map(data.items.map((item) => [item.id, item]));
    const at = dates.indexOf(date);
    const prev = dates[at + 1];
    const next = dates[at - 1];
    const sw = (s) => `<a href="${dayUrl(date, s, location.hash.slice(1))}"${s === slug ? ' aria-current="page"' : ''}>${LAYERS[s].kind}</a>`;
    const options = dates.map((d) => `<option value="${esc(d)}"${d === date ? ' selected' : ''}>${esc(d)}</option>`).join('');

    $('#main').innerHTML = `<div class="wrap">
      <div class="dayhead">
        <h1>${meta.zh}　${esc(zhDate(date))}<span class="en">${meta.en}</span></h1>
        <nav class="switch" aria-label="切換視角"><span class="lab">越南</span>${sw('vn-local')}${sw('vn-huashang')}<span class="lab">泰國</span>${sw('th-local')}${sw('th-huashang')}</nav>
        <nav class="datenav" aria-label="切換日期">${prev ? `<a href="${dayUrl(prev, slug, location.hash.slice(1))}">前一天</a>` : '<span>前一天</span>'}
          <label class="visually-hidden" for="pick" hidden>日期</label><select id="pick" aria-label="選擇日期">${options}</select>
          ${next ? `<a href="${dayUrl(next, slug, location.hash.slice(1))}">後一天</a>` : '<span>後一天</span>'}</nav>
      </div>
      <div class="tabs" role="tablist" aria-label="儀表板分頁">${TABS.map((t) => `<button role="tab" id="tab-${t.id}" aria-controls="panel" data-tab="${t.id}" aria-selected="false">${t.zh}</button>`).join('')}</div>
      <section class="panel" id="panel" role="tabpanel"></section>
    </div>`;
    $('#pick').addEventListener('change', (e) => { location.href = dayUrl(e.target.value, slug, location.hash.slice(1)); });

    const show = (id) => {
      const tab = TABS.some((t) => t.id === id) ? id : 'new';
      document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
      $('#panel').setAttribute('aria-labelledby', `tab-${tab}`);
      const render = { new: tabNew, heat: tabHeat, industry: tabIndustry, ideas: tabIdeas, invest: tabInvest }[tab];
      $('#panel').innerHTML = render(data, items);
      if (tab === 'heat') bindHeat(data, items);
      document.querySelectorAll('.switch a, .datenav a').forEach((a) => { a.href = a.href.replace(/#.*$/, '') + `#${tab}`; });
    };
    document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => { history.replaceState(null, '', `#${b.dataset.tab}`); show(b.dataset.tab); }));
    $('.tabs').addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const buttons = [...document.querySelectorAll('.tabs button')];
      const i = buttons.findIndex((b) => b.getAttribute('aria-selected') === 'true');
      const nextButton = buttons[(i + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length];
      nextButton.focus();
      nextButton.click();
    });
    show(location.hash.slice(1));
    footer();
  }

  const fail = (error) => {
    $('#main').innerHTML = `<div class="wrap"><p class="loading">資料載入失敗：${esc(error.message)}。請稍後重新整理。</p></div>`;
  };
  (document.body.dataset.page === 'day' ? renderDay() : renderHome()).catch(fail);
})();
