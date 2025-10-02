import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';
import { debounceTime, switchMap, map, startWith } from 'rxjs/operators';

import { LegalCasesService } from '../../services/legal-cases.service';
import { LegalTermGroup, LegalPhrase, WordGroupSearchResult, PhraseSearchResult } from '../../models/legal-case.model';

@Component({
  selector: 'app-legal-terms-groups',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    RouterLink
  ],
  templateUrl: './legal-terms-groups.html',
  styleUrl: './legal-terms-groups.scss'
})
export class LegalTermsGroups implements OnInit {
  // Word Groups
  wordGroups: LegalTermGroup[] = [];
  editingGroup: LegalTermGroup | null = null;
  newGroup: LegalTermGroup = { group_name: '', group_description: '', words: [] };
  newWord: string = '';
  wordControl = new FormControl('');
  filteredWords: Observable<any[]> = of([]);
  availableWords: any[] = [];
  groupSearchResults: { [groupId: number]: WordGroupSearchResult[] } = {};
  loadingGroups = false;
  searchingGroup: number | null = null;

  // Navigation state for occurrences
  occurrenceIndices: { [key: string]: number } = {};

  // Legal Phrases
  phrases: LegalPhrase[] = [];
  editingPhrase: LegalPhrase | null = null;
  newPhrase: LegalPhrase = { phrase_text: '', description: '' };
  phraseSearchResults: { [phraseId: number]: PhraseSearchResult[] } = {};
  loadingPhrases = false;
  searchingPhrase: number | null = null;

  constructor(private legalCasesService: LegalCasesService) {}

  ngOnInit(): void {
    this.loadWordGroups();
    this.loadPhrases();
    this.setupWordAutocomplete();
  }

