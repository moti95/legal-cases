# API Quick Reference
## For Backend Developer

### 🚀 Priority Endpoints (Build These First)

#### 1. Search (Most Important!)
```
GET /api/search?term=חיפוש&phraseSearch=false&courtType=...&legalField=...
Response: SearchResult[]
```

#### 2. Create Case (For Testing)
```
POST /api/legal-cases
Content-Type: multipart/form-data
Body: { file: File, data: JSON }
Response: { success: true, case_id: number }
```

#### 3. Get Case Details
```
GET /api/legal-cases/:id
Response: LegalCase object
```

#### 4. Get Case Text
```
GET /api/legal-cases/:id/text
Response: Plain text
```

#### 5. Get Judges & Parties
```
GET /api/legal-cases/:caseId/judges
GET /api/legal-cases/:caseId/parties
```

#### 6. Word Groups (NEW - Concordance Feature!)
```
GET /api/word-groups              # Get all groups
POST /api/word-groups             # Create new group
PUT /api/word-groups/:id          # Update group
DELETE /api/word-groups/:id       # Delete group
POST /api/word-groups/:id/words   # Add word to group
DELETE /api/word-groups/:id/words/:word  # Remove word
GET /api/word-groups/:id/search   # Search occurrences
GET /api/word-groups/:id/index    # Generate index
```

#### 7. Legal Phrases (NEW - Concordance Feature!)
```
GET /api/legal-phrases            # Get all phrases
POST /api/legal-phrases           # Create new phrase
PUT /api/legal-phrases/:id        # Update phrase
DELETE /api/legal-phrases/:id     # Delete phrase
GET /api/legal-phrases/:id/search # Search occurrences
```

#### 8. Statistics (NEW - Dashboard Feature!)
```
GET /api/statistics               # Get dashboard statistics
```

**Response includes:**
- Total counts (cases, judges, word groups, phrases)
- Court type distribution (for doughnut chart)
- Legal field distribution (for bar chart)
- Cases timeline (for line chart)
- Top 10 judges by case count
- Last 10 recent cases
- Top 5 legal phrases by occurrence

---

### 📋 Response Examples

**Search Result:**
```json
{
  "case_id": 1,
  "case_number": "ע״א 1234/20",
  "case_title": "פלוני נגד אלמוני",
  "court_type": "בית המשפט העליון",
  "verdict_date": "2020-05-15",
  "context": "...טקסט עם <mark>מילת החיפוש</mark> מודגשת..."
}
```

**Create Case Request:**
```javascript
// FormData structure
{
  file: PDF/TXT file,
  data: JSON.stringify({
    case_number: "ע״א 1234/20",
    case_title: "...",
    court_type: "...",
    verdict_date: "2020-05-15",
    judges: [{ judge_name: "...", judge_title: "שופט", is_presiding: true }],
    parties: [{ party_name: "...", party_role: "תובע" }]
  })
}
```

**Statistics Response:**
```json
{
  "totalCases": 150,
  "totalJudges": 45,
  "totalWordGroups": 12,
  "totalPhrases": 23,
  "courtTypeDistribution": [
    { "type": "בית המשפט העליון", "count": 50 },
    { "type": "בית משפט מחוזי", "count": 70 }
  ],
  "legalFieldDistribution": [
    { "field": "נזיקין", "count": 40 }
  ],
  "casesTimeline": [
    { "date": "2024-01", "count": 10 }
  ],
  "topJudges": [
    { "name": "השופטת א' חיות", "caseCount": 25 }
  ],
  "recentCases": [...],  // Last 10 LegalCase objects
  "topPhrases": [
    { "phrase": "על פי החוק", "count": 156 }
  ]
}
```

---

### 🗄️ Suggested Database Tables

```sql
-- Main case info
legal_cases (case_id, case_number, case_title, court_type, verdict_date, ...)

-- Case text (for search)
case_text (text_id, case_id, content) -- FULLTEXT index on content

-- Judges
judges (judge_id, case_id, judge_name, judge_title, is_presiding)

-- Parties
parties (party_id, case_id, party_name, party_role)

-- Word Groups (NEW!)
word_groups (group_id, group_name, group_description, created_at)
word_group_words (group_id, word)

-- Legal Phrases (NEW!)
legal_phrases (phrase_id, phrase_text, description, created_at)

-- Word Occurrences (for concordance)
word_occurrences (occurrence_id, case_id, word, line_number, paragraph_number)
```

---

### 🔍 Search Implementation

**Use MySQL FULLTEXT:**
```sql
-- Simple search
SELECT * FROM case_text
WHERE MATCH(content) AGAINST('searchTerm' IN BOOLEAN MODE)

-- Exact phrase
SELECT * FROM case_text
WHERE MATCH(content) AGAINST('"exact phrase"' IN BOOLEAN MODE)

-- With filters
SELECT c.* FROM legal_cases c
JOIN case_text t ON c.case_id = t.case_id
WHERE MATCH(t.content) AGAINST('term' IN BOOLEAN MODE)
  AND c.court_type = 'בית המשפט העליון'
  AND c.verdict_date BETWEEN '2020-01-01' AND '2025-12-31'
```

**Context Extraction:**
```javascript
// Extract ~100 chars before/after match
const index = text.indexOf(searchTerm);
const start = Math.max(0, index - 100);
const end = Math.min(text.length, index + searchTerm.length + 100);
const context = '...' + text.substring(start, end) + '...';
const highlighted = context.replace(searchTerm, `<mark>${searchTerm}</mark>`);
```

---

### 📤 File Upload Handling

```javascript
// Using multer (Express)
const upload = multer({
  dest: 'uploads/cases/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' ||
        file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

app.post('/api/legal-cases', upload.single('file'), (req, res) => {
  const file = req.file;
  const data = JSON.parse(req.body.data);

  // Extract text from file
  // Save to database
  // Return success
});
```

---

### ✅ Testing Checklist

**Basic Features:**
- [ ] Can upload a case with file
- [ ] Can search by term and get highlighted results
- [ ] Can filter search by court type
- [ ] Can filter search by legal field
- [ ] Can filter search by date range
- [ ] Can get case details by ID
- [ ] Can get case text by ID
- [ ] Can get judges for a case
- [ ] Can get parties for a case
- [ ] Search returns proper context with `<mark>` tags

**Concordance Features (NEW!):**
- [ ] Can create word groups
- [ ] Can add/remove words from groups
- [ ] Can search for word group occurrences
- [ ] Can generate printable index for word groups
- [ ] Can create legal phrases
- [ ] Can search for phrase occurrences
- [ ] Phrase search returns context with highlighting

**Statistics Dashboard (NEW!):**
- [ ] Statistics endpoint returns all required data
- [ ] Total counts are accurate (cases, judges, groups, phrases)
- [ ] Court type distribution data is correct
- [ ] Legal field distribution data is correct
- [ ] Cases timeline shows monthly aggregation
- [ ] Top judges sorted by case count (DESC, limit 10)
- [ ] Recent cases returns last 10 cases
- [ ] Top phrases sorted by occurrence count

---

### 🐛 Common Issues

**Issue:** Hebrew text showing as ???
**Fix:** Use UTF-8 encoding everywhere
```sql
CREATE DATABASE legal_cases CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Issue:** Search not working with Hebrew
**Fix:** Configure MySQL FULLTEXT for Hebrew
```sql
-- In my.cnf:
ft_min_word_len = 1
ngram_token_size = 1
```

**Issue:** File upload fails
**Fix:** Check file size limits and MIME types

---

### 📞 Questions?

See full documentation in [API-SPEC.md](./API-SPEC.md)

Contact frontend team for clarifications!
