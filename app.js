(() => {
  'use strict';

  const app = document.getElementById('app');
  let DATA = null;

  // ---------- helpers ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = s => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
  const labName = l => ({ 0: 'Dùng chung', 1: 'Lab 1', 2: 'Lab 2', 3: 'Lab 3' }[l] || '');
  const labCls = l => (l ? 'l' + l : '');
  const STUDENT = {
    S: { name: 'Lan', desc: 'hỏi từ gốc' },
    G: { name: 'Minh', desc: 'hỏi kiểu giám khảo' },
  };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- theme ----------
  const themeBtn = document.getElementById('themeBtn');
  const savedTheme = store.get('shtb-theme', null);
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  themeBtn.addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    store.set('shtb-theme', next);
  });

  // ---------- data helpers ----------
  const topicsOf = lab => DATA.topics.filter(t => t.lab === lab && t.id !== 'EXAM');
  const topicById = id => DATA.topics.find(t => t.id === id);
  const ORDER = () => DATA.topics.filter(t => t.id !== 'EXAM');

  function practicePool() {
    const pool = [];
    const exam = topicById('EXAM');
    if (exam) exam.final.steps.forEach((s, i) => pool.push({
      key: 'EXAM-' + i, q: s.name, src: 'Đề mẫu', lab: 'exam', topicId: 'EXAM',
      answer: s.what, extra: s.why, bad: s.ifWrong, keyPoints: [],
    }));
    ORDER().forEach(t => (t.final.examQuestions || []).forEach((q, i) => pool.push({
      key: t.id + '-' + i, q: q.q, src: labName(t.lab) + ' · ' + t.final.title, lab: t.lab, topicId: t.id,
      answer: q.answer, keyPoints: q.keyPoints || [],
    })));
    return pool;
  }

  // ---------- views ----------
  function viewHome() {
    const pool = practicePool();
    const known = store.get('shtb-known', {});
    const knownCount = pool.filter(p => known[p.key] === 1).length;
    const nThreads = DATA.topics.reduce((s, t) => s + t.threads.length, 0);
    const nTurns = DATA.topics.reduce((s, t) => s + t.threads.reduce((a, th) => a + th.turns.length, 0), 0);
    const exam = topicById('EXAM');
    const labs = [
      { lab: 1, title: 'Lab 1 · Cấu trúc thực vật (Plant structures)', desc: 'Cắt lát → Javel → acid acetic → nhuộm → quan sát' },
      { lab: 0, title: 'Dùng chung · Lên tiêu bản & kính hiển vi', desc: 'Lamen 45°, bọt khí, mẫu dày, tiêu bản đạt chuẩn' },
      { lab: 2, title: 'Lab 2 · Phân bào (Cell division)', desc: 'HCl 1N + hơ lửa → orcein → ép tiêu bản' },
      { lab: 3, title: 'Lab 3 · Tiêu bản vĩnh viễn (Permanent slides)', desc: 'FAA → albumin → cồn tăng dần → xylene → Canada balsam' },
    ];
    app.innerHTML = `
      <h1>Ôn thi Thí nghiệm Sinh học Tế bào</h1>
      <p class="lede">Mỗi bước thí nghiệm đều trả lời 3 câu: <b>làm gì</b>, <b>tại sao</b>, và <b>làm sai thì hỏng gì</b>. Các câu "tại sao" được truy tới gốc qua các chuỗi hỏi đáp giữa giảng viên và hai sinh viên.</p>
      <div class="stat-row">
        <div class="stat"><b>${ORDER().length}</b><span>chủ đề</span></div>
        <div class="stat"><b>${nThreads}</b><span>chuỗi hỏi đáp</span></div>
        <div class="stat"><b>${nTurns}</b><span>lượt trao đổi</span></div>
        <div class="stat"><b>${knownCount}/${pool.length}</b><span>câu đã thuộc</span></div>
      </div>
      <input class="search" id="q" type="search" placeholder="Tìm nhanh: HCl, bọt khí, xylene, kỳ giữa…" autocomplete="off">
      <div id="results"></div>

      <h2>📝 9 câu hỏi đề mẫu</h2>
      <div class="grid">
        ${exam ? exam.final.steps.map((s, i) => `<a class="topic-link" href="#/exam/q${i}"><span class="flow-num">${i + 1}</span><span class="t">${esc(s.name)}</span><span class="arrow">→</span></a>`).join('') : ''}
      </div>

      <h2>📚 Học theo từng bài</h2>
      ${labs.map(L => `
        <section class="lab-block">
          <div class="lab-head"><span class="pill ${labCls(L.lab)}">${labName(L.lab)}</span><h3 style="margin:0">${esc(L.title.split('·')[1] || L.title)}</h3></div>
          <p class="muted" style="margin:-4px 0 10px">${esc(L.desc)}</p>
          <div class="grid">
            ${topicsOf(L.lab).map(t => `
              <a class="topic-link ${labCls(t.lab)}" href="#/topic/${t.id}">
                <span><span class="t">${esc(t.final.title)}</span><br><span class="meta">${t.final.steps.length} ý · ${t.threads.length} chuỗi hỏi đáp · ${(t.final.examQuestions || []).length} câu hỏi thi</span></span>
                <span class="arrow">→</span>
              </a>`).join('')}
          </div>
        </section>`).join('')}

      <h2>🧭 Cách ôn hiệu quả</h2>
      <div class="flow">
        <div class="flow-item"><span class="flow-num">1</span><div>Đọc <b>Đề mẫu</b> để biết giảng viên hay hỏi kiểu gì.</div></div>
        <div class="flow-item"><span class="flow-num">2</span><div>Vào từng chủ đề: đọc phần <b>Các bước</b>, bấm mở các chuỗi <b>Thảo luận</b> ở chỗ nào chưa hiểu.</div></div>
        <div class="flow-item"><span class="flow-num">3</span><div>Học bảng <b>Chất gì – mẫu gì</b>; luyện <b>Nhận diện kỳ</b> bằng ảnh thật.</div></div>
        <div class="flow-item"><span class="flow-num">4</span><div>Bài thi bằng tiếng Anh? Vào <b><a href="#/vocab">Từ vựng EN</a></b>: thuật ngữ, mẫu câu và đáp án tiếng Anh mẫu.</div></div>
        <div class="flow-item"><span class="flow-num">5</span><div>Vào <b>Luyện thi</b>: tự viết câu trả lời rồi mới mở đáp án, đánh dấu câu đã thuộc.</div></div>
      </div>`;
    const q = document.getElementById('q');
    q.addEventListener('input', () => renderSearch(q.value));
  }

  function searchIndex() {
    if (searchIndex.cache) return searchIndex.cache;
    const idx = [];
    DATA.topics.forEach(t => {
      const base = t.id === 'EXAM' ? '#/exam' : '#/topic/' + t.id;
      t.final.steps.forEach((s, i) => idx.push({ href: base + '/' + (t.id === 'EXAM' ? 'q' : 's') + i, title: s.name, where: t.final.title, text: [s.name, s.what, s.why, s.ifWrong].join(' ') }));
      (t.final.keyConcepts || []).forEach(c => idx.push({ href: base + '/concepts', title: c.term, where: t.final.title + ' · khái niệm', text: c.term + ' ' + c.explain }));
      (t.final.examQuestions || []).forEach((q, i) => idx.push({ href: base + '/e' + i, title: q.q, where: t.final.title + ' · câu hỏi thi', text: q.q + ' ' + q.answer }));
      t.threads.forEach(th => idx.push({ href: base + '/t-' + th.id, title: th.turns[0].text, where: t.final.title + ' · thảo luận', text: th.turns.map(x => x.text).join(' ') }));
    });
    (DATA.table || []).forEach(r => idx.push({ href: '#/table', title: r.chemical + ' (' + r.lab + ')', where: 'Bảng hóa chất', text: Object.values(r).join(' ') }));
    return (searchIndex.cache = idx);
  }
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  function renderSearch(q) {
    const box = document.getElementById('results');
    const nq = norm(q.trim());
    if (nq.length < 2) { box.innerHTML = ''; return; }
    const words = nq.split(/\s+/);
    const hits = searchIndex().filter(it => { const n = norm(it.text); return words.every(w => n.includes(w)); }).slice(0, 12);
    box.innerHTML = hits.length ? hits.map(h => `<a class="result" href="${h.href}"><small>${esc(h.where)}</small>${esc(h.title)}</a>`).join('') : '<p class="muted" style="margin-top:8px">Không tìm thấy.</p>';
  }

  function stepCard(s, i, anchor) {
    return `<article class="step" id="${anchor}${i}">
      <h3><span class="n">${String(i + 1).padStart(2, '0')}</span><span>${esc(s.name)}</span></h3>
      <div class="blk what"><b class="lbl">Làm gì</b>${fmt(s.what)}</div>
      <div class="blk why"><b class="lbl">Tại sao</b>${fmt(s.why)}</div>
      <div class="blk bad"><b class="lbl">Làm sai / bỏ qua → tác hại</b>${fmt(s.ifWrong)}</div>
    </article>`;
  }

  function threadView(t, th) {
    const k = th.id[0];
    const st = STUDENT[k] || STUDENT.S;
    const corr = (t.final.threadCorrections || []).filter(c => c.threadId === th.id);
    const qCount = th.turns.filter(x => x.role === 'student').length;
    return `<details class="thread" id="t-${th.id}">
      <summary><span class="who-tag ${k}">${st.name}</span><span class="q">${esc(th.turns[0].text)}</span><span class="depth">${qCount > 1 ? qCount + ' lần hỏi tiếp' : '1 lượt'}</span></summary>
      <div class="chat">
        ${th.turns.map(x => x.role === 'student'
          ? `<div class="msg student"><span class="av ${k}">${st.name[0]}</span><div class="bubble"><span class="who">${st.name} · ${st.desc}</span>${fmt(x.text)}</div></div>`
          : `<div class="msg teacher"><span class="av T">GV</span><div class="bubble"><span class="who">Giảng viên</span>${fmt(x.text)}</div></div>`).join('')}
      </div>
      ${corr.map(c => `<div class="fix-note"><b>Đính chính sau kiểm định:</b> ${fmt(c.correction)}</div>`).join('')}
      ${th.note ? `<div class="fix-note"><b>Ghi chú rà soát:</b> ${fmt(th.note)}</div>` : ''}
      <div class="understood">${th.capped ? '⏹ Dừng sau số vòng tối đa' : '✔ ' + st.name + ' đã hiểu'}</div>
    </details>`;
  }

  function qaView(q, i, prefix) {
    return `<div class="qa exam-q" id="${prefix}${i}">
      <div class="qq">${esc(q.q)}</div>
      <div class="btn-row"><button class="btn" data-toggle="${prefix}a${i}">Xem đáp án</button></div>
      <div class="ans" id="${prefix}a${i}" hidden>
        ${fmt(q.answer)}
        ${q.keyPoints && q.keyPoints.length ? `<ul class="kp">${q.keyPoints.map(k => `<li>${fmt(k)}</li>`).join('')}</ul>` : ''}
      </div>
    </div>`;
  }

  function viewTopic(id, sub) {
    const t = topicById(id);
    if (!t) return viewHome();
    const f = t.final;
    const list = ORDER();
    const idx = list.indexOf(t);
    const prev = list[idx - 1], next = list[idx + 1];
    app.innerHTML = `
      <div class="crumb"><a href="#/">Tổng quan</a> › ${labName(t.lab)}</div>
      <span class="pill ${labCls(t.lab)}">${labName(t.lab)}</span>
      <h1 style="margin-top:8px">${esc(f.title)}</h1>
      <p class="lede">${fmt(f.overview)}</p>
      ${t.issues && t.issues.length ? `<span class="badge-check">🛡 Kiểm định đã bắt & sửa ${t.issues.length} chỗ</span>` : `<span class="badge-check">🛡 Đã qua kiểm định</span>`}
      <div class="toc">
        <a href="#/topic/${id}/steps">Các bước</a>
        <a href="#/topic/${id}/concepts">Khái niệm nền</a>
        <a href="#/topic/${id}/threads">Thảo luận (${t.threads.length})</a>
        <a href="#/topic/${id}/mistakes">Lỗi hay gặp</a>
        <a href="#/topic/${id}/exam">Câu hỏi thi</a>
      </div>

      <h2 id="steps">🔬 Các bước: làm gì · tại sao · sai thì sao</h2>
      ${f.steps.map((s, i) => stepCard(s, i, 's')).join('')}

      <h2 id="concepts">🧱 Khái niệm nền</h2>
      <div class="concepts">${(f.keyConcepts || []).map(c => `<details class="concept"><summary>${esc(c.term)}</summary><p>${fmt(c.explain)}</p></details>`).join('')}</div>

      <h2 id="threads">💬 Thảo luận: hỏi đến khi hiểu</h2>
      <p class="muted"><span class="who-tag S">Lan</span> hỏi từ gốc (bản chất hóa học, cơ chế) · <span class="who-tag G">Minh</span> hỏi kiểu giám khảo (làm sai thì sao, so sánh). Bấm vào từng câu để xem cả chuỗi.</p>
      ${t.threads.map(th => threadView(t, th)).join('')}

      <h2 id="mistakes">⚠️ Lỗi hay gặp</h2>
      ${(f.commonMistakes || []).map(m => `<div class="mistake"><div class="m">✗ ${esc(m.mistake)}</div><div class="c">→ ${fmt(m.consequence)}</div><div class="f">✓ ${fmt(m.fix)}</div></div>`).join('')}

      <h2 id="exam">🎯 Câu hỏi thi</h2>
      ${(f.examQuestions || []).map((q, i) => qaView(q, i, 'e')).join('')}

      ${t.issues && t.issues.length ? `<details class="concept" style="margin-top:20px"><summary>🛡 Nhật ký kiểm định (lỗi trong bản nháp đã được sửa)</summary>${t.issues.map(x => `<p><b>${esc(x.where)}:</b> ${fmt(x.problem)}<br><span style="color:var(--ok)">→ ${fmt(x.correction)}</span></p>`).join('')}</details>` : ''}

      <div class="btn-row" style="justify-content:space-between;margin-top:28px">
        ${prev ? `<a class="btn" href="#/topic/${prev.id}">← ${esc(prev.final.title.slice(0, 40))}${prev.final.title.length > 40 ? '…' : ''}</a>` : '<span></span>'}
        ${next ? `<a class="btn primary" href="#/topic/${next.id}">${esc(next.final.title.slice(0, 40))}${next.final.title.length > 40 ? '…' : ''} →</a>` : ''}
      </div>`;
    bindToggles();
    jump(sub);
  }

  function viewExam(sub) {
    const t = topicById('EXAM');
    if (!t) return viewHome();
    const f = t.final;
    app.innerHTML = `
      <div class="crumb"><a href="#/">Tổng quan</a> › Đề mẫu</div>
      <h1>9 câu hỏi đề mẫu</h1>
      <p class="lede">${fmt(f.overview)}</p>
      <p class="muted">Mỗi câu: <b>Trả lời</b> là phần viết vào bài thi; <b>Giải thích gốc</b> giúp bạn hiểu để không học vẹt; <b>Liên quan</b> là hậu quả khi làm sai.</p>
      ${f.steps.map((s, i) => `
        <article class="step exam-q" id="q${i}">
          <h3><span class="n">CÂU ${i + 1}</span><span>${esc(s.name)}</span></h3>
          <div class="blk what"><b class="lbl">Trả lời</b>${fmt(s.what)}</div>
          <div class="blk why"><b class="lbl">Giải thích gốc</b>${fmt(s.why)}</div>
          <div class="blk bad"><b class="lbl">Làm sai → tác hại / lưu ý</b>${fmt(s.ifWrong)}</div>
          ${i === 6 ? `<div class="blk tip"><b class="lbl">Xem thêm</b><a href="#/table">Bảng đầy đủ: Chất gì dùng cho mẫu gì →</a></div>` : ''}
        </article>`).join('')}
      <h2>💬 Thảo luận quanh đề mẫu</h2>
      ${t.threads.map(th => threadView(t, th)).join('')}
      <h2>🎯 Câu hỏi luyện thêm</h2>
      ${(f.examQuestions || []).map((q, i) => qaView(q, i, 'e')).join('')}`;
    bindToggles();
    jump(sub);
  }

  function viewTable() {
    const rows = DATA.table || [];
    const labOrder = r => (/1/.test(r.lab) ? 1 : /2/.test(r.lab) ? 2 : 3);
    const sorted = rows.slice().sort((a, b) => labOrder(a) - labOrder(b));
    app.innerHTML = `
      <div class="crumb"><a href="#/">Tổng quan</a> › Chất gì – mẫu gì</div>
      <h1>Chất gì dùng cho mẫu gì?</h1>
      <p class="lede">Mỗi hóa chất: dùng ở bài nào, cho mẫu nào, ở bước nào, để làm gì, và dùng sai thì sao.</p>
      <div class="chips" id="labChips">
        ${['Tất cả', 'Lab 1', 'Lab 2', 'Lab 3'].map((x, i) => `<button class="chip ${i === 0 ? 'on' : ''}" data-f="${x}">${x}</button>`).join('')}
      </div>
      <div class="only-wide"><div class="table-wrap"><table>
        <thead><tr><th>Hóa chất</th><th>Bài</th><th>Mẫu</th><th>Bước</th><th>Mục đích</th><th>Dùng sai thì sao</th></tr></thead>
        <tbody>${sorted.map(r => `<tr data-lab="${esc(r.lab)}"><td class="chem">${esc(r.chemical)}</td><td><span class="pill l${labOrder(r)}">${esc(r.lab)}</span></td><td>${fmt(r.sample)}</td><td>${fmt(r.step)}</td><td>${fmt(r.purpose)}</td><td>${fmt(r.ifWrong)}</td></tr>`).join('')}</tbody>
      </table></div></div>
      <div class="only-narrow chem-cards">
        ${sorted.map(r => `<div class="chem-card" data-lab="${esc(r.lab)}"><div class="h"><span class="pill l${labOrder(r)}">${esc(r.lab)}</span>${esc(r.chemical)}</div>
          <dl><dt>Mẫu</dt><dd>${fmt(r.sample)}</dd><dt>Bước</dt><dd>${fmt(r.step)}</dd><dt>Mục đích</dt><dd>${fmt(r.purpose)}</dd><dt>Sai thì</dt><dd style="color:var(--bad)">${fmt(r.ifWrong)}</dd></dl></div>`).join('')}
      </div>`;
    document.getElementById('labChips').addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return;
      document.querySelectorAll('#labChips .chip').forEach(c => c.classList.toggle('on', c === b));
      const f = b.dataset.f;
      document.querySelectorAll('[data-lab]').forEach(el => { el.style.display = (f === 'Tất cả' || el.dataset.lab.includes(f.slice(-1))) ? '' : 'none'; });
    });
  }

  // ---------- practice ----------
  const P = { filter: 'all', queue: [], i: 0 };
  function viewPractice() {
    const filters = [['all', 'Tất cả'], ['exam', 'Đề mẫu'], ['1', 'Lab 1'], ['0', 'Dùng chung'], ['2', 'Lab 2'], ['3', 'Lab 3'], ['todo', 'Chưa thuộc']];
    app.innerHTML = `
      <div class="crumb"><a href="#/">Tổng quan</a> › Luyện thi</div>
      <h1>Luyện thi</h1>
      <p class="lede">Tự viết câu trả lời trước, rồi mới mở đáp án và đánh dấu.</p>
      <div class="chips" id="pf">${filters.map(([k, v]) => `<button class="chip ${P.filter === k ? 'on' : ''}" data-k="${k}">${v}</button>`).join('')}</div>
      <div id="pstat"></div>
      <div id="pcard"></div>`;
    document.getElementById('pf').addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return;
      P.filter = b.dataset.k; buildQueue(); viewPractice();
    });
    if (!P.queue.length) buildQueue();
    renderCard();
  }
  function buildQueue() {
    const known = store.get('shtb-known', {});
    const pool = practicePool().filter(p => P.filter === 'all' ? true : P.filter === 'exam' ? p.lab === 'exam' : P.filter === 'todo' ? known[p.key] !== 1 : String(p.lab) === P.filter);
    P.queue = shuffle(pool); P.i = 0;
  }
  function renderCard() {
    const known = store.get('shtb-known', {});
    const pool = practicePool();
    const k = pool.filter(p => known[p.key] === 1).length;
    document.getElementById('pstat').innerHTML = `<div class="stats">Đã thuộc ${k}/${pool.length} câu · Câu ${Math.min(P.i + 1, P.queue.length)}/${P.queue.length} trong bộ lọc</div><div class="progress"><i style="width:${pool.length ? (100 * k / pool.length) : 0}%"></i></div>`;
    const box = document.getElementById('pcard');
    if (!P.queue.length) { box.innerHTML = '<div class="practice-card">Không còn câu nào trong bộ lọc này 🎉</div>'; return; }
    if (P.i >= P.queue.length) { box.innerHTML = `<div class="practice-card"><p>Hết lượt! </p><button class="btn primary" id="again">Trộn lại & làm tiếp</button></div>`; document.getElementById('again').onclick = () => { buildQueue(); renderCard(); }; return; }
    const it = P.queue[P.i];
    const href = it.topicId === 'EXAM' ? '#/exam' : '#/topic/' + it.topicId;
    box.innerHTML = `<div class="practice-card">
      <div class="src">${esc(it.src)} ${known[it.key] === 1 ? '· ✔ đã thuộc' : ''}</div>
      <div class="bigq">${esc(it.q)}</div>
      <textarea id="mine" placeholder="Viết câu trả lời của bạn ở đây (không bắt buộc)…"></textarea>
      <div class="btn-row"><button class="btn primary" id="reveal">Xem đáp án</button><button class="btn" id="skip">Bỏ qua</button></div>
      <div class="ans" id="pans" hidden>
        <div class="blk what"><b class="lbl">Đáp án</b>${fmt(it.answer)}</div>
        ${it.extra ? `<div class="blk why"><b class="lbl">Giải thích gốc</b>${fmt(it.extra)}</div>` : ''}
        ${it.bad ? `<div class="blk bad"><b class="lbl">Làm sai → tác hại</b>${fmt(it.bad)}</div>` : ''}
        ${it.keyPoints.length ? `<p class="muted" style="margin:10px 0 0">Tự chấm: bạn đã viết được ý nào?</p><ul class="kp check">${it.keyPoints.map((p, j) => `<li><label><input type="checkbox"> ${fmt(p)}</label></li>`).join('')}</ul>` : ''}
        <p class="muted" style="margin-top:10px"><a href="${href}">Mở bài học liên quan →</a></p>
        <div class="btn-row"><button class="btn good" id="ok">✔ Thuộc rồi</button><button class="btn badb" id="no">↻ Cần ôn lại</button></div>
      </div></div>`;
    document.getElementById('reveal').onclick = () => { document.getElementById('pans').hidden = false; document.getElementById('reveal').hidden = true; };
    document.getElementById('skip').onclick = () => { P.i++; renderCard(); };
    const mark = v => { const kn = store.get('shtb-known', {}); kn[it.key] = v; store.set('shtb-known', kn); P.i++; renderCard(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    document.getElementById('ok').onclick = () => mark(1);
    document.getElementById('no').onclick = () => mark(0);
  }

  // ---------- phase recognition ----------
  const PHASES = [
    { img: 'img/mito-interphase.jpg', kind: 'mito', ans: 'Kỳ trung gian', hint: 'Nhìn các tế bào ở giữa ảnh: nhân tròn, chất nhiễm sắc dạng sợi mảnh/hạt phân tán đều, chưa thấy NST riêng rẽ, màng nhân còn nguyên. Đây là giai đoạn dài nhất nên gặp nhiều nhất. (Góc trên bên phải có một tế bào đang ở kỳ sau.)' },
    { img: 'img/mito-prophase.jpg', kind: 'mito', ans: 'Kỳ đầu', hint: 'Nhân to, chất nhiễm sắc bắt đầu co xoắn thành các sợi/hạt bắt màu đậm, nhưng vẫn còn trong một khối nhân tròn; chưa xếp hàng.' },
    { img: 'img/mito-prophase-b.jpg', kind: 'mito', ans: 'Kỳ đầu', hint: 'NST co xoắn thành sợi rõ hơn, khối nhân bắt đầu mất ranh giới (màng nhân đang tiêu biến); chưa xếp thành hàng ở giữa.' },
    { img: 'img/mito-metaphase.jpg', kind: 'mito', ans: 'Kỳ giữa', hint: 'Tế bào ở giữa ảnh: các NST co ngắn tối đa, tập trung thành một dải ngang qua giữa tế bào (mặt phẳng xích đạo), không còn màng nhân.' },
    { img: 'img/mito-anaphase.jpg', kind: 'mito', ans: 'Kỳ sau', hint: 'Hai nhóm NST hình chữ V đang tách xa nhau về hai cực, ở giữa có khoảng trống.' },
    { img: 'img/mito-anaphase-b.jpg', kind: 'mito', ans: 'Kỳ sau', hint: 'Tế bào kéo dài, hai nhóm NST song song đang trượt về hai đầu tế bào.' },
    { img: 'img/mito-telophase.jpg', kind: 'mito', ans: 'Kỳ cuối', hint: 'Hai nhân con đã tách hẳn về hai đầu, NST dãn xoắn trở lại, giữa hai nhân có vách ngăn (cell plate) đang hình thành.' },
    { img: 'img/mei-prophase1.jpg', kind: 'mei', ans: 'Kỳ đầu I', hint: 'Tế bào mẹ hạt phấn to; nhân lớn chứa NST dạng sợi dài đang co xoắn (giai đoạn tiếp hợp/trao đổi chéo).' },
    { img: 'img/mei-metaphase1.jpg', kind: 'mei', ans: 'Kỳ giữa I', hint: 'Các cặp NST tương đồng (bivalent) xếp thành dải đậm ở mặt phẳng xích đạo của tế bào.' },
    { img: 'img/mei-metaphase1-b.jpg', kind: 'mei', ans: 'Kỳ giữa I', hint: 'Khối NST đậm tập trung giữa tế bào, chưa tách về hai cực.' },
    { img: 'img/mei-anaphase1.jpg', kind: 'mei', ans: 'Kỳ sau I', hint: 'Trong một tế bào to, hai nhóm NST đã tách ra hai cực đối diện (mỗi NST kép của cặp tương đồng đi về một cực).' },
    { img: 'img/mei-telophase1.jpg', kind: 'mei', ans: 'Kỳ cuối I', hint: 'Hai nhân con nằm trong cùng một tế bào/đang tách thành hai tế bào (dyad), mỗi nhân mang bộ NST đơn bội (n) ở trạng thái kép.' },
  ];
  const PH = { order: [], i: 0, score: 0, done: 0 };
  function viewPhases() {
    if (!PH.order.length) { PH.order = shuffle(PHASES); PH.i = 0; PH.score = 0; PH.done = 0; }
    app.innerHTML = `
      <div class="crumb"><a href="#/">Tổng quan</a> › Nhận diện kỳ</div>
      <h1>Nhận diện kỳ phân bào</h1>
      <p class="lede">Ảnh thật từ buổi thí nghiệm Lab 2 (đầu rễ hành tím và bao phấn hẹ). Chọn đáp án đúng.</p>
      <div id="phq"></div>`;
    renderPhase();
  }
  function renderPhase() {
    const box = document.getElementById('phq');
    if (PH.i >= PH.order.length) {
      box.innerHTML = `<div class="practice-card"><div class="bigq">Bạn đúng ${PH.score}/${PH.order.length} ảnh.</div><button class="btn primary" id="phr">Làm lại</button></div>`;
      document.getElementById('phr').onclick = () => { PH.order = []; viewPhases(); };
      return;
    }
    const it = PH.order[PH.i];
    const opts = it.kind === 'mito' ? ['Kỳ trung gian', 'Kỳ đầu', 'Kỳ giữa', 'Kỳ sau', 'Kỳ cuối'] : ['Kỳ đầu I', 'Kỳ giữa I', 'Kỳ sau I', 'Kỳ cuối I'];
    box.innerHTML = `<div class="practice-card phase-quiz">
      <div class="src">Ảnh ${PH.i + 1}/${PH.order.length} · ${it.kind === 'mito' ? 'Nguyên phân · đầu rễ hành tím' : 'Giảm phân I · bao phấn hẹ'} · điểm: ${PH.score}</div>
      <img class="phase-img" src="${it.img}" alt="Ảnh hiển vi tế bào đang phân bào">
      <div class="opts">${opts.map(o => `<button class="opt" data-o="${o}">${o}</button>`).join('')}</div>
      <div id="phh"></div></div>`;
    box.querySelector('.opts').addEventListener('click', e => {
      const b = e.target.closest('.opt'); if (!b || box.dataset.answered === '1') return;
      box.dataset.answered = '1';
      const right = b.dataset.o === it.ans;
      if (right) PH.score++;
      box.querySelectorAll('.opt').forEach(o => { if (o.dataset.o === it.ans) o.classList.add('right'); else if (o === b) o.classList.add('wrong'); });
      document.getElementById('phh').innerHTML = `<div class="hint"><b>${right ? '✔ Đúng!' : '✗ Đáp án: ' + it.ans}</b><br>${esc(it.hint)}</div><div class="btn-row"><button class="btn primary" id="phn">Ảnh tiếp →</button></div>`;
      document.getElementById('phn').onclick = () => { PH.i++; box.dataset.answered = ''; renderPhase(); };
    });
    box.dataset.answered = '';
  }

  // ---------- English vocabulary ----------
  let VOCAB = null;
  const speak = text => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 0.9;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) { /* no speech support */ }
  };
  const canSpeak = 'speechSynthesis' in window;
  const spk = t => canSpeak ? `<button class="spk" data-say="${esc(t)}" aria-label="Phát âm">🔊</button>` : '';
  function bindSpeak(root) {
    root.addEventListener('click', e => { const b = e.target.closest('[data-say]'); if (b) { e.preventDefault(); e.stopPropagation(); speak(b.dataset.say); } });
  }

  function viewVocab(sub) {
    if (!VOCAB) {
      app.innerHTML = '<p class="loading">Đang tải từ vựng…</p>';
      fetch('vocab.json', { cache: 'no-cache' }).then(r => r.json()).then(v => { VOCAB = v; viewVocab(sub); })
        .catch(() => { app.innerHTML = '<p>Không tải được từ vựng.</p>'; });
      return;
    }
    const tab = sub || 'words';
    const tabs = [['words', 'Từ vựng'], ['frames', 'Mẫu câu trả lời'], ['answers', 'Đáp án đề mẫu (EN)'], ['cards', 'Flashcard']];
    let body = '';
    if (tab === 'words') {
      body = `
        <input class="search" id="vq" type="search" placeholder="Tìm từ tiếng Anh hoặc nghĩa tiếng Việt…" autocomplete="off">
        <div class="chips" id="vg"><button class="chip on" data-g="all">Tất cả</button>${VOCAB.groups.map(g => `<button class="chip" data-g="${g.id}">${esc(g.title)}</button>`).join('')}</div>
        <div id="vlist">${VOCAB.groups.map(g => `
          <section class="vgroup" data-g="${g.id}">
            <h2>${esc(g.title)} <span class="muted">· ${g.words.length} từ</span></h2>
            ${g.words.map(w => `
              <div class="word" data-s="${esc(norm(w.en + ' ' + w.vi))}">
                <div class="wh"><b class="en">${esc(w.en)}</b>${spk(w.en)}<span class="ipa">${esc(w.ipa)}</span><span class="pos">${esc(w.pos)}</span></div>
                <div class="vi">${esc(w.vi)}</div>
                <div class="ex"><span>${esc(w.example)}</span>${spk(w.example)}<small>${esc(w.exampleVi)}</small></div>
              </div>`).join('')}
          </section>`).join('')}</div>`;
    } else if (tab === 'frames') {
      const groups = {};
      VOCAB.frames.forEach(f => { (groups[f.use] = groups[f.use] || []).push(f); });
      body = `<p class="muted">Học khung câu, thay phần trong [ ] bằng nội dung của bước thí nghiệm.</p>` +
        Object.keys(groups).map(u => `<h2>${esc(u)}</h2>${groups[u].map(f => `
          <div class="frame"><div class="fr">${esc(f.frame).replace(/\[([^\]]+)\]/g, '<span class="slot">[$1]</span>')}</div>
          <div class="ex"><span>${esc(f.example)}</span>${spk(f.example)}<small>${esc(f.exampleVi)}</small></div></div>`).join('')}`).join('');
    } else if (tab === 'answers') {
      body = `<p class="muted">Đáp án tiếng Anh mẫu cho 9 câu đề. Đọc to theo nút 🔊, chú ý các cụm từ in đậm.</p>` +
        VOCAB.models.map((m, i) => `
        <article class="step">
          <h3><span class="n">Q${i + 1}</span><span>${esc(m.qEn)}<br><small class="muted">${esc(m.q)}</small></span></h3>
          <div class="blk what"><b class="lbl">Answer ${spk(m.answerEn)}</b>${boldPhrases(m.answerEn, m.keyPhrases)}</div>
          <details class="concept" style="margin-top:8px"><summary>Bản dịch tiếng Việt</summary><p>${fmt(m.answerVi)}</p></details>
          <div class="phr">${m.keyPhrases.map(p => `<span class="phrase"><b>${esc(p.en)}</b> ${esc(p.vi)}</span>`).join('')}</div>
        </article>`).join('');
    } else {
      body = `<div class="chips" id="fcg"><button class="chip ${FC.g === 'all' ? 'on' : ''}" data-g="all">Tất cả</button>${VOCAB.groups.map(g => `<button class="chip ${FC.g === g.id ? 'on' : ''}" data-g="${g.id}">${esc(g.title.split('·')[0])}</button>`).join('')}</div>
        <div class="chips" id="fcm"><button class="chip ${FC.mode === 'en' ? 'on' : ''}" data-m="en">Anh → Việt</button><button class="chip ${FC.mode === 'vi' ? 'on' : ''}" data-m="vi">Việt → Anh</button></div>
        <div id="fc"></div>`;
    }
    app.innerHTML = `
      <div class="crumb"><a href="#/">Tổng quan</a> › Từ vựng tiếng Anh</div>
      <h1>Từ vựng tiếng Anh để làm bài</h1>
      <p class="lede">Thuật ngữ cần dùng khi trả lời bằng tiếng Anh, mẫu câu để viết ý "mục đích / tại sao / làm sai thì sao", và đáp án tiếng Anh mẫu.</p>
      <div class="chips">${tabs.map(([k, v]) => `<a class="chip ${k === tab ? 'on' : ''}" style="text-decoration:none" href="#/vocab/${k}">${v}</a>`).join('')}</div>
      ${body}`;
    if (tab === 'words') {
      const q = document.getElementById('vq');
      let g = 'all';
      const apply = () => {
        const nq = norm(q.value.trim());
        document.querySelectorAll('.vgroup').forEach(sec => {
          const on = g === 'all' || sec.dataset.g === g;
          let n = 0;
          sec.querySelectorAll('.word').forEach(w => { const show = on && (!nq || w.dataset.s.includes(nq)); w.style.display = show ? '' : 'none'; if (show) n++; });
          sec.style.display = n ? '' : 'none';
        });
      };
      q.addEventListener('input', apply);
      document.getElementById('vg').addEventListener('click', e => {
        const b = e.target.closest('.chip'); if (!b) return;
        g = b.dataset.g; document.querySelectorAll('#vg .chip').forEach(c => c.classList.toggle('on', c === b)); apply();
      });
    }
    if (tab === 'cards') {
      document.getElementById('fcg').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; FC.g = b.dataset.g; FC.deck = []; viewVocab('cards'); });
      document.getElementById('fcm').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; FC.mode = b.dataset.m; viewVocab('cards'); });
      if (!FC.deck.length) { FC.deck = shuffle(VOCAB.groups.filter(g => FC.g === 'all' || g.id === FC.g).flatMap(g => g.words)); FC.i = 0; }
      renderFC();
    }
    window.scrollTo(0, 0);
  }
  const FC = { g: 'all', mode: 'en', deck: [], i: 0 };
  function renderFC() {
    const box = document.getElementById('fc');
    if (FC.i >= FC.deck.length) { FC.deck = []; box.innerHTML = `<div class="practice-card"><div class="bigq">Hết bộ thẻ!</div><button class="btn primary" id="fcr">Trộn lại</button></div>`; document.getElementById('fcr').onclick = () => viewVocab('cards'); return; }
    const w = FC.deck[FC.i];
    const front = FC.mode === 'en' ? `<div class="bigq">${esc(w.en)} ${spk(w.en)}</div><div class="ipa">${esc(w.ipa)}</div>` : `<div class="bigq">${esc(w.vi)}</div>`;
    box.innerHTML = `<div class="practice-card fcard">
      <div class="src">Thẻ ${FC.i + 1}/${FC.deck.length}</div>
      ${front}
      <div class="btn-row"><button class="btn primary" id="fcflip">Lật thẻ</button></div>
      <div id="fcback" hidden>
        ${FC.mode === 'en' ? `<div class="blk what"><b class="lbl">Nghĩa</b>${esc(w.vi)}</div>` : `<div class="blk what"><b class="lbl">English</b><b>${esc(w.en)}</b> ${spk(w.en)} <span class="ipa">${esc(w.ipa)}</span></div>`}
        <div class="blk why"><b class="lbl">Ví dụ ${spk(w.example)}</b>${esc(w.example)}<br><small class="muted">${esc(w.exampleVi)}</small></div>
        <div class="btn-row"><button class="btn primary" id="fcnext">Thẻ tiếp →</button></div>
      </div></div>`;
    document.getElementById('fcflip').onclick = () => { document.getElementById('fcback').hidden = false; document.getElementById('fcflip').hidden = true; };
    document.getElementById('fcnext').onclick = () => { FC.i++; renderFC(); };
  }
  function boldPhrases(text, phrases) {
    let h = esc(text);
    (phrases || []).slice().sort((a, b) => b.en.length - a.en.length).forEach(p => {
      const e = esc(p.en).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      h = h.replace(new RegExp('(?![^<]*>)(' + e + ')', 'i'), '<strong>$1</strong>');
    });
    return h.replace(/\n/g, '<br>');
  }

  // ---------- shared ----------
  function bindToggles() {
    app.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', () => {
      const el = document.getElementById(b.dataset.toggle);
      el.hidden = !el.hidden;
      b.textContent = el.hidden ? 'Xem đáp án' : 'Ẩn đáp án';
    }));
  }
  function jump(sub) {
    if (!sub) { window.scrollTo(0, 0); return; }
    const el = document.getElementById(sub);
    if (!el) { window.scrollTo(0, 0); return; }
    if (el.tagName === 'DETAILS') el.open = true;
    requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function route() {
    if (!DATA) return;
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    const r = parts[0] || 'home';
    document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.r === r || (r === 'topic' && a.dataset.r === 'home')));
    if (r === 'topic') viewTopic(parts[1], parts[2]);
    else if (r === 'exam') viewExam(parts[1]);
    else if (r === 'table') viewTable();
    else if (r === 'practice') viewPractice();
    else if (r === 'phases') viewPhases();
    else if (r === 'vocab') viewVocab(parts[1]);
    else { viewHome(); window.scrollTo(0, 0); }
  }

  bindSpeak(app);
  window.addEventListener('hashchange', route);
  fetch('data.json', { cache: 'no-cache' })
    .then(r => r.json())
    .then(d => { DATA = d; route(); })
    .catch(() => { app.innerHTML = '<p>Không tải được dữ liệu. Hãy thử tải lại trang.</p>'; });
})();
