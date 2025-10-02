import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';

import { LegalCasesService } from '../../services/legal-cases.service';
import { SearchResult } from '../../models/legal-case.model';

@Component({
  selector: 'app-search-page',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  templateUrl: './search-page.html',
  styleUrl: './search-page.scss'
})
export class SearchPage implements OnInit {
  searchTerm: string = '';
  phraseSearch: boolean = false;
  loading: boolean = false;
  results: SearchResult[] = [];
  error: string = '';

  // Basic filters (3 only + location search)
  showFilters: boolean = false;
  courtType: string = '';
  caseNumber: string = '';
  dateFrom: string = '';
  dateTo: string = '';
  lineNumber: number | null = null;
  paragraphNumber: number | null = null;

  courtTypes = [
    'בית המשפט העליון',
    'בית משפט מחוזי',
    'בית משפט שלום',
    'בית דין לעבודה',
    'בית משפט צבאי'
  ];

  constructor(private legalCasesService: LegalCasesService) {}

  ngOnInit(): void {
    // Initialize component
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.error = 'נא להזין מונח חיפוש';
      return;
    }

    this.loading = true;
    this.error = '';
    this.results = [];

    this.legalCasesService.search(
      this.searchTerm,
      this.phraseSearch,
      this.courtType || undefined,
      this.caseNumber || undefined,
      this.dateFrom || undefined,
      this.dateTo || undefined,
      this.lineNumber || undefined,
      this.paragraphNumber || undefined
    ).subscribe({
      next: (results) => {
        this.results = results;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'שגיאה בחיפוש. אנא נסה שוב.';
        this.loading = false;
        console.error('Search error:', err);
      }
    });
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.results = [];
    this.error = '';
  }

  clearFilters(): void {
    this.courtType = '';
    this.caseNumber = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.lineNumber = null;
    this.paragraphNumber = null;
  }

  removeFilter(filterName: string): void {
    switch(filterName) {
      case 'courtType': this.courtType = ''; break;
      case 'caseNumber': this.caseNumber = ''; break;
      case 'dateFrom': this.dateFrom = ''; break;
      case 'dateTo': this.dateTo = ''; break;
      case 'lineNumber': this.lineNumber = null; break;
      case 'paragraphNumber': this.paragraphNumber = null; break;
    }
    this.onSearch();
  }

  hasActiveFilters(): boolean {
    return !!(this.courtType || this.caseNumber || this.dateFrom || this.dateTo || this.lineNumber || this.paragraphNumber);
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.courtType) count++;
    if (this.caseNumber) count++;
    if (this.dateFrom || this.dateTo) count++;
    if (this.lineNumber) count++;
    if (this.paragraphNumber) count++;
    return count;
  }
}
