import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Project } from '../../../services/browser';

@Component({
  standalone: true,
  selector: 'app-project-list',
  imports: [CommonModule],
  templateUrl: './project-list.html',
  styleUrl: './project-list.css',
})
export class ProjectList {
  @Input() projects: Project[] = []
  @Output() projectSelected = new EventEmitter<Project>();

  onProjectClick(project: Project): void {
    this.projectSelected.emit(project);
  }

  getProjectIcon(type: string): string {
    if (type?.includes('bim360')) return 'BIM';
    if (type?.includes('acc')) return 'ACC';
    return 'PRJ'
  }
}
