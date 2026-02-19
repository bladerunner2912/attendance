import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-prompt',
  imports: [CommonModule],
  templateUrl: './prompt.html',
  styleUrl: './prompt.css',
})
export class Prompt {
  @Input() isOpen = false;
  @Input() title = 'Confirm';
  @Input() message = '';
  @Input() confirmText = 'Confirm';
  @Input() cancelText = 'Cancel';
  @Input() disabled = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm() {
    if (this.disabled) {
      return;
    }
    this.confirmed.emit();
  }

  onCancel() {
    if (this.disabled) {
      return;
    }
    this.cancelled.emit();
  }
}
