
/* Run:
   npm i
   npm run dev  (or npm start)
   Requires MySQL running and dbConfig set.
*/
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecification = require('./swagger');
const multer = require('multer');

const app = express();
const port = 3000;

// ----- MySQL pool -----
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'mydb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};
const pool = mysql.createPool(dbConfig);

// ----- Middleware -----
app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
const upload = multer({ storage: multer.memoryStorage() });

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecification));

app.get('/', (req, res) => res.send('Court Decisions + Text Concordance API (MySQL)'));

// ---------- Schema bootstrap ----------
async function initSchema() {
  const ddl = `
  CREATE TABLE IF NOT EXISTS court_decisions (
    decision_id       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    source_slug       VARCHAR(200),
    source_url        VARCHAR(1000) NOT NULL,
    court_name        VARCHAR(200),
    court_level       VARCHAR(50),
    decision_type     VARCHAR(50),
    case_number       VARCHAR(120),
    decision_title    VARCHAR(500),
    decision_date     DATE,
    publish_date      DATE,
    language_code     VARCHAR(10) DEFAULT 'he',
    summary_text      LONGTEXT,
    keywords          VARCHAR(1000),
    page_count        INT,
    file_size_bytes   BIGINT,
    status            VARCHAR(30) DEFAULT 'PUBLISHED',
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_cd_case_number (case_number),
    KEY idx_cd_dates (decision_date, publish_date),
    KEY idx_cd_courtlevel (court_level)
  );

  CREATE TABLE IF NOT EXISTS court_decision_files (
    file_id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    decision_id       BIGINT UNSIGNED NOT NULL,
    file_url          VARCHAR(1000) NOT NULL,
    file_title        VARCHAR(500),
    mime_type         VARCHAR(100) DEFAULT 'application/pdf',
    lang_code         VARCHAR(10)  DEFAULT 'he',
    page_count        INT,
    file_size_bytes   BIGINT,
    hash_sha256       CHAR(64),
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cdf_decision
      FOREIGN KEY (decision_id) REFERENCES court_decisions(decision_id)
      ON DELETE CASCADE,
    KEY idx_cdf_decision (decision_id)
  );

  -- Store text by lines for fast context retrieval
  CREATE TABLE IF NOT EXISTS decision_lines (
    decision_id BIGINT UNSIGNED NOT NULL,
    line_no     INT NOT NULL,
    content     TEXT NOT NULL,
    PRIMARY KEY (decision_id, line_no),
    FULLTEXT KEY ftx_decision_lines (content)
  );

  -- Unique words (normalized, lowercase)
  CREATE TABLE IF NOT EXISTS words (
    word_id    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    word_text  VARCHAR(255) NOT NULL,
    UNIQUE KEY uq_word_text (word_text)
  );

  -- Word occurrences with positions
  CREATE TABLE IF NOT EXISTS occurrences (
    occurrence_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    decision_id   BIGINT UNSIGNED NOT NULL,
    word_id       BIGINT UNSIGNED NOT NULL,
    line_no       INT NOT NULL,
    char_start    INT NOT NULL,
    char_end      INT NOT NULL,
    idx_in_line   INT NOT NULL,
    FOREIGN KEY (decision_id) REFERENCES court_decisions(decision_id) ON DELETE CASCADE,
    FOREIGN KEY (word_id)     REFERENCES words(word_id) ON DELETE CASCADE,
    KEY idx_occ_decision_word (decision_id, word_id),
    KEY idx_occ_word (word_id)
  );

  -- User-defined word groups
  CREATE TABLE IF NOT EXISTS word_groups (
    group_id    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    description VARCHAR(500)
  );

  CREATE TABLE IF NOT EXISTS word_group_members (
    group_id  BIGINT UNSIGNED NOT NULL,
    word_id   BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (group_id, word_id),
    FOREIGN KEY (group_id) REFERENCES word_groups(group_id) ON DELETE CASCADE,
    FOREIGN KEY (word_id)  REFERENCES words(word_id) ON DELETE CASCADE,
    KEY idx_wgm_word (word_id)
  );

  -- Phrases (multi-word expressions)
  CREATE TABLE IF NOT EXISTS phrases (
    phrase_id      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(200),
    expression_text VARCHAR(500) NOT NULL,
    language_code  VARCHAR(10) DEFAULT 'he'
  );

  CREATE TABLE IF NOT EXISTS phrase_occurrences (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    decision_id  BIGINT UNSIGNED NOT NULL,
    phrase_id    BIGINT UNSIGNED NOT NULL,
    line_no      INT NOT NULL,
    char_start   INT NOT NULL,
    char_end     INT NOT NULL,
    FOREIGN KEY (decision_id) REFERENCES court_decisions(decision_id) ON DELETE CASCADE,
    FOREIGN KEY (phrase_id)   REFERENCES phrases(phrase_id) ON DELETE CASCADE,
    KEY idx_po_decision_phrase (decision_id, phrase_id)
  );
  `;

  const conn = await pool.getConnection();
  try {
    for (const stmt of ddl.split(';').map(s => s.trim()).filter(Boolean)) {
      await conn.query(stmt);
    }
  } finally {
    conn.release();
  }
}

