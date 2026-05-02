import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Folder, FolderItem } from '../../../services/browser';

@Component({
  standalone: true,
  selector: 'app-folder-list',
  imports: [CommonModule],
  templateUrl: './folder-list.html',
  styleUrl: './folder-list.css',
})
export class FolderList {
  @Input() items: (Folder | FolderItem)[] = [];
  @Input() level: 'folders' | 'contents' = 'folders'
  @Input() selectedFile: FolderItem | null = null;
  @Input() projectId: string = '';
  @Output() folderSelected = new EventEmitter<Folder>();
  @Output() fileSelected = new EventEmitter<FolderItem>();

  isFolder(item: Folder | FolderItem): boolean {
    return item.type?.toLowerCase().includes('folder');
  }

  // ts union type one or the other
  onItemClick(item: Folder | FolderItem): void {
    if (this.isFolder(item)) {
      const asFolderItem = item as FolderItem;
      const asFolder = item as Folder;

      // If content_id exists, this is a subfolder from contents API
      // Use content_id as the folder_id for the next API call
      const folderId = asFolderItem.content_id
        ? asFolderItem.content_id
        : asFolder.folder_id;

      const folder: Folder = {
        folder_id: folderId,
        project_id: this.projectId,
        name: item.name,
        type: item.type
      };

      this.folderSelected.emit(folder);
    } else {
      this.fileSelected.emit(item as FolderItem);
    }
  }

  isSelected(item: Folder | FolderItem): boolean {
    if (!this.selectedFile) return false;
    if (this.isFolder(item)) return false;
    return (item as FolderItem).content_id === this.selectedFile.content_id
  }

  getFileExtension(name: string): string {
    if(!name) return '?';
    const parts = name.split('.');
    if (parts.length < 2) return '?';
    return parts[parts.length - 1].toUpperCase().slice(0, 3)
  }

  getItemName(item: Folder | FolderItem): string {
    return item.name || 'Unnamed';
  }
}
