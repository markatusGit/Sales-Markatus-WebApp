/**
 * Begrenzter, ausschließlich lesender HQ-API-Benchmark.
 * Konfiguration über Script Properties, nicht über Browser oder Quellcode.
 * Der erste Firmen-Lesetest wurde am 23.09.2026 gegen HQ v2 ausgeführt.
 */
const HQ_BENCH = Object.freeze({
  origin: 'https://api.hellohq.io',
  maxRequests: 60,
  maxParallel: 10,
  maxRpm: 60,
  softDeadlineMs: 210000,
  runProperty: 'HQ_BENCH_ACTIVE_RUN'
});

function doGet() {
  requireBenchUser_();
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('Magazinvertrieb – HQ-Test');
}

function getBenchmarkSetup() {
  requireBenchUser_();
  const props = PropertiesService.getScriptProperties();
  const cases = readCases_(props);
  return {
    configured: Boolean(props.getProperty('HQ_API_TOKEN')) && cases.length > 0,
    tokenPresent: Boolean(props.getProperty('HQ_API_TOKEN')),
    cases: cases.map(item => ({id: item.id, label: item.label, path: item.path})),
    maxRequests: HQ_BENCH.maxRequests,
    maxRpm: HQ_BENCH.maxRpm
  };
}

function requestBenchmarkStop(runId) {
  const actor = requireBenchUser_();
  const props = PropertiesService.getScriptProperties();
  const active = readActive_(props);
  if (active && active.id === runId && active.actor === actor) {
    props.setProperty(HQ_BENCH.runProperty, JSON.stringify(Object.assign({}, active, {stop: true})));
    return {requested: true};
  }
  return {requested: false};
}

