import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Hub } from '../../../services/browser';

@Component({
  standalone: true,
  selector: 'app-hub-list',
  imports: [CommonModule],
  templateUrl: './hub-list.html',
  styleUrl: './hub-list.css',
})
export class HubList {
  @Input() hubs: Hub[] = [];
  @Output() hubSelected = new EventEmitter<Hub>();

  onHubClick(hub: Hub): void {
    this.hubSelected.emit(hub);
  }

  getHubIcon(type: string): string {
    if (type?.includes('bim360')) return 'BIM';
    if (type?.includes('acc')) return 'ACC';
    return 'HUB'
  }
}
