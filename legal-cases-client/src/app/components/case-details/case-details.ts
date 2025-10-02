import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';

import { LegalCasesService } from '../../services/legal-cases.service';
import { LegalCase, Judge, Party } from '../../models/legal-case.model';

@Component({
  selector: 'app-case-details',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTabsModule
  ],
  templateUrl: './case-details.html',
  styleUrl: './case-details.scss'
})
export class CaseDetails implements OnInit {
  caseId: number | null = null;
  legalCase: LegalCase | null = null;
  judges: Judge[] = [];
  parties: Party[] = [];
  caseText: string = '';
  loading = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private legalCasesService: LegalCasesService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.caseId = +params['id'];
      if (this.caseId) {
        this.loadCaseDetails();
      }
    });
  }

  loadCaseDetails(): void {
    if (!this.caseId) return;

    this.loading = true;
    this.error = '';

    // Load case details
    this.legalCasesService.getCase(this.caseId).subscribe({
      next: (caseData: LegalCase) => {
        this.legalCase = caseData;
        this.loadJudges();
        this.loadParties();
        this.loadCaseText();
      },
      error: (err: any) => {
        this.loading = false;
        this.error = 'שגיאה בטעינת פרטי התיק';
        console.error('Error loading case:', err);
      }
    });
  }

  loadJudges(): void {
    if (!this.caseId) return;

    this.legalCasesService.getCaseJudges(this.caseId).subscribe({
      next: (judges) => {
        this.judges = judges;
      },
      error: (err) => {
        console.error('Error loading judges:', err);
      }
    });
  }

  loadParties(): void {
    if (!this.caseId) return;

    this.legalCasesService.getCaseParties(this.caseId).subscribe({
      next: (parties) => {
        this.parties = parties;
      },
      error: (err) => {
        console.error('Error loading parties:', err);
      }
    });
  }

  loadCaseText(): void {
    if (!this.caseId) return;

    this.legalCasesService.getCaseText(this.caseId).subscribe({
      next: (text) => {
        this.caseText = text;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        console.error('Error loading case text:', err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/search']);
  }

  printCase(): void {
    window.print();
  }

  getPresidingJudge(): Judge | undefined {
    return this.judges.find(j => j.is_presiding);
  }

  getPartyRole(role: string): string {
    const roles: { [key: string]: string } = {
      'תובע': 'התובע',
      'נתבע': 'הנתבע',
      'מערער': 'המערער',
      'משיב': 'המשיב'
    };
    return roles[role] || role;
  }
}