// ---------- Helpers ----------

// Normalize word: lowercase; strip leading/trailing punctuation
function normalizeWord(w) {
  return (w || '')
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

// Split text into lines (normalize newlines)
function splitToLines(text) {
  return (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
}

// Tokenize a single line and return tokens with positions
function tokenizeLine(line) {
  const tokens = [];
  const re = /[\p{L}\p{N}]+/gu; // letters or digits, unicode-safe
  let m, idx = 0;
  while ((m = re.exec(line)) !== null) {
    const raw = m[0];
    const start = m.index;
    const end = start + raw.length;
    const norm = normalizeWord(raw);
    if (norm) {
      tokens.push({ word: norm, start, end, idxInLine: idx++ });
    }
  }
  return tokens;
}

// Bulk insert helper (multi-row)
async function bulkInsert(conn, sql, rows, chunkSize = 1000) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const [q, params] = buildMultiValues(sql, chunk);
    await conn.query(q, params);
  }
}
function buildMultiValues(baseSql, rows) {
  // baseSql example: "INSERT IGNORE INTO words (word_text) VALUES ?"
  // We'll convert to VALUES (?,?),(?,?)
  const placeholders = [];
  const params = [];
  for (const row of rows) {
    if (Array.isArray(row)) {
      placeholders.push('(' + row.map(() => '?').join(',') + ')');
      params.push(...row);
    } else {
      placeholders.push('(?)'); params.push(row);
    }
  }
  const q = baseSql.replace('VALUES ?', 'VALUES ' + placeholders.join(','));
  return [q, params];
}

// Fetch multiple line ranges in one query and map back
async function getLineRangeMap(conn, decisionId, ranges) {
  // Build WHERE (line_no BETWEEN a AND b) OR ...
  if (!ranges.length) return new Map();
  const parts = [];
  const params = [decisionId];
  for (const r of ranges) {
    parts.push('(line_no BETWEEN ? AND ?)');
    params.push(r.start, r.end);
  }
  const sql = `SELECT line_no, content FROM decision_lines WHERE decision_id=? AND (${parts.join(' OR ')})`;
  const [rows] = await conn.query(sql, params);
  const map = new Map();
  for (const row of rows) map.set(row.line_no, row.content);
  return map;
}

// ---------- Decisions CRUD (metadata) ----------

/**
 * @swagger
 * /api/decisions:
 *   post:
 *     summary: Create a court decision (metadata only)
 */
