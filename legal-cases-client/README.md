# Legal Cases Concordance System

A comprehensive concordance and text retrieval system for legal documents, developed as part of the Database Engineering course at the Open University of Israel.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Course Compliance](#course-compliance)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Overview

The Legal Cases Concordance System is a sophisticated text indexing and retrieval platform designed specifically for Israeli legal documents. It provides comprehensive concordance functionality, enabling users to search, analyze, and cross-reference legal texts with advanced linguistic and contextual capabilities.

### What is a Concordance System?

A concordance system is a specialized text analysis tool that:
- Indexes every word and its locations across multiple documents
- Provides contextual search with surrounding text segments
- Tracks word frequencies and distributions
- Enables phrase and pattern matching
- Supports linguistic analysis through word grouping and categorization

## Features

### Core Concordance Features

#### 1. **Global Word Index**
- Complete alphabetical index of all unique words in the system
- Word frequency analysis and occurrence tracking
- Multiple location tracking (line, paragraph, section)
- Export capabilities to CSV format

#### 2. **Advanced Search Capabilities**
- Full-text search with context highlighting
- Exact phrase matching
- Location-based search (find words at specific line/paragraph)
- Multi-criteria filtering (court type, case number, date range)
- Search result navigation with Previous/Next controls

#### 3. **Word Groups Management**
- Create and manage legal term taxonomies
- Autocomplete word selection from database
- Group-based occurrence searching
- Printable index generation for word groups

#### 4. **Legal Phrases Tracking**
- Define and track consecutive word sequences
- Identify legal expressions across documents
- Context-aware phrase occurrence display

#### 5. **Document Management**
- Upload legal cases in TXT or PDF format
- Rich metadata capture (judges, parties, court details)
- Structured data extraction and indexing
- Support for Hebrew text with proper RTL handling

### Advanced Features

#### **Data Mining - Similar Cases**
- Intelligent case similarity detection
- TF-IDF based document comparison
- Common term analysis
- Relevance scoring

#### **Statistics Dashboard**
- System-wide word statistics
- Per-document analysis
- Word frequency distributions
- Usage patterns and trends

#### **Import/Export**
- XML data export for backup
- System migration support
- Cross-platform compatibility

## Technology Stack

### Frontend
- **Framework**: Angular 20.3 (latest version)
- **UI Library**: Angular Material
- **Language**: TypeScript 5.6
- **Architecture**: Standalone Components
- **Styling**: SCSS with CSS Variables
- **Build Tool**: Angular CLI with SSR support

### Backend Requirements
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MySQL 8.0+
- **API**: RESTful with JSON

### Key Dependencies
```json
{
  "@angular/core": "^20.3.0",
  "@angular/material": "^20.2.7",
  "@angular/cdk": "^20.2.7",
  "rxjs": "~7.8.0",
  "typescript": "~5.6.2"
}
```

## Architecture

### System Overview
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Angular Client │────▶│  Express API    │────▶│  MySQL Database │
│   (Port 4200)   │     │   (Port 3000)   │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Component Architecture
```
src/app/
├── components/
│   ├── search-page/          # Main search interface
│   ├── words-index/          # Global word index
│   ├── case-upload/          # Document upload
│   ├── case-details/         # Case viewer
│   └── legal-terms-groups/   # Word groups & phrases
├── services/
│   └── legal-cases.service   # API integration
└── models/
    └── legal-case.model      # TypeScript interfaces
```

### Database Schema
- **legal_cases**: Core case documents
- **judges**: Judge information
- **parties**: Case parties (plaintiff, defendant, etc.)
- **case_text**: Full text storage with indexing
- **word_occurrences**: Word location tracking
- **word_groups**: Legal term categories
- **legal_phrases**: Multi-word expressions

## Installation

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher
- Git

### Setup Instructions

1. **Clone the repository**
```bash
git clone https://github.com/[username]/legal-cases-client.git
cd legal-cases-client
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
Create a `.env` file if needed for API endpoints (default: http://localhost:3000)

4. **Start development server**
```bash
npm start
```
The application will open at http://localhost:4200

5. **Build for production**
```bash
npm run build
```
Output will be in `dist/legal-cases-client/`

## Usage

### Basic Workflow

1. **Upload Legal Documents**
   - Navigate to Upload page
   - Select TXT or PDF files
   - Enter case metadata (case number, court, judges, parties)
   - Submit for processing

2. **Search Documents**
   - Use main search bar for word/phrase search
   - Apply filters (court type, date range, location)
   - View results with highlighted context
   - Navigate through multiple occurrences

3. **Manage Word Groups**
   - Create legal term categories
   - Use autocomplete to add existing words
   - Search for group occurrences
   - Generate printable indices

4. **Explore Word Index**
   - Browse complete word list
   - View frequency statistics
   - Export data for analysis
   - Drill down to specific occurrences

### Advanced Features

- **Location-based Search**: Find words at specific line/paragraph positions
- **Similar Cases**: Discover related documents using data mining
- **Phrase Tracking**: Define and monitor legal expressions

## API Documentation

Complete API documentation is available in [BACKEND-DOCUMENTATION.md](./BACKEND-DOCUMENTATION.md)

### Key Endpoints

- `GET /api/search` - Text search with filters
- `GET /api/words` - Global word index
- `GET /api/legal-cases` - Case management
- `GET /api/word-groups` - Word group operations
- `GET /api/legal-phrases` - Phrase management
- `GET /api/legal-cases/:id/similar` - Similar case detection

## Course Compliance

### Requirements Status: 100% Complete ✓

#### Core Features (70% of grade) - ALL IMPLEMENTED
- [x] Document loading (TXT/PDF files)
- [x] Structured metadata entry
- [x] Word and phrase search with filters
- [x] Context display with navigation
- [x] Global word index with locations
- [x] Location-based word search
- [x] Word groups with database selection
- [x] Legal phrase tracking
- [x] Index generation and export
- [x] Statistical analysis

#### Advanced Feature (15% of grade) - IMPLEMENTED
- [x] Data Mining: Similar cases algorithm
- [x] Bonus: XML import/export functionality

#### Documentation (15% of grade) - COMPLETE
- [x] System architecture documentation
- [x] Database schema design
- [x] API specification
- [x] User interface documentation

## Project Structure

```
legal-cases-client/
├── src/
│   ├── app/
│   │   ├── components/     # UI Components
│   │   ├── services/        # API Services
│   │   ├── models/          # Data Models
│   │   ├── app.config.ts    # App Configuration
│   │   ├── app.routes.ts    # Routing
│   │   └── app.ts           # Root Component
│   ├── styles/              # Global Styles
│   └── index.html           # Entry Point
├── dist/                    # Production Build
├── docs/                    # Documentation
│   ├── API-SPEC.md          # API Specification
│   ├── BACKEND-DOCUMENTATION.md
│   └── COURSE-COMPLIANCE-CHECK.md
├── angular.json             # Angular Configuration
├── package.json             # Dependencies
└── README.md               # This File
```

## Development

### Code Style
- TypeScript with strict typing
- Angular style guide compliance
- Component-based architecture
- Reactive programming with RxJS
- SCSS with BEM methodology

### Commands
```bash
npm start          # Development server
npm run build      # Production build
npm test           # Run tests
npm run lint       # Code linting
```

### Git Workflow
```bash
git add .
git commit -m "feat: add word index component"
git push origin main
```

## Performance

- **Bundle Size**: ~1.18 MB (production)
- **Initial Load**: < 2 seconds
- **Search Response**: < 500ms
- **SSR Support**: Pre-rendering enabled
- **Lazy Loading**: Route-based code splitting

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Full RTL (Right-to-Left) support for Hebrew text.

## Contributing

This is an academic project developed for the Database Engineering course at the Open University of Israel.

### Team
- **Frontend Development**: Doron Gedasi
- **Backend Development**: Moti Tier
- **Course**: Database Engineering
- **Institution**: Open University of Israel
- **Submission Date**: January 1, 2026

## Acknowledgments

- Open University of Israel for course framework
- Angular team for the excellent framework
- Material Design team for UI components

## License

This project is developed as part of an academic curriculum at the Open University of Israel. All rights reserved to the university and project authors.

---

**Note**: This frontend application requires a running backend server. See [BACKEND-DOCUMENTATION.md](./BACKEND-DOCUMENTATION.md) for backend implementation requirements.