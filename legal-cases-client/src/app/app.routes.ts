import { Routes } from '@angular/router';
import { SearchPage } from './components/search-page/search-page';
import { CaseUploadComponent } from './components/case-upload/case-upload';
import { CaseDetails } from './components/case-details/case-details';
import { LegalTermsGroups } from './components/legal-terms-groups/legal-terms-groups';
import { WordsIndexComponent } from './components/words-index/words-index';

export const routes: Routes = [
  { path: '', redirectTo: '/search', pathMatch: 'full' },
  { path: 'search', component: SearchPage },
  { path: 'case/:id', component: CaseDetails },
  { path: 'upload', component: CaseUploadComponent },
  { path: 'terms', component: LegalTermsGroups },
  { path: 'words-index', component: WordsIndexComponent },
  { path: '**', redirectTo: '/search' }
];