app.post('/api/decisions', async (req, res) => {
  const b = req.body || {};
  if (!b.source_url) return res.status(400).json({ error: 'source_url is required' });
  const sql = `
    INSERT INTO court_decisions 
      (source_slug, source_url, court_name, court_level, decision_type, case_number,
       decision_title, decision_date, publish_date, language_code, summary_text, keywords,
       page_count, file_size_bytes, status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `;
  const params = [
    b.source_slug || null, b.source_url, b.court_name || null, b.court_level || null,
    b.decision_type || null, b.case_number || null, b.decision_title || null,
    b.decision_date || null, b.publish_date || null, b.language_code || 'he',
    b.summary_text || null, b.keywords || null, b.page_count || null,
    b.file_size_bytes || null, b.status || 'PUBLISHED'
  ];
  let conn; 
  try {
    conn = await pool.getConnection();
    const [r] = await conn.execute(sql, params);
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed_to_insert' });
  } finally { if (conn) conn.release(); }
});

/**
 * @swagger
 * /api/decisions/{id}:
 *   get:
 *     summary: Get decision metadata + attached files
 */
app.get('/api/decisions/:id', async (req, res) => {
  const id = req.params.id;
  let conn;
  try {
    conn = await pool.getConnection();
    const [d] = await conn.execute('SELECT * FROM court_decisions WHERE decision_id=?', [id]);
    if (!d.length) return res.status(404).json({ error: 'not_found' });
    const [files] = await conn.execute('SELECT * FROM court_decision_files WHERE decision_id=?', [id]);
    res.json({ ...d[0], files });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed_to_get' });
  } finally { if (conn) conn.release(); }
});

/**
 * @swagger
 * /api/decisions/{id}:
 *   put:
 *     summary: Update decision metadata
 */
app.put('/api/decisions/:id', async (req, res) => {
  const id = req.params.id;
  const b = req.body || {};
  const sql = `
    UPDATE court_decisions SET
      source_slug=?, source_url=?, court_name=?, court_level=?, decision_type=?,
      case_number=?, decision_title=?, decision_date=?, publish_date=?, language_code=?,
      summary_text=?, keywords=?, page_count=?, file_size_bytes=?, status=?
    WHERE decision_id=?
  `;
  const params = [
    b.source_slug || null, b.source_url || null, b.court_name || null, b.court_level || null,
    b.decision_type || null, b.case_number || null, b.decision_title || null,
    b.decision_date || null, b.publish_date || null, b.language_code || 'he',
    b.summary_text || null, b.keywords || null, b.page_count || null,
    b.file_size_bytes || null, b.status || 'PUBLISHED', id
  ];
  let conn;
  try {
    conn = await pool.getConnection();
    const [r] = await conn.execute(sql, params);
    if (!r.affectedRows) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed_to_update' });
  } finally { if (conn) conn.release(); }
});

/**
 * @swagger
 * /api/decisions/{id}:
 *   delete:
 *     summary: Delete a decision (cascades to lines, occurrences, files)
 */
