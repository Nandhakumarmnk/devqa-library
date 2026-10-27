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
  /* Filler carries no subject, and counting it makes a real answer look
     like a weak one — "why do you want to leave" is a question about
     leaving, not about wanting. Keywords that happen to be English words
     stay out of this list: as, by, from, in, out, set, get, new, base.  */
  var STOP = {what:1,is:1,are:1,the:1,a:1,an:1,of:1,in:1,on:1,to:1,do:1,does:1,did:1,
    how:1,why:1,when:1,me:1,my:1,about:1,and:1,or:1,for:1,you:1,your:1,we:1,i:1,
    explain:1,tell:1,give:1,show:1,can:1,it:1,its:1,with:1,use:1,used:1,using:1,
    please:1,question:1,answer:1,interview:1,'in':1,
    want:1,wants:1,wanted:1,need:1,needs:1,needed:1,would:1,should:1,could:1,will:1,
    know:1,knows:1,think:1,going:1,really:1,actually:1,basically:1,simply:1,kindly:1,
    maybe:1,also:1,just:1,very:1,much:1,many:1,been:1,being:1,have:1,has:1,had:1,
    was:1,were:1,am:1,be:1,between:1,one:1};

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

  /* ---------- how much a word is worth ----------
     A word sitting in half the library tells us nothing; a word in two
     answers tells us almost everything. Every term score below is
     multiplied by this, so "indexer" counts for far more than "data".  */
  var NDOC = DATA.length || 1, DF = {};
  DATA.forEach(function (d) {
    var seen = {};
    d.titleTok.concat(d.tagTok).forEach(function (t) {
      if (!seen[t]) { seen[t] = 1; DF[t] = (DF[t] || 0) + 1; }
    });
  });
  var IDF = {};
  function idf(t) {
    if (IDF[t] !== undefined) return IDF[t];
    var df = DF[t] || 0;
    var v = df ? Math.log(NDOC / df) / Math.log(NDOC / 2) : 1.2;   // unseen word = distinctive
    return (IDF[t] = Math.max(0.18, Math.min(1.35, v)));
  }

  /* every word the library actually uses — what a misspelling is matched against */
  var VOCAB = Object.keys(DF).filter(function (t) { return t.length >= 4; });

  /* ---------- is this a misspelling of that? ----------
     Deliberately stricter than the match-time similarity. A word that merely
     starts with a known word is a different word, not a typo: "indexer" must
     never be rewritten to "index", or a C# question answers with SQL. Only a
     word of near-identical length and a character or two out qualifies.     */
  function misspelling(a, b) {
    if (Math.abs(a.length - b.length) > 1) return 0;
    var max = allowance(Math.max(a.length, b.length));
    if (!max) return 0;
    var d = dist(a, b, max);
    if (!d || d > max) return 0;
    return 1 - d / (Math.max(a.length, b.length) + 1);
  }

  /* A word built from a word the library knows plus an ordinary English
     ending is a real word of its own, however close it looks to something
     else: "indexer" is index+er, one character from "indexes", and must be
     left alone. The endings that merely inflect a word (-s, -ed, -ing) are
     not listed — those are matched by sameRoot, and are the shapes a typo
     usually takes.                                                        */
  var DERIV = ['er', 'ers', 'ion', 'ions', 'able', 'ible', 'ive', 'ment', 'ments',
               'ness', 'ful', 'less', 'ly', 'ity', 'ism', 'ist'];
  function derivedWord(w) {
    for (var i = 0; i < DERIV.length; i++) {
      var suf = DERIV[i];
      if (w.length - suf.length < 4) continue;
      if (w.slice(-suf.length) !== suf) continue;
      var root = w.slice(0, -suf.length);
      if (DF[root] || DF[root + 'e']) return true;      // index+er, declare+ation
    }
    return false;
  }

  /* "records" and "record" are the same idea - count them once */
  function stem(t) {
    return (t.length > 3 && t.charAt(t.length - 1) === 's' && t.slice(-2) !== 'ss') ? t.slice(0, -1) : t;
  }

  /* ---------- same word, different ending ----------
     Typing "why do you want to leave" has to reach the answer tagged
     "why leaving". Only the endings that keep the meaning are allowed,
     so "index" still does not become "indexer".                       */
  var TAIL = { '': 1, s: 1, es: 1, d: 1, ed: 1, ing: 1, ings: 1 };
  function sameRoot(a, b) {
    if (a === b) return true;
    var sh = a.length <= b.length ? a : b, ln = a.length <= b.length ? b : a;
    if (sh.length < 3) return false;
    if (ln.indexOf(sh) !== 0) {
      // the silent e is dropped before the ending: "leave" -> "leaving"
      if (sh.charAt(sh.length - 1) !== 'e' || ln.indexOf(sh.slice(0, -1)) !== 0) return false;
      sh = sh.slice(0, -1);
    }
    var tail = ln.slice(sh.length);
    // the final consonant doubles before the ending: "map" -> "mapping"
    if (tail.length > 1 && tail.charAt(0) === sh.charAt(sh.length - 1)) tail = tail.slice(1);
    return TAIL[tail] === 1;
  }

  /* pre-tokenised problem phrases, so a search does no repeat work */
  DATA.forEach(function (d) {
    d.probStems = (d.probs || []).map(function (p) { return uniq(toks(p).map(stem)); });
  });

  /* ---------- which stack is the question about? ----------
     "records in c#" must not come back with "delete duplicate rows".
     A word that names a stack pins the search to that stack: the named
     topic is lifted, its neighbours are left alone, and everything else
     is pushed down rather than filtered out - so an answer that genuinely
     crosses stacks can still win if it is a far better match.

     Two kinds of hint, and the difference matters:

     STACK — the word only names the technology, it is not the thing being
     asked about. "string in c#" is a question about strings. These are
     discounted as search terms and they push foreign stacks hard.

     SUBJECT — the word names the topic AND is the subject of the question.
     "stored procedure", "service discovery", "salary" steer the search, but
     they must keep their full weight, or "find the second highest salary"
     scores as a question about nothing and loses to the HR pack.          */
  var TOPIC_STACK = [
    ['csharp',        ['c#', 'csharp', 'c sharp', '.net', 'dotnet', 'net core', 'clr']],
    ['solid',         ['oop', 'oops']],
    ['aspnet',        ['asp.net', 'aspnet', 'asp net', 'mvc', 'web api', 'webapi', 'razor', 'kestrel']],
    ['adonet',        ['ado.net', 'adonet']],
    ['sql',           ['sql', 'sql server', 't-sql', 'tsql', 'ssms']],
    ['jquery',        ['jquery', 'javascript']],
    ['react',         ['react', 'reactjs', 'react.js', 'jsx']],
    ['azure',         ['azure']],
    ['microservices', ['microservice']],
    ['web',           ['html', 'css', 'typescript']],
    ['coding',        ['coding round', 'write a program', 'program to']],
    ['hr',            ['hr round']]
  ];
  var TOPIC_SUBJECT = [
    ['csharp',        ['linq', 'garbage collector']],
    ['solid',         ['solid', 'design pattern', 'srp', 'ocp', 'lsp', 'isp', 'dip']],
    ['aspnet',        ['middleware', 'entity framework', 'ef core']],
    ['adonet',        ['sqlcommand', 'sqldatareader', 'sqlconnection', 'dataset', 'datatable', 'dataadapter']],
    ['sql',           ['execution plan']],
    ['jquery',        ['ajax', 'dom']],
    ['react',         ['usestate', 'useeffect', 'redux', 'hook']],
    ['azure',         ['app service', 'blob storage', 'key vault', 'devops']],
    ['microservices', ['api gateway', 'service discovery', 'saga']],
    ['web',           ['flexbox', 'bootstrap']],
    ['hr',            ['notice period', 'salary', 'appraisal']]
  ];

  /* topics close enough that a hint for one must not bury the other */
  var NEAR = {
    csharp:        { solid: 1, coding: 1, adonet: 1, aspnet: 1, scenario: 1 },
    solid:         { csharp: 1, aspnet: 1, coding: 1 },
    aspnet:        { csharp: 1, adonet: 1, microservices: 1, solid: 1, azure: 1 },
    adonet:        { sql: 1, csharp: 1, aspnet: 1 },
    sql:           { adonet: 1, scenario: 1 },
    jquery:        { react: 1, web: 1 },
    react:         { jquery: 1, web: 1 },
    azure:         { microservices: 1, aspnet: 1, scenario: 1 },
    microservices: { azure: 1, aspnet: 1, scenario: 1 },
    web:           { react: 1, jquery: 1 },
    coding:        { csharp: 1 },
    scenario:      { projects: 1, sql: 1, aspnet: 1 },
    projects:      { hr: 1, scenario: 1, microservices: 1 },
    hr:            { projects: 1 }
  };

  /* {hit:{topic:1}, near:{topic:1}, words:{token:1}, any:bool} for one query.
     `words` is every word the hint consumed — "c#" in "string in c#" names
     the stack, it is not the thing being asked about, so it must not be
     scored as a search term on top of steering the search.               */
  function topicHints(qn) {
    var pad = ' ' + qn + ' ', hit = {}, near = {}, words = {},
        any = false, strong = false, i, j;

    for (i = 0; i < TOPIC_STACK.length; i++) {
      var sk = TOPIC_STACK[i][0], sl = TOPIC_STACK[i][1];
      for (j = 0; j < sl.length; j++) {
        if (pad.indexOf(' ' + sl[j] + ' ') < 0) continue;
        hit[sk] = 1; any = true; strong = true;
        sl[j].split(' ').forEach(function (w) { words[stem(w)] = 1; });
      }
    }
    for (i = 0; i < TOPIC_SUBJECT.length; i++) {
      var bk = TOPIC_SUBJECT[i][0], bl = TOPIC_SUBJECT[i][1];
      for (j = 0; j < bl.length; j++) {
        if (pad.indexOf(' ' + bl[j] + ' ') < 0) continue;
        hit[bk] = 1; any = true;         // steers, but the word keeps its weight
      }
    }
    if (any) {
      for (var k in hit) {
        var n = NEAR[k] || {};
        for (var m in n) if (!hit[m]) near[m] = 1;
      }
    }
    return { hit: hit, near: near, words: words, any: any, strong: strong };
  }

  /* ---------- scoring ----------
     Every result carries `conf` — its score measured against the best score
     that query could possibly have earned. Checked over 64 questions the
     library answers and 18 it does not, a real answer lands at 1.1 and up
     while an uncovered subject stays near 0.5, so this is the line between
     answering and saying plainly that there is no answer here.            */
  var CONFIDENT = 1.05;

  function search(q, topic) {
    var qn = norm(q);
    if (!qn) return [];
    var qt = uniq(toks(q));
    if (!qt.length) qt = qn.split(' ');

    // group the query by stem, so "records" / "record" is one idea, not two
    var groups = {}, stems = [];
    for (var gi = 0; gi < qt.length; gi++) {
      var st = stem(qt[gi]);
      if (!groups[st]) { groups[st] = []; stems.push(st); }
      groups[st].push(qt[gi]);
    }

    // ---- spelling, fixed once for the whole query ----
    // "clusterd indx" has to become "clustered index" before anything is
    // weighed, or the misspelling is treated as the rarest word in the
    // question and drags the confidence down with it. A word with no near
    // neighbour in the library is left alone: it is a subject we do not
    // have, not a typo, and it should lower confidence.
    var qFix = null, fixedAny = false, kept = [];
    for (var ci = 0; ci < stems.length; ci++) {
      var sc = stems[ci];
      if (DF[sc]) { kept.push(sc); continue; }
      var near = null, nearSim = 0;
      if (sc.length >= 4 && !derivedWord(sc)) {
        for (var vi = 0; vi < VOCAB.length; vi++) {
          var vs = misspelling(sc, VOCAB[vi]);
          if (vs > nearSim) { nearSim = vs; near = VOCAB[vi]; }
        }
      }
      if (near && nearSim >= 0.72) {
        (qFix = qFix || {})[sc] = near;
        fixedAny = true;
        if (!groups[near]) { groups[near] = []; kept.push(near); }
        groups[near] = groups[near].concat(groups[sc]).concat([near]);
      } else if (sc.length >= 4) {
        kept.push(sc);                 // a real word we simply do not cover
      }
      // anything shorter that matched nothing is a typo'd filler — dropped
    }
    if (kept.length) stems = kept;

    var hints = topicHints(qn);

    // weight per word: how distinctive it is, less the words that only name
    // the stack, which the topic boost at the bottom already acts on
    // Words he actually typed, as opposed to the ones SYN added for him.
    // Only the typed ones have to be covered: expanding "api" into "rest" must
    // not make a perfectly good answer look like it only half fits.
    var typed = {};
    norm(q).split(' ').forEach(function (w) { if (w && !STOP[w]) typed[stem(w)] = 1; });
    if (qFix) for (var fk in qFix) typed[qFix[fk]] = 1;        // a fixed spelling still counts as typed

    // RAW is the undiscounted weight, used only to measure how much of the
    // question an answer accounts for — the coverage check below.
    var W = {}, RAW = {}, mass = 0, coverAll = 0;
    for (var si = 0; si < stems.length; si++) {
      RAW[stems[si]] = idf(stems[si]);
      W[stems[si]] = RAW[stems[si]] * (hints.words[stems[si]] ? 0.15 : 1);
      mass += W[stems[si]];
      // naming the stack is not part of what has to be covered — "records in c#"
      // is a question about records, and the answer need not repeat "c#"
      if (!hints.words[stems[si]] && typed[stems[si]]) coverAll += RAW[stems[si]];
    }
    var mean = stems.length ? mass / stems.length : 0;
    var allWords = 26 * mean;             // the all-words bonus, worth what the words are worth

    // What this query would score against a perfect match. A long question is
    // still only about a few things — "what is the difference between abstract
    // class and interface with example" is a question about abstract classes
    // and interfaces — so only its most distinctive words set the bar. Without
    // this cap, the longer you type the less the right answer is believed.
    var top = stems.slice().sort(function (x, y) { return W[y] - W[x]; }).slice(0, 4);
    var topMass = 0;
    for (var ti = 0; ti < top.length; ti++) topMass += W[top[ti]];
    var ideal = (top.length > 1 ? 26 * (topMass / top.length) : 0) + 22 * topMass;
    if (ideal < 12) ideal = 12;

    var res = [];
    for (var i = 0; i < DATA.length; i++) {
      var d = DATA[i];
      if (topic && d.topic !== topic) continue;
      var s = 0, hit = 0, nhit = 0, docCorr = null, coverGot = 0;

      if (d.qNorm === qn) s += 200;
      // A phrase found in the title counts; one word in a long title does not
      // count twice. A short fragment counts for nothing at all — "hi" sits
      // inside "why should we hire you", and that is a coincidence, not a hit.
      else if (d.qNorm.indexOf(qn) >= 0 && (qn.indexOf(' ') > 0 || qn.length >= 4))
        s += (qn.indexOf(' ') > 0 ? 110 : 30);
      var exactTag = false;
      if (d.tagList.indexOf(qn) >= 0) { s += 150; exactTag = true; }   // typed exactly a curated keyword
      else if ((' ' + d.tagText + ' ').indexOf(' ' + qn + ' ') >= 0) { s += 95; exactTag = true; }
      if (qn.length > 6 && d.bodyText.indexOf(qn) >= 0) s += 22;

      // described-symptom match - how much of one problem phrase did they say.
      // One word in common is a coincidence, so two distinct words are required,
      // and the overlap is weighed by how distinctive those words are.
      if (d.probStems.length && stems.length >= 2) {
        var bestP = 0;
        for (var pi = 0; pi < d.probStems.length; pi++) {
          var pt = d.probStems[pi];
          if (pt.length < 2) continue;
          var shared = 0, got = 0, all = 0, pk;
          for (pk = 0; pk < pt.length; pk++) if (!hints.words[pt[pk]]) all += idf(pt[pk]);
          for (pk = 0; pk < stems.length; pk++) {
            if (hints.words[stems[pk]]) continue;     // naming the stack is not describing the problem
            if (pt.indexOf(stems[pk]) >= 0) { shared++; got += idf(stems[pk]); }
          }
          if (shared < 2) continue;
          var cover = all ? got / all : 0;
          if (cover > bestP) bestP = cover;
        }
        if (bestP >= 0.5) s += 50 + 90 * bestP;              // they described the problem
        else if (bestP > 0) s += 14 * bestP;
      }

      for (var k = 0; k < stems.length; k++) {
        var forms = groups[stems[k]], w = W[stems[k]];
        var add = 0, got = 0, named = 0, bestSim = 0, bestWord = null, bestTyped = null;

        for (var f = 0; f < forms.length; f++) {
          var t = forms[f], a, sim, part = 0, matched = 0, onName = 0;

          if (d.titleTok.indexOf(t) >= 0) { part += 22; matched = 1; onName = 1; }
          else {
            var titleHit = 0;
            for (a = 0; a < d.titleTok.length; a++) {
              if (sameRoot(t, d.titleTok[a])) { titleHit = 22; break; }
            }
            // A prefix is only evidence if there is enough of it. Two letters
            // are not a word: "hi" must not count as a hit on "hire".
            if (!titleHit && t.length >= 3) for (a = 0; a < d.titleTok.length; a++) {
              if (d.titleTok[a].indexOf(t) === 0 || (d.titleTok[a].length >= 3 && t.indexOf(d.titleTok[a]) === 0)) { titleHit = 12; break; }
            }
            if (titleHit) { part += titleHit; matched = 1; onName = 1; }
          }
          // tags are hand-written search keywords, so a tag hit is as good as
          // a title hit — "why leaving" is on that answer precisely so that
          // "why do you want to leave" finds it
          if (d.tagTok.indexOf(t) >= 0) { part += 22; matched = 1; onName = 1; }
          else {
            var tagHit = 0;
            for (a = 0; a < d.tagTok.length; a++) {
              if (sameRoot(t, d.tagTok[a])) { tagHit = 20; break; }
            }
            if (!tagHit && d.tagText.indexOf(t) >= 0) tagHit = 8;
            if (tagHit) { part += tagHit; matched = 1; onName = 1; }
          }
          if (!matched && d.bodyText.indexOf(t) >= 0) { part += 3.5; matched = 1; }

          // A word buried in the prose is a weak hit, and it must not stop the
          // near-miss check on the title: "dispose pattern" has to reach
          // "IDisposable", not stop at a body mention and lose to "Repository
          // pattern". So this runs whenever the title and tags did not match.
          if (!onName && t.length >= 4) {                    // misspelt or partial word
            for (a = 0; a < d.titleTok.length; a++) {
              sim = similarity(t, d.titleTok[a]);
              if (sim > bestSim) { bestSim = sim; bestWord = d.titleTok[a]; bestTyped = t; }
            }
            if (bestSim) part += 22 * bestSim;
            else {
              for (a = 0; a < d.tagTok.length; a++) {
                sim = similarity(t, d.tagTok[a]);
                if (sim > bestSim) { bestSim = sim; bestWord = d.tagTok[a]; bestTyped = t; }
              }
              if (bestSim) part += 17 * bestSim;
            }
            if (bestSim >= 0.72) { matched = 1; onName = 1; }
            else if (bestSim) matched = 1;
          }
          if (part > add) add = part;
          if (matched) got = 1;
          if (onName) named = 1;
        }

        if (named) { if (!hints.words[stems[k]] && typed[stems[k]]) coverGot += RAW[stems[k]]; nhit++; }
        s += add * w;
        if (bestWord && bestSim >= 0.6 && bestWord !== bestTyped) (docCorr = docCorr || {})[bestTyped] = bestWord;
        if (got) hit++;
      }

      if (!s) continue;
      // covered every word — at full value only when the title and keywords
      // covered them. A mention buried in the prose earns a third of it: that
      // title-sized bonus for a body hit is what made "dispose pattern" come
      // back as "Repository pattern".
      if (hit === stems.length && stems.length > 1)
        s += allWords * (nhit === stems.length ? 1 : 0.35);
      s += Math.max(0, 9 - d.titleTok.length) * 0.6;                // prefer tight titles

      // the stack the question named wins; a foreign stack has to be far better.
      // A subject hint ("salary", "saga") only nudges — the word itself is the
      // question, so it must not bury a better answer in another pack.
      if (hints.any) {
        if (hints.hit[d.topic]) s *= hints.strong ? 1.9 : 1.45;
        else if (!hints.near[d.topic]) s *= hints.strong ? 0.42 : 0.8;
      }
      if (d.topic === topic) s += 6;

      // ---- how much of the question this answer actually accounts for ----
      // Measured on the title and the curated keywords only: a word found
      // merely somewhere in the prose does not make it the subject.
      // nothing left to cover (the whole question was a stack name, "what is
      // ado.net") — there is no shortfall to be suspicious of
      var qCover = coverAll ? coverGot / coverAll : 1;
      var conf = s / ideal;
      // every word of the question is in the title/keywords — this IS the answer,
      // however the arithmetic came out
      // a hand-written keyword matched word for word: that is the answer, full stop
      if (exactTag) conf = Math.max(conf, 1.3);
      else if (qCover >= 0.85) conf = Math.max(conf, 1.15);
      // half the question is unaccounted for — never hand it over as the answer
      else if (qCover < 0.6) conf = Math.min(conf, 0.9);
      if (exactTag && conf < 1.3) conf = 1.3;

      res.push({ d: d, s: s, corr: fixedAny ? qFix : docCorr, conf: conf, cover: qCover });
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
    // the same filter as a chip row, in the main column where it is seen
    var bar = '<button class="fchip active" data-topic="">All<span class="fcnt">' + DATA.length + '</span></button>';
    Object.keys(TOPICS).forEach(function (k) {
      if (!counts[k]) return;
      bar += '<button class="fchip" data-topic="' + k + '" style="--topic-color:' + TOPICS[k].color + '">' +
             '<span class="dot" style="background:' + TOPICS[k].color + '"></span>' +
             TOPICS[k].name + '<span class="fcnt">' + counts[k] + '</span></button>';
    });

    $('topicList').innerHTML = html;
    $('topicSelect').innerHTML = sel;
    $('filterBar').innerHTML = bar;
    $('brandCount').textContent = DATA.length + ' answers · offline';

    Array.prototype.forEach.call($('topicList').children, function (el) {
      el.onclick = function () { setTopic(el.getAttribute('data-topic')); };
    });
    Array.prototype.forEach.call($('filterBar').children, function (el) {
      // clicking the chip that is already on clears it, so one control does both
      el.onclick = function () {
        var k = el.getAttribute('data-topic');
        setTopic(k && k === activeTopic ? '' : k);
      };
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
    Array.prototype.forEach.call($('filterBar').children, function (el) {
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
    if (cut.length <= 96) return cut;
    // cut on a word, not mid-word — "written again insi…" reads like a glitch
    var t = cut.slice(0, 94), sp = t.lastIndexOf(' ');
    if (sp > 60) t = t.slice(0, sp);
    return t.replace(/[\s,;:—–-]+$/, '') + '…';
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
    // No bullets, but the answer leads its paragraphs with a bold label —
    // "**Normalisation**: transactional tables go to 3NF". That label plus its
    // first clause is a key point; the label on its own is just a word.
    if (out.length < 2) {
      out = [];
      String(d.answer || '').split('\n').forEach(function (line) {
        var m = line.trim().match(/^\*\*([^*]+)\*\*\s*[—–\-:]*\s*([\s\S]*)$/);
        if (!m) return;
        var label = m[1].trim(), rest = firstClause(m[2]);
        // a label that is already a whole sentence stands alone
        if (/[.?!]$/.test(label)) out.push('**' + label.replace(/[.?!]$/, '') + '**');
        else out.push('**' + label + '**' + (rest ? ' — ' + rest : ''));
      });
    }

    if (out.length < 2) {                       // last resort: the bolded terms
      var seen = {}, bolds = String(d.answer || '').match(/\*\*([^*]+)\*\*/g) || [];
      out = [];
      bolds.forEach(function (b) {
        var t = b.replace(/\*\*/g, '').trim();
        // a two-word fragment is not a key point — "Keys", "3NF" tell him nothing
        if (t.length >= 12 && t.length < 60 && !seen[t.toLowerCase()]) { seen[t.toLowerCase()] = 1; out.push('**' + t + '**'); }
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

    // The words the interviewer is listening for. Say these out loud and the
    // answer registers as a developer's answer, whatever else you say around it.
    if (d.tags && d.tags.length) {
      h += '<div class="a-keys"><span class="a-keys-lab">Say these words</span>' +
        d.tags.slice(0, 7).map(function (k) { return '<span class="a-key">' + esc(k) + '</span>'; }).join('') +
           '</div>';
    }

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

  /* ---------- nothing really matches ----------
     Shown instead of an answer when the best hit is weak. The topic badge
     on every row is the point: it is obvious at a glance that the closest
     thing to "dispose pattern" sits in OOP & SOLID, so a wrong-subject
     answer can never be mistaken for the right one.                      */
  function nearMissHTML(q, near) {
    var scoped = activeTopic ? ' in <b>' + esc(TOPICS[activeTopic].name) + '</b>' : '';
    return '<div class="nomatch">' +
      '<p class="nm-lead">No direct answer for <b>' + esc(q) + '</b>' + scoped + ' in the library yet.</p>' +
      (near.length ? '<p class="nm-sub">Closest to what you asked:</p><div class="near-list">' +
        near.map(function (r) {
          var t = TOPICS[r.d.topic] || { name: r.d.topic, color: '#888' };
          return '<button class="near" data-ask="' + esc(r.d.q) + '">' +
            '<span class="mini" style="color:' + t.color + ';border-color:' + t.color + '55">' + esc(t.name) + '</span>' +
            '<span class="near-q">' + esc(r.d.q) + '</span></button>';
        }).join('') + '</div>' : '') +
      '<p class="nm-foot">' + (activeTopic
        ? 'Still nothing? Clear the topic filter to search all ' + DATA.length + ' answers.'
        : 'Or narrow it down with the topic filter above.') + '</p>' +
      '</div>';
  }

  /* ---------- talking, not searching ----------
     "hi" is not a question about hiring. A box that answers a greeting with
     an interview answer is a search box wearing a chat costume, so these are
     handled as conversation and never reach the ranker.                    */
  var SMALL_TALK = [
    ['greet', /^(hi+|hii+|hey+|hello+|helo+|hai+|hlo|yo|good (morning|afternoon|evening|day)|vanakkam|namaste|namaskaram|start|lets start|let us start)$/],
    ['thanks', /^(thanks|thank you|thanku|thank u|thx|ty|nandri|super|great|nice|good|cool|awesome|perfect|excellent|well done|correct)$/],
    ['bye',   /^(bye|goodbye|good night|gn|see you|ok bye|tata|exit|quit|done for today)$/],
    ['ack',   /^(ok|okay|k|hmm+|mm+|ya|yeah|yes|yep|yup|no|nope|fine|got it|understood|clear|next|continue|more)$/],
    ['who',   /^(who are you|what are you|what is this|what can you do|what do you do|help|how to use|how do i use this|how does this work|how this works|what should i ask|what should i type|guide me|teach me)$/]
  ];

  function smallTalk(q) {
    var n = norm(q);
    for (var i = 0; i < SMALL_TALK.length; i++)
      if (SMALL_TALK[i][1].test(n)) return SMALL_TALK[i][0];
    // one or two characters that the library does not know as a term of its own
    // ("ef", "di", "js" do pass) — ask, rather than rank 325 answers on a fragment
    if (n.length <= 2 && !SYN[n] && !DF[n]) return 'short';
    return null;
  }

  /* a few real questions to offer, from the topic he is in if he has picked one */
  function suggestions(count) {
    var pool = DATA.filter(function (d) { return !activeTopic || d.topic === activeTopic; });
    var picks = pool.filter(function (d) { return d.star && !learned[d.id]; });
    if (picks.length < count) picks = picks.concat(pool.filter(function (d) { return !d.star; }));
    return picks.slice(0, count || 4);
  }

  function chipRow(list) {
    return '<div class="rel-chips">' + list.map(function (d) {
      return '<button class="rel" data-ask="' + esc(d.q) + '">' + esc(d.q) + '</button>';
    }).join('') + '</div>';
  }

  function greetingWord() {
    var h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  function chatHTML(kind) {
    var scope = activeTopic ? (TOPICS[activeTopic] || {}).name : null;
    var lead, body = '';

    if (kind === 'greet') {
      lead = greetingWord() + ', Nandha. Ready when you are.';
      body = '<p>Type a question the way an interviewer would ask it &mdash; or just the keyword. ' +
             '<b>&ldquo;What is an index&rdquo;</b>, <b>&ldquo;index&rdquo;</b> and ' +
             '<b>&ldquo;my screen takes 30 seconds to load&rdquo;</b> all reach the same answer.</p>' +
             '<p>' + (scope ? 'You are inside <b>' + esc(scope) + '</b> right now &mdash; clear the filter above to search all '
                            : 'I have ') + DATA.length + ' answers' + (scope ? '.' : ' across 14 topics.') + '</p>' +
             '<p class="a-h" style="margin-bottom:6px">Pick one to start:</p>' + chipRow(suggestions(5));
    } else if (kind === 'thanks') {
      lead = 'Any time. Want the next one?';
      body = chipRow(suggestions(4));
    } else if (kind === 'bye') {
      lead = 'Good luck in there. You know this material.';
      body = '<p>Before you close it: say the <b>Remember</b> line of the last three answers out loud. ' +
             'That is the bit that survives the nerves.</p>';
    } else if (kind === 'ack') {
      lead = 'Right &mdash; what next?';
      body = chipRow(suggestions(4));
    } else if (kind === 'short') {
      lead = 'Give me a little more to go on.';
      body = '<p>One or two letters could mean anything. A term, a full question or the symptom all work &mdash; ' +
             '<i>&ldquo;index&rdquo;</i>, <i>&ldquo;what is deferred execution&rdquo;</i>, ' +
             '<i>&ldquo;my click stops working after the grid refreshes&rdquo;</i>.</p>' +
             chipRow(suggestions(4));
    } else {                                   // who / help
      lead = 'I am your offline interview answer library. ' + DATA.length +
             ' answers, on your own machine &mdash; no internet, no API, no cost.';
      body = '<p><b>Ask however you like.</b> The term (<i>&ldquo;deferred execution&rdquo;</i>), the ' +
             'interviewer&rsquo;s phrasing (<i>&ldquo;what is the difference between IEnumerable and IQueryable&rdquo;</i>), ' +
             'or the symptom (<i>&ldquo;my click stops working after the grid refreshes&rdquo;</i>). ' +
             'Spelling does not have to be right.</p>' +
             '<p><b>Every answer gives you</b> the one-line version, the words to say out loud, the key points, ' +
             'the full answer, what they ask next, and where you used it in your own projects.</p>' +
             '<p><b>Narrow it</b> with the topic row at the top, <b>browse</b> everything with Browse library, ' +
             'and <b>mark learned</b> as you go &mdash; the percentage at the top right is your progress.</p>' +
             '<p>If I do not have something, I say so and show you the closest instead. ' +
             'I will not hand you an answer from the wrong subject.</p>' +
             '<p class="a-h" style="margin-bottom:6px">Try one of these:</p>' + chipRow(suggestions(5));
    }

    // lead is our own copy, entities and all — escaping it would print "&amp;mdash;"
    return '<div class="a-lead" style="border-bottom:0;margin-bottom:10px">' + lead + '</div>' +
           '<div class="a-body">' + body + '</div>';
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

    // conversation, not a question -> talk back. Nothing is searched, so
    // "hi" can never come back as "Why should we hire you?"
    var chat = smallTalk(q);

    // a subject rather than a question -> show what is in that topic
    var topicHit = (chat || activeTopic) ? null : matchTopic(q);

    var t0 = performance.now();
    var res = chat ? [] : search(q, activeTopic);

    // typed in spoken form? ("sequel server", "jay query") - only as a rescue,
    // so a query that already works is never rewritten
    var spokenFix = null;
    if (!chat && (!res.length || res[0].conf < CONFIDENT)) {
      var alt = fixSpoken(q);
      if (alt && alt !== norm(q)) {
        var res2 = search(alt, activeTopic);
        if (res2.length && (!res.length || res2[0].conf > res[0].conf + 0.15)) { res = res2; spokenFix = alt; }
      }
    }
    var corr = (res[0] && res[0].corr) || {};
    var ms = Math.max(1, Math.round((performance.now() - t0) * 10) / 10);
    if (!chat) $('speedTxt').textContent = 'matched ' + DATA.length + ' answers in ' + ms + ' ms';

    var loading = row('bot', 'Q', '<div class="typing"><i></i><i></i><i></i></div>');
    thread.scrollTop = thread.scrollHeight;

    // The dots were held for 140 ms so a reply would not appear to come
    // from nowhere. The search has already finished by this point — the
    // wait was manners, not work — and in an interview manners are not
    // worth a seventh of a second, so they flash rather than linger.
    setTimeout(function () {
      var holder = loading.querySelector('.body');
      holder.innerHTML = '';                 // drop the typing dots
      if (chat) {
        holder.innerHTML = chatHTML(chat);   // a greeting is not a search; not kept in Recent
        streamIn(holder);
      } else if (topicHit) {
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
        var fixed = Object.keys(corr);
        var lead = '';
        if (spokenFix) {
          lead = '<div class="didyoumean">Searched for <b>' + esc(spokenFix) + '</b> instead of <i>' + esc(q) + '</i>.</div>';
        } else if (fixed.length) {
          lead = '<div class="didyoumean">Searched for <b>' +
            esc(fixed.map(function (k) { return corr[k]; }).join(' ')) +
            '</b> instead of <i>' + esc(fixed.join(' ')) + '</i>.</div>';
        }

        // One answer streets ahead of everything else is the answer, even if the
        // arithmetic left it just under the line — "cors error" scores 60 against
        // a next-best 51, and there is no honest reading of that as "no match".
        var dominant = res.length > 1 && res[0].s >= 1.3 * res[1].s &&
                       res[0].cover >= 0.55 && res[0].conf >= 0.8;

        if (res[0].conf < CONFIDENT && !dominant) {
          // Nothing here really answers this. Say so and show what is nearest,
          // rather than handing over a confident answer from the wrong subject —
          // a C# question must never come back as a SQL answer.
          holder.innerHTML = lead + nearMissHTML(q, res.slice(0, 5));
          pushRecent(q);
          streamIn(holder);
        } else {
          var rel = res.slice(1, 6).filter(function (r) { return r.conf >= 0.5; }).map(function (r) { return r.d; });
          if (rel.length < 4) {
            DATA.filter(function (d) { return d.topic === top.topic && d.id !== top.id; }).slice(0, 4 - rel.length)
              .forEach(function (d) { rel.push(d); });
          }
          holder.innerHTML = lead + answerHTML(top, ms, rel);
          pushRecent(q);
          streamIn(holder);               // reveal block by block, like a reply arriving
        }
      }
      bindAnswer(holder);
      busy = false;
      if (pendingAsk) { var next = pendingAsk; pendingAsk = null; setTimeout(function () { ask(next); }, 30); }
      loading.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(syncJump, 400);
      voiceFollowUp();
    }, 55);
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
    // The whole point of this function is that nothing is ever left invisible.
    // It was only un-hiding the words — a block faded in as a unit (the chips,
    // the Related row, the action buttons) stayed at opacity 0 for good if the
    // guard fired or a click cut the stream short.
    var off = thread.querySelectorAll(".blk-off");
    for (var b = 0; b < off.length; b++) off[b].classList.remove("blk-off");
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
    // 34 frames was ~560 ms, and with the block cascade behind it that put
    // a full second of decoration in front of every answer. In an interview
    // that second is the whole budget, so the reveal is quicker now — still
    // a reply arriving rather than a page appearing, just not a performance.
    var frames = 20;                              // ~330 ms at 60fps
    var perFrame = Math.max(3, Math.ceil(total / frames));

    function tick() {
      var end = Math.min(streamIdx + perFrame, total);
      for (; streamIdx < end; streamIdx++) streamWords[streamIdx].classList.remove("w-off");
      var last = streamWords[streamIdx - 1];
      if (last && last.parentNode) last.parentNode.insertBefore(streamCaret, last.nextSibling);
      if (streamIdx < total) { streamRaf = requestAnimationFrame(tick); return; }
      streamRaf = null;
      Array.prototype.forEach.call(holder.querySelectorAll(".blk-off"), function (el, i) {
        setTimeout(function () { el.classList.remove("blk-off"); }, i * 28);
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
    if (smallTalk(q)) return hideSuggest();      // "hi" is talk, not a lookup
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
      return '<div class="sg" data-i="' + i + '">' +
        '<span class="mini" style="color:' + t.color + ';border-color:' + t.color + '55">' + t.name + '</span>' +
        '<span class="sg-q">' + title + '</span></div>';
    }).join('');
    // Nothing is pre-selected. Enter sends what HE typed; the list is only
    // taken when he deliberately arrows onto a row or presses Tab. Selecting
    // row one for him is what turned "hi" into "Why should we hire you?".
    sgIndex = -1;
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
    // Tab accepts the top suggestion — the deliberate way to take the list
    if (e.key === 'Tab' && !suggest.hidden && sgItems.length) {
      e.preventDefault();
      ask(sgItems[sgIndex >= 0 ? sgIndex : 0].q);
      return;
    }
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

     Honest note on the network. The browser will happily transcribe
     through its vendor's online service, and that is what this used
     to do. Where the browser can run the model on this machine it now
     does that instead — see the on-device block below — and then
     nothing leaves the laptop at all. Where it cannot, voice still
     works and still needs a connection to transcribe; the answers
     never do, either way.

     Either way it needs a secure page, so it works on https:// and
     localhost but not on a file:// page opened from disk.
     ============================================================ */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recog = null;
  var listening = false;        // a session is actually running
  var wantListening = false;    // the user wants the mic live
  var mode = LS.get('mode', 'text');
  var micGranted = LS.get('micOk', false);

  /* ---- on-device speech: the part that takes voice offline too -------
     Chrome can run the recogniser on this machine instead of streaming
     the audio to its vendor. It is the same API — set processLocally
     and the microphone never touches the network.

     The model is downloaded once (a few hundred MB, kept by the
     browser, not by this folder) and after that voice works in
     airplane mode, on hotel wifi that blocks everything, and in a
     room with no signal. That is the whole point: the answers were
     always local, and now the listening is too.

     It degrades honestly. A browser without it, or a language with no
     model, falls back to the online recogniser exactly as before —
     voice still works, it just needs a connection to transcribe.      */
  var LOCAL = {
    can:   !!(SR && typeof SR.available === 'function' && 'processLocally' in SR.prototype),
    state: 'unknown',    // unavailable | downloadable | downloading | available
    ready: false,        // transcription is happening on this machine
    asked: false         // we have already kicked off a download this session
  };

  function speechLang() { return LS.get('speechLang', 'en-IN'); }

  function checkLocal() {
    if (!LOCAL.can) { LOCAL.state = 'unavailable'; return Promise.resolve(LOCAL); }
    return SR.available({ langs: [speechLang()], processLocally: true })
      .then(function (s) {
        LOCAL.state = String(s || 'unavailable');
        LOCAL.ready = LOCAL.state === 'available';
        paintMode();
        return LOCAL;
      })
      .catch(function () { LOCAL.state = 'unavailable'; LOCAL.ready = false; return LOCAL; });
  }

  /* Downloading needs a user gesture, which the Voice click already is.
     It runs in the background: voice stays usable on the online
     recogniser throughout, and switches itself over when the model
     lands — nothing to wait for and nothing to press twice. */
  function installLocal(announce) {
    if (!LOCAL.can || LOCAL.ready || LOCAL.asked) return;
    LOCAL.asked = true;
    LOCAL.state = 'downloading';
    paintMode();
    if (announce) toast('Downloading the offline voice model once — voice works now, and will keep working with no internet.');
    var want = speechLang();
    SR.install({ langs: [want], processLocally: true })
      .then(function (ok) {
        if (!ok) throw new Error('declined');
        return checkLocal();
      })
      .then(function () {
        if (!LOCAL.ready) return;
        toast('Offline voice is ready — the microphone no longer needs internet.');
        // pick it up on the next session rather than cutting this one off
        if (wantListening && mode === 'voice' && recog) { try { recog.stop(); } catch (e) {} }
      })
      .catch(function () {
        LOCAL.asked = false;                 // a failed download may be retried
        return checkLocal();
      });
  }

  /* ---- telling the recogniser what it is about to hear ---------------
     Speech models are trained on ordinary English, which is why
     "IEnumerable" comes back as "I innumerable" and ".NET" as "dot
     net". Chrome takes a list of phrases to expect, and the one thing
     this library has is the exact vocabulary of the questions it can
     answer. Feeding it that is free accuracy on the only words that
     matter here.

     QA_SPEECH stays regardless: it repairs what still comes through
     wrong, and it is the only correction available when the browser
     has no phrase support.                                            */
  var BIAS = null;
  function biasPhrases() {
    if (BIAS) return BIAS;
    var Phrase = window.SpeechRecognitionPhrase;
    if (!Phrase) return (BIAS = []);
    var seen = {}, list = [];
    function add(text, boost) {
      var t = String(text || '').trim().toLowerCase();
      // single words are what the model is already good at; the wins are
      // in the multi-word terms it has never been trained on
      if (t.length < 6 || t.indexOf(' ') < 0 || seen[t]) return;
      seen[t] = 1;
      list.push(new Phrase(t, boost));
    }
    // what the questions are actually called, and every alias they carry
    for (var i = 0; i < DATA.length && list.length < 240; i++) {
      (DATA[i].tags || []).forEach(function (t) { add(t, 2.0); });
    }
    // the corrected spellings, so the model can produce them directly
    // instead of leaning on QA_SPEECH to repair them afterwards
    var sp = window.QA_SPEECH || {};
    for (var k in sp) { if (list.length < 280) add(sp[k], 3.0); }
    return (BIAS = list);
  }

  var finalBuffer = '', submitTimer = null, restartTimer = null;
  var starting = false, startingAt = 0;   // start() called, onstart not back yet
  var errorCount = 0, errorWindowAt = 0;

  /* --- what the microphone heard -> what you meant --------------- */
  var SPEECH_KEYS = Object.keys(window.QA_SPEECH || {})
    .sort(function (a, b) { return b.length - a.length; });

  /* Each pass carries on AFTER the text it just wrote, never from the
     start of the string again. Rescanning from zero is what froze the
     tab: a mapping whose right side still contains its own left side
     ("virtual dom" -> "virtual dom") was found again in the very text
     the replacement had just produced, forever. Advancing past the
     replacement makes that impossible whatever anyone adds later. */
  function fixSpoken(text) {
    var out = ' ' + String(text || '').toLowerCase().replace(/\s+/g, ' ').trim() + ' ';
    for (var i = 0; i < SPEECH_KEYS.length; i++) {
      var k = SPEECH_KEYS[i], v = window.QA_SPEECH[k];
      if (v === k) continue;                       // nothing to change
      var needle = ' ' + k + ' ', from = 0, idx;
      while ((idx = out.indexOf(needle, from)) >= 0) {
        out = out.slice(0, idx) + ' ' + v + ' ' + out.slice(idx + needle.length);
        from = idx + v.length + 1;                 // resume on the space we just wrote
      }
    }
    return out.replace(/\s+/g, ' ').trim();
  }

  function voiceBlockReason() {
    if (!SR) return 'This browser has no speech recognition. Chrome or Edge will do it.';
    // Chrome calls file:// a secure context but still refuses it the microphone,
    // so the generic check below never catches it. Name it outright: double-clicking
    // index.html is exactly how this gets opened, and the old message sent you
    // looking for a permission icon the address bar does not show on file://.
    if (location.protocol === 'file:')
      return 'Voice cannot work on a file opened from disk. Close this tab, run Start-Library-Server.cmd, and use the http://localhost:5173 link it prints.';
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
    // The mic stays in the composer in both modes. On a phone the Text/Voice
    // switch lives inside the sidebar drawer, so hiding the mic until you were
    // already in voice mode meant opening the menu just to start listening.
    $('micBtn').hidden = false;
    var hint = document.querySelector('.composer-hint');
    if (hint) {
      hint.firstChild.nodeValue = mode !== 'voice'
        ? 'Runs fully offline on your machine · no internet, no API, no cost · '
        : LOCAL.ready
          ? 'Fully offline · answers and speech both run on this machine · '
          : LOCAL.state === 'downloading'
            ? 'Answers run locally · fetching the offline voice model… · '
            : 'Answers run locally · only voice transcription uses the network · ';
    }
    input.placeholder = mode === 'voice' ? 'Just speak — or type here' : 'Ask anything…';
  }

  function paintListening() {
    $('micBtn').classList.toggle('listening', wantListening);
    $('composerShell').classList.toggle('listening', wantListening);
    if ($('kbdHint')) $('kbdHint').hidden = wantListening;
    // the voice bar above the composer says this now, with the live words
    // in it — saying it twice just ate the row a phone has least of
    if ($('listeningNote')) $('listeningNote').hidden = true;
    if ($('voiceBar')) $('voiceBar').hidden = !wantListening;
    $('micBtn').title = wantListening ? 'Stop listening (Esc)' : 'Start listening (Ctrl+M)';
    if (!wantListening) { input.classList.remove('interim'); say('idle'); }
  }

  /* one place that says what voice is doing, so the bar can never lie */
  var SAYINGS = {
    idle:    'Listening — ask your question',
    hearing: '',                                  // filled with the live words
    working: 'Answering…',
    parked:  'Heard you — press Enter if you meant to ask that',
    warn:    'Reconnecting…'
  };
  function say(state, words) {
    var bar = $('voiceBar'), txt = $('voiceBarTxt');
    if (!bar || !txt) return;
    bar.classList.toggle('hearing', state === 'hearing');
    bar.classList.toggle('working', state === 'working');
    bar.classList.toggle('warn', state === 'warn');
    txt.textContent = state === 'hearing' ? '“' + words + '”' : SAYINGS[state] || SAYINGS.idle;
  }

  /* ---- the session itself ---- */
  function startRecognition() {
    if (listening || starting || !wantListening || mode !== 'voice') return;
    if (!SR) return;

    recog = new SR();
    recog.lang = speechLang();
    recog.interimResults = true;
    recog.continuous = true;          // stay open across several questions
    recog.maxAlternatives = 1;

    // Run it on this machine when the model is here. Asked for and
    // refused is still fine — the browser falls back to its online
    // service, which is exactly what used to happen every time.
    if (LOCAL.ready) { try { recog.processLocally = true; } catch (e) { LOCAL.ready = false; } }

    // and tell it the vocabulary it is about to hear
    try {
      var ph = biasPhrases();
      if (ph.length) recog.phrases = ph;
    } catch (e) { /* unsupported, or over the browser's limit — not fatal */ }

    recog.onstart = function () {
      starting = false;
      listening = true;
      micGranted = true;
      LS.set('micOk', true);
      errorCount = 0;
      paintListening();
      say('idle');
    };

    recog.onresult = function (e) {
      var interim = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalBuffer += ' ' + t;
        else interim += t;
      }
      var live = (finalBuffer + ' ' + interim).replace(/\s+/g, ' ').trim();
      if (!busy) {
        input.value = live;
        input.classList.toggle('interim', !finalBuffer.trim() && !!interim);
        autosize();
        syncSend();
      }
      if (live) say('hearing', live.length > 90 ? '…' + live.slice(-88) : live);

      // Answer while they are still speaking, when it is already obvious
      // what they are asking. This is what removes the pause from the
      // common case entirely.
      maybeAnswerEarly(live);
      // A pause after the last final chunk means the question is finished.
      // 700 ms was short enough that an interviewer thinking mid-sentence
      // ("so... tell me... what dependency injection is") was heard as three
      // separate questions — but waiting 1200 ms on every question spent a
      // second of the answer's budget to protect the cases that need it.
      // So the wait fits what was actually heard: something that already
      // reads as a whole question does not need protecting from itself,
      // while a fragment gets the longer pause it needs.
      // Once the browser marks the transcript final AND the words already
      // read as a finished question, the thing the pause was there to find
      // out is already known. A short beat is still worth keeping, because
      // a long question can be finalised in two chunks and the second is
      // usually right behind the first — but 650 ms of it was waiting for
      // an answer to a question that had been answered.
      clearTimeout(submitTimer);
      var heardSoFar = finalBuffer.replace(/\s+/g, ' ').trim();
      if (heardSoFar) {
        submitTimer = setTimeout(submitHeard, soundsFinished(heardSoFar) ? 300 : 1300);
      }
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
      // Everything else is temporary. A dropped connection or a stumble in the
      // speech service used to switch voice off after four tries, which is why
      // it kept needing the mic tapped again mid-interview. It now backs off and
      // keeps trying: once voice is on, it stays on until you turn it off.
      say('warn');
      // A network error is the one the offline model exists to end, so say
      // what to do about it rather than just reporting it again.
      // Only offer the download when there is actually one to fetch:
      // 'unavailable' means this browser has no model for the language,
      // and telling someone to go and get it would send them nowhere.
      noteError(e.error !== 'network'
        ? 'Voice hiccup (' + e.error + ') — still listening.'
        : LOCAL.state === 'downloadable'
          ? 'Speech service unreachable. Switch Voice off and on to fetch the offline model — after that the microphone needs no internet.'
          : LOCAL.state === 'downloading'
            ? 'Speech service unreachable — the offline model is still downloading. It will stop needing this.'
            : 'Speech service unreachable — still trying. The answers never needed it.');
    };

    recog.onend = function () {
      starting = false;
      listening = false;
      input.classList.remove('interim');
      // sessions end by themselves on silence — just open a new one
      if (wantListening && mode === 'voice') {
        clearTimeout(restartTimer);
        restartTimer = setTimeout(startRecognition, retryDelay());
      } else {
        paintListening();
      }
    };

    try { starting = true; startingAt = Date.now(); recog.start(); }
    catch (err) {
      // start() throws if a session is already running — harmless
      starting = false;
      listening = false;
      if (wantListening) { clearTimeout(restartTimer); restartTimer = setTimeout(startRecognition, 600); }
    }
  }

  /* The safety net. onend normally reopens the session, but it does not
     always arrive: Chrome quietly drops recognition when the tab sits in
     the background, when the machine sleeps, or when the microphone is
     taken by a call. Nothing told the page, so voice looked on and heard
     nothing until the mic was tapped again. This checks every few seconds
     and reopens it — switch voice on once and it stays on. */
  setInterval(function () {
    // a start that never reported back must not block the net forever
    if (starting && Date.now() - startingAt > 4000) starting = false;
    if (wantListening && mode === 'voice' && !listening && !document.hidden) startRecognition();
  }, 3000);

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && wantListening && mode === 'voice' && !listening) {
      clearTimeout(restartTimer);
      restartTimer = setTimeout(startRecognition, 300);
    }
  });

  /* Repeated failures slow the retries down; they never stop them.
     The wait grows 0.4s, 0.8s, 1.6s … to 10s so a flapping network does
     not spin the CPU, and the message is shown once per bad patch
     rather than on every attempt. */
  function retryDelay() {
    return Math.min(400 * Math.pow(2, Math.max(0, errorCount - 1)), 10000);
  }

  function noteError(msg) {
    var now = Date.now();
    if (now - errorWindowAt > 20000) { errorWindowAt = now; errorCount = 0; }
    errorCount++;
    if (errorCount === 1) toast(msg);
  }

  /* ---- the interviewer asks; you answer ------------------------
     The microphone hears the whole room, your own voice included. If
     every sentence were searched, your own spoken answer would wipe
     the answer you are reading off the screen halfway through it, and
     fill Recent with fragments of your own words.

     So only something that reads as a question is sent. Anything else
     is parked in the box instead — it is still on screen, and Enter
     sends it if you did want it.                                   */

  // "yes", "okay", "exactly" — the noises either side makes between sentences
  var BACKCHANNEL = /^(yes|yeah|yep|ya|no|nope|ok|okay|hmm+|mhm|uh+|um+|er+|right|sure|correct|exactly|true|fine|good|great|nice|thanks|thank you|got it|alright|sorry|hello|hi|hey|one minute|one moment|just a second|yes sir|no sir)[\s.,!?]*$/;

  // a question, however it starts
  // The coding round is asked as an instruction, not a question — "reverse a
  // string", "find the second largest". Those are questions in every sense
  // that matters here, so the imperatives belong in the same list.
  var ASK_OPENER = /^(what|why|how|when|where|which|who|whose|whom|can|could|would|will|shall|should|do|does|did|is|are|was|were|have|has|had|tell|explain|describe|define|give|show|list|name|compare|differentiate|suppose|imagine|walk|take|say|write|reverse|find|check|implement|sort|remove|count|print|return|swap|merge|detect|validate|design|handle|solve)\b/;
  var ASK_INSIDE = /\b(what|why|how|when|which|difference|differences|different|explain|meaning|means|example|scenario|versus|vs|instead of|about)\b/;

  // you, mid-answer: "in my project I used", "we handled it by"
  var OWN_ANSWER = /\b(i|we|my|our)\s+(use|used|using|have|has|had|did|do|was|were|am|will|would|work|worked|build|built|create|created|handle|handled|implement|implemented|write|wrote|add|added|fix|fixed|face|faced|think|feel|believe|know|joined|started)\b|\b(my|our)\s+\w+(\s+\w+)?\s+(is|was|are|were)\b/;

  /* Lower-cased first, every time. The browser hands back a capitalised
     sentence — "What is dependency injection" — and these patterns are
     anchored and case-sensitive, so testing the raw transcript quietly
     answered false for every real question. fixSpoken happens to lower
     its input, which is why this only showed up on the one path that
     reads the transcript directly. */
  function looksLikeAQuestion(t) {
    t = String(t || '').toLowerCase();
    if (/\?\s*$/.test(t)) return true;
    if (ASK_OPENER.test(t)) return true;
    return ASK_INSIDE.test(t) && t.split(' ').length >= 3;
  }

  /* A sentence left hanging on one of these is still being spoken —
     "what is the", "tell me about your". Everything else that already
     reads as a question can be answered without waiting the long pause,
     which is where half a second per question was going. */
  var DANGLING = /\b(the|a|an|of|for|in|on|at|to|with|and|or|but|your|my|our|their|its|this|that|these|those|about|between|from|is|are|do|does|did|can|how|what|why|when|which)$/;

  function soundsFinished(t) {
    t = String(t || '').toLowerCase().trim();
    if (!looksLikeAQuestion(t)) return false;
    if (t.split(' ').length < 3) return false;      // too short to be sure
    return !DANGLING.test(t);                        // not left mid-phrase
  }

  /* ---- answering before they have finished the sentence ----------
     Searching all 354 answers costs a few milliseconds, and the browser
     streams a running transcript the whole time someone is talking. So
     the pause was never needed to work out the answer — only to be sure
     the question had ended.

     Two guards make that safe to skip. The words must already read as a
     finished question, and the same answer must come top twice running,
     which is what tells you the transcript has settled rather than
     still being revised mid-word. When both hold, the answer goes up
     immediately — often before the interviewer stops talking.

     Anything less certain falls through to the ordinary pause, so this
     only ever makes the obvious cases faster; it never makes a doubtful
     one wrong.                                                       */
  var earlySeenId = null;      // what the previous interim pointed at
  var earlyAnsweredId = null;  // what we have already put on screen

  function resetEarly() { earlySeenId = null; earlyAnsweredId = null; }

  function maybeAnswerEarly(live) {
    if (busy || !live) return;
    var fixed = fixSpoken(live);
    if (!fixed || !soundsFinished(fixed)) { earlySeenId = null; return; }
    if (BACKCHANNEL.test(fixed) || OWN_ANSWER.test(fixed)) { earlySeenId = null; return; }

    var res = search(fixed, activeTopic);
    if (!res.length || res[0].conf < CONFIDENT) { earlySeenId = null; return; }
    var dominant = res.length < 2 || res[0].s >= 1.25 * res[1].s;
    if (!dominant) { earlySeenId = null; return; }

    var id = res[0].d.id;
    if (id === earlyAnsweredId) return;          // already on screen
    if (id !== earlySeenId) {
      earlySeenId = id;
      // Normally wait for the same answer to come top twice — that is what
      // says the transcript has settled. A three-word question never gets a
      // second look though ("explain async await" is finished the moment it
      // is recognised), so one sighting is enough when the winner is not
      // merely ahead but twice the score of anything else.
      if (!(res.length > 1 && res[0].s >= 2 * res[1].s)) return;
    }

    earlyAnsweredId = id;
    clearTimeout(submitTimer);
    input.value = fixed;
    input.classList.remove('interim');
    say('working');
    ask(fixed);
  }

  /* park it in the box without searching: nothing on screen is disturbed */
  function parkHeard(text) {
    say('parked');
    if (busy) return;
    input.value = text;
    input.classList.remove('interim');
    autosize();
    syncSend();
  }

  function submitHeard() {
    var heard = finalBuffer.replace(/\s+/g, ' ').trim();
    finalBuffer = '';
    if (!heard || heard.length < 2) return;

    var fixed = fixSpoken(heard);              // "sequel server" -> "sql server"
    if (!fixed) return;

    // Already answered from the running transcript? Then the final text
    // is the same question arriving late, and asking it again would put
    // the answer on screen twice. Compared by answer rather than by
    // wording, because the last word or two often changes right at the
    // end ("...in asp dot net" arriving after the answer was obvious).
    if (earlyAnsweredId) {
      var settledOn = search(fixed, activeTopic);
      if (settledOn.length && settledOn[0].d.id === earlyAnsweredId) { resetEarly(); return; }
      resetEarly();                            // genuinely different — answer it
    }

    if (looksLikeAQuestion(fixed)) {
      input.value = fixed;
      input.classList.remove('interim');
      say('working');
      ask(fixed);
      return;
    }

    // not phrased as a question. Backchannel and your own narration are
    // dropped; a bare subject ("dependency injection") is still worth
    // answering, but only when the library is sure about it.
    if (BACKCHANNEL.test(fixed) || OWN_ANSWER.test(fixed) || fixed.split(' ').length > 14) {
      parkHeard(fixed);
      return;
    }
    var probe = search(fixed, activeTopic);
    if (probe.length && probe[0].conf >= CONFIDENT) {
      input.value = fixed;
      input.classList.remove('interim');
      say('working');
      ask(fixed);
    } else {
      parkHeard(fixed);
    }
  }

  function startListening() {
    var reason = voiceBlockReason();
    if (reason) { toast(reason); return; }
    if (MOCK.on) stopMock();               // one microphone, one owner
    wantListening = true;
    finalBuffer = '';
    resetEarly();
    paintListening();
    startRecognition();
  }

  function stopListening() {
    wantListening = false;
    clearTimeout(restartTimer);
    clearTimeout(submitTimer);
    finalBuffer = '';
    resetEarly();
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
      else if (LOCAL.ready) toast('Voice mode on, running offline. Just speak — it stays listening after each answer.');
      else toast('Voice mode on. Just speak — it stays listening after each answer.');
      // the same click is also the gesture the model download needs
      checkLocal().then(function () {
        if (LOCAL.state === 'downloadable') installLocal(!micGranted ? false : true);
      });
    } else {
      stopListening();
    }
  }

  /* the mic button is now start / stop, not ask-once — and one tap from
     text mode is enough, so a phone never has to go via the drawer */
  $('micBtn').onclick = function () {
    if (mode !== 'voice') { setMode('voice'); return; }
    if (wantListening) stopListening(); else startListening();
  };

  Array.prototype.forEach.call(document.querySelectorAll('.mode-opt'), function (b) {
    b.onclick = function () {
      setMode(b.getAttribute('data-mode'));
      closeSidebar();          // on a phone the drawer was covering the thread
    };
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

  /* the session never stopped listening — just put the bar back to ready */
  function voiceFollowUp() {
    if (wantListening) say('idle');
  }

  if ($('voiceStop')) $('voiceStop').onclick = function () { stopListening(); };

  paintMode();
  paintListening();

  /* Ask once, at startup, whether the offline model is already here —
     this is a read, not a download, so it needs no gesture. It is what
     makes the hint tell the truth before anything is clicked, and what
     lets a remembered voice session start offline straight away. */
  checkLocal();

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


  /* ============================================================
     Mock interview — the app is the interviewer, you are the candidate.

     It picks a question, reads it out, then listens to your answer.
     The thing it must NOT do is react to every word: the recogniser
     streams a running transcript, and a pause to think ("so... the
     middleware pipeline is...") is not the end of an answer. So the
     transcript is only collected while you speak, and nothing is
     judged until you have actually said something AND then gone quiet
     long enough to mean it. "Um", "okay", a cough — none of those
     count as a reply, and none of them end your turn.

     Then it scores the answer against the key points the library
     already holds, shows what you covered and what you missed, and
     asks the next one.

     Say "repeat" to hear the question again, "skip" or "next" to move
     on, "stop interview" to end. Esc ends it too.
     ============================================================ */
  var MOCK = {
    on: false,
    state: 'off',        // off | asking | answering | judging
    d: null,             // the question being asked
    asked: {},           // ids already asked this session
    count: 0,
    total: 0,            // sum of scores, for the running average
    heard: '',           // final chunks of the current answer
    interim: '',
    recog: null,
    live: false,
    silenceTimer: null,
    capTimer: null,
    nextTimer: null,
    speakId: 0
  };

  // How long you must be quiet before your answer counts as finished.
  // Long on purpose: a candidate pausing to think is not done.
  var MOCK_SILENCE = 2600;
  var MOCK_SILENCE_HANGING = 4200;   // ended on "the", "and", "because"…
  var MOCK_MIN_WORDS = 4;            // fewer real words is not an answer yet
  var MOCK_MAX_MS = 180000;          // three minutes, then it moves on anyway

  var FILLER = /^(um+|uh+|er+|ah+|hmm+|mm+|okay|ok|yes|yeah|ya|right|so|well|actually|basically|like|sure|wait)$/;
  var HANGING = /\b(the|a|an|of|for|in|on|at|to|with|and|or|but|so|because|which|that|is|are|was|then|like|my|our|we|i)$/;
  var CMD_REPEAT = /^(please )?(repeat|repeat (that|it|the question)|say (that|it) again|come again|pardon|sorry what|can you repeat( that| the question)?)$/;
  var CMD_SKIP = /^(skip|next|next question|pass|skip (it|this|this one)|i dont know|i do not know|no idea)$/;
  var CMD_STOP = /^(stop|end|stop (the )?interview|end (the )?interview|finish|thats all|that is all)$/;

  function mockText() { return (MOCK.heard + ' ' + MOCK.interim).replace(/\s+/g, ' ').trim(); }

  function mockWords(t) {
    return norm(t).split(' ').filter(function (w) { return w && !FILLER.test(w); });
  }

  function mockPick() {
    var inScope = function (d) { return (!activeTopic || d.topic === activeTopic) && d.answer; };
    var pool = DATA.filter(function (d) { return inScope(d) && !MOCK.asked[d.id]; });
    if (!pool.length) { MOCK.asked = {}; pool = DATA.filter(inScope); }   // went through them all
    // starred and not-yet-learned first, the way an interviewer leads with the common ones
    var pri = pool.filter(function (d) { return d.star && !learned[d.id]; });
    var from = pri.length ? pri : pool;
    return from[Math.floor(Math.random() * from.length)];
  }

  /* the points a good answer touches, each reduced to the words that prove it was said */
  function mockPoints(d) {
    var kp = keyPoints(d);
    if (kp.length < 2) kp = (d.tags || []).slice(0, 5);
    return kp.map(function (p) {
      var label = (String(p).match(/\*\*([^*]+)\*\*/) || [])[1] || p;
      var text = String(p).replace(/\*\*/g, '').replace(/`/g, '');
      var st = uniq(toks(label).map(stem));
      if (!st.length) st = uniq(toks(text).map(stem));
      return { text: text, stems: st.slice(0, 4) };
    }).filter(function (p) { return p.stems.length; });
  }

  function mockScore(d, said) {
    var mine = uniq(toks(fixSpoken(said)).map(stem));
    var have = {}; mine.forEach(function (w) { have[w] = 1; });
    function heardWord(s) {
      if (have[s]) return true;
      for (var i = 0; i < mine.length; i++) {
        if (sameRoot(mine[i], s)) return true;
        if (s.length >= 6 && dist(mine[i], s, 1) <= 1) return true;   // one slip of the recogniser
      }
      return false;
    }
    var points = mockPoints(d), hit = [], miss = [];
    points.forEach(function (p) {
      var n = p.stems.filter(heardWord).length;
      (n >= Math.ceil(p.stems.length / 2) ? hit : miss).push(p);
    });
    var pct = points.length ? Math.round(hit.length / points.length * 100) : 0;
    return { pct: pct, hit: hit, miss: miss };
  }

  /* ---- talking ---- */
  function mockSpeak(text, then) {
    var synth = window.speechSynthesis;
    var done = false, id = ++MOCK.speakId;
    // a cancelled or superseded line must not open the mic over the next one
    function finish() { if (done || id !== MOCK.speakId) return; done = true; if (then && MOCK.on) then(); }
    if (!synth || !window.SpeechSynthesisUtterance) { setTimeout(finish, 200); return; }
    try { synth.cancel(); } catch (e) {}
    var u = new SpeechSynthesisUtterance(text);
    u.lang = speechLang();
    u.onend = finish;
    u.onerror = finish;
    // some voices never fire onend — never leave the candidate waiting on it
    setTimeout(finish, 1500 + text.length * 90);
    synth.speak(u);
  }

  function mockBar(state, words) {
    var bar = $('mockBar'), txt = $('mockBarTxt');
    if (!bar) return;
    bar.hidden = !MOCK.on;
    bar.className = 'voice-bar mock-bar ' + state;
    var lines = {
      asking:  'Interviewer is asking…',
      waiting: 'Your turn — answer when ready (say “repeat” or “skip”)',
      judging: 'Got it — checking your answer…',
      warn:    'Reconnecting the microphone…'
    };
    txt.textContent = state === 'hearing' ? '“' + words + '”' : (lines[state] || '');
  }

  /* ---- one question ---- */
  function mockAsk(d, again) {
    if (!MOCK.on) return;
    clearTimeout(MOCK.nextTimer);
    clearTimeout(MOCK.capTimer);
    mockMicOff();
    MOCK.d = d;
    MOCK.state = 'asking';
    MOCK.heard = ''; MOCK.interim = '';
    if (!again) {
      MOCK.asked[d.id] = 1;
      MOCK.count++;
      showLibrary(false);
      if (welcome) welcome.style.display = 'none';
      finishStream();
      row('bot', 'Q',
        '<div class="mock-q"><span class="mock-tag">Mock interview · Question ' + MOCK.count +
        ' · ' + esc((TOPICS[d.topic] || {}).name || d.topic) + '</span>' +
        '<div class="mock-qtext">' + esc(d.q) + '</div></div>');
      thread.scrollTop = thread.scrollHeight;
    }
    mockBar('asking');
    mockSpeak(d.q, mockListen);   // the mic stays off while it talks, so it never hears itself
  }

  /* ---- listening to the answer ---- */
  function mockListen() {
    if (!MOCK.on || MOCK.state !== 'asking') return;
    MOCK.state = 'answering';
    mockBar('waiting');
    clearTimeout(MOCK.capTimer);
    MOCK.capTimer = setTimeout(function () { if (MOCK.state === 'answering') mockFinish(!mockText()); }, MOCK_MAX_MS);
    mockMicOn();
  }

  function mockMicOn() {
    if (!MOCK.on || MOCK.state !== 'answering' || MOCK.recog) return;
    var r = new SR();
    r.lang = speechLang();
    r.interimResults = true;
    r.continuous = true;
    r.maxAlternatives = 1;
    if (LOCAL.ready) { try { r.processLocally = true; } catch (e) {} }
    try { var ph = biasPhrases(); if (ph.length) r.phrases = ph; } catch (e) {}

    r.onresult = function (e) {
      var interim = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var t = e.results[i][0].transcript;
        if (e.results[i].isFinal) MOCK.heard += ' ' + t;
        else interim += t;
      }
      MOCK.interim = interim;
      var live = mockText();
      if (live) mockBar('hearing', live.length > 90 ? '…' + live.slice(-88) : live);
      // Every new word pushes the deadline back. Nothing is judged here —
      // the answer is only finished once you have stopped talking.
      mockArm();
    };
    r.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        toast('Microphone blocked. Allow it from the address bar, then start the mock interview again.');
        stopMock();
        return;
      }
      if (e.error !== 'no-speech' && e.error !== 'aborted') mockBar('warn');
    };
    r.onend = function () {
      if (MOCK.recog !== r) return;
      MOCK.recog = null;
      // A closed session ends the final chunk too — fold the half-heard words
      // in so they are not lost, then reopen: the answer is not over because
      // the browser decided to restart.
      if (MOCK.interim) { MOCK.heard += ' ' + MOCK.interim; MOCK.interim = ''; }
      if (MOCK.on && MOCK.state === 'answering') setTimeout(mockMicOn, 250);
    };
    MOCK.recog = r;
    try { r.start(); }
    catch (e) { MOCK.recog = null; setTimeout(mockMicOn, 600); }
  }

  function mockMicOff() {
    clearTimeout(MOCK.silenceTimer);
    var r = MOCK.recog;
    MOCK.recog = null;
    if (r) { try { r.abort(); } catch (e) {} }
  }

  function mockArm() {
    clearTimeout(MOCK.silenceTimer);
    var all = mockText().toLowerCase();
    if (!all) return;
    MOCK.silenceTimer = setTimeout(mockSilence, HANGING.test(all) ? MOCK_SILENCE_HANGING : MOCK_SILENCE);
  }

  /* you have gone quiet — but is that an answer? */
  function mockSilence() {
    if (MOCK.state !== 'answering') return;
    var said = mockText();
    var plain = norm(said).replace(/[.?!,']/g, '').trim();

    if (CMD_STOP.test(plain)) { stopMock(); return; }
    if (CMD_REPEAT.test(plain)) { mockAsk(MOCK.d, true); return; }
    if (CMD_SKIP.test(plain)) { mockFinish(true); return; }

    // only noises so far: not a reply, so keep waiting for the real one
    if (mockWords(said).length < MOCK_MIN_WORDS) {
      MOCK.heard = ''; MOCK.interim = '';
      mockBar('waiting');
      return;
    }
    mockFinish(false);
  }

  /* ---- judging, then on to the next ---- */
  function mockFinish(skipped) {
    if (MOCK.state !== 'answering') return;
    MOCK.state = 'judging';
    clearTimeout(MOCK.capTimer);
    mockMicOff();
    var d = MOCK.d;
    var said = mockText();
    MOCK.heard = ''; MOCK.interim = '';
    mockBar('judging');

    if (said && !skipped) row('user', 'N', '<div class="q-text">' + esc(said) + '</div>');

    var sc = skipped ? { pct: 0, hit: [], miss: mockPoints(d) } : mockScore(d, said);
    MOCK.total += sc.pct;
    var of = sc.hit.length + sc.miss.length;
    var grade = skipped ? 'Skipped' : sc.pct >= 75 ? 'Strong answer' : sc.pct >= 45 ? 'Decent — fill the gaps' : 'Needs work';
    var cls = skipped ? 'skip' : sc.pct >= 75 ? 'good' : sc.pct >= 45 ? 'ok' : 'low';

    var h = '<div class="mock-fb ' + cls + '">' +
      '<div class="mock-score"><b>' + (skipped ? '—' : sc.pct + '%') + '</b> ' + grade +
      '<span class="mock-avg">average ' + Math.round(MOCK.total / MOCK.count) + '% over ' + MOCK.count + '</span></div>' +
      '<div class="mock-meter"><i style="width:' + (skipped ? 0 : sc.pct) + '%"></i></div>';
    if (sc.hit.length) h += '<h3 class="a-h">You covered</h3><ul class="mock-list hit">' +
      sc.hit.map(function (p) { return '<li>' + inlineMd(p.text) + '</li>'; }).join('') + '</ul>';
    if (sc.miss.length) h += '<h3 class="a-h">' + (skipped ? 'Key points' : 'You missed') + '</h3><ul class="mock-list miss">' +
      sc.miss.map(function (p) { return '<li>' + inlineMd(p.text) + '</li>'; }).join('') + '</ul>';
    h += '<details class="mock-model"><summary>Model answer</summary>' + md(d.answer) +
      (d.remember ? '<div class="a-note">' + md(d.remember) + '</div>' : '') + '</details></div>';
    row('bot', 'Q', h);
    thread.scrollTop = thread.scrollHeight;

    var spoken = skipped ? 'Okay, moving on.'
      : sc.pct >= 75 ? 'Good answer. You covered ' + sc.hit.length + ' of ' + of + ' key points.'
      : 'You covered ' + sc.hit.length + ' of ' + of + ' key points. Check the ones you missed.';
    mockSpeak(spoken, function () {
      MOCK.nextTimer = setTimeout(function () { if (MOCK.on) mockAsk(mockPick()); }, 1800);
    });
  }

  function startMock() {
    var reason = voiceBlockReason();
    if (reason) { toast(reason); return; }
    if (mode === 'voice') setMode('text');   // one microphone, one owner
    MOCK.on = true;
    MOCK.count = 0; MOCK.total = 0; MOCK.asked = {};
    $('mockBtn').classList.add('on');
    $('mockTxt').textContent = 'End mock interview';
    closeSidebar();
    toast('Mock interview started. Answer out loud — it waits until you have finished.');
    checkLocal();
    mockAsk(mockPick());
  }

  function stopMock() {
    if (!MOCK.on) return;
    MOCK.on = false;
    MOCK.state = 'off';
    clearTimeout(MOCK.capTimer);
    clearTimeout(MOCK.nextTimer);
    mockMicOff();
    MOCK.speakId++;
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
    $('mockBtn').classList.remove('on');
    $('mockTxt').textContent = 'Mock interview';
    mockBar('off');
    if (MOCK.count) toast('Mock interview ended — ' + MOCK.count + ' questions, average ' + Math.round(MOCK.total / MOCK.count) + '%.');
  }

  if ($('mockBtn')) $('mockBtn').onclick = function () { if (MOCK.on) stopMock(); else startMock(); };
  if ($('mockRepeat')) $('mockRepeat').onclick = function () { if (MOCK.on && MOCK.d) mockAsk(MOCK.d, true); };
  if ($('mockSkip')) $('mockSkip').onclick = function () {
    if (MOCK.state === 'asking') { MOCK.speakId++; try { window.speechSynthesis.cancel(); } catch (e) {} MOCK.state = 'answering'; }
    mockFinish(true);
  };
  // finished early and do not want to wait out the pause
  if ($('mockDone')) $('mockDone').onclick = function () {
    if (MOCK.state !== 'answering') return;
    if (mockWords(mockText()).length) mockFinish(false);
    else toast('Nothing heard yet — answer out loud first.');
  };
  if ($('mockEnd')) $('mockEnd').onclick = stopMock;
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && MOCK.on) stopMock(); });


  /* ============================================================
     Install it, and keep it working with no signal

     Registering the worker is what lets Chrome offer "Install app" —
     on a phone it lands on the home screen and opens without browser
     chrome, on Windows it becomes an ordinary desktop window. After
     the first visit every file is served from the cache, so the
     library opens in a lift or on an aeroplane.

     Only over https or localhost. A page opened from disk gets no
     worker, which is the same line voice draws.
     ============================================================ */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {
        /* not fatal: without it the app still runs, just not offline */
      });
    });
  }

  /* Chrome decides when it is installable and hands us the prompt;
     holding onto it is the only way to offer a button of our own. */
  var installEvent = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    installEvent = e;
    if ($('installBtn')) $('installBtn').hidden = false;
  });

  if ($('installBtn')) $('installBtn').onclick = function () {
    if (!installEvent) return;
    installEvent.prompt();
    installEvent.userChoice.then(function (choice) {
      if (choice.outcome === 'accepted') {
        $('installBtn').hidden = true;
        toast('Installed. It opens from your home screen or Start menu now — and works with no signal.');
      }
      installEvent = null;
    });
  };

  window.addEventListener('appinstalled', function () {
    if ($('installBtn')) $('installBtn').hidden = true;
  });

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
