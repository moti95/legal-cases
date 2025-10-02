import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { LegalCasesService } from '../../services/legal-cases.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface Word {
  word: string;
  total_occurrences: number;
  case_count: number;
  first_appearance_case?: string;
  last_appearance_case?: string;
}

interface WordOccurrence {
  case_id: number;
  case_number: string;
  case_title: string;
  line_number: number;
  paragraph_number: number;
  section_number?: number;
  context?: string;
}

@Component({
  selector: 'app-words-index',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDialogModule,
    MatTooltipModule,
    MatSnackBarModule,
    RouterModule
  ],
  templateUrl: './words-index.html',
  styleUrls: ['./words-index.scss']
})
export class WordsIndexComponent implements OnInit {
  words: Word[] = [];
  filteredWords: Word[] = [];
  displayedWords: Word[] = [];
  selectedWord: Word | null = null;
  wordOccurrences: WordOccurrence[] = [];

  loading = false;
  loadingOccurrences = false;
  searchTerm = '';

  // Pagination
  pageSize = 20;
  pageIndex = 0;
  totalWords = 0;

  // Sorting
  sortField: keyof Word = 'word';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Statistics
  totalUniqueWords = 0;
  totalOccurrences = 0;
  averageOccurrences = 0;

  displayedColumns: string[] = ['word', 'total_occurrences', 'case_count', 'actions'];

  constructor(
    private legalCasesService: LegalCasesService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadAllWords();
  }

  loadAllWords() {
    this.loading = true;
    this.legalCasesService.getAllWords().subscribe({
      next: (words) => {
        this.words = words;
        this.calculateStatistics();
        this.applyFilter();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading words:', error);
        this.snackBar.open('שגיאה בטעינת אינדקס המילים', 'סגור', {
          duration: 3000,
          direction: 'rtl'
        });
        this.loading = false;
      }
    });
  }

  calculateStatistics() {
    this.totalUniqueWords = this.words.length;
    this.totalOccurrences = this.words.reduce((sum, word) => sum + word.total_occurrences, 0);
    this.averageOccurrences = this.totalUniqueWords > 0
      ? Math.round(this.totalOccurrences / this.totalUniqueWords)
      : 0;
  }

  applyFilter() {
    if (!this.searchTerm) {
      this.filteredWords = [...this.words];
    } else {
      const searchLower = this.searchTerm.toLowerCase();
      this.filteredWords = this.words.filter(word =>
        word.word.toLowerCase().includes(searchLower)
      );
    }

    this.totalWords = this.filteredWords.length;
    this.sortWords();
    this.updateDisplayedWords();
  }

  sortWords() {
    this.filteredWords.sort((a, b) => {
      const aValue = a[this.sortField];
      const bValue = b[this.sortField];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return this.sortDirection === 'asc'
          ? aValue.localeCompare(bValue, 'he')
          : bValue.localeCompare(aValue, 'he');
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        return this.sortDirection === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }
      return 0;
    });
  }

  updateDisplayedWords() {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.displayedWords = this.filteredWords.slice(startIndex, endIndex);
  }

  onSort(sort: Sort) {
    this.sortField = sort.active as keyof Word;
    this.sortDirection = sort.direction as 'asc' | 'desc' || 'asc';
    this.sortWords();
    this.updateDisplayedWords();
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updateDisplayedWords();
  }

  viewOccurrences(word: Word) {
    this.selectedWord = word;
    this.loadingOccurrences = true;

    this.legalCasesService.getWordOccurrences(word.word).subscribe({
      next: (occurrences) => {
        this.wordOccurrences = occurrences;
        this.loadingOccurrences = false;
      },
      error: (error) => {
        console.error('Error loading occurrences:', error);
        this.snackBar.open('שגיאה בטעינת המופעים', 'סגור', {
          duration: 3000,
          direction: 'rtl'
        });
        this.loadingOccurrences = false;
      }
    });
  }

  addToWordGroup(word: Word) {
    // This will be implemented when we add the dialog for selecting word group
    this.snackBar.open('הוספת מילה לקבוצה - יפותח בהמשך', 'סגור', {
      duration: 3000,
      direction: 'rtl'
    });
  }

  exportToCSV() {
    const csvContent = this.generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `words_index_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.snackBar.open('האינדקס יוּצא בהצלחה', 'סגור', {
      duration: 3000,
      direction: 'rtl'
    });
  }

  private generateCSV(): string {
    const headers = ['מילה', 'מספר מופעים', 'מספר תיקים'];
    const rows = this.filteredWords.map(word => [
      word.word,
      word.total_occurrences.toString(),
      word.case_count.toString()
    ]);

    const csvRows = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ];

    // Add BOM for proper Hebrew encoding
    return '\ufeff' + csvRows.join('\n');
  }

  clearSearch() {
    this.searchTerm = '';
    this.applyFilter();
  }

  closeOccurrencesPanel() {
    this.selectedWord = null;
    this.wordOccurrences = [];
  }
}