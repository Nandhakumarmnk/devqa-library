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
    adonet:        { name: 'ADO.NET',          color: '#84cc16' },
    sql:           { name: 'SQL Server',       color: '#ff7a59' },
    jquery:        { name: 'JavaScript & jQuery', color: '#f5d547' },
    react:         { name: 'React.js',         color: '#38bdf8' },
    azure:         { name: 'Azure & Functions', color: '#0ea5e9' },
    microservices: { name: 'Microservices',    color: '#10a37f' },
    web:           { name: 'HTML, CSS & TypeScript', color: '#fb923c' },
    coding:        { name: 'Coding Round',      color: '#2dd4bf' },
    scenario:      { name: 'Scenario Based',    color: '#c084fc' },
    projects:      { name: 'My Projects',       color: '#e11d48' },
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

  /* ---------- typo tolerance ----------
     Levenshtein distance, abandoned as soon as it exceeds max.
     Returns the distance, or max+1 when it is worse than that.      */
  function dist(a, b, max) {
    if (a === b) return 0;
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > max) return max + 1;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= lb; j++) prev[j] = j;
    for (i = 1; i <= la; i++) {
      cur[0] = i;
      var best = cur[0];
      for (j = 1; j <= lb; j++) {
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
        // transposition — "teh" for "the", the commonest real typo
        if (i > 1 && j > 1 &&
            a.charAt(i - 1) === b.charAt(j - 2) &&
            a.charAt(i - 2) === b.charAt(j - 1)) {
          cur[j] = Math.min(cur[j], prev[j - 2] === undefined ? cur[j] : prev[j - 2] + 1);
        }
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1;       // no way back under the limit
      prev = cur.slice();
    }
    return prev[lb];
  }

  /* how wrong a word is allowed to be, by length */
  function allowance(len) {
    if (len <= 3) return 0;
    if (len <= 5) return 1;
    if (len <= 9) return 2;
    return 3;
  }

  /* 0 = no match, 1 = exact, lower for a sloppier match */
  function similarity(q, w) {
    if (q === w) return 1;
    // one word inside the other: "procedur" / "procedure", "auth" / "authentication"
    if (q.length >= 4 && w.indexOf(q) === 0) return 0.9;
    if (w.length >= 4 && q.indexOf(w) === 0) return 0.85;
    if (q.length >= 5 && w.indexOf(q) > 0) return 0.7;
    var max = allowance(Math.max(q.length, w.length));
    if (!max) return 0;
    var d = dist(q, w, max);
    if (d > max) return 0;
    return 1 - (d / (Math.max(q.length, w.length) + 1));
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
    d.bodyText = norm([d.simple, d.answer, d.project, d.remember, d.code,
      (window.QA_SCRIPT && window.QA_SCRIPT[d.id] ? window.QA_SCRIPT[d.id].script : ''),
      (window.QA_SCRIPT && window.QA_SCRIPT[d.id] ? (window.QA_SCRIPT[d.id].followups || []).map(function (f) { return f.q + ' ' + f.a; }).join(' ') : '')
    ].join(' ')).slice(0, 3200);
    d.topicName = (TOPICS[d.topic] || {}).name || d.topic;
    if (window.QA_COMPARE && window.QA_COMPARE[d.id]) d.compare = window.QA_COMPARE[d.id];
    if (window.QA_SCRIPT && window.QA_SCRIPT[d.id]) {
      d.script = window.QA_SCRIPT[d.id].script;
      d.followups = window.QA_SCRIPT[d.id].followups;
    }
  });

  /* ---------- problem statements ----------
     'my click stops working after the grid refreshes' -> the delegation answer.
     Each phrase is tokenised once and hung on the answer it solves.          */
  (function attachProblems() {
    var byId = {};
    DATA.forEach(function (d) { byId[d.id] = d; d.probs = []; d.probTok = []; });
    (window.QA_PROBLEMS || []).forEach(function (entry) {
      var d = byId[entry.id];
      if (!d) { return; }                       // id typo - ignore rather than break
      (entry.p || []).forEach(function (phrase) {
        var n = norm(phrase);
        d.probs.push(n);
        d.probTok = d.probTok.concat(toks(phrase));
      });
    });
    DATA.forEach(function (d) { d.probTok = uniq(d.probTok); d.probText = d.probs.join(' | '); });
  })();

  /* vocabulary for typo-correction */
  var VOCAB = (function () {
    var m = {};
    DATA.forEach(function (d) {
      d.titleTok.concat(d.tagTok).forEach(function (t) { if (t.length >= 5) m[t] = 1; });
    });
    return Object.keys(m);
  })();

  /* ---------- scoring ---------- */
  var corrections = {};                 // {typed: whatWeMatched} from the last search
  function search(q, topic) {
    corrections = {};
    var qn = norm(q);
    if (!qn) return [];
    var qt = uniq(toks(q));
    if (!qt.length) qt = qn.split(' ');
    var res = [];

    for (var i = 0; i < DATA.length; i++) {
      var d = DATA[i];
      if (topic && d.topic !== topic) continue;
      var s = 0, hit = 0, docCorr = null;

      if (d.qNorm === qn) s += 200;
      // a phrase found in the title counts; a single word in a long title does not count twice
      else if (d.qNorm.indexOf(qn) >= 0) s += (qn.indexOf(' ') > 0 ? 110 : 30);
      if (d.tagList.indexOf(qn) >= 0) s += 150;            // typed exactly a curated keyword
      else if ((' ' + d.tagText + ' ').indexOf(' ' + qn + ' ') >= 0) s += 95;
      if (qn.length > 6 && d.bodyText.indexOf(qn) >= 0) s += 22;

      // described-symptom match - how much of one problem phrase did they say
      if (d.probs.length && qt.length >= 2) {
        var bestP = 0;
        for (var pi = 0; pi < d.probs.length; pi++) {
          var pt = uniq(toks(d.probs[pi]));
          if (!pt.length) continue;
          var shared = 0;
          for (var qi = 0; qi < qt.length; qi++) if (pt.indexOf(qt[qi]) >= 0) shared++;
          var cover = shared / Math.max(pt.length, qt.length);
          if (cover > bestP) bestP = cover;
        }
        if (bestP >= 0.34) s += 60 + 110 * bestP;      // they described the problem
        else if (bestP > 0) s += 18 * bestP;
      }

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
        if (!got && t.length >= 3) {                       // misspelt or partial word
          var bestSim = 0, bestWord = null, sim;
          for (var b = 0; b < d.titleTok.length; b++) {
            sim = similarity(t, d.titleTok[b]);
            if (sim > bestSim) { bestSim = sim; bestWord = d.titleTok[b]; }
          }
          if (bestSim) { s += 24 * bestSim; got = 1; }
          else {
            for (var c = 0; c < d.tagTok.length; c++) {
              sim = similarity(t, d.tagTok[c]);
              if (sim > bestSim) { bestSim = sim; bestWord = d.tagTok[c]; }
            }
            if (bestSim) { s += 19 * bestSim; got = 1; }
          }
          if (bestWord && bestSim >= 0.6 && bestWord !== t) (docCorr = docCorr || {})[t] = bestWord;
        }
        if (got) hit++;
      }

      if (!s) continue;
      if (hit === qt.length && qt.length > 1) s += 26;          // covered every word
      s += Math.max(0, 9 - d.titleTok.length) * 0.6;            // prefer tight titles
      if (d.topic === topic) s += 6;
      res.push({ d: d, s: s, corr: docCorr });
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
      html += '<div class="topic" data-topic="' + k + '" style="--topic-color:' + TOPICS[k].color + '"><span class="dot" style="background:' + TOPICS[k].color + '"></span>' +
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

  function syncJump() {
    var j = $('toBottom');
    if (!j) return;
    var scrollable = thread.scrollHeight > thread.clientHeight + 40;
    var atEnd = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 120;
    j.hidden = thread.hidden || !scrollable || atEnd;
  }

  function syncScope() {
    var pill = $('scopePill'), txt = $('scopeTxt'), dot = $('scopeDot');
    if (!pill) return;
    var t = activeTopic ? TOPICS[activeTopic] : null;
    txt.textContent = t ? t.name : 'All topics';
    dot.style.background = t ? t.color : 'var(--ink-3)';
    pill.classList.toggle('filtered', !!activeTopic);
    pill.title = activeTopic ? 'Searching only ' + t.name + ' - click to clear' : 'Searching every topic';
  }

  function setTopic(t) {
    activeTopic = t || '';
    Array.prototype.forEach.call($('topicList').children, function (el) {
      el.classList.toggle('active', el.getAttribute('data-topic') === activeTopic);
    });
    $('topicSelect').value = activeTopic;
    $('topbarTitle').textContent = activeTopic ? TOPICS[activeTopic].name : 'All topics';
    syncScope();
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
      cards += '<div class="hero-card" data-q="' + esc(sample.q) + '" style="--topic-color:' + TOPICS[k].color + '">' +
        '<h3><span class="dot" style="background:' + TOPICS[k].color + '"></span>' + TOPICS[k].name + '<span class="count">' + list.length + '</span></h3>' +
        '<p>try "' + esc((sample.tags && sample.tags[0]) || sample.q).slice(0, 40) + '"</p></div>';
    });
    $('heroGrid').innerHTML = cards;

    Array.prototype.forEach.call(document.querySelectorAll('[data-q]'), function (el) {
      el.onclick = function () { ask(el.getAttribute('data-q')); };
    });
    updateProgress();
  }

  /* ---------- key points ----------
     The crisp list to actually say out loud. Uses an explicit
     `keypoints` array when an answer has one, otherwise lifts the
     bullet lead-ins out of the answer, which is where the structure
     already lives.                                                  */
  function firstClause(s) {
    s = String(s || '').replace(/`/g, '').trim();
    var cut = s.split(/(?:\. |; |, which |, so )/)[0].trim().replace(/[.,;:]$/, '');
    return cut.length > 96 ? cut.slice(0, 94).trim() + '…' : cut;
  }

  function keyPoints(d) {
    if (d.keypoints && d.keypoints.length) return d.keypoints.slice(0, 7);
    var out = [];
    String(d.answer || '').split('\n').forEach(function (line) {
      line = line.trim();
      if (line.indexOf('- ') !== 0) return;
      var body = line.slice(2).trim();
      var m = body.match(/^\*\*([^*]+)\*\*\s*[—–\-:]*\s*([\s\S]*)$/);
      if (m) {
        var rest = firstClause(m[2]);
        out.push('**' + m[1].trim() + '**' + (rest ? ' — ' + rest : ''));
      } else {
        out.push(firstClause(body));
      }
    });
    if (out.length < 2) {                       // no bullets: use the bolded terms
      var seen = {}, bolds = String(d.answer || '').match(/\*\*([^*]+)\*\*/g) || [];
      out = [];
      bolds.forEach(function (b) {
        var t = b.replace(/\*\*/g, '').trim();
        if (t.length > 1 && t.length < 60 && !seen[t.toLowerCase()]) { seen[t.toLowerCase()] = 1; out.push('**' + t + '**'); }
      });
    }
    return out.slice(0, 7);
  }

  /* inline markdown only — for one-line list items */
  function inlineMd(s) {
    return esc(String(s || ''))
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  /* ---------- comparison table ----------
     For the "X vs Y" questions, a table reads far faster than prose
     and is what you would sketch on a whiteboard anyway.            */
  function compareTable(c) {
    if (!c || !c.rows || !c.rows.length) return '';
    return '<h3 class="a-h">Side by side</h3>' +
      '<div class="cmp-wrap"><table class="cmp-table"><thead><tr>' +
        '<th></th><th>' + esc(c.a) + '</th><th>' + esc(c.b) + '</th>' +
      '</tr></thead><tbody>' +
      c.rows.map(function (r) {
        return '<tr><th>' + inlineMd(r[0]) + '</th><td>' + inlineMd(r[1]) + '</td><td>' + inlineMd(r[2]) + '</td></tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  /* ---------- answer rendering ---------- */
  function badge(topic) {
    var t = TOPICS[topic] || { name: topic, color: '#888' };
    return '<span class="badge" style="color:' + t.color + ';border-color:' + t.color + '55;background:' + t.color + '14">' + t.name + '</span>';
  }

  /* ---------- the assistant message ----------
     Flowing prose with quiet headings, the way a real assistant
     replies — not a reference card of labelled boxes.            */
  function answerHTML(d, ms, rel) {
    var t = TOPICS[d.topic] || { name: d.topic, color: '#888' };
    var h = '';

    h += '<div class="a-head">' +
           '<h2 class="a-title">' + esc(d.q) + '</h2>' +
           '<span class="a-chip" style="color:' + t.color + ';border-color:' + t.color + '40;background:' + t.color + '14">' +
             esc(t.name) + '</span>' +
         '</div>';

    if (d.simple) h += '<div class="a-lead">' + md(d.simple) + '</div>';

    if (d.script) {
      h += '<h3 class="a-h">Say this, word for word</h3>' +
           '<blockquote class="a-script">' + md(d.script) + '</blockquote>';
    }

    var kp = keyPoints(d);
    if (kp.length > 1) {
      h += '<h3 class="a-h">Key points</h3><ol class="a-kp">' +
             kp.map(function (p) { return '<li>' + inlineMd(p) + '</li>'; }).join('') +
           '</ol>';
    }

    h += '<h3 class="a-h">The answer</h3><div class="a-body">' + md(d.answer) + '</div>';

    if (d.compare) h += compareTable(d.compare);

    if (d.followups && d.followups.length) {
      h += '<h3 class="a-h">What they ask next</h3><dl class="a-fu">' +
        d.followups.map(function (f) {
          return '<dt>' + inlineMd(f.q) + '</dt><dd>' + inlineMd(f.a) + '</dd>';
        }).join('') + '</dl>';
    }

    if (d.code) {
      h += '<figure class="a-code">' +
             '<figcaption><span class="a-lang">' + esc(codeLang(d)) + '</span>' +
               '<button class="a-copycode" data-code="' + d.id + '">Copy</button></figcaption>' +
             '<pre><code>' + esc(d.code) + '</code></pre>' +
           '</figure>';
    }

    if (d.project) {
      h += '<h3 class="a-h">Where I used it</h3><div class="a-note">' + md(d.project) + '</div>';
    }
    if (d.note) {
      h += '<h3 class="a-h">Before the interview</h3><div class="a-note tip">' + md(d.note) + '</div>';
    }
    if (d.remember) {
      h += '<p class="a-remember"><b>Remember</b> · ' + inlineMd(d.remember) + '</p>';
    }

    var done = !!learned[d.id];
    h += '<div class="a-actions">' +
           '<button class="a-act" data-copy="' + d.id + '" title="Copy answer">' + ICON.copy + '<span>Copy</span></button>' +
           '<button class="a-act ' + (done ? 'on' : '') + '" data-learn="' + d.id + '" title="Mark as learned">' +
             ICON.check + '<span>' + (done ? 'Learned' : 'Mark learned') + '</span></button>' +
           '<button class="a-act" data-topicjump="' + d.topic + '" title="Browse this topic">' + ICON.grid + '<span>' + esc(t.name) + '</span></button>' +
           '<span class="a-ms">' + ms + ' ms</span>' +
         '</div>';

    if (rel && rel.length) {
      h += '<div class="a-rel"><h3 class="a-h">Related</h3><div class="rel-chips">' +
             rel.map(function (r) { return '<button class="rel" data-ask="' + esc(r.q) + '">' + esc(r.q) + '</button>'; }).join('') +
           '</div></div>';
    }
    return h;
  }

  /* a sensible language label for the code header */
  function codeLang(d) {
    var c = d.code || '';
    if (/^\s*(SELECT|CREATE|ALTER|UPDATE|DELETE|INSERT|WITH|BEGIN|DECLARE|EXEC|MERGE|--)/i.test(c)) return 'sql';
    if (/^\s*(git |npm |dotnet |docker)/i.test(c)) return 'bash';
    if (/[{};]\s*$/m.test(c) && /\b(const|let|var|function|=>|await)\b/.test(c) && !/\b(public|private|void|string |int )\b/.test(c)) return 'javascript';
    if (/<[a-z]+[\s>]/i.test(c) && /className|=>|useState/.test(c)) return 'jsx';
    if (/^\s*[.#a-z-]+\s*\{/m.test(c) && /:\s*[^;]+;/.test(c)) return 'css';
    if (/^\s*</.test(c)) return 'html';
    return 'csharp';
  }

  var ICON = {
    copy:  '<svg viewBox="0 0 24 24" width="14" height="14"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M5 15V5a2 2 0 0 1 2-2h8" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    grid:  '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M4 5h6v6H4zM14 5h6v6h-6zM4 13h6v6H4zM14 13h6v6h-6z" stroke="currentColor" stroke-width="1.7" fill="none"/></svg>'
  };

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
    Array.prototype.forEach.call(el.querySelectorAll('[data-code]'), function (b) {
      b.onclick = function () {
        var d = DATA.filter(function (x) { return x.id === b.getAttribute('data-code'); })[0];
        if (!d || !d.code) return;
        if (navigator.clipboard) navigator.clipboard.writeText(d.code);
        b.textContent = 'Copied';
        setTimeout(function () { b.textContent = 'Copy'; }, 1400);
      };
    });
    Array.prototype.forEach.call(el.querySelectorAll('[data-copy]'), function (b) {
      b.onclick = function () { copyAnswer(b.getAttribute('data-copy')); };
    });
    Array.prototype.forEach.call(el.querySelectorAll('[data-learn]'), function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-learn');
        var label = b.querySelector('span');
        if (learned[id]) { delete learned[id]; b.classList.remove('on'); if (label) label.textContent = 'Mark learned'; }
        else { learned[id] = 1; b.classList.add('on'); if (label) label.textContent = 'Learned'; toast('Marked as learned'); }
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
      (d.script ? 'SAY THIS\n' + d.script + '\n\n' : '') +
      (d.followups ? 'WHAT THEY ASK NEXT\n' + d.followups.map(function (f) { return 'Q: ' + f.q + '\nA: ' + f.a; }).join('\n') + '\n\n' : '') +
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

  /* ---------- topic lookups ----------
     Typing a subject rather than a question — "scenario based",
     "coding round", "sql" — should list what is in it, not guess
     at one answer from inside it.                                 */
  var TOPIC_ALIAS = {
    csharp:        ["c#", "c sharp", "csharp", "dotnet", ".net", "c# .net", "c# questions"],
    solid:         ["solid", "oop", "oops", "design patterns", "principles"],
    aspnet:        ["asp.net", "asp.net core", "web api", "api", "mvc", "ef core"],
    adonet:        ["ado.net", "adonet", "ado"],
    sql:           ["sql", "sql server", "database", "tsql", "t-sql", "db"],
    jquery:        ["javascript", "js", "jquery", "javascript jquery"],
    react:         ["react", "reactjs", "react.js", "hooks"],
    azure:         ["azure", "devops", "cloud", "azure functions", "git"],
    microservices: ["microservices", "microservice", "architecture"],
    web:           ["html", "css", "typescript", "frontend", "html css"],
    coding:        ["coding", "coding round", "programs", "dsa", "algorithms", "coding questions"],
    scenario:      ["scenario", "scenario based", "scenarios", "situational", "real time", "scenario based questions"],
    projects:      ["projects", "my projects", "project", "architecture questions"],
    hr:            ["hr", "hr round", "behavioural", "behavioral", "hr questions"]
  };

  function matchTopic(q) {
    var n = norm(q).replace(/\b(questions?|qa|q and a|interview|round|topics?|based)\b/g, " ").replace(/\s+/g, " ").trim();
    if (!n || n.split(" ").length > 3) return null;
    for (var k in TOPIC_ALIAS) {
      if (TOPIC_ALIAS[k].indexOf(n) >= 0) return k;
      if (norm(TOPICS[k].name) === n) return k;
    }
    return null;
  }

  function topicOverviewHTML(key) {
    var t = TOPICS[key];
    var list = DATA.filter(function (d) { return d.topic === key; });
    var starred = list.filter(function (d) { return d.star; });
    var show = (starred.length >= 6 ? starred : list).slice(0, 14);
    return "<div class=\"a-head\"><h2 class=\"a-title\">" + esc(t.name) + "</h2>" +
      "<span class=\"a-chip\" style=\"color:" + t.color + ";border-color:" + t.color + "40;background:" + t.color + "14\">" +
        list.length + " answers</span></div>" +
      "<div class=\"a-lead\">Here is what I have on " + esc(t.name) + ". Pick one, or keep typing to search inside it.</div>" +
      "<div class=\"rel-chips\">" + show.map(function (d) {
        return "<button class=\"rel\" data-ask=\"" + esc(d.q) + "\">" + esc(d.q) + "</button>";
      }).join("") + "</div>" +
      "<div class=\"a-actions\"><button class=\"a-act\" data-topicjump=\"" + key + "\">" + ICON.grid +
        "<span>Browse all " + list.length + "</span></button></div>";
  }

  /* ---------- ask ---------- */
  var busy = false, pendingAsk = null;
  function ask(q) {
    q = String(q || '').trim();
    if (!q) return;
    if (busy) { pendingAsk = q; return; }   // asked again mid-answer: queue it, never drop it
    busy = true;
    showLibrary(false);
    if (welcome) welcome.style.display = 'none';
    hideSuggest();
    input.value = '';
    autosize();
    syncSend();
    finishStream();

    row('user', 'N', '<div class="q-text">' + esc(q) + '</div>');

    // a subject rather than a question -> show what is in that topic
    var topicHit = activeTopic ? null : matchTopic(q);

    var t0 = performance.now();
    var res = search(q, activeTopic);

    // typed in spoken form? ("sequel server", "jay query") - only as a rescue,
    // so a query that already works is never rewritten
    var spokenFix = null;
    if (!res.length || res[0].s < 45) {
      var alt = fixSpoken(q);
      if (alt && alt !== norm(q)) {
        var res2 = search(alt, activeTopic);
        if (res2.length && (!res.length || res2[0].s > res[0].s + 8)) { res = res2; spokenFix = alt; }
      }
    }
    var corr = (res[0] && res[0].corr) || {};
    var ms = Math.max(1, Math.round((performance.now() - t0) * 10) / 10);
    $('speedTxt').textContent = 'matched ' + DATA.length + ' answers in ' + ms + ' ms';

    var loading = row('bot', 'Q', '<div class="typing"><i></i><i></i><i></i></div>');
    thread.scrollTop = thread.scrollHeight;

    setTimeout(function () {
      var holder = loading.querySelector('.body');
      holder.innerHTML = '';                 // drop the typing dots
      if (topicHit) {
        holder.innerHTML = topicOverviewHTML(topicHit);
        pushRecent(q);
        streamIn(holder);
      } else if (!res.length) {
        // genuinely nothing — offer the best starting points rather than a dead end
        var picks = DATA.filter(function (d) { return d.star; }).slice(0, 6);
        holder.innerHTML = '<div class="nores"><p>Nothing in the library matches <b>' + esc(q) +
          '</b> yet.</p><p>These are good places to start:</p></div>' +
          '<div class="rel-chips" style="margin-top:10px">' +
          picks.map(function (d) { return '<button class="rel" data-ask="' + esc(d.q) + '">' + esc(d.q) + '</button>'; }).join('') +
          '</div>';
      } else {
        var top = res[0].d;
        // a weak top hit still gets answered — say so rather than showing nothing
        var fixed = Object.keys(corr);
        if (spokenFix) { holder.innerHTML = '<div class="didyoumean">Searched for <b>' + esc(spokenFix) + '</b> instead of <i>' + esc(q) + '</i>.</div>'; }
        if (!spokenFix && (res[0].s < 30 || fixed.length)) {
          holder.innerHTML =
            '<div class="didyoumean">' +
            (fixed.length
              ? 'Searched for <b>' + esc(fixed.map(function (k) { return corr[k]; }).join(' ')) +
                '</b> instead of <i>' + esc(fixed.join(' ')) + '</i>.'
              : 'No exact match for <i>' + esc(q) + '</i> — this is the closest answer.') +
            '</div>';
        }
        var rel = res.slice(1, 6).filter(function (r) { return r.s >= 25; }).map(function (r) { return r.d; });
        if (rel.length < 4) {
          DATA.filter(function (d) { return d.topic === top.topic && d.id !== top.id; }).slice(0, 4 - rel.length)
            .forEach(function (d) { rel.push(d); });
        }
        holder.innerHTML += answerHTML(top, ms, rel);
        pushRecent(q);
        streamIn(holder);                 // reveal block by block, like a reply arriving
      }
      bindAnswer(holder);
      busy = false;
      if (pendingAsk) { var next = pendingAsk; pendingAsk = null; setTimeout(function () { ask(next); }, 30); }
      loading.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(syncJump, 400);
      voiceFollowUp();
    }, 140);
  }

  /* ---------- streaming ----------
     Reveals the reply word by word, the way an assistant answers.
     Every text node is split into word spans once, then revealed in
     batches on animation frames. A click anywhere finishes it.
     Whole thing lands inside ~700 ms however long the answer is.   */
  var streamRaf = null, streamWords = [], streamIdx = 0, streamCaret = null, streamGuard = null;

  function finishStream() {
    clearTimeout(streamGuard);
    if (streamRaf) cancelAnimationFrame(streamRaf);
    streamRaf = null;
    for (var i = streamIdx; i < streamWords.length; i++) streamWords[i].classList.remove("w-off");
    streamWords = []; streamIdx = 0;
    if (streamCaret && streamCaret.parentNode) streamCaret.parentNode.removeChild(streamCaret);
    streamCaret = null;
  }

  function collectWords(root) {
    var out = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (n.parentNode.closest("pre, .a-actions, .a-rel, .rel-chips, .cmp-table, figcaption")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);

    nodes.forEach(function (node) {
      var parts = node.nodeValue.split(/(\s+)/);
      var frag = document.createDocumentFragment();
      parts.forEach(function (p) {
        if (!p) return;
        if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
        var sp = document.createElement("span");
        sp.className = "w w-off";
        sp.textContent = p;
        frag.appendChild(sp);
        out.push(sp);
      });
      node.parentNode.replaceChild(frag, node);
    });
    return out;
  }

  function streamIn(holder) {
    finishStream();
    // blocks that are not word-streamed fade in as units
    Array.prototype.forEach.call(holder.querySelectorAll("pre, .cmp-wrap, .a-rel, .rel-chips, .a-actions"), function (el) {
      el.classList.add("blk-off");
    });

    streamWords = collectWords(holder);
    streamIdx = 0;
    if (!streamWords.length) { holder.querySelectorAll(".blk-off").forEach(function (e) { e.classList.remove("blk-off"); }); return; }

    streamCaret = document.createElement("span");
    streamCaret.className = "caret";

    var total = streamWords.length;
    var frames = 34;                              // ~560 ms at 60fps
    var perFrame = Math.max(3, Math.ceil(total / frames));

    function tick() {
      var end = Math.min(streamIdx + perFrame, total);
      for (; streamIdx < end; streamIdx++) streamWords[streamIdx].classList.remove("w-off");
      var last = streamWords[streamIdx - 1];
      if (last && last.parentNode) last.parentNode.insertBefore(streamCaret, last.nextSibling);
      if (streamIdx < total) { streamRaf = requestAnimationFrame(tick); return; }
      streamRaf = null;
      Array.prototype.forEach.call(holder.querySelectorAll(".blk-off"), function (el, i) {
        setTimeout(function () { el.classList.remove("blk-off"); }, i * 45);
      });
      setTimeout(function () {
        if (streamCaret && streamCaret.parentNode) streamCaret.parentNode.removeChild(streamCaret);
        streamCaret = null;
      }, 160);
    }
    streamRaf = requestAnimationFrame(tick);
    // rAF pauses in a background tab - never leave words invisible
    clearTimeout(streamGuard);
    streamGuard = setTimeout(finishStream, 1500);
  }

  /* ---------- recents ---------- */
  function pushRecent(q) {
    recent = recent.filter(function (x) { return x.toLowerCase() !== q.toLowerCase(); });
    recent.unshift(q);
    if (recent.length > 25) recent.pop();
    LS.set('recent', recent);
    buildRecent();
    syncScope();
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
          return '<div class="lib-card ' + (learned[d.id] ? 'learned' : '') + '" data-ask="' + esc(d.q) + '" style="--topic-color:' + TOPICS[k].color + '">' +
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
  function closeSidebar() {
    $('sidebar').classList.remove('open');
    $('app').classList.remove('side-open');
  }
  function openSidebar() {
    $('sidebar').classList.add('open');
    $('app').classList.add('side-open');
  }

  /* ---------- events ---------- */
  function syncSend() { $('send').disabled = !input.value.trim(); }
  input.addEventListener('input', function () { autosize(); showSuggest(); syncSend(); });
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
  $('scopePill').onclick = function () { if (activeTopic) setTopic(''); };
  thread.addEventListener('click', function (e) {
    if (!e.target.closest('button, a')) finishStream();
  });
  $('toBottom').onclick = function () {
    thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' });
  };
  thread.addEventListener('scroll', function () {
    var atEnd = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 120;
    syncJump();
  });
  $('newChat').onclick = function () {
    thread.innerHTML = ''; thread.appendChild(welcome);
    welcome.style.display = ''; showLibrary(false); buildWelcome();
    input.value = ''; autosize(); syncSend(); input.focus(); closeSidebar();
  };
  $('libBtn').onclick = function () { showLibrary(library.hidden); closeSidebar(); };
  $('libFilter').oninput = function () { buildLibrary(this.value); };
  $('clearRecent').onclick = function () { recent = []; LS.set('recent', recent); buildRecent(); };
  // tapping the dimmed backdrop closes the slide-over
  $('app').addEventListener('click', function (e) {
    if (window.innerWidth <= 760 && $('sidebar').classList.contains('open') && !e.target.closest('#sidebar, #openSide')) closeSidebar();
  });

  function toggleNav(force) {
    if (window.innerWidth <= 860) {           // mobile: slide the panel over the page
      if ($('sidebar').classList.contains('open')) closeSidebar(); else openSidebar();
      return;
    }
    var app = $('app');
    var collapsed = force === undefined ? !app.classList.contains('nav-collapsed') : force;
    app.classList.toggle('nav-collapsed', collapsed);
    LS.set('navCollapsed', collapsed);
  }
  $('openSide').onclick = function () { toggleNav(); };
  $('closeSide').onclick = closeSidebar;
  $('themeBtn').onclick = function () {
    var cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', cur);
    $('themeTxt').textContent = cur === 'light' ? 'Dark mode' : 'Light mode';
    LS.set('theme', cur);
  };
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== input) { e.preventDefault(); input.focus(); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); toggleNav(); }
  });

  /* ---------- debug + extension hook ---------- */
  window.DevQA = { data: DATA, search: search, ask: ask, topics: TOPICS };

  /* ============================================================
     Voice mode — always listening, no clicking between questions.

     Switch to Voice once and the microphone stays live: ask, read the
     answer, ask the next one. Recognition sessions end on their own
     (silence, or the browser's own limit) so this restarts them
     automatically — the user never sees that happen.

     It stops only when you mean it to: tap the mic, press Escape, or
     switch back to Text. Permission is asked once by the browser, and
     remembered after that.

     Answers come back as text — nothing is read aloud.

     Honest note: the browser transcribes through its vendor's online
     service, so voice is the one part of this app that touches the
     network. It also needs a secure page, so it works on https:// and
     localhost but not on a file:// page opened from disk.
     ============================================================ */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recog = null;
  var listening = false;        // a session is actually running
  var wantListening = false;    // the user wants the mic live
  var mode = LS.get('mode', 'text');
  var micGranted = LS.get('micOk', false);

  var finalBuffer = '', submitTimer = null, restartTimer = null;
  var errorCount = 0, errorWindowAt = 0;

  /* --- what the microphone heard -> what you meant --------------- */
  var SPEECH_KEYS = Object.keys(window.QA_SPEECH || {})
    .sort(function (a, b) { return b.length - a.length; });

  function fixSpoken(text) {
    var out = ' ' + String(text || '').toLowerCase().replace(/\s+/g, ' ').trim() + ' ';
    for (var i = 0; i < SPEECH_KEYS.length; i++) {
      var k = SPEECH_KEYS[i], idx = out.indexOf(' ' + k + ' ');
      while (idx >= 0) {
        out = out.slice(0, idx) + ' ' + window.QA_SPEECH[k] + ' ' + out.slice(idx + k.length + 2);
        idx = out.indexOf(' ' + k + ' ');
      }
    }
    return out.replace(/\s+/g, ' ').trim();
  }

  function voiceBlockReason() {
    if (!SR) return 'This browser has no speech recognition. Chrome or Edge will do it.';
    if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1')
      return 'Voice needs a secure page. Open the published https:// link — a file opened from disk cannot use the microphone.';
    return '';
  }

  function paintMode() {
    var sw = $('modeSwitch');
    if (!sw) return;
    sw.classList.toggle('voice', mode === 'voice');
    Array.prototype.forEach.call(sw.querySelectorAll('.mode-opt'), function (b) {
      b.classList.toggle('active', b.getAttribute('data-mode') === mode);
    });
    $('micBtn').hidden = mode !== 'voice';
    var hint = document.querySelector('.composer-hint');
    if (hint) {
      hint.firstChild.nodeValue = mode === 'voice'
        ? 'Answers run locally · only voice transcription uses the network · '
        : 'Runs fully offline on your machine · no internet, no API, no cost · ';
    }
    input.placeholder = mode === 'voice' ? 'Just speak — or type here' : 'Ask anything…';
  }

  function paintListening() {
    $('micBtn').classList.toggle('listening', wantListening);
    $('composerShell').classList.toggle('listening', wantListening);
    if ($('kbdHint')) $('kbdHint').hidden = wantListening;
    if ($('listeningNote')) $('listeningNote').hidden = !wantListening;
    $('micBtn').title = wantListening ? 'Stop listening (Esc)' : 'Start listening (Ctrl+M)';
    if (!wantListening) input.classList.remove('interim');
  }

  /* ---- the session itself ---- */
  function startRecognition() {
    if (listening || !wantListening || mode !== 'voice') return;
    if (!SR) return;

    recog = new SR();
    recog.lang = LS.get('speechLang', 'en-IN');
    recog.interimResults = true;
    recog.continuous = true;          // stay open across several questions
    recog.maxAlternatives = 1;

    recog.onstart = function () {
      listening = true;
      micGranted = true;
      LS.set('micOk', true);
      errorCount = 0;
      paintListening();
    };

    recog.onresult = function (e) {
      var interim = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalBuffer += ' ' + t;
        else interim += t;
      }
      if (!busy) {
        input.value = (finalBuffer + ' ' + interim).replace(/\s+/g, ' ').trim();
        input.classList.toggle('interim', !finalBuffer.trim() && !!interim);
        autosize();
        syncSend();
      }
      // a short pause after the last final chunk means the question is finished
      clearTimeout(submitTimer);
      if (finalBuffer.trim()) submitTimer = setTimeout(submitHeard, 700);
    };

    recog.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        // the only error that should actually stop us
        wantListening = false;
        micGranted = false;
        LS.set('micOk', false);
        toast('Microphone blocked. Allow it from the icon in the address bar, then switch Voice on again.');
        setMode('text');
        return;
      }
      if (e.error === 'no-speech' || e.error === 'aborted') return;   // onend will restart
      if (e.error === 'network') {
        noteError('Speech service unreachable. Voice needs internet; the answers do not.');
        return;
      }
      noteError('Voice error: ' + e.error);
    };

    recog.onend = function () {
      listening = false;
      input.classList.remove('interim');
      // sessions end by themselves on silence — just open a new one
      if (wantListening && mode === 'voice') {
        clearTimeout(restartTimer);
        restartTimer = setTimeout(startRecognition, 250);
      } else {
        paintListening();
      }
    };

    try { recog.start(); }
    catch (err) {
      // start() throws if a session is already running — harmless
      listening = false;
      if (wantListening) { clearTimeout(restartTimer); restartTimer = setTimeout(startRecognition, 400); }
    }
  }

  /* repeated failures should not spin forever */
  function noteError(msg) {
    var now = Date.now();
    if (now - errorWindowAt > 15000) { errorWindowAt = now; errorCount = 0; }
    errorCount++;
    if (errorCount === 1) toast(msg);
    if (errorCount >= 4) {
      wantListening = false;
      paintListening();
      toast('Voice keeps failing — stopped. Tap the mic to try again.');
    }
  }

  function submitHeard() {
    var heard = finalBuffer.replace(/\s+/g, ' ').trim();
    finalBuffer = '';
    if (!heard || heard.length < 2) return;

    var fixed = fixSpoken(heard);
    input.value = fixed;
    input.classList.remove('interim');
    if (fixed !== heard.toLowerCase()) toast('Heard “' + heard + '” → searching “' + fixed + '”');
    ask(fixed);
  }

  function startListening() {
    var reason = voiceBlockReason();
    if (reason) { toast(reason); return; }
    wantListening = true;
    finalBuffer = '';
    paintListening();
    startRecognition();
  }

  function stopListening() {
    wantListening = false;
    clearTimeout(restartTimer);
    clearTimeout(submitTimer);
    finalBuffer = '';
    if (recog) { try { recog.abort(); } catch (e) {} }
    listening = false;
    paintListening();
  }

  function setMode(next) {
    if (next === 'voice') {
      var reason = voiceBlockReason();
      if (reason) { toast(reason); return; }
    }
    mode = next;
    LS.set('mode', mode);
    paintMode();
    if (mode === 'voice') {
      startListening();                       // this click is the gesture the browser needs
      if (!micGranted) toast('Allow the microphone once — after that it keeps listening, no clicking.');
      else toast('Voice mode on. Just speak — it stays listening after each answer.');
    } else {
      stopListening();
    }
  }

  /* the mic button is now start / stop, not ask-once */
  $('micBtn').onclick = function () {
    if (wantListening) stopListening(); else startListening();
  };

  Array.prototype.forEach.call(document.querySelectorAll('.mode-opt'), function (b) {
    b.onclick = function () { setMode(b.getAttribute('data-mode')); };
  });

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'm' || e.key === 'M')) {
      e.preventDefault();
      if (mode !== 'voice') setMode('voice');
      else if (wantListening) stopListening();
      else startListening();
    }
    if (e.key === 'Escape' && wantListening) stopListening();
  });

  /* nothing to do after an answer — the session is already listening */
  function voiceFollowUp() { }

  paintMode();
  paintListening();

  /* remembered voice mode: pick straight back up without a click */
  if (mode === 'voice' && micGranted && !voiceBlockReason()) {
    wantListening = true;
    paintListening();
    setTimeout(startRecognition, 300);
    // if the browser refuses without a gesture, the first click anywhere starts it
    document.addEventListener('click', function once() {
      document.removeEventListener('click', once);
      if (wantListening && !listening) startRecognition();
    });
  }


  /* ---------- rotating placeholder ---------- */
  var PLACEHOLDERS = [
    'Ask anything…',
    'Try: solid principles',
    'Try: why is my query slow',
    'Try: explain the vendor portal',
    'Try: reverse a string',
    'Try: two users edit the same record',
    'Try: tell me about yourself'
  ];
  (function rotatePlaceholder() {
    var i = 0;
    setInterval(function () {
      if (document.activeElement === input || input.value) return;
      i = (i + 1) % PLACEHOLDERS.length;
      input.style.opacity = '.45';
      setTimeout(function () { input.placeholder = PLACEHOLDERS[i]; input.style.opacity = '1'; }, 160);
    }, 3600);
  })();

  /* ---------- boot ---------- */
  (function boot() {
    var th = LS.get('theme', 'dark');
    document.documentElement.setAttribute('data-theme', th);
    $('themeTxt').textContent = th === 'light' ? 'Dark mode' : 'Light mode';
    if (LS.get('navCollapsed', false) && window.innerWidth > 860) $('app').classList.add('nav-collapsed');
    buildSidebar();
    buildWelcome();
    buildRecent();
    updateProgress();
    $('speedTxt').textContent = DATA.length + ' answers loaded';
    input.focus();
    // deep link:  index.html#q=solid
    var m = location.hash.match(/#q=(.+)/);
    if (m) ask(decodeURIComponent(m[1]).replace(/\+/g, ' '));   // + means space in a URL
  })();
})();