app.delete('/api/decisions/:id', async (req, res) => {
  const id = req.params.id;
  let conn;
  try {
    conn = await pool.getConnection();
    const [r] = await conn.execute('DELETE FROM court_decisions WHERE decision_id=?', [id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed_to_delete' });
  } finally { if (conn) conn.release(); }
});

/**
 * @swagger
 * /api/decisions/{id}/files:
 *   post:
 *     summary: Attach file metadata (e.g., PDF/TXT URL)
 */
app.post('/api/decisions/:id/files', async (req, res) => {
  const decisionId = req.params.id;
  const b = req.body || {};
  if (!b.file_url) return res.status(400).json({ error: 'file_url is required' });
  const sql = `INSERT INTO court_decision_files
    (decision_id, file_url, file_title, mime_type, lang_code, page_count, file_size_bytes, hash_sha256)
    VALUES (?,?,?,?,?,?,?,?)`;
  const params = [
    decisionId, b.file_url, b.file_title || null, b.mime_type || 'application/pdf',
    b.lang_code || 'he', b.page_count || null, b.file_size_bytes || null, b.hash_sha256 || null
  ];
  let conn;
  try {
    conn = await pool.getConnection();
    const [r] = await conn.execute(sql, params);
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed_to_insert_file' });
  } finally { if (conn) conn.release(); }
});

/**
 * @swagger
 * /api/decisions/{id}/text:
 *   post:
 *     summary: Upload a TXT file (multipart or JSON text) and index it
 *     description: Accepts multipart/form-data with field "file" (.txt) OR JSON { text: "..." }.
 */
app.post('/api/decisions/:id/text', upload.single('file'), async (req, res) => {
  const id = Number(req.params.id);
  const fromJson = req.is('application/json');
  let text = null;
  if (fromJson) {
    text = (req.body && req.body.text) || null;
  } else if (req.file) {
    if (!/text\/plain|\.txt$/i.test(req.file.mimetype) && !/\.txt$/i.test(req.file.originalname)) {
      return res.status(400).json({ error: 'expected .txt file' });
    }
    text = req.file.buffer.toString('utf-8');
  }
  if (!text) return res.status(400).json({ error: 'text_missing' });

  const lines = splitToLines(text);
  // Build tokens + unique words
  const allTokens = []; // {lineNo, word, start, end, idxInLine}
  const unique = new Set();
  lines.forEach((line, i) => {
    const ln = i + 1;
    const toks = tokenizeLine(line);
    toks.forEach(t => {
      allTokens.push({ lineNo: ln, ...t });
      unique.add(t.word);
    });
  });
  const uniqWords = Array.from(unique);

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Clean previous text & index for this decision
    await conn.query('DELETE FROM occurrences WHERE decision_id=?', [id]);
    await conn.query('DELETE FROM decision_lines WHERE decision_id=?', [id]);

    // Insert lines (batched)
    const lineRows = lines.map((content, i) => [id, i+1, content]);
    for (let i = 0; i < lineRows.length; i += 500) {
      const chunk = lineRows.slice(i, i+500);
      const [q, p] = buildMultiValues('INSERT INTO decision_lines (decision_id, line_no, content) VALUES ?', chunk);
      await conn.query(q, p);
    }

    // Insert words (ignore duplicates)
    if (uniqWords.length) {
      for (let i = 0; i < uniqWords.length; i += 1000) {
        const chunk = uniqWords.slice(i, i+1000).map(w => [w]);
        const [q, p] = buildMultiValues('INSERT IGNORE INTO words (word_text) VALUES ?', chunk);
        await conn.query(q, p);
      }
    }

    // Fetch ids for all words used
    let wordIds = new Map();
    if (uniqWords.length) {
      // chunk IN clause to avoid too many placeholders
      for (let i = 0; i < uniqWords.length; i += 1000) {
        const chunk = uniqWords.slice(i, i+1000);
        const placeholders = chunk.map(() => '?').join(',');
        const [rows] = await conn.query(`SELECT word_id, word_text FROM words WHERE word_text IN (${placeholders})`, chunk);
        for (const r of rows) wordIds.set(r.word_text, r.word_id);
      }
    }

    // Insert occurrences (batched)
    const occRows = allTokens.map(t => [id, wordIds.get(t.word), t.lineNo, t.start, t.end, t.idxInLine]);
    for (let i = 0; i < occRows.length; i += 1000) {
      const chunk = occRows.slice(i, i+1000);
      const [q, p] = buildMultiValues('INSERT INTO occurrences (decision_id, word_id, line_no, char_start, char_end, idx_in_line) VALUES ?', chunk);
      await conn.query(q, p);
    }

    await conn.commit();
    res.json({ ok: true, lines: lines.length, unique_words: uniqWords.length, tokens: allTokens.length });
  } catch (e) {
    if (conn) await conn.rollback();
    console.error(e);
    res.status(500).json({ error: 'failed_to_index' });
  } finally {
    if (conn) conn.release();
  }
});

/**
 * @swagger
 * /api/decisions/{id}/text:
 *   get:
 *     summary: Get the full text (concatenated from lines)
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: integer }
 *       - in: query
 *         name: to
 *         schema: { type: integer }
 */
app.get('/api/decisions/:id/text', async (req, res) => {
  const id = req.params.id;
  const from = Number(req.query.from || 1);
  const to   = Number(req.query.to || Number.MAX_SAFE_INTEGER);
  let conn;
  try {
    conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT line_no, content FROM decision_lines WHERE decision_id=? AND line_no BETWEEN ? AND ? ORDER BY line_no ASC', [id, from, to]);
    const body = rows.map(r => r.content).join('\n');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(body);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed_to_get_text' });
  } finally { if (conn) conn.release(); }
});

/**
 * @swagger
 * /api/decisions/{id}/words:
 *   get:
 *     summary: Word index for a decision (counts)
 *     parameters:
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [alpha, freq] }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 */
app.get('/api/decisions/:id/words', async (req, res) => {
  const id = req.params.id;
  const order = (req.query.order || 'alpha');
  const limit = Number(req.query.limit || 1000);
  const orderSql = order === 'freq' ? 'ORDER BY cnt DESC, w.word_text ASC' : 'ORDER BY w.word_text ASC';
  const sql = `
    SELECT w.word_text, COUNT(*) AS cnt
    FROM occurrences o JOIN words w ON o.word_id=w.word_id
    WHERE o.decision_id=?
    GROUP BY w.word_id, w.word_text
    ${orderSql}
    LIMIT ?
  `;
  let conn;
  try {
    conn = await pool.getConnection();
    const [rows] = await conn.query(sql, [id, limit]);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed_to_list_words' });
  } finally { if (conn) conn.release(); }
});

/**
 * @swagger
 * /api/decisions/{id}/search/word:
 *   get:
 *     summary: Find occurrences of a word with context window
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         required: true
 *       - in: query
 *         name: before
 *         schema: { type: integer, default: 2 }
 *       - in: query
 *         name: after
 *         schema: { type: integer, default: 2 }
 *       - in: query
 *         name: max
 *         schema: { type: integer, default: 100 }
 */
app.get('/api/decisions/:id/search/word', async (req, res) => {
  const id = Number(req.params.id);
  const q = normalizeWord(String(req.query.q || ''));
  if (!q) return res.status(400).json({ error: 'q_required' });
  const before = Math.max(0, Number(req.query.before || 2));
  const after  = Math.max(0, Number(req.query.after || 2));
  const max    = Math.max(1, Number(req.query.max || 100));

  let conn;
  try {
    conn = await pool.getConnection();
    // Lookup word id
    const [wrows] = await conn.query('SELECT word_id FROM words WHERE word_text=?', [q]);
    if (!wrows.length) return res.json({ occurrences: [] });

    const wid = wrows[0].word_id;
    const [occ] = await conn.query('SELECT line_no, char_start, char_end FROM occurrences WHERE decision_id=? AND word_id=? ORDER BY line_no, char_start LIMIT ?', [id, wid, max]);

    // Build ranges
    const ranges = occ.map(o => ({ start: Math.max(1, o.line_no - before), end: o.line_no + after }));
    const rangeMap = await getLineRangeMap(conn, id, ranges);

    const results = occ.map(o => {
      const context = [];
      for (let ln = Math.max(1, o.line_no - before); ln <= o.line_no + after; ln++) {
        const content = rangeMap.get(ln);
        if (content !== undefined) context.push({ line: ln, text: content });
      }
      return { line_no: o.line_no, char_start: o.char_start, char_end: o.char_end, context };
    });
    res.json({ word: q, occurrences: results });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed_to_search_word' });
  } finally { if (conn) conn.release(); }
});

/**
 * @swagger
 * /api/decisions/{id}/search/phrase:
 *   get:
 *     summary: Search a phrase (as raw text) with context window
 */
app.get('/api/decisions/:id/search/phrase', async (req, res) => {
  const id = Number(req.params.id);
  const phrase = String(req.query.q || '').trim();
  if (!phrase) return res.status(400).json({ error: 'q_required' });
  const before = Math.max(0, Number(req.query.before || 2));
  const after  = Math.max(0, Number(req.query.after || 2));
  const max    = Math.max(1, Number(req.query.max || 100));

  let conn;
  try {
    conn = await pool.getConnection();
    // simple scan over lines with LIKE; fallback to JS includes for position
    const [lines] = await conn.query('SELECT line_no, content FROM decision_lines WHERE decision_id=? ORDER BY line_no ASC', [id]);
    const hits = [];
    for (const row of lines) {
      const idx = row.content.indexOf(phrase);
      if (idx !== -1) {
        hits.push({ line_no: row.line_no, char_start: idx, char_end: idx + phrase.length });
        if (hits.length >= max) break;
      }
    }
    const ranges = hits.map(h => ({ start: Math.max(1, h.line_no - before), end: h.line_no + after }));
    const rangeMap = await getLineRangeMap(conn, id, ranges);
    const results = hits.map(h => {
      const context = [];
      for (let ln = Math.max(1, h.line_no - before); ln <= h.line_no + after; ln++) {
        const content = rangeMap.get(ln);
        if (content !== undefined) context.push({ line: ln, text: content });
      }
      return { line_no: h.line_no, char_start: h.char_start, char_end: h.char_end, context };
    });
    res.json({ phrase, occurrences: results });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed_to_search_phrase' });
  } finally { if (conn) conn.release(); }
});

/**
 * @swagger
 * /api/groups:
 *   post:
 *     summary: Create a word group
 */
app.post('/api/groups', async (req, res) => {
  const { name, description } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name_required' });
  let conn;
  try {
    conn = await pool.getConnection();
    const [r] = await conn.query('INSERT INTO word_groups (name, description) VALUES (?,?)', [name, description || null]);
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed_to_create_group' });
  } finally { if (conn) conn.release(); }
});

/**
 * @swagger
 * /api/groups/{id}/words:
 *   post:
 *     summary: Add words to a group (creates words if missing)
 */
app.post('/api/groups/:id/words', async (req, res) => {
  const gid = Number(req.params.id);
  const words = Array.isArray(req.body?.words) ? req.body.words : [];
  if (!words.length) return res.status(400).json({ error: 'words_required' });
  const normalized = [...new Set(words.map(w => normalizeWord(String(w))))].filter(Boolean);

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Ensure words exist
    for (let i = 0; i < normalized.length; i += 1000) {
      const chunk = normalized.slice(i, i+1000).map(w => [w]);
      const [q, p] = buildMultiValues('INSERT IGNORE INTO words (word_text) VALUES ?', chunk);
      await conn.query(q, p);
    }

    // Fetch ids
    const placeholders = normalized.map(() => '?').join(',');
    const [rows] = await conn.query(`SELECT word_id, word_text FROM words WHERE word_text IN (${placeholders})`, normalized);
    const toInsert = rows.map(r => [gid, r.word_id]);

    // Insert group members (ignore duplicates)
    if (toInsert.length) {
      const [q2, p2] = buildMultiValues('INSERT IGNORE INTO word_group_members (group_id, word_id) VALUES ?', toInsert);
      await conn.query(q2, p2);
    }

    await conn.commit();
    res.json({ ok: true, added: toInsert.length });
  } catch (e) {
    if (conn) await conn.rollback();
    console.error(e);
    res.status(500).json({ error: 'failed_to_add_group_words' });
  } finally { if (conn) conn.release(); }
});

