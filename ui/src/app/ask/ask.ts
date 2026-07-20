import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { armadilloApi, ArmadilloApi } from '../electron-api';

@Component({
  selector: 'app-ask',
  imports: [FormsModule, TranslocoPipe],
  templateUrl: './ask.html',
})
export class Ask implements OnInit {
  private api: ArmadilloApi = armadilloApi();

  promptLabel = signal('');
  maxChars = signal(200);
  text = signal('');

  async ngOnInit(): Promise<void> {
    const init = await this.api.getAskInit();
    this.promptLabel.set(init.promptLabel);
    this.maxChars.set(init.maxChars);
    document.title = init.title;
  }

  onInput(value: string): void {
    this.text.set(value.slice(0, this.maxChars()));
  }

  canSubmit(): boolean {
    return this.text().trim().length > 0;
  }

  submit(): void {
    if (!this.canSubmit()) return;
    this.api.askSubmit(this.text().trim());
  }

  cancel(): void {
    this.api.askCancel();
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.submit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.cancel();
    }
  }
}
