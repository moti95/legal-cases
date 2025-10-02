# API Specification for Legal Cases System
## Client-Server Integration Guide

This document describes all API endpoints that the Angular client expects from the Node.js/Express/MySQL backend.

**Base URL:** `http://localhost:3000/api`

---

## 📋 Table of Contents
1. [Search Endpoints](#search-endpoints)
2. [Legal Cases Endpoints](#legal-cases-endpoints)
3. [Judges & Parties Endpoints](#judges--parties-endpoints)
4. [Statistics Endpoints](#statistics-endpoints)
5. [Export/Import Endpoints](#exportimport-endpoints)
6. [Data Models](#data-models)

---

## 🔍 Search Endpoints

### Search Cases
**Endpoint:** `GET /api/search`

**Query Parameters:**
```typescript
{
  term: string;              // Search term (required)
  phraseSearch: boolean;     // Exact phrase search flag

  // Basic Filters (all optional)
  courtType?: string;        // e.g., "בית המשפט העליון"
  caseNumber?: string;       // e.g., "ע"א 1234/20"
  dateFrom?: string;         // ISO date string (YYYY-MM-DD)
  dateTo?: string;           // ISO date string (YYYY-MM-DD)
}
```

**Example Request:**
```
GET /api/search?term=נזיקין&phraseSearch=false&courtType=בית%20המשפט%20העליון&dateFrom=2020-01-01&dateTo=2023-12-31
```

**Response Format:**
```typescript
[
  {
    case_id: number;           // Unique case identifier
    case_number: string;       // e.g., "ע״א 1234/20"
    case_title: string;        // Case title
    court_type: string;        // Court type
    verdict_date: string;      // Date string (YYYY-MM-DD or formatted)
    legal_field?: string;      // Legal field
    court_location?: string;   // Court location
    context: string;           // Text excerpt with search term highlighted
                              // Use <mark>term</mark> for highlighting
  }
]
```

**Example Response:**
```json
[
  {
    "case_id": 1,
    "case_number": "ע״א 1234/20",
    "case_title": "פלוני נגד אלמוני",
    "court_type": "בית המשפט העליון",
    "verdict_date": "2020-05-15",
    "legal_field": "נזיקין",
    "court_location": "ירושלים",
    "context": "...ההחלטה בעניין <mark>נזיקין</mark> הייתה חד משמעית..."
  }
]
```

---

## 📁 Legal Cases Endpoints

### Get All Cases
**Endpoint:** `GET /api/legal-cases`

**Response:** Array of `LegalCase` objects (see [Data Models](#data-models))

---

### Get Case By ID
**Endpoint:** `GET /api/legal-cases/:id`

**URL Parameters:**
- `id` - Case ID (number)

**Response:** Single `LegalCase` object

**Example Response:**
```json
{
  "case_id": 1,
  "case_number": "ע״א 1234/20",
  "case_title": "פלוני נגד אלמוני",
  "court_type": "בית המשפט העליון",
  "court_location": "ירושלים",
  "verdict_date": "2020-05-15",
  "legal_field": "נזיקין",
  "file_path": "/uploads/cases/case_1.pdf",
  "created_at": "2025-01-15T10:30:00Z"
}
```

---

### Create New Case
**Endpoint:** `POST /api/legal-cases`

**Content-Type:** `multipart/form-data`

**Request Body:**
```typescript
FormData {
  file: File;        // PDF or TXT file (max 10MB)
  data: string;      // JSON string with case data
}
```

**JSON data structure:**
```typescript
{
  case_number: string;       // Required
  case_title: string;        // Required
  court_type: string;        // Required
  verdict_date: string;      // Required (YYYY-MM-DD)
  court_location?: string;   // Optional
  legal_field?: string;      // Optional

  judges: [                  // Array of judges
    {
      judge_name: string;    // Required
      judge_title: string;   // e.g., "שופט", "נשיא"
      is_presiding: boolean; // true if presiding judge
    }
  ],

  parties: [                 // Array of parties
    {
      party_name: string;    // Required
      party_role: string;    // Required: "תובע", "נתבע", "מערער", "משיב"
    }
  ]
}
```

**Example Request (using FormData):**
```javascript
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('data', JSON.stringify({
  case_number: "ע״א 1234/20",
  case_title: "פלוני נגד אלמוני",
  court_type: "בית המשפט העליון",
  verdict_date: "2020-05-15",
  legal_field: "נזיקין",
  judges: [
    {
      judge_name: "אסתר חיות",
      judge_title: "נשיאה",
      is_presiding: true
    }
  ],
  parties: [
    {
      party_name: "יוסי כהן",
      party_role: "מערער"
    },
    {
      party_name: "דינה לוי",
      party_role: "משיב"
    }
  ]
}));
```

**Response:**
```json
{
  "success": true,
  "case_id": 123,
  "message": "Case created successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Invalid file type"
}
```

---

### Delete Case
**Endpoint:** `DELETE /api/legal-cases/:id`

**URL Parameters:**
- `id` - Case ID (number)

**Response:**
```json
{
  "success": true,
  "message": "Case deleted successfully"
}
```

---

### Get Case Text
**Endpoint:** `GET /api/legal-cases/:id/text`

**URL Parameters:**
- `id` - Case ID (number)

**Response:** Plain text content of the case document

**Content-Type:** `text/plain; charset=utf-8`

**Example Response:**
```
בית המשפט העליון
ע״א 1234/20

בפני כבוד הנשיאה א' חיות

המערער: יוסי כהן
המשיב: דינה לוי

פסק דין

לאחר עיון בכתבי הטענות ובחומר הראיות...
```

---

## 👨‍⚖️ Judges & Parties Endpoints

### Get Case Judges
**Endpoint:** `GET /api/legal-cases/:caseId/judges`

**URL Parameters:**
- `caseId` - Case ID (number)

**Response:** Array of `Judge` objects

**Example Response:**
```json
[
  {
    "judge_id": 1,
    "judge_name": "אסתר חיות",
    "judge_title": "נשיאה",
    "is_presiding": true
  },
  {
    "judge_id": 2,
    "judge_name": "נעם סולברג",
    "judge_title": "שופט",
    "is_presiding": false
  }
]
```

---

### Get Case Parties
**Endpoint:** `GET /api/legal-cases/:caseId/parties`

**URL Parameters:**
- `caseId` - Case ID (number)

**Response:** Array of `Party` objects

**Example Response:**
```json
[
  {
    "party_id": 1,
    "party_name": "יוסי כהן",
    "party_role": "מערער"
  },
  {
    "party_id": 2,
    "party_name": "דינה לוי",
    "party_role": "משיב"
  }
]
```

---

## 📊 Statistics Endpoints

### Get Statistics
**Endpoint:** `GET /api/statistics`

**Query Parameters (all optional):**
```typescript
{
  caseId?: number;  // Get statistics for specific case (optional)
}
```

**Response Format:**
```typescript
interface Statistics {
  // Basic summary metrics
  totalCases: number;
  totalWords: number;
  totalWordGroups: number;
  totalPhrases: number;

  // If caseId is provided (optional):
  caseStats?: {
    wordCount: number;
    characterCount: number;
  };
}
```

**Example Response (Basic Statistics):**
```json
{
  "totalCases": 150,
  "totalWords": 45823,
  "totalWordGroups": 12,
  "totalPhrases": 23
}
```

**Example Response (With Case Stats):**
```json
{
  "totalCases": 150,
  "totalWords": 45823,
  "totalWordGroups": 12,
  "totalPhrases": 23,
  "caseStats": {
    "wordCount": 3542,
    "characterCount": 18956
  }
}
```

**Implementation Tips:**
- Use SQL COUNT() for basic metrics
- For totalWords: COUNT(DISTINCT word) from words table
- For caseStats: Parse and count from case_text content

---

## 📤 Export/Import Endpoints

### Export to XML
**Endpoint:** `GET /api/export`

**Response:** XML document with all cases data

**Content-Type:** `application/xml; charset=utf-8`

**Example Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<legal_cases>
  <case id="1">
    <case_number>ע״א 1234/20</case_number>
    <case_title>פלוני נגד אלמוני</case_title>
    <court_type>בית המשפט העליון</court_type>
    <verdict_date>2020-05-15</verdict_date>
    <judges>
      <judge presiding="true">
        <name>אסתר חיות</name>
        <title>נשיאה</title>
      </judge>
    </judges>
    <parties>
      <party>
        <name>יוסי כהן</name>
        <role>מערער</role>
      </party>
    </parties>
  </case>
</legal_cases>
```

---

### Import from XML
**Endpoint:** `POST /api/import`

**Content-Type:** `application/xml`

**Request Body:** XML document (same format as export)

**Response:**
```json
{
  "success": true,
  "imported": 25,
  "errors": []
}
```

---

## 🗂️ Data Models

### LegalCase
```typescript
interface LegalCase {
  case_id?: number;           // Auto-generated
  case_number: string;        // Unique case number
  case_title: string;         // Case title
  court_type: string;         // Court type
  court_location?: string;    // Court location
  verdict_date: string;       // Date (YYYY-MM-DD)
  legal_field?: string;       // Legal field
  file_path?: string;         // Path to uploaded file
  created_at?: string;        // ISO datetime
  updated_at?: string;        // ISO datetime
}
```

### Judge
```typescript
interface Judge {
  judge_id?: number;          // Auto-generated
  judge_name: string;         // Full name
  judge_title: string;        // e.g., "שופט", "נשיא", "סגן נשיא"
  is_presiding: boolean;      // Is presiding judge
}
```

### Party
```typescript
interface Party {
  party_id?: number;          // Auto-generated
  party_name: string;         // Full name
  party_role: string;         // "תובע", "נתבע", "מערער", "משיב"
}
```

### SearchResult
```typescript
interface SearchResult {
  case_id: number;
  case_number: string;
  case_title: string;
  court_type: string;
  verdict_date: string;
  legal_field?: string;
  court_location?: string;
  context: string;            // Highlighted excerpt
}
```

---

## 🔧 Implementation Notes

### Database Schema Suggestions

**legal_cases table:**
```sql
CREATE TABLE legal_cases (
  case_id INT AUTO_INCREMENT PRIMARY KEY,
  case_number VARCHAR(50) UNIQUE NOT NULL,
  case_title VARCHAR(255) NOT NULL,
  court_type VARCHAR(100) NOT NULL,
  court_location VARCHAR(100),
  verdict_date DATE NOT NULL,
  legal_field VARCHAR(100),
  file_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_court_type (court_type),
  INDEX idx_legal_field (legal_field),
  INDEX idx_verdict_date (verdict_date)
);
```

**judges table:**
```sql
CREATE TABLE judges (
  judge_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  judge_name VARCHAR(100) NOT NULL,
  judge_title VARCHAR(50),
  is_presiding BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (case_id) REFERENCES legal_cases(case_id) ON DELETE CASCADE,
  INDEX idx_judge_name (judge_name)
);
```

**parties table:**
```sql
CREATE TABLE parties (
  party_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  party_name VARCHAR(100) NOT NULL,
  party_role VARCHAR(50) NOT NULL,
  FOREIGN KEY (case_id) REFERENCES legal_cases(case_id) ON DELETE CASCADE,
  INDEX idx_party_name (party_name)
);
```

**case_text table:**
```sql
CREATE TABLE case_text (
  text_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  content LONGTEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES legal_cases(case_id) ON DELETE CASCADE,
  FULLTEXT INDEX idx_content (content)
);
```

### Search Implementation Tips

1. **Full-Text Search:**
   - Use MySQL FULLTEXT search for the `content` field
   - For phrase search: Use `MATCH() AGAINST('term' IN BOOLEAN MODE)`
   - For exact phrase: Use `MATCH() AGAINST('"exact phrase"' IN BOOLEAN MODE)`

2. **Context Extraction:**
   - Extract ~100 characters before and after the match
   - Wrap search term with `<mark>` tags for highlighting

3. **Filters:**
   - Apply as `WHERE` clauses
   - Date range: `verdict_date BETWEEN ? AND ?`
   - Join judges/parties tables for name filtering

4. **File Upload:**
   - Save files to `/uploads/cases/` directory
   - Store relative path in database
   - Parse TXT files to extract text content
   - For PDF: Use a PDF parser library (e.g., `pdf-parse`)

---

## 📚 Word Groups & Legal Phrases (Concordance Features)

### Get All Word Groups
**Endpoint:** `GET /api/word-groups`

**Response:**
```typescript
interface LegalTermGroup {
  group_id: number;
  group_name: string;
  group_description?: string;
  words: string[];
  created_at: string;
}

Response: LegalTermGroup[]
```

**Example:**
```json
[
  {
    "group_id": 1,
    "group_name": "חיות",
    "group_description": "מילים הקשורות לבעלי חיים",
    "words": ["כלב", "חתול", "ציפור"],
    "created_at": "2025-10-02T10:00:00Z"
  }
]
```

---

### Create Word Group
**Endpoint:** `POST /api/word-groups`

**Request Body:**
```json
{
  "group_name": "כלי רכב",
  "group_description": "סוגי כלי רכב",
  "words": ["מכונית", "אופנוע", "משאית"]
}
```

**Response:**
```json
{
  "group_id": 2,
  "group_name": "כלי רכב",
  "group_description": "סוגי כלי רכב",
  "words": ["מכונית", "אופנוע", "משאית"],
  "created_at": "2025-10-02T11:00:00Z"
}
```

---

### Update Word Group
**Endpoint:** `PUT /api/word-groups/:id`

**Request Body:** Same as create (all fields)

**Response:** Updated LegalTermGroup object

---

### Delete Word Group
**Endpoint:** `DELETE /api/word-groups/:id`

**Response:**
```json
{
  "success": true,
  "message": "Word group deleted"
}
```

---

### Search Word Group Occurrences
**Endpoint:** `GET /api/word-groups/:id/search`

**Response:**
```typescript
interface WordGroupSearchResult {
  word: string;
  occurrences: WordOccurrence[];
}

interface WordOccurrence {
  occurrence_id: number;
  case_id: number;
  word: string;
  line_number: number;
  paragraph_number: number;
}

Response: WordGroupSearchResult[]
```

**Example:**
```json
[
  {
    "word": "כלב",
    "occurrences": [
      {
        "occurrence_id": 1,
        "case_id": 5,
        "word": "כלב",
        "line_number": 42,
        "paragraph_number": 8
      },
      {
        "occurrence_id": 2,
        "case_id": 12,
        "word": "כלב",
        "line_number": 15,
        "paragraph_number": 3
      }
    ]
  },
  {
    "word": "חתול",
    "occurrences": [...]
  }
]
```

---

### Generate Word Group Index
**Endpoint:** `GET /api/word-groups/:id/index`

**Response:** Formatted index for printing/export

**Example:**
```json
{
  "group_name": "חיות",
  "generated_at": "2025-10-02T12:00:00Z",
  "total_occurrences": 45,
  "words": [
    {
      "word": "כלב",
      "count": 23,
      "cases": [
        { "case_id": 5, "case_number": "ע״א 100/20", "lines": [42, 56] },
        { "case_id": 12, "case_number": "ע״א 200/21", "lines": [15] }
      ]
    }
  ]
}
```

---

### Get All Legal Phrases
**Endpoint:** `GET /api/legal-phrases`

**Response:**
```typescript
interface LegalPhrase {
  phrase_id: number;
  phrase_text: string;
  description?: string;
  occurrences?: number;
  created_at: string;
}

Response: LegalPhrase[]
```

**Example:**
```json
[
  {
    "phrase_id": 1,
    "phrase_text": "על פי החוק",
    "description": "ביטוי משפטי נפוץ",
    "occurrences": 156,
    "created_at": "2025-10-02T10:00:00Z"
  }
]
```

---

### Create Legal Phrase
**Endpoint:** `POST /api/legal-phrases`

**Request Body:**
```json
{
  "phrase_text": "בית המשפט העליון",
  "description": "התייחסות לביהמ״ש העליון"
}
```

**Response:** Created LegalPhrase object

---

### Update Legal Phrase
**Endpoint:** `PUT /api/legal-phrases/:id`

**Request Body:** Same as create

**Response:** Updated LegalPhrase object

---

### Delete Legal Phrase
**Endpoint:** `DELETE /api/legal-phrases/:id`

**Response:**
```json
{
  "success": true,
  "message": "Phrase deleted"
}
```

---

### Search Phrase Occurrences
**Endpoint:** `GET /api/legal-phrases/:id/search`

**Response:**
```typescript
interface PhraseSearchResult {
  phrase_id: number;
  phrase_text: string;
  case_id: number;
  case_title: string;
  case_number: string;
  context: string;  // With <mark> tags
  line_number: number;
}

Response: PhraseSearchResult[]
```

**Example:**
```json
[
  {
    "phrase_id": 1,
    "phrase_text": "על פי החוק",
    "case_id": 5,
    "case_title": "כהן נגד לוי",
    "case_number": "ע״א 100/20",
    "context": "...הנאשם פעל בניגוד <mark>על פי החוק</mark> ולכן יש להרשיעו...",
    "line_number": 42
  }
]
```

---

### Database Schema Additions

**word_groups table:**
```sql
CREATE TABLE word_groups (
  group_id INT AUTO_INCREMENT PRIMARY KEY,
  group_name VARCHAR(100) NOT NULL,
  group_description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_group_name (group_name)
);
```

**word_group_words table:**
```sql
CREATE TABLE word_group_words (
  group_id INT NOT NULL,
  word VARCHAR(100) NOT NULL,
  PRIMARY KEY (group_id, word),
  FOREIGN KEY (group_id) REFERENCES word_groups(group_id) ON DELETE CASCADE,
  INDEX idx_word (word)
);
```

**legal_phrases table:**
```sql
CREATE TABLE legal_phrases (
  phrase_id INT AUTO_INCREMENT PRIMARY KEY,
  phrase_text VARCHAR(500) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FULLTEXT INDEX idx_phrase_text (phrase_text)
);
```

**word_occurrences table (optional for optimization):**
```sql
CREATE TABLE word_occurrences (
  occurrence_id INT AUTO_INCREMENT PRIMARY KEY,
  case_id INT NOT NULL,
  word VARCHAR(100) NOT NULL,
  line_number INT NOT NULL,
  paragraph_number INT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES legal_cases(case_id) ON DELETE CASCADE,
  INDEX idx_word (word),
  INDEX idx_case_word (case_id, word)
);
```

---

*Last Updated: October 2, 2025*
*Angular Client Version: 20.3.0*
*Concordance Features Added: October 2, 2025*
