// models/legal-case.model.ts

export interface LegalCase {
  case_id?: number;
  case_number: string;
  case_title: string;
  court_type: string;
  court_location?: string;
  verdict_date: string;
  legal_field?: string;
  file_path: string;
  file_name: string;
  created_at?: string;
}

export interface Judge {
  judge_id?: number;
  judge_name: string;
  judge_title?: string;
  is_presiding?: boolean;
}

export interface Party {
  party_id?: number;
  party_name: string;
  party_role: string;
  party_type?: string;
}

export interface SearchResult {
  case_id: number;
  case_title: string;
  case_number: string;
  court_type: string;
  court_location?: string;
  verdict_date: string;
  legal_field?: string;
  line_number: number;
  paragraph_number: number;
  section_number?: number;
  context: string;
}

export interface WordOccurrence {
  occurrence_id: number;
  case_id: number;
  word_id: number;
  word: string;
  line_number: number;
  paragraph_number: number;
  section_number?: number;
}

export interface LegalTermGroup {
  group_id?: number;
  group_name: string;
  group_description?: string;
  group_category?: string;
  words?: string[];
}

export interface LegalPhrase {
  phrase_id?: number;
  phrase_text: string;
  description?: string;
  occurrences?: number;
  created_at?: string;
}

export interface WordGroupSearchResult {
  word: string;
  occurrences: WordOccurrence[];
}

export interface PhraseSearchResult {
  phrase_id: number;
  phrase_text: string;
  case_id: number;
  case_title: string;
  case_number: string;
  context: string;
  line_number: number;
}

export interface Statistics {
  totalCases: number;
  totalWords: number;
  totalWordGroups: number;
  totalPhrases: number;

  // Statistics for specific case (optional)
  caseStats?: {
    wordCount: number;
    characterCount: number;
  };
}