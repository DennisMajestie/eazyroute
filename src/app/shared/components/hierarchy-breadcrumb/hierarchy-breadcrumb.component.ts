import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-hierarchy-breadcrumb',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hierarchy-breadcrumb.component.html',
  styleUrls: ['./hierarchy-breadcrumb.component.scss']
})
export class HierarchyBreadcrumbComponent {
  @Input() area?: string;
  @Input() locality?: string;
  @Input() anchor?: string;
  @Input() microNode?: string;

  get breadcrumbItems(): string[] {
    const items: string[] = [];
    if (this.area) items.push(this.area);
    if (this.locality) items.push(this.locality);
    if (this.anchor) items.push(this.anchor);
    if (this.microNode) items.push(this.microNode);
    return items;
  }
}