/**
 * @swagger
 * /api/groups/{id}/index:
 *   get:
 *     summary: Index for a word group within a decision (counts + sample locations)
 */
app.get('/api/groups/:id/index', async (req, res) => {
  const gid = Number(req.params.id);
  const decisionId = Number(req.query.decision_id);
  if (!decisionId) return res.status(400).json({ error: 'decision_id_required' });
  const limitPerWord = Math.max(1, Number(req.query.limit_per_word || 5));
  let conn;
  try {
    conn = await pool.getConnection();
    // words in group
    const [gws] = await conn.query(`
      SELECT w.word_id, w.word_text
      FROM word_group_members gm JOIN words w ON gm.word_id=w.word_id
      WHERE gm.group_id=?
    `, [gid]);
    if (!gws.length) return res.json({ words: [] });

    const wordIds = gws.map(w => w.word_id);
    const placeholders = wordIds.map(() => '?').join(',');
    const [occ] = await conn.query(`
      SELECT o.word_id, o.line_no, o.char_start, o.char_end
      FROM occurrences o
      WHERE o.decision_id=? AND o.word_id IN (${placeholders})
      ORDER BY o.word_id, o.line_no, o.char_start
    `, [decisionId, ...wordIds]);

    // Build map of sample ranges
    const ranges = [];
    const byWord = new Map();
    for (const o of occ) {
      if (!byWord.has(o.word_id)) byWord.set(o.word_id, []);
      const arr = byWord.get(o.word_id);
      if (arr.length < limitPerWord) {
        arr.push(o);
        ranges.push({ start: Math.max(1, o.line_no - 1), end: o.line_no + 1 });
      }
    }
    const rangeMap = await getLineRangeMap(conn, decisionId, ranges);

    const items = gws.map(w => {
      const samples = (byWord.get(w.word_id) || []).map(o => {
        const context = [];
        for (let ln = Math.max(1, o.line_no - 1); ln <= o.line_no + 1; ln++) {
          const content = rangeMap.get(ln);
          if (content !== undefined) context.push({ line: ln, text: content });
        }
        return { line_no: o.line_no, char_start: o.char_start, char_end: o.char_end, context };
      });
      return { word: w.word_text, samples };
    });

    res.json({ decision_id: decisionId, group_id: gid, words: items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed_to_group_index' });
  } finally { if (conn) conn.release(); }
});

/**
 * @swagger
 * /api/decisions/{id}/stats:
 *   get:
 *     summary: Simple statistics about a decision text
 */
app.get('/api/decisions/:id/stats', async (req, res) => {
  const id = Number(req.params.id);
  let conn;
  try {
    conn = await pool.getConnection();
    const [[lines]] = await conn.query('SELECT COUNT(*) AS c FROM decision_lines WHERE decision_id=?', [id]);
    const [[tokens]] = await conn.query('SELECT COUNT(*) AS c FROM occurrences WHERE decision_id=?', [id]);
    const [[unique]] = await conn.query(`
      SELECT COUNT(DISTINCT word_id) AS c FROM occurrences WHERE decision_id=?
    `, [id]);
    res.json({ lines: lines.c, tokens: tokens.c, unique_words: unique.c });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed_to_stats' });
  } finally { if (conn) conn.release(); }
});

// ---------- Start ----------
app.listen(port, async () => {
  try {
    const conn = await pool.getConnection();
    conn.release();
    await initSchema();
    console.log('MySQL connected. Schema ready.');
    console.log(`Server: http://localhost:${port}`);
    console.log(`Swagger: http://localhost:${port}/api-docs`);
  } catch (e) {
    console.error('DB init error:', e);
  }
});

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Court Decisions + Text Concordance API',
      version: '1.1.0',
      description: 'Manage court decisions (metadata, files) and ingest/search TXT with word index, context windows, groups, phrases, and stats'
    },
    servers: [{ url: 'http://localhost:3000' }]
  },
  apis: ['./index.js']
};

module.exports = swaggerJsdoc(options);


Path("/mnt/data/index.js").write_text(index_js, encoding="utf-8")
Path("/mnt/data/swagger.js").write_text(swagger_js, encoding="utf-8")

"/mnt/data/index.js", "/mnt/data/swagger.js"
