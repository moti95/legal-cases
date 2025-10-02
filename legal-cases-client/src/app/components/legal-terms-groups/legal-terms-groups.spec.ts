import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LegalTermsGroups } from './legal-terms-groups';

describe('LegalTermsGroups', () => {
  let component: LegalTermsGroups;
  let fixture: ComponentFixture<LegalTermsGroups>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LegalTermsGroups]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LegalTermsGroups);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
