import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BreadcrumbItem } from '../../../services/browser';

@Component({
  standalone: true,
  selector: 'app-breadcrumb',
  imports: [CommonModule],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.css',
})
export class Breadcrumb {
  @Input() breadcrumbs: BreadcrumbItem[] = [];
  @Output() breadcrumbClick = new EventEmitter<BreadcrumbItem>();

  onCrumbClick(crumb: BreadcrumbItem): void {
    this.breadcrumbClick.emit(crumb)
  }
}
