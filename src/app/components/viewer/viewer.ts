import { ActivatedRoute } from '@angular/router';
import { TranslationService, ViewerData } from './../../services/translation';
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';

declare const Autodesk: any;

@Component({
  standalone: true,
  selector: 'app-viewer',
  imports: [DatePipe],
  templateUrl: './viewer.html',
  styleUrl: './viewer.css',
})
export class Viewer implements OnInit, OnDestroy {
  @ViewChild('viewerContainer', { static: true }) viewerContainer!: ElementRef;

  viewerData: ViewerData | null = null;
  isLoading = true;
  error: string | null = null;
  private viewer: any = null;
  private currentDoc: any = null;
  viewables3D: any[] = [];
  viewables2D: any[] = [];
  activeTab: '3d' | '2d' = '3d';
  activeViewIndex = 0;
  showSharePanel = false;
  shareUrl: string | null = null;
  shareExpiry: number = 0;
  isGeneratingShare = false;
  shareError: string | null = null;
  copied = false;

  constructor(
    private route: ActivatedRoute,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    const urn = this.route.snapshot.paramMap.get('urn');

    if (urn) {
      const fileName = this.route.snapshot.queryParamMap.get('file_name') || 'Model';
      this.translationService.getAuthViewerData(urn, fileName).subscribe({
      next: (data) => {
        console.log('data received', data);
        console.log('isLoading before set', this.isLoading);
        this.viewerData = data;
        this.isLoading = false;
        console.log('isLoading after set', this.isLoading);
        this.cdr.detectChanges();
        console.log('detectChanges called');
        this.loadViewerSDK(data);
      },
        error: () => {
          this.error = 'Could not load the viewer.';
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    } else if (token) {
      this.translationService.getViewerData(token).subscribe({
        next: (data) => {
          this.viewerData = data;
          this.isLoading = false;
          this.cdr.detectChanges();
          this.loadViewerSDK(data);
        },
        error: (err) => {
          if (err.status === 404) {
            this.error = 'This link does not exist or has been removed.';
          } else if (err.status === 410) {
            this.error = 'This link has expired.';
          } else {
            this.error = 'Could not load the viewer.';
          }
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.error = 'Invalid viewer link.';
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  loadViewerSDK(data: ViewerData): void {
    if (typeof Autodesk !== 'undefined') {
      this.initializeViewer(data);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js';
    script.onload = () => this.initializeViewer(data);
    document.head.appendChild(script);

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css';
    document.head.appendChild(link);
  }

  initializeViewer(data: ViewerData): void {
    const options = {
      env: 'AutodeskProduction2',
      api: 'streamingV2',
      getAccessToken: (callback: (token: string, expires: number) => void) => {
        callback(data.token, 3600);
      }
    };

    Autodesk.Viewing.Initializer(options, () => {
      const container = this.viewerContainer.nativeElement;
      this.viewer = new Autodesk.Viewing.GuiViewer3D(container);
      this.viewer.start();
      this.viewer.setTheme('light-theme');

      const apsUrn = atob(data.urn.replace(/-/g, '+').replace(/_/g, '/'));
      const documentId = `urn:${apsUrn}`;

      Autodesk.Viewing.Document.load(
        documentId,
        (doc: any) => {
          const root = doc.getRoot();
          const viewables3D = root.search({ type: 'geometry', role: '3d' });
          const viewables2D = root.search({ type: 'geometry', role: '2d' });

          this.currentDoc = doc;
          this.viewables3D = viewables3D;
          this.viewables2D = viewables2D;

          const defaultView = viewables3D[0] || viewables2D[0] || root.getDefaultGeometry();

          this.viewer.loadDocumentNode(doc, defaultView).then(() => {
            this.loadExtensions();
            this.viewer.addEventListener(
              Autodesk.Viewing.GEOMETRY_LOADED_EVENT,
              () => {
                const modelStructure = this.viewer.getExtension('Autodesk.ModelStructure');
                if (modelStructure) modelStructure.activate();

                const propertiesPanel = this.viewer.getExtension('Autodesk.PropertiesManager');
                if (propertiesPanel) propertiesPanel.activate();
              }
            );
            this.cdr.detectChanges();
          });
        },
        (errorCode: number) => {
          this.error = `Failed to load model (error ${errorCode})`;
          this.cdr.detectChanges();
        }
      );
    });
  }

  loadExtensions(): void {
    const extensions = [
      'Autodesk.ModelStructure',
      'Autodesk.PropertiesManager',
      'Autodesk.Measure',
      'Autodesk.Section',
      'Autodesk.Explode',
      'Autodesk.ViewCubeUi',
      'Autodesk.FullScreen',
      'Autodesk.BimWalk'
    ];

    Promise.all(
      extensions.map(ext =>
        this.viewer.loadExtension(ext).catch((err: any) => {
          console.warn(`Could not load extension ${ext}:`, err);
        })
      )
    );
  }

  ngOnDestroy(): void {
    if (this.viewer) {
      this.viewer.finish();
      this.viewer = null;
    }
  }

  loadView(viewable: any, index: number, tab: '3d' | '2d'): void {
    if (!this.currentDoc || !this.viewer) return;
    this.activeViewIndex = index;
    this.activeTab = tab;
    this.cdr.detectChanges();

    this.viewer.loadDocumentNode(this.currentDoc, viewable).then(() => {
      this.loadExtensions();
    });
  }

  onShareToggle(): void {
    this.showSharePanel = !this.showSharePanel;
    this.shareUrl = null;
    this.shareError = null;
    this.copied = false;
    this.shareExpiry = 0;
    this.cdr.detectChanges();
  }

  onGenerateShare(): void {
    if (!this.viewerData) return;
    this.isGeneratingShare = true;
    this.shareError = null;
    this.cdr.detectChanges();

    this.translationService.share(
      this.viewerData.urn,
      this.viewerData.file_name,
      this.shareExpiry
    ).subscribe({
      next: (result) => {
        this.shareUrl = result.url;
        this.isGeneratingShare = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.shareError = 'Could not generate share link.';
        this.isGeneratingShare = false;
        this.cdr.detectChanges();
      }
    });
  }

  onCopy(): void {
    if (!this.shareUrl) return;
    navigator.clipboard.writeText(this.shareUrl).then(() => {
      this.copied = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.copied = false;
        this.showSharePanel = false;
        this.cdr.detectChanges();
      }, 1500);
    });
  }
}