function runBenchmark(input) {
  const actor = requireBenchUser_();
  const props = PropertiesService.getScriptProperties();
  const token = String(props.getProperty('HQ_API_TOKEN') || '').trim();
  if (!token || /[\r\n]/.test(token)) throw new Error('HQ_API_TOKEN fehlt oder ist ungültig.');
  const cases = readCases_(props);
  const selected = cases.find(item => item.id === String(input && input.caseId));
  if (!selected) throw new Error('Bitte ein konfiguriertes Testszenario auswählen.');
  const count = Number(input && input.count);
  const parallel = Number(input && input.parallel);
  const rpm = Number(input && input.rpm);
  const runId = String(input && input.runId || '');
  if (!Number.isInteger(count) || count < 1 || count > HQ_BENCH.maxRequests) throw new Error('Zulässig sind 1 bis 60 Requests je Lauf.');
  if (![1, 3, 5, 10].includes(parallel)) throw new Error('Parallelität muss 1, 3, 5 oder 10 sein.');
  if (count < parallel) throw new Error('Die Requestanzahl muss mindestens so groß wie die Parallelität sein.');
  if (![30, 60].includes(rpm)) throw new Error('Zulässig sind 30 oder 60 Requests pro Minute.');
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(runId)) throw new Error('Ungültige Laufkennung.');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('Es läuft bereits ein Test. Bitte diesen zuerst beenden.');

  const started = Date.now();
  const batches = [];
  const recentFailures = [];
  let sent = 0, consecutiveServerErrors = 0, nextAllowedAt = started, stopReason = null;
  try {
    props.setProperty(HQ_BENCH.runProperty, JSON.stringify({id: runId, actor: actor, stop: false, startedAt: started}));
    while (sent < count) {
      if (!waitForTurn_(nextAllowedAt, started, props, runId)) {
        stopReason = stopRequested_(props, runId) ? 'Vom Nutzer gestoppt.' : 'Zeitbudget erreicht.';
        break;
      }
      const size = Math.min(parallel, count - sent);
      const calls = Array.from({length: size}, () => ({
        url: HQ_BENCH.origin + selected.path,
        method: 'get',
        headers: {Authorization: 'Bearer ' + token, Accept: 'application/json'},
        followRedirects: false,
        validateHttpsCertificates: true,
        muteHttpExceptions: true
      }));
      const batchStart = Date.now();
      let responses;
      try {
        if (size === 1) {
          const options = Object.assign({}, calls[0]);
          delete options.url;
          responses = [UrlFetchApp.fetch(calls[0].url, options)];
        } else {
          responses = UrlFetchApp.fetchAll(calls);
        }
      } catch (_) {
        // Keine Exceptiondetails aus UrlFetch ausgeben: sie könnten Requestdaten enthalten.
        sent += size;
        batches.push({index: batches.length + 1, requests: size, elapsedMs: Date.now() - batchStart, statuses: [], bytes: 0, recognizedRecords: null, transportError: true, countsComplete: false});
        stopReason = 'Transportfehler. Der HTTP-Ausgang der gestarteten Requests ist unbekannt; kein automatischer Wiederholungsversuch.';
        break;
      }
      const elapsed = Date.now() - batchStart;
      sent += size;
      const statuses = responses.map(response => response.getResponseCode());
      let bytes = 0, recognizedRecords = 0, allCountsRecognized = true;
      responses.forEach(response => {
        const code = response.getResponseCode();
        const info = inspectResponse_(response);
        bytes += info.bytes;
        if (info.records === null) allCountsRecognized = false;
        else recognizedRecords += info.records;
        const failed = code < 200 || code >= 300;
        recentFailures.push(failed);
        if (recentFailures.length > 20) recentFailures.shift();
        consecutiveServerErrors = code >= 500 ? consecutiveServerErrors + 1 : 0;
      });
      batches.push({index: batches.length + 1, requests: size, elapsedMs: elapsed, statuses: statuses, bytes: bytes, recognizedRecords: allCountsRecognized ? recognizedRecords : null, transportError: false, countsComplete: true});
      if (statuses.includes(429)) stopReason = 'HQ meldet HTTP 429. Rate-Limit erreicht; Lauf beendet.';
      else if (statuses.some(code => code === 401 || code === 403)) stopReason = 'Authentisierung oder Berechtigung fehlt (HTTP 401/403).';
      else if (statuses.some(code => code >= 300 && code < 400)) stopReason = 'HQ antwortet mit einer Weiterleitung. Zieladresse und API-Version zuerst prüfen.';
      else if (statuses.some(code => code >= 400 && code < 500)) stopReason = 'Abfragefehler (HTTP 4xx). Pfad, Version und Filter prüfen.';
      else if (consecutiveServerErrors >= 3) stopReason = 'Drei Serverfehler in Folge. Lastlauf beendet.';
      else if (recentFailures.length === 20 && recentFailures.filter(Boolean).length / 20 > 0.05) stopReason = 'Mehr als 5 % Fehler in den letzten 20 Requests. Lastlauf beendet.';
      if (stopReason) break;
      // Durchschnittliche angebotene Rate begrenzen; parallele Requests starten als ein kleiner Batch.
      nextAllowedAt = batchStart + Math.ceil(size * 60000 / rpm);
    }
    return summarizeRun_({id: runId, caseId: selected.id, caseLabel: selected.label, path: selected.path, requested: count, parallel: parallel, rpm: rpm, startedAt: new Date(started).toISOString(), durationMs: Date.now() - started, sent: sent, stopReason: stopReason, batches: batches});
  } finally {
    const active = readActive_(props);
    if (active && active.id === runId) props.deleteProperty(HQ_BENCH.runProperty);
    lock.releaseLock();
  }
}

function requireBenchUser_() {
  const email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  const allowed = String(PropertiesService.getScriptProperties().getProperty('HQ_BENCH_ALLOWED_EMAILS') || '')
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  if (!email || !allowed.includes(email)) throw new Error('Kein freigeschalteter interner Google-Nutzer. Identität und HQ_BENCH_ALLOWED_EMAILS prüfen.');
  return email;
}

