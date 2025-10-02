import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';

import { LegalCasesService } from '../../services/legal-cases.service';

@Component({
  selector: 'app-case-upload',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  templateUrl: './case-upload.html',
  styleUrl: './case-upload.scss'
})
export class CaseUploadComponent {
  uploadForm: FormGroup;
  selectedFile: File | null = null;
  uploading = false;
  uploadSuccess = false;
  uploadError = '';
  isDragging = false;

  courtTypes = [
    'בית המשפט העליון',
    'בית משפט מחוזי',
    'בית משפט השלום',
    'בית דין לעבודה',
    'בית המשפט לענייני משפחה',
    'בית משפט צבאי'
  ];

  legalFields = [
    'דיני עבודה',
    'דיני משפחה',
    'נזיקין',
    'דיני חוזים',
    'דיני מקרקעין',
    'דיני חברות',
    'דיני מסים',
    'דיני נזיקין',
    'דיני פשיטת רגל',
    'אחר'
  ];

  partyRoles = ['תובע', 'נתבע', 'מערער', 'משיב'];
  judgeTitles = ['נשיא', 'שופט', 'רשם'];

  constructor(
    private fb: FormBuilder,
    private legalCasesService: LegalCasesService
  ) {
    this.uploadForm = this.fb.group({
      case_number: ['', [Validators.required]],
      case_title: ['', [Validators.required]],
      court_type: ['', [Validators.required]],
      court_location: [''],
      verdict_date: ['', [Validators.required]],
      legal_field: [''],
      judges: this.fb.array([]),
      parties: this.fb.array([])
    });

    // Add initial judge and party
    this.addJudge();
    this.addParty();
  }

  // Judges
  get judges(): FormArray {
    return this.uploadForm.get('judges') as FormArray;
  }

  addJudge(): void {
    const judgeGroup = this.fb.group({
      judge_name: ['', Validators.required],
      judge_title: ['שופט'],
      is_presiding: [false]
    });
    this.judges.push(judgeGroup);
  }

  removeJudge(index: number): void {
    if (this.judges.length > 1) {
      this.judges.removeAt(index);
    }
  }

  // Parties
  get parties(): FormArray {
    return this.uploadForm.get('parties') as FormArray;
  }

  addParty(): void {
    const partyGroup = this.fb.group({
      party_name: ['', Validators.required],
      party_role: ['תובע', Validators.required],
      party_type: ['פרטי']
    });
    this.parties.push(partyGroup);
  }

  removeParty(index: number): void {
    if (this.parties.length > 1) {
      this.parties.removeAt(index);
    }
  }

  // File handling
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'text/plain'];
      if (!validTypes.includes(file.type)) {
        this.uploadError = 'סוג קובץ לא נתמך. יש להעלות קובץ PDF או TXT בלבד.';
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        this.uploadError = 'הקובץ גדול מדי. גודל מקסימלי: 10MB';
        return;
      }

      this.selectedFile = file;
      this.uploadError = '';
    }
  }

  removeFile(): void {
    this.selectedFile = null;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      const fakeEvent = { target: { files: [file] } };
      this.onFileSelected(fakeEvent);
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Form submission
  onSubmit(): void {
    if (this.uploadForm.invalid) {
      this.uploadError = 'נא למלא את כל השדות הנדרשים';
      return;
    }

    if (!this.selectedFile) {
      this.uploadError = 'נא להעלות קובץ פסק דין';
      return;
    }

    this.uploading = true;
    this.uploadError = '';
    this.uploadSuccess = false;

    // Prepare form data
    const formData = new FormData();
    formData.append('file', this.selectedFile);

    // Add form values as JSON
    const caseData = {
      ...this.uploadForm.value,
      verdict_date: this.formatDate(this.uploadForm.value.verdict_date)
    };
    formData.append('data', JSON.stringify(caseData));

    // Call API
    this.legalCasesService.createCase(formData).subscribe({
      next: (response) => {
        this.uploading = false;
        this.uploadSuccess = true;
        this.uploadError = '';

        // Reset form after 2 seconds
        setTimeout(() => {
          this.resetForm();
        }, 2000);
      },
      error: (error) => {
        this.uploading = false;
        this.uploadSuccess = false;
        this.uploadError = 'שגיאה בהעלאת פסק הדין. נא לנסות שוב.';
        console.error('Upload error:', error);
      }
    });
  }

  formatDate(date: Date): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  resetForm(): void {
    this.uploadForm.reset();
    this.selectedFile = null;
    this.uploadSuccess = false;
    this.uploadError = '';

    // Clear arrays and add initial items
    while (this.judges.length > 0) {
      this.judges.removeAt(0);
    }
    while (this.parties.length > 0) {
      this.parties.removeAt(0);
    }
    this.addJudge();
    this.addParty();
  }
}
