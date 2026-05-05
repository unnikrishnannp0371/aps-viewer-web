import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FolderItem } from '../../services/browser';
import { ShareResponse, TranslationService } from '../../services/translation';

type DialogStatus = 'checking' | 'ready' | 'generating' | 'done' | 'error'

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
    this.checkTranslationStatus();
  }

  progress = '';
  private pollCount = 0;
  private maxPolls = 30;
  checkTranslationStatus(): void {
    this.pollCount++;

    if (this.pollCount > this.maxPolls) {
      this.state = 'error';
      this.errorMessage = 'Translation is taking too long. Please try again later.';
      this.cdr.detectChanges();
      return;
    }

    this.state = 'checking';

    if (!this.file.tip_urn) {
      this.state = 'error';
      this.errorMessage = 'This file has no translation available.';
      this.cdr.detectChanges();
      return;
    }

    this.translationService.checkStatus(this.file.tip_urn!).subscribe({
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
      this.file.tip_urn!,
      this.file.name,
      this.expiresInDays
    ).subscribe({
      next: (result) => {
        this.shareResult = result;
        this.state = 'done';
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
}
