// src/app/components/dashboard-viewer/dashboard-viewer.ts

import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectorRef, Component, ElementRef, Input,
  OnChanges, OnDestroy, SimpleChanges, ViewChild
} from '@angular/core';

declare const Autodesk: any;

export interface ViewerTarget {
  urn:        string;
  pushpin: {
    location: { x: number; y: number; z: number } | null;
    objectId: number | null;
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
        // Bug 1 fix: Rails returns access_token (snake_case), not accessToken
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

    // The APS Viewer Document.load expects: "urn:<base64url_encoded_raw_urn>"
    // The raw URN from ACC looks like: "urn:adsk.wipprod:dm.lineage:KrzcyB5IQc2AWj06-w0xKQ"
    // We must Base64 encode the entire raw URN, then prefix with "urn:"
    // btoa() does standard Base64 — viewer accepts both standard and URL-safe
    const encoded    = btoa(urn);
    const documentId = `urn:${encoded}`;

    console.log('Raw URN:', urn);
    console.log('Document ID:', documentId);

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
    const root     = doc.getRoot();
    const viewable = root.search({ type: 'geometry', role: '3d' })[0]
                  ?? root.getDefaultGeometry();

    this.viewer.loadDocumentNode(doc, viewable).then(() => {
      this.currentUrn = urn;
      this.isLoading  = false;

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