  setupWordAutocomplete(): void {
    this.filteredWords = this.wordControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      switchMap(value => {
        if (typeof value === 'string' && value.length > 1) {
          return this.legalCasesService.searchWords(value);
        }
        return of([]);
      })
    );
  }

  // --- Word Groups Methods ---

  loadWordGroups(): void {
    this.loadingGroups = true;
    this.legalCasesService.getAllWordGroups().subscribe({
      next: (groups) => {
        this.wordGroups = groups;
        this.loadingGroups = false;
      },
      error: (err) => {
        console.error('Error loading word groups:', err);
        this.loadingGroups = false;
      }
    });
  }

  createGroup(): void {
    if (!this.newGroup.group_name.trim()) return;

    this.legalCasesService.createWordGroup(this.newGroup).subscribe({
      next: (group) => {
        this.wordGroups.unshift(group);
        this.newGroup = { group_name: '', group_description: '', words: [] };
      },
      error: (err) => console.error('Error creating group:', err)
    });
  }

  startEditGroup(group: LegalTermGroup): void {
    this.editingGroup = { ...group, words: [...(group.words || [])] };
  }

  saveGroup(): void {
    if (!this.editingGroup || !this.editingGroup.group_id) return;

    this.legalCasesService.updateWordGroup(this.editingGroup.group_id, this.editingGroup).subscribe({
      next: (updated) => {
        const index = this.wordGroups.findIndex(g => g.group_id === updated.group_id);
        if (index !== -1) {
          this.wordGroups[index] = updated;
        }
        this.editingGroup = null;
      },
      error: (err) => console.error('Error updating group:', err)
    });
  }

  cancelEditGroup(): void {
    this.editingGroup = null;
  }

  deleteGroup(groupId: number): void {
    if (!confirm('האם אתה בטוח שברצונך למחוק קבוצה זו?')) return;

    this.legalCasesService.deleteWordGroup(groupId).subscribe({
      next: () => {
        this.wordGroups = this.wordGroups.filter(g => g.group_id !== groupId);
      },
      error: (err) => console.error('Error deleting group:', err)
    });
  }

  addWordToNewGroup(): void {
    const word = this.wordControl.value?.trim() || this.newWord.trim();
    if (!word) return;
    if (!this.newGroup.words) this.newGroup.words = [];
    if (!this.newGroup.words.includes(word)) {
      this.newGroup.words.push(word);
      this.newWord = '';
      this.wordControl.setValue('');
    }
  }

  onWordSelected(event: any): void {
    const word = event.option.value;
    if (!this.newGroup.words) this.newGroup.words = [];
    if (!this.newGroup.words.includes(word)) {
      this.newGroup.words.push(word);
    }
    this.wordControl.setValue('');
  }

  removeWordFromNewGroup(word: string): void {
    if (!this.newGroup.words) return;
    this.newGroup.words = this.newGroup.words.filter(w => w !== word);
  }

  addWordToEditingGroup(): void {
    if (!this.newWord.trim() || !this.editingGroup) return;
    if (!this.editingGroup.words) this.editingGroup.words = [];
    if (!this.editingGroup.words.includes(this.newWord.trim())) {
      this.editingGroup.words.push(this.newWord.trim());
      this.newWord = '';
    }
  }

  removeWordFromEditingGroup(word: string): void {
    if (!this.editingGroup || !this.editingGroup.words) return;
    this.editingGroup.words = this.editingGroup.words.filter(w => w !== word);
  }

  searchGroup(groupId: number): void {
    this.searchingGroup = groupId;
    this.legalCasesService.searchWordGroup(groupId).subscribe({
      next: (results) => {
        this.groupSearchResults[groupId] = results;
        this.searchingGroup = null;
      },
      error: (err) => {
        console.error('Error searching group:', err);
        this.searchingGroup = null;
      }
    });
  }

  getTotalOccurrences(groupId: number): number {
    const results = this.groupSearchResults[groupId];
    if (!results) return 0;
    return results.reduce((sum, r) => sum + r.occurrences.length, 0);
  }

  generateIndex(groupId: number): void {
    this.legalCasesService.generateWordGroupIndex(groupId).subscribe({
      next: (data) => {
        // Create downloadable file or open in new window
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `word-group-${groupId}-index.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Error generating index:', err)
    });
  }

  // --- Legal Phrases Methods ---

  loadPhrases(): void {
    this.loadingPhrases = true;
    this.legalCasesService.getAllPhrases().subscribe({
      next: (phrases) => {
        this.phrases = phrases;
        this.loadingPhrases = false;
      },
      error: (err) => {
        console.error('Error loading phrases:', err);
        this.loadingPhrases = false;
      }
    });
  }

  createPhrase(): void {
    if (!this.newPhrase.phrase_text.trim()) return;

    this.legalCasesService.createPhrase(this.newPhrase).subscribe({
      next: (phrase) => {
        this.phrases.unshift(phrase);
        this.newPhrase = { phrase_text: '', description: '' };
      },
      error: (err) => console.error('Error creating phrase:', err)
    });
  }

  startEditPhrase(phrase: LegalPhrase): void {
    this.editingPhrase = { ...phrase };
  }

  savePhrase(): void {
    if (!this.editingPhrase || !this.editingPhrase.phrase_id) return;

    this.legalCasesService.updatePhrase(this.editingPhrase.phrase_id, this.editingPhrase).subscribe({
      next: (updated) => {
        const index = this.phrases.findIndex(p => p.phrase_id === updated.phrase_id);
        if (index !== -1) {
          this.phrases[index] = updated;
        }
        this.editingPhrase = null;
      },
      error: (err) => console.error('Error updating phrase:', err)
    });
  }

  cancelEditPhrase(): void {
    this.editingPhrase = null;
  }

  deletePhrase(phraseId: number): void {
    if (!confirm('האם אתה בטוח שברצונך למחוק ביטוי זה?')) return;

    this.legalCasesService.deletePhrase(phraseId).subscribe({
      next: () => {
        this.phrases = this.phrases.filter(p => p.phrase_id !== phraseId);
      },
      error: (err) => console.error('Error deleting phrase:', err)
    });
  }

  searchPhraseOccurrences(phraseId: number): void {
    this.searchingPhrase = phraseId;
    this.legalCasesService.searchPhrase(phraseId).subscribe({
      next: (results) => {
        this.phraseSearchResults[phraseId] = results;
        this.searchingPhrase = null;
      },
      error: (err) => {
        console.error('Error searching phrase:', err);
        this.searchingPhrase = null;
      }
    });
  }

  getPhraseOccurrencesCount(phraseId: number): number {
    const results = this.phraseSearchResults[phraseId];
    return results ? results.length : 0;
  }

  // --- Navigation Methods for Occurrences ---

  private getOccurrenceKey(groupId: number, word: string): string {
    return `${groupId}_${word}`;
  }

  getCurrentIndex(groupId: number, word: string): number {
    const key = this.getOccurrenceKey(groupId, word);
    return this.occurrenceIndices[key] || 0;
  }

  getCurrentOccurrence(groupId: number, word: string): any {
    const results = this.groupSearchResults[groupId];
    if (!results) return null;

    const wordResult = results.find(r => r.word === word);
    if (!wordResult || !wordResult.occurrences) return null;

    const index = this.getCurrentIndex(groupId, word);
    return wordResult.occurrences[index] || wordResult.occurrences[0];
  }

  navigateNext(groupId: number, word: string): void {
    const key = this.getOccurrenceKey(groupId, word);
    const results = this.groupSearchResults[groupId];
    const wordResult = results?.find(r => r.word === word);

    if (wordResult && wordResult.occurrences) {
      const currentIndex = this.occurrenceIndices[key] || 0;
      const maxIndex = wordResult.occurrences.length - 1;

      if (currentIndex < maxIndex) {
        this.occurrenceIndices[key] = currentIndex + 1;
      }
    }
  }

  navigatePrevious(groupId: number, word: string): void {
    const key = this.getOccurrenceKey(groupId, word);
    const currentIndex = this.occurrenceIndices[key] || 0;

    if (currentIndex > 0) {
      this.occurrenceIndices[key] = currentIndex - 1;
    }
  }
}
