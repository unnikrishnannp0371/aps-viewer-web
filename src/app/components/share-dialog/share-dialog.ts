import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FolderItem } from '../../services/browser';
import { ShareResponse, TranslationService, Version } from '../../services/translation';

type DialogStatus = 'checking' | 'versions' | 'ready' | 'generating' | 'done' | 'error'

@Component({
  standalone: true,
  selector: 'app-share-dialog',
  imports: [CommonModule],
  templateUrl: './share-dialog.html',
  styleUrl: './share-dialog.css',
})
export class ShareDialog implements OnInit{
  @Input() file!: FolderItem
  @Output () closed = new EventEmitter<void>();

  state: DialogStatus = 'checking'
  expiresInDays = 30;
  shareResult: ShareResponse | null = null;
  errorMessage = '';
  copied = false;
  progress = '';
  private pollCount = 0;
  private maxPolls = 30;

  versions: Version[] = [];
  selectedVersion: Version | null = null;
  selectedUrn: string | null = null;

  expiryOptions: {label: string, value: number}[] = [
    { label: '7 days', value: 7 },
    { label: '30 days', value: 30 },
    { label: '90 days', value: 90 }
  ];

  constructor(
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadVersions();
  }

  loadVersions(): void {
    this.state = 'checking';

    this.translationService.getVersions(
      this.file.project_id,
      this.file.content_id
    ).subscribe({
      next: (fetchedVersions) => {
        this.versions = fetchedVersions

        if (fetchedVersions.length === 1){
          this.selectedVersion = fetchedVersions[0];
          this.selectedUrn = fetchedVersions[0].version_urn
          this.checkTranslationStatus();
        } else {
          this.state = 'versions';
          this.cdr.detectChanges();
        }
      },
      error: () => {
        if (this.file.tip_urn) {
          this.selectedUrn = this.file.tip_urn;
          this.checkTranslationStatus();
        } else {
          this.errorMessage = 'Could not load file versions'
          this.state = 'error'
          this.cdr.detectChanges();
        }
      },
    })
  }

  onVersionSelect(version: Version): void {
    this.selectedVersion = version;
    this.selectedUrn = version.version_urn
    this.checkTranslationStatus();
  }

  checkTranslationStatus(): void {
    this.pollCount++;

    if (this.pollCount > this.maxPolls) {
      this.state = 'error';
      this.errorMessage = 'Translation is taking too long. Please try again later.';
      this.cdr.detectChanges();
      return;
    }

    this.state = 'checking';

    if (!this.selectedUrn) {
      this.state = 'error';
      this.errorMessage = 'This file has no translation available.';
      this.cdr.detectChanges();
      return;
    }

    this.translationService.checkStatus(this.selectedUrn!).subscribe({
      next: (status) => {
        if (status.status === 'success') {
          this.state = 'ready';
          this.progress = '';
        } else if (status.status === 'inprogress') {
          this.progress = status.progress;
          this.cdr.detectChanges();
          setTimeout(() => this.checkTranslationStatus(), 10000);
        } else {
          this.state = 'error';
          this.errorMessage = 'Translation failed. Please try again.';
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.state = 'error';
        this.errorMessage = 'Could not check translation status.';
        this.cdr.detectChanges();
      }
    });
  }

  onExpirySelect(days: number): void {
    this.expiresInDays = Number(days)
  }

  onGenerate(): void {
    this.state = 'generating';
    this.translationService.share(
      this.selectedUrn!,
      this.file.name,
      this.expiresInDays
    ).subscribe({
      next: (result) => {
        this.shareResult = result;
        this.state = 'done';
        window.open(result.url, '_blank')
        this.closed.emit();
        this.cdr.detectChanges();
      },
      error: () => {
        this.state = 'error';
        this.errorMessage = 'Could not generate share link.';
        this.cdr.detectChanges();
      }
    });
  }

  onCopy(): void {
    if (!this.shareResult) return;
    navigator.clipboard.writeText(this.shareResult.url).then(() => {
      this.copied = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.copied = false;
        this.cdr.detectChanges();
      }, 2000);
    });
  }

  onClose(): void {
    this.closed.emit();
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatVersionDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
}