function readCases_(props) {
  const raw = props.getProperty('HQ_BENCH_CASES') || '[]';
  let parsed;
  try { parsed = JSON.parse(raw); } catch (_) { throw new Error('HQ_BENCH_CASES muss eine gültige JSON-Liste sein.'); }
  if (!Array.isArray(parsed) || parsed.length > 12) throw new Error('HQ_BENCH_CASES muss eine Liste mit maximal zwölf Szenarien sein.');
  const seen = {};
  return parsed.map(item => {
    if (!item || typeof item.id !== 'string' || !/^[a-z0-9_-]{1,40}$/.test(item.id) || seen[item.id]) throw new Error('Szenario-IDs müssen eindeutig sein und aus Kleinbuchstaben, Zahlen, _ oder - bestehen.');
    seen[item.id] = true;
    const path = String(item.path || '');
    if (path.length > 1700 || !/^\/v[12]\/[A-Za-z][A-Za-z0-9]*(?:\([0-9]+\)|\/[A-Za-z0-9_-]+)*(?:\?[^#\r\n]*)?$/.test(path) || /\s/.test(path)) throw new Error('Testszenario hat einen ungültigen Pfad. Nur relative, URL-kodierte /v1/ oder /v2/ Leseabfragen sind zulässig.');
    if (/[?&](?:access_token|token|key|api_key|authorization|password|client_secret)=/i.test(path)) throw new Error('Zugangsdaten sind in Testpfaden nicht erlaubt.');
    return {id: item.id, label: String(item.label || item.id).slice(0,100), path: path};
  });
}

function readActive_(props) {
  try { return JSON.parse(props.getProperty(HQ_BENCH.runProperty) || 'null'); }
  catch (_) { return null; }
}

function stopRequested_(props, id) {
  const active = readActive_(props);
  return Boolean(active && active.id === id && active.stop);
}

function waitForTurn_(target, started, props, id) {
  while (Date.now() < target) {
    if (stopRequested_(props,id) || Date.now() - started >= HQ_BENCH.softDeadlineMs) return false;
    Utilities.sleep(Math.min(500, target - Date.now()));
  }
  return !stopRequested_(props,id) && Date.now() - started < HQ_BENCH.softDeadlineMs;
}

function inspectResponse_(response) {
  let records = null;
  const bytes = response.getBlob().getBytes().length;
  // Nur die Anzahl erkennen. Keine Kundeninhalte oder Response-Bodies zurückgeben/protokollieren.
  try {
    const body = JSON.parse(response.getContentText());
    if (Array.isArray(body)) records = body.length;
    else if (body && typeof body === 'object') {
      for (const key of ['value','data','items']) {
        if (Array.isArray(body[key])) { records = body[key].length; break; }
      }
    }
  } catch (_) { /* HTML, Binärdaten oder unbekanntes Format: Anzahl bleibt unbekannt. */ }
  return {bytes: bytes, records: records};
}

function quantile_(values, q) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a,b) => a-b);
  return sorted[Math.max(0,Math.ceil(q * sorted.length)-1)];
}

function summarizeRun_(run) {
  const times = run.batches.map(batch => batch.elapsedMs);
  const codes = run.batches.flatMap(batch => batch.statuses);
  const unknown = run.batches.filter(batch => batch.transportError).reduce((sum,batch) => sum+batch.requests,0);
  const failures = codes.filter(code => code < 200 || code >= 300).length;
  const counts = {};
  codes.forEach(code => { counts[code] = (counts[code] || 0) + 1; });
  const comparable = run.batches.filter(batch => batch.requests === run.parallel && !batch.transportError).map(batch => batch.elapsedMs);
  return Object.assign({},run,{
    summary: {
      metric: run.parallel === 1 ? 'Einzelrequest-Antwortzeit' : 'Antwortzeit je vollständig beendetem Parallel-Batch',
      measurementIncludes: 'HTTP-Aufruf einschließlich Apps-Script-UrlFetch und Netzwerk; keine reine HQ-Rechenzeit',
      measurements: comparable.length,
      medianMs: quantile_(comparable,0.5), p95Ms: quantile_(comparable,0.95), maxMs: times.length ? Math.max.apply(null,times) : null,
      knownHttpErrors: failures, unknownRequests: unknown,
      errorRate: run.sent ? (failures+unknown)/run.sent : null,
      statusCounts: counts, bytes: run.batches.reduce((sum,batch) => sum+batch.bytes,0),
      smallSample: comparable.length < 100,
      completed: !run.stopReason && run.sent === run.requested
    }
  });
}
