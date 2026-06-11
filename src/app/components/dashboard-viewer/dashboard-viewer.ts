// src/app/components/dashboard-viewer/dashboard-viewer.ts

import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectorRef, Component, ElementRef, EventEmitter, Input,
  OnChanges, OnDestroy, Output, SimpleChanges, ViewChild
} from '@angular/core';

declare const Autodesk: any;

export interface ViewerTarget {
  urn:        string;
  pushpin: {
    location:      { x: number; y: number; z: number } | null;
    objectId:      number | null;
    viewable_guid: string | null;
    seed_urn:      string | null;
  } | null;
  issueTitle: string;
}

@Component({
  standalone: true,
  selector:   'app-dashboard-viewer',
  imports:    [],
  templateUrl: './dashboard-viewer.html',
  styleUrl:    './dashboard-viewer.css'
  // No OnPush here — it was causing the double-fire with markForCheck()
})
export class DashboardViewer implements OnChanges, OnDestroy {

  @ViewChild('viewerContainer', { static: true })
  viewerContainer!: ElementRef;

  @Input() target: ViewerTarget | null = null;

  @Output() viewerClosed = new EventEmitter<void>();

  isVisible        = false;
  isLoading        = false;
  error: string | null = null;
  activeIssueTitle = '';

  private viewer:      any    = null;
  private currentUrn:  string = '';
  private sdkLoaded          = false;
  private accessToken        = '';

  constructor(
    private http: HttpClient,
    private cdr:  ChangeDetectorRef
  ) {}

  // ── Input changes ──────────────────────────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    const change = changes['target'];
    if (!change || !this.target) return;

    // Skip if the URN hasn't actually changed — prevents double firing
    if (change.previousValue?.urn === change.currentValue?.urn) return;

    this.isVisible        = true;
    this.activeIssueTitle = this.target.issueTitle;
    this.error            = null;

    if (!this.sdkLoaded) {
      this.bootstrap();
    } else if (this.target.urn !== this.currentUrn) {
      this.loadModel(this.target.urn);
    } else {
      this.flyToPushpin(this.target.pushpin);
    }
  }

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  private bootstrap(): void {
    this.isLoading = true;

    this.http.get<{ access_token: string }>(
      '/api/v1/auth/viewer-token',
      { withCredentials: true }
    ).subscribe({
      next: (response) => {
        this.accessToken = response.access_token;
        this.loadSdk();
      },
      error: () => {
        this.error     = 'Could not fetch viewer token.';
        this.isLoading = false;
      }
    });
  }

  // ── SDK Loading ────────────────────────────────────────────────────────────

  private loadSdk(): void {
    if (document.querySelector('#aps-viewer-sdk')) {
      this.onSdkReady();
      return;
    }

    const link  = document.createElement('link');
    link.rel    = 'stylesheet';
    link.href   = 'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css';
    document.head.appendChild(link);

    const script    = document.createElement('script');
    script.id       = 'aps-viewer-sdk';
    script.src      = 'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js';
    script.onload   = () => this.onSdkReady();
    script.onerror  = () => {
      this.error     = 'Failed to load viewer SDK.';
      this.isLoading = false;
    };
    document.head.appendChild(script);
  }

  private onSdkReady(): void {
    const options = {
      env: 'AutodeskProduction2',
      api: 'streamingV2',
      getAccessToken: (callback: (token: string, expires: number) => void) => {
        callback(this.accessToken, 3600);
      }
    };

    Autodesk.Viewing.Initializer(options, () => {
      const container = this.viewerContainer.nativeElement;
      this.viewer     = new Autodesk.Viewing.GuiViewer3D(container);
      this.viewer.start();
      this.viewer.setTheme('light-theme');
      this.sdkLoaded = true;

      this.loadModel(this.target!.urn);
    });
  }

  // ── Model Loading ──────────────────────────────────────────────────────────
  private loadModel(urn: string): void {
    this.isLoading = true;

    // Use seed_urn from viewerState if available — it's already base64-encoded
    // Fall back to base64-encoding the lineage URN
    const seedUrn    = this.target?.pushpin?.seed_urn;
    const documentId = seedUrn ? `urn:${seedUrn}` : `urn:${btoa(urn)}`;

    Autodesk.Viewing.Document.load(
      documentId,
      (doc: any)          => this.onDocumentLoaded(doc, urn),
      (errorCode: number) => {
        this.error     = `Failed to load model (error ${errorCode}).`;
        this.isLoading = false;
      }
    );
  }

  private onDocumentLoaded(doc: any, urn: string): void {
    const root = doc.getRoot();
    const guid = this.target?.pushpin?.viewable_guid;

    let viewable;
    if (guid) {
      viewable = root.search({ guid })[0];
    }
    viewable = viewable
      ?? root.search({ type: 'geometry', role: '3d' })[0]
      ?? root.getDefaultGeometry();

    this.viewer.loadDocumentNode(doc, viewable).then(() => {
      this.currentUrn = urn;
      this.isLoading  = false;
      this.cdr.detectChanges();
      this.viewer.addEventListener(
        Autodesk.Viewing.GEOMETRY_LOADED_EVENT,
        () => this.flyToPushpin(this.target?.pushpin ?? null),
        { once: true }
      );
    });
  }

  // ── Camera ─────────────────────────────────────────────────────────────────

  private flyToPushpin(pushpin: ViewerTarget['pushpin']): void {
    if (!this.viewer || !pushpin) return;

    if (pushpin.objectId != null) {
      this.viewer.isolate([pushpin.objectId]);
      this.viewer.fitToView([pushpin.objectId]);
      return;
    }

    if (pushpin.location) {
      const { x, y, z } = pushpin.location;
      const pos    = new Autodesk.Viewing.THREE.Vector3(x, y, z);
      const offset = new Autodesk.Viewing.THREE.Vector3(x + 5, y + 5, z + 5);
      this.viewer.navigation.setTarget(pos);
      this.viewer.navigation.setPosition(offset);
    }
  }

  // ── Controls ───────────────────────────────────────────────────────────────

  closeViewer(): void {
    this.isVisible = false;
    if (this.viewer) this.viewer.isolate([]);
    this.viewerClosed.emit();
  }

  resetView(): void {
    if (this.viewer) this.viewer.isolate([]);
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  ngOnDestroy(): void {
    if (this.viewer) {
      this.viewer.finish();
      this.viewer = null;
    }
  }
}