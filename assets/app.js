/* ============================================================
   DevQA Library — client-side answer engine
   No server, no API, no network. Everything runs in the browser.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- topic meta ---------- */
  var TOPICS = {
    csharp:        { name: 'C# / .NET',        color: '#9b7bff' },
    solid:         { name: 'OOP & SOLID',      color: '#f0b429' },
    aspnet:        { name: 'ASP.NET Core / API', color: '#4f8cff' },
    sql:           { name: 'SQL Server',       color: '#ff7a59' },
    jquery:        { name: 'JavaScript & jQuery', color: '#f5d547' },
    react:         { name: 'React.js',         color: '#38bdf8' },
    azure:         { name: 'Azure & Functions', color: '#0ea5e9' },
    microservices: { name: 'Microservices',    color: '#10a37f' },
    hr:            { name: 'HR & Project Talk', color: '#ec4899' }
  };

  /* ---------- word helpers ---------- */
  var STOP = {what:1,is:1,are:1,the:1,a:1,an:1,of:1,in:1,on:1,to:1,do:1,does:1,did:1,
    how:1,why:1,when:1,me:1,my:1,about:1,and:1,or:1,for:1,you:1,your:1,we:1,i:1,
    explain:1,tell:1,give:1,show:1,can:1,it:1,its:1,with:1,use:1,used:1,using:1,
    please:1,question:1,answer:1,interview:1,'in':1};

  // short-hand → real words (so "sp", "di", "oops" still hit)
  var SYN = {
    oops:'oop', oop:'oop object oriented',
    sp:'stored procedure', sps:'stored procedure', proc:'stored procedure',
    di:'dependency injection', ioc:'dependency injection inversion control',
    ef:'entity framework', efcore:'entity framework core',
    api:'web api rest', apis:'web api rest', rest:'rest api',
    db:'database', dbs:'database', sql:'sql server',
    js:'javascript', jq:'jquery', ts:'typescript',
    auth:'authentication', authz:'authorization', jwt:'jwt token',
    mvc:'mvc', wepapi:'web api',
    perf:'performance', opt:'optimization optimize',
    idx:'index', indexes:'index', indices:'index',
    tsql:'t-sql sql', cte:'common table expression cte',
    ms:'microservice', microservice:'microservices',
    func:'function', fn:'function', funcs:'functions',
    gc:'garbage collector', clr:'clr runtime',
    async:'async await', ca:'async await',
    solid:'solid srp ocp lsp isp dip',
    crud:'create read update delete',
    hooks:'hook', props:'prop', state:'state',
    middleware:'middleware pipeline',
    deploy:'deployment release iis',
    env:'environment', config:'configuration',
    ci:'ci cd devops pipeline', cd:'ci cd devops pipeline'
  };

  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[^a-z0-9+#.\- ]+/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  function toks(s) {
    var out = [], parts = norm(s).split(' ');
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (!p || p.length < 2) continue;
      if (STOP[p]) continue;
      out.push(p);
      if (SYN[p]) {
        var ex = SYN[p].split(' ');
        for (var j = 0; j < ex.length; j++) if (ex[j].length > 1) out.push(ex[j]);
      }
      // simple plural → singular
      if (p.length > 3 && p.charAt(p.length - 1) === 's' && p.slice(-2) !== 'ss') out.push(p.slice(0, -1));
    }
    return out;
  }
  function uniq(a) { var m = {}, r = []; for (var i=0;i<a.length;i++){ if(!m[a[i]]){m[a[i]]=1;r.push(a[i]);} } return r; }

  /* edit distance capped at 1 — cheap typo tolerance */
  function near(a, b) {
    if (a === b) return true;
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    if (la < 5 && lb < 5) return false;
    var i = 0, j = 0, diff = 0;
    while (i < la && j < lb) {
      if (a.charAt(i) === b.charAt(j)) { i++; j++; continue; }
      if (++diff > 1) return false;
      if (la > lb) i++; else if (lb > la) j++; else { i++; j++; }
    }
    if (i < la || j < lb) diff++;
    return diff <= 1;
  }

  /* ---------- build the index ---------- */
  var DATA = (window.QA || []).slice();
  DATA.forEach(function (d, i) {
    d._i = i;
    d.id = d.id || (d.topic + '-' + i);
    d.qNorm = norm(d.q);
    d.titleTok = uniq(toks(d.q));
    d.tagTok = uniq(toks((d.tags || []).join(' ')));
    d.tagText = norm((d.tags || []).join(' '));
    d.tagList = (d.tags || []).map(norm);                 // exact curated keywords
    d.bodyText = norm([d.simple, d.answer, d.project, d.remember, d.code].join(' ')).slice(0, 2600);
    d.topicName = (TOPICS[d.topic] || {}).name || d.topic;
  });

  /* vocabulary for typo-correction */
  var VOCAB = (function () {
    var m = {};
    DATA.forEach(function (d) {
      d.titleTok.concat(d.tagTok).forEach(function (t) { if (t.length >= 5) m[t] = 1; });
    });
    return Object.keys(m);
  })();

  /* ---------- scoring ---------- */
  function search(q, topic) {
    var qn = norm(q);
    if (!qn) return [];
    var qt = uniq(toks(q));
    if (!qt.length) qt = qn.split(' ');
    var res = [];

    for (var i = 0; i < DATA.length; i++) {
      var d = DATA[i];
      if (topic && d.topic !== topic) continue;
      var s = 0, hit = 0;

      if (d.qNorm === qn) s += 200;
      // a phrase found in the title counts; a single word in a long title does not count twice
      else if (d.qNorm.indexOf(qn) >= 0) s += (qn.indexOf(' ') > 0 ? 110 : 30);
      if (d.tagList.indexOf(qn) >= 0) s += 150;            // typed exactly a curated keyword
      else if ((' ' + d.tagText + ' ').indexOf(' ' + qn + ' ') >= 0) s += 95;
      if (qn.length > 6 && d.bodyText.indexOf(qn) >= 0) s += 22;

      for (var k = 0; k < qt.length; k++) {
        var t = qt[k], got = 0;
        if (d.titleTok.indexOf(t) >= 0) { s += 20; got = 1; }
        else {
          for (var a = 0; a < d.titleTok.length; a++) {
            if (d.titleTok[a].indexOf(t) === 0 || t.indexOf(d.titleTok[a]) === 0) { s += 11; got = 1; break; }
          }
        }
        if (d.tagTok.indexOf(t) >= 0) { s += 16; got = 1; }
        else if (d.tagText.indexOf(t) >= 0) { s += 8; got = 1; }
        if (!got && d.bodyText.indexOf(t) >= 0) { s += 4; got = 1; }
        if (!got && t.length >= 4) {                       // typo tolerance
          for (var b = 0; b < d.titleTok.length; b++) {
            if (near(t, d.titleTok[b])) { s += 16; got = 1; break; }
          }
          if (!got) for (var c = 0; c < d.tagTok.length; c++) {
            if (near(t, d.tagTok[c])) { s += 13; got = 1; break; }
          }
        }
        if (got) hit++;
      }

      if (!s) continue;
      if (hit === qt.length && qt.length > 1) s += 26;          // covered every word
      s += Math.max(0, 9 - d.titleTok.length) * 0.6;            // prefer tight titles
      if (d.topic === topic) s += 6;
      res.push({ d: d, s: s });
    }

    res.sort(function (x, y) { return y.s - x.s || x.d._i - y.d._i; });
    return res;
  }

  /* ---------- tiny markdown ---------- */
  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function md(txt) {
    if (!txt) return '';
    var lines = String(txt).split('\n'), html = '', list = false;
    function inline(s) {
      // pull code spans out first, so a * inside them (CRON, feature/*) survives untouched
      var codes = [];
      var t = esc(s).replace(/`([^`]+)`/g, function (m, c) {
        codes.push(c);
        return '\u0000' + (codes.length - 1) + '\u0000';
      });
      t = t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
           .replace(/\*([^*\n]+)\*/g, '<i>$1</i>');
      return t.replace(/\u0000(\d+)\u0000/g, function (m, i) {
        return '<code>' + codes[i] + '</code>';
      });
    }
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i].trim();
      if (!ln) { if (list) { html += '</ul>'; list = false; } continue; }
      if (ln.charAt(0) === '-' && ln.charAt(1) === ' ') {
        if (!list) { html += '<ul>'; list = true; }
        html += '<li>' + inline(ln.slice(2)) + '</li>';
      } else {
        if (list) { html += '</ul>'; list = false; }
        html += '<p>' + inline(ln) + '</p>';
      }
    }
    if (list) html += '</ul>';
    return html;
  }

  /* ---------- storage ---------- */
  var LS = {
    get: function (k, def) { try { return JSON.parse(localStorage.getItem('devqa_' + k)) || def; } catch (e) { return def; } },
    set: function (k, v) { try { localStorage.setItem('devqa_' + k, JSON.stringify(v)); } catch (e) {} }
  };
  var learned = LS.get('learned', {});
  var recent = LS.get('recent', []);

  /* ---------- dom ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var thread = $('thread'), welcome = $('welcome'), input = $('input'),
      suggest = $('suggest'), library = $('library'), libBody = $('libBody');
  var activeTopic = '';
  var sgIndex = -1, sgItems = [];

  /* ---------- sidebar ---------- */
  function buildSidebar() {
    var counts = {};
    DATA.forEach(function (d) { counts[d.topic] = (counts[d.topic] || 0) + 1; });

    var html = '<div class="topic active" data-topic=""><span class="dot" style="background:var(--ink-3)"></span>All topics<span class="cnt">' + DATA.length + '</span></div>';
    var sel = '<option value="">All topics (' + DATA.length + ')</option>';
    Object.keys(TOPICS).forEach(function (k) {
      if (!counts[k]) return;
      html += '<div class="topic" data-topic="' + k + '"><span class="dot" style="background:' + TOPICS[k].color + '"></span>' +
              TOPICS[k].name + '<span class="cnt">' + counts[k] + '</span></div>';
      sel += '<option value="' + k + '">' + TOPICS[k].name + ' (' + counts[k] + ')</option>';
    });
    $('topicList').innerHTML = html;
    $('topicSelect').innerHTML = sel;
    $('brandCount').textContent = DATA.length + ' answers · offline';

    Array.prototype.forEach.call($('topicList').children, function (el) {
      el.onclick = function () { setTopic(el.getAttribute('data-topic')); };
    });
    $('topicSelect').onchange = function () { setTopic(this.value); };
  }

  function setTopic(t) {
    activeTopic = t || '';
    Array.prototype.forEach.call($('topicList').children, function (el) {
      el.classList.toggle('active', el.getAttribute('data-topic') === activeTopic);
    });
    $('topicSelect').value = activeTopic;
    $('topbarTitle').textContent = activeTopic ? TOPICS[activeTopic].name : 'All topics';
    buildWelcome();
    if (!library.hidden) buildLibrary();
    closeSidebar();
  }

  /* ---------- welcome screen ---------- */
  function buildWelcome() {
    var pool = DATA.filter(function (d) { return !activeTopic || d.topic === activeTopic; });
    var starters = [];
    var picks = pool.filter(function (d) { return d.star; });
    if (picks.length < 6) picks = picks.concat(pool.slice(0, 10));
    picks.slice(0, 7).forEach(function (d) {
      starters.push('<button class="chip" data-q="' + esc(d.q) + '">' + esc(d.tags && d.tags[0] ? d.tags[0] : d.q) + '</button>');
    });
    $('starterChips').innerHTML = starters.join('');

    var cards = '';
    var keys = activeTopic ? [activeTopic] : Object.keys(TOPICS);
    keys.forEach(function (k) {
      var list = DATA.filter(function (d) { return d.topic === k; });
      if (!list.length) return;
      var sample = list.filter(function (d) { return d.star; })[0] || list[0];
      cards += '<div class="hero-card" data-q="' + esc(sample.q) + '">' +
        '<h3><span class="dot" style="background:' + TOPICS[k].color + '"></span>' + TOPICS[k].name + '</h3>' +
        '<p>' + list.length + ' answers · try "' + esc((sample.tags && sample.tags[0]) || sample.q).slice(0, 38) + '"</p></div>';
    });
    $('heroGrid').innerHTML = cards;

    Array.prototype.forEach.call(document.querySelectorAll('[data-q]'), function (el) {
      el.onclick = function () { ask(el.getAttribute('data-q')); };
    });
    updateProgress();
  }

  /* ---------- answer rendering ---------- */
  function badge(topic) {
    var t = TOPICS[topic] || { name: topic, color: '#888' };
    return '<span class="badge" style="color:' + t.color + ';border-color:' + t.color + '55;background:' + t.color + '14">' + t.name + '</span>';
  }

  function answerHTML(d, ms, rel) {
    var h = '';
    h += '<div class="ans-head">' + badge(d.topic) +
         '<span class="ans-title">' + esc(d.q) + '</span>' +
         '<span class="score">' + ms + ' ms</span></div>';

    if (d.simple) {
      h += '<div class="block simple"><div class="block-label">In simple words</div>' + md(d.simple) + '</div>';
    }
    h += '<div class="block"><div class="block-label">Say this in the interview</div><div class="say">' + md(d.answer) + '</div></div>';
    if (d.code) {
      h += '<div class="block"><div class="block-label">Code</div><pre><code>' + esc(d.code) + '</code></pre></div>';
    }
    if (d.project) {
      h += '<div class="block proj"><div class="block-label">Where I used it in my project</div><div class="proj-box">' + md(d.project) + '</div></div>';
    }
    if (d.note) {
      h += '<div class="block tip"><div class="block-label">Before the interview</div><div class="tip-box">' + md(d.note) + '</div></div>';
    }
    if (d.remember) {
      h += '<div class="block"><div class="remember"><span>📌</span><div><b>Remember:</b> ' + md(d.remember).replace(/<\/?p>/g, '') + '</div></div></div>';
    }
    if (d.tags && d.tags.length) {
      h += '<div class="tags">' + d.tags.slice(0, 8).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>';
    }

    var done = !!learned[d.id];
    h += '<div class="ans-actions">' +
      '<button class="act" data-copy="' + d.id + '">📋 Copy answer</button>' +
      '<button class="act ' + (done ? 'done' : '') + '" data-learn="' + d.id + '">' + (done ? '✓ Learned' : '◻ Mark learned') + '</button>' +
      '<button class="act" data-topicjump="' + d.topic + '">More from ' + esc(d.topicName) + '</button>' +
      '</div>';

    if (rel && rel.length) {
      h += '<div class="related"><div class="block-label">Related questions</div><div class="rel-chips">' +
        rel.map(function (r) { return '<button class="rel" data-ask="' + esc(r.q) + '">' + esc(r.q) + '</button>'; }).join('') +
        '</div></div>';
    }
    return h;
  }

  function row(cls, avatar, bodyHtml) {
    var div = document.createElement('div');
    div.className = 'row ' + cls;
    div.innerHTML = '<div class="wrap"><div class="msg">' +
      '<div class="avatar ' + (cls === 'user' ? 'u' : 'b') + '">' + avatar + '</div>' +
      '<div class="body">' + bodyHtml + '</div></div></div>';
    thread.appendChild(div);
    return div;
  }

  function bindAnswer(el) {
    Array.prototype.forEach.call(el.querySelectorAll('[data-ask]'), function (b) {
      b.onclick = function () { ask(b.getAttribute('data-ask')); };
    });
    Array.prototype.forEach.call(el.querySelectorAll('[data-copy]'), function (b) {
      b.onclick = function () { copyAnswer(b.getAttribute('data-copy')); };
    });
    Array.prototype.forEach.call(el.querySelectorAll('[data-learn]'), function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-learn');
        if (learned[id]) { delete learned[id]; b.className = 'act'; b.textContent = '◻ Mark learned'; }
        else { learned[id] = 1; b.className = 'act done'; b.textContent = '✓ Learned'; toast('Marked as learned'); }
        LS.set('learned', learned); updateProgress();
      };
    });
    Array.prototype.forEach.call(el.querySelectorAll('[data-topicjump]'), function (b) {
      b.onclick = function () { setTopic(b.getAttribute('data-topicjump')); showLibrary(true); };
    });
  }

  function copyAnswer(id) {
    var d = DATA.filter(function (x) { return x.id === id; })[0];
    if (!d) return;
    var txt = d.q + '\n\n' + (d.simple ? 'IN SIMPLE WORDS\n' + d.simple + '\n\n' : '') +
      'INTERVIEW ANSWER\n' + d.answer + '\n\n' +
      (d.code ? 'CODE\n' + d.code + '\n\n' : '') +
      (d.project ? 'WHERE I USED IT\n' + d.project + '\n\n' : '') +
      (d.note ? 'BEFORE THE INTERVIEW\n' + d.note + '\n\n' : '') +
      (d.remember ? 'REMEMBER: ' + d.remember : '');
    txt = txt.replace(/\*/g, '').replace(/`/g, '');
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { toast('Answer copied'); });
    else {
      var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta);
      ta.select(); try { document.execCommand('copy'); toast('Answer copied'); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  /* ---------- ask ---------- */
  var busy = false;
  function ask(q) {
    q = String(q || '').trim();
    if (!q || busy) return;
    busy = true;
    showLibrary(false);
    if (welcome) welcome.style.display = 'none';
    hideSuggest();
    input.value = '';
    autosize();

    row('user', 'N', '<div class="q-text">' + esc(q) + '</div>');

    var t0 = performance.now();
    var res = search(q, activeTopic);
    var ms = Math.max(1, Math.round((performance.now() - t0) * 10) / 10);
    $('speedTxt').textContent = 'matched ' + DATA.length + ' answers in ' + ms + ' ms';

    var loading = row('bot', 'Q', '<div class="typing"><i></i><i></i><i></i></div>');
    thread.scrollTop = thread.scrollHeight;

    setTimeout(function () {
      var holder = loading.querySelector('.body');
      if (!res.length || res[0].s < 14) {
        var near5 = res.slice(0, 5);
        if (!near5.length) near5 = DATA.filter(function (d) { return d.star; }).slice(0, 5).map(function (d) { return { d: d }; });
        holder.innerHTML = '<div class="nores"><p>No exact match for <b>' + esc(q) +
          '</b> in the library yet.</p><p>Closest things I do have:</p></div>' +
          '<div class="rel-chips" style="margin-top:10px">' +
          near5.map(function (r) { return '<button class="rel" data-ask="' + esc(r.d.q) + '">' + esc(r.d.q) + '</button>'; }).join('') +
          '</div>';
      } else {
        var top = res[0].d;
        var rel = res.slice(1, 6).filter(function (r) { return r.s >= 25; }).map(function (r) { return r.d; });
        if (rel.length < 4) {
          DATA.filter(function (d) { return d.topic === top.topic && d.id !== top.id; }).slice(0, 4 - rel.length)
            .forEach(function (d) { rel.push(d); });
        }
        holder.innerHTML = answerHTML(top, ms, rel);
        pushRecent(q);
      }
      bindAnswer(holder);
      busy = false;
      loading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 260);
  }

  /* ---------- recents ---------- */
  function pushRecent(q) {
    recent = recent.filter(function (x) { return x.toLowerCase() !== q.toLowerCase(); });
    recent.unshift(q);
    if (recent.length > 25) recent.pop();
    LS.set('recent', recent);
    buildRecent();
  }
  function buildRecent() {
    if (!recent.length) { $('recentList').innerHTML = '<div class="recent-empty">Nothing yet — ask something.</div>'; return; }
    $('recentList').innerHTML = recent.map(function (q) {
      return '<div class="recent-item" title="' + esc(q) + '">' + esc(q) + '</div>';
    }).join('');
    Array.prototype.forEach.call($('recentList').children, function (el, i) {
      el.onclick = function () { ask(recent[i]); };
    });
  }

  /* ---------- autocomplete ---------- */
  function showSuggest() {
    var q = input.value.trim();
    if (q.length < 2) return hideSuggest();
    var res = search(q, activeTopic).slice(0, 7);
    if (!res.length) return hideSuggest();
    sgItems = res.map(function (r) { return r.d; });
    var qn = norm(q).split(' ')[0];
    suggest.innerHTML = res.map(function (r, i) {
      var t = TOPICS[r.d.topic] || { name: r.d.topic, color: '#888' };
      var title = esc(r.d.q);
      if (qn.length > 1) {
        try { title = title.replace(new RegExp('(' + qn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); } catch (e) {}
      }
      return '<div class="sg' + (i === 0 ? ' sel' : '') + '" data-i="' + i + '">' +
        '<span class="mini" style="color:' + t.color + ';border-color:' + t.color + '55">' + t.name + '</span>' +
        '<span class="sg-q">' + title + '</span></div>';
    }).join('');
    sgIndex = 0;
    suggest.hidden = false;
    Array.prototype.forEach.call(suggest.children, function (el) {
      el.onmousedown = function (e) { e.preventDefault(); ask(sgItems[+el.getAttribute('data-i')].q); };
    });
  }
  function hideSuggest() { suggest.hidden = true; sgIndex = -1; sgItems = []; }
  function moveSg(dir) {
    if (suggest.hidden || !sgItems.length) return false;
    sgIndex = (sgIndex + dir + sgItems.length) % sgItems.length;
    Array.prototype.forEach.call(suggest.children, function (el, i) { el.classList.toggle('sel', i === sgIndex); });
    suggest.children[sgIndex].scrollIntoView({ block: 'nearest' });
    return true;
  }

  /* ---------- library view ---------- */
  function showLibrary(on) {
    library.hidden = !on;
    thread.hidden = on;
    $('libBtn').classList.toggle('on', on);
    if (on) buildLibrary();
  }
  function buildLibrary(filter) {
    var f = norm(filter || $('libFilter').value || '');
    var keys = activeTopic ? [activeTopic] : Object.keys(TOPICS);
    var html = '';
    keys.forEach(function (k) {
      var list = DATA.filter(function (d) {
        if (d.topic !== k) return false;
        if (!f) return true;
        return d.qNorm.indexOf(f) >= 0 || d.tagText.indexOf(f) >= 0 || d.bodyText.indexOf(f) >= 0;
      });
      if (!list.length) return;
      html += '<div class="lib-group"><h3><span class="dot" style="background:' + TOPICS[k].color + '"></span>' +
        TOPICS[k].name + ' · ' + list.length + '</h3><div class="lib-grid">' +
        list.map(function (d) {
          return '<div class="lib-card ' + (learned[d.id] ? 'learned' : '') + '" data-ask="' + esc(d.q) + '">' +
            '<div class="lq">' + esc(d.q) + '</div>' +
            '<div class="lt">' + esc(String(d.simple || d.answer).replace(/\*\*/g, '').replace(/`/g, '')) + '</div></div>';
        }).join('') + '</div></div>';
    });
    libBody.innerHTML = html || '<p style="color:var(--ink-3)">No question matches that filter.</p>';
    Array.prototype.forEach.call(libBody.querySelectorAll('[data-ask]'), function (el) {
      el.onclick = function () { ask(el.getAttribute('data-ask')); };
    });
  }

  /* ---------- misc ui ---------- */
  function updateProgress() {
    var total = DATA.length, done = Object.keys(learned).length;
    $('progressPill').textContent = Math.round(done / total * 100) + '%  (' + done + '/' + total + ')';
  }
  var toastT;
  function toast(msg) {
    var el = $('toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('show'); }, 1800);
  }
  function autosize() {
    input.style.height = 'auto';
    input.style.height = Math.min(150, input.scrollHeight) + 'px';
  }
  function closeSidebar() { $('sidebar').classList.remove('open'); }

  /* ---------- events ---------- */
  input.addEventListener('input', function () { autosize(); showSuggest(); });
  input.addEventListener('blur', function () { setTimeout(hideSuggest, 120); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { if (moveSg(1)) e.preventDefault(); return; }
    if (e.key === 'ArrowUp') { if (moveSg(-1)) e.preventDefault(); return; }
    if (e.key === 'Escape') { hideSuggest(); return; }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!suggest.hidden && sgIndex >= 0 && sgItems[sgIndex] && norm(input.value) !== norm(sgItems[sgIndex].q)) {
        ask(sgItems[sgIndex].q);
      } else ask(input.value);
    }
  });
  $('send').onclick = function () { ask(input.value); };
  $('newChat').onclick = function () {
    thread.innerHTML = ''; thread.appendChild(welcome);
    welcome.style.display = ''; showLibrary(false); buildWelcome();
    input.value = ''; autosize(); input.focus(); closeSidebar();
  };
  $('libBtn').onclick = function () { showLibrary(library.hidden); closeSidebar(); };
  $('libFilter').oninput = function () { buildLibrary(this.value); };
  $('clearRecent').onclick = function () { recent = []; LS.set('recent', recent); buildRecent(); };
  $('openSide').onclick = function () { $('sidebar').classList.add('open'); };
  $('closeSide').onclick = closeSidebar;
  $('themeBtn').onclick = function () {
    var cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', cur);
    $('themeTxt').textContent = cur === 'light' ? 'Dark mode' : 'Light mode';
    LS.set('theme', cur);
  };
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== input) { e.preventDefault(); input.focus(); }
  });

  /* ---------- debug + extension hook ---------- */
  window.DevQA = { data: DATA, search: search, ask: ask, topics: TOPICS };

  /* ---------- boot ---------- */
  (function boot() {
    var th = LS.get('theme', 'dark');
    document.documentElement.setAttribute('data-theme', th);
    $('themeTxt').textContent = th === 'light' ? 'Dark mode' : 'Light mode';
    buildSidebar();
    buildWelcome();
    buildRecent();
    updateProgress();
    $('speedTxt').textContent = DATA.length + ' answers loaded';
    input.focus();
    // deep link:  index.html#q=solid
    var m = location.hash.match(/#q=(.+)/);
    if (m) ask(decodeURIComponent(m[1]));
  })();
})();
