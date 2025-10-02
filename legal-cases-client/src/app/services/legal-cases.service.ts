// services/legal-cases.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LegalCase, Judge, Party, SearchResult, LegalTermGroup, LegalPhrase, WordGroupSearchResult, PhraseSearchResult, Statistics } from '../models/legal-case.model';

@Injectable({
  providedIn: 'root'
})
export class LegalCasesService {
  private apiUrl = 'http://localhost:3000/api';
  
  constructor(private http: HttpClient) {}
  
  // --- Legal Cases ---
  
  // קבלת כל פסקי הדין
  getAllCases(): Observable<LegalCase[]> {
    return this.http.get<LegalCase[]>(`${this.apiUrl}/legal-cases`);
  }
  
  // קבלת פסק דין ספציפי
  getCase(id: number): Observable<LegalCase> {
    return this.http.get<LegalCase>(`${this.apiUrl}/legal-cases/${id}`);
  }
  
  // יצירת פסק דין חדש
  createCase(caseData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/legal-cases`, caseData);
  }
  
  // מחיקת פסק דין
  deleteCase(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/legal-cases/${id}`);
  }
  
  // קבלת טקסט של פסק דין
  getCaseText(id: number): Observable<string> {
    return this.http.get(`${this.apiUrl}/legal-cases/${id}/text`, { responseType: 'text' });
  }
  
  // --- Judges ---
  
  // קבלת שופטים של פסק דין
  getCaseJudges(caseId: number): Observable<Judge[]> {
    return this.http.get<Judge[]>(`${this.apiUrl}/legal-cases/${caseId}/judges`);
  }
  
  // --- Parties ---
  
  // קבלת צדדים של פסק דין
  getCaseParties(caseId: number): Observable<Party[]> {
    return this.http.get<Party[]>(`${this.apiUrl}/legal-cases/${caseId}/parties`);
  }
  
  // --- Search ---
  
  // חיפוש בפסקי דין
  search(
    term: string,
    phraseSearch: boolean = false,
    courtType?: string,
    caseNumber?: string,
    dateFrom?: string,
    dateTo?: string,
    lineNumber?: number,
    paragraphNumber?: number
  ): Observable<SearchResult[]> {
    let params = `term=${encodeURIComponent(term)}&phraseSearch=${phraseSearch}`;

    // הוספת פילטרים בסיסיים
    if (courtType) params += `&courtType=${encodeURIComponent(courtType)}`;
    if (caseNumber) params += `&caseNumber=${encodeURIComponent(caseNumber)}`;
    if (dateFrom) params += `&dateFrom=${encodeURIComponent(dateFrom)}`;
    if (dateTo) params += `&dateTo=${encodeURIComponent(dateTo)}`;

    // הוספת חיפוש לפי מיקום
    if (lineNumber) params += `&lineNumber=${lineNumber}`;
    if (paragraphNumber) params += `&paragraphNumber=${paragraphNumber}`;

    return this.http.get<SearchResult[]>(`${this.apiUrl}/search?${params}`);
  }
  
  // --- Similar Cases ---
  
  // מציאת פסקי דין דומים
  findSimilarCases(caseId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/legal-cases/${caseId}/similar`);
  }
  
  // --- Statistics ---

  // קבלת סטטיסטיקה
  getStatistics(caseId?: number): Observable<Statistics> {
    const url = caseId
      ? `${this.apiUrl}/statistics?caseId=${caseId}`
      : `${this.apiUrl}/statistics`;
    return this.http.get<Statistics>(url);
  }
  
  // --- Export/Import ---
  
  // ייצוא נתונים ל-XML
  exportData(): Observable<string> {
    return this.http.get(`${this.apiUrl}/export`, { responseType: 'text' });
  }
  
  // ייבוא נתונים מ-XML
  importData(xmlData: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/import`, xmlData, {
      headers: new HttpHeaders({ 'Content-Type': 'application/xml' }),
      responseType: 'text'
    });
  }

  // --- Word Groups ---

  // קבלת כל קבוצות המילים
  getAllWordGroups(): Observable<LegalTermGroup[]> {
    return this.http.get<LegalTermGroup[]>(`${this.apiUrl}/word-groups`);
  }

  // קבלת קבוצת מילים ספציפית
  getWordGroup(id: number): Observable<LegalTermGroup> {
    return this.http.get<LegalTermGroup>(`${this.apiUrl}/word-groups/${id}`);
  }

  // יצירת קבוצת מילים חדשה
  createWordGroup(group: LegalTermGroup): Observable<LegalTermGroup> {
    return this.http.post<LegalTermGroup>(`${this.apiUrl}/word-groups`, group);
  }

  // עדכון קבוצת מילים
  updateWordGroup(id: number, group: LegalTermGroup): Observable<LegalTermGroup> {
    return this.http.put<LegalTermGroup>(`${this.apiUrl}/word-groups/${id}`, group);
  }

  // מחיקת קבוצת מילים
  deleteWordGroup(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/word-groups/${id}`);
  }

  // הוספת מילה לקבוצה
  addWordToGroup(groupId: number, word: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/word-groups/${groupId}/words`, { word });
  }

  // הסרת מילה מקבוצה
  removeWordFromGroup(groupId: number, word: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/word-groups/${groupId}/words/${encodeURIComponent(word)}`);
  }

  // חיפוש מופעים של קבוצת מילים
  searchWordGroup(groupId: number): Observable<WordGroupSearchResult[]> {
    return this.http.get<WordGroupSearchResult[]>(`${this.apiUrl}/word-groups/${groupId}/search`);
  }

  // יצירת אינדקס להדפסה
  generateWordGroupIndex(groupId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/word-groups/${groupId}/index`);
  }

  // --- Legal Phrases ---

  // קבלת כל הביטויים
  getAllPhrases(): Observable<LegalPhrase[]> {
    return this.http.get<LegalPhrase[]>(`${this.apiUrl}/legal-phrases`);
  }

  // קבלת ביטוי ספציפי
  getPhrase(id: number): Observable<LegalPhrase> {
    return this.http.get<LegalPhrase>(`${this.apiUrl}/legal-phrases/${id}`);
  }

  // יצירת ביטוי חדש
  createPhrase(phrase: LegalPhrase): Observable<LegalPhrase> {
    return this.http.post<LegalPhrase>(`${this.apiUrl}/legal-phrases`, phrase);
  }

  // עדכון ביטוי
  updatePhrase(id: number, phrase: LegalPhrase): Observable<LegalPhrase> {
    return this.http.put<LegalPhrase>(`${this.apiUrl}/legal-phrases/${id}`, phrase);
  }

  // מחיקת ביטוי
  deletePhrase(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/legal-phrases/${id}`);
  }

  // חיפוש מופעים של ביטוי
  searchPhrase(phraseId: number): Observable<PhraseSearchResult[]> {
    return this.http.get<PhraseSearchResult[]>(`${this.apiUrl}/legal-phrases/${phraseId}/search`);
  }

  // --- Words Index ---

  // קבלת כל המילים במערכת
  getAllWords(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/words`);
  }

  // קבלת מופעים של מילה ספציפית
  getWordOccurrences(word: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/words/${encodeURIComponent(word)}/occurrences`);
  }

  // חיפוש מילים לצורך השלמה אוטומטית
  searchWords(query: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/words/search?query=${encodeURIComponent(query)}`);
  }

  // חיפוש לפי מיקום (שורה ופסקה)
  searchByLocation(lineNumber: number, paragraphNumber?: number, caseId?: number): Observable<any[]> {
    let params = `lineNumber=${lineNumber}`;
    if (paragraphNumber) params += `&paragraphNumber=${paragraphNumber}`;
    if (caseId) params += `&caseId=${caseId}`;
    return this.http.get<any[]>(`${this.apiUrl}/search/by-location?${params}`);
  }
}