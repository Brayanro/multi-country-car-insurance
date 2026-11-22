import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  Injector,
  input,
  OnChanges,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import { FormControl, FormRecord, ReactiveFormsModule } from '@angular/forms';
import {
  isKindValue,
  validateField,
  type DraftEntry,
  type FieldDefinition,
  type FieldValue,
  type FormDefinition,
} from '@quote/contract';
import type { Subscription } from 'rxjs';
import { QUOTE_CLOCK, QuoteState } from './quote-state';

@Component({
  selector: 'app-details-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './details-form.html',
})
export class DetailsForm implements OnChanges, OnDestroy {
  private readonly store = inject(QuoteState);
  private readonly clock = inject(QUOTE_CLOCK);
  private readonly injector = inject(Injector);
  readonly configuration = input.required<FormDefinition>();
  readonly complete = output<void>();
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly announcement = signal('');
  protected form = new FormRecord<FormControl<FieldValue | null>>({});
  private changes?: Subscription;
  private announcer?: ReturnType<typeof setTimeout>;
  private readonly touched = new Set<string>();
  private readonly badInput = new Set<string>();
  private submitted = false;

  ngOnChanges() {
    this.changes?.unsubscribe();
    this.clearAnnouncement();
    this.errors.set({});
    this.touched.clear();
    this.badInput.clear();
    this.submitted = false;
    const config = this.configuration();
    const draft = this.store.draft(config.country);
    this.form = new FormRecord(
      Object.fromEntries(
        config.fields.map((field) => [
          field.id,
          new FormControl<FieldValue | null>(
            draft[field.id]?.value ?? (field.kind === 'checkbox' ? false : null),
          ),
        ]),
      ),
    );
    this.changes = this.form.valueChanges.subscribe(() => this.save());
  }

  ngOnDestroy() {
    this.changes?.unsubscribe();
    this.clearAnnouncement();
  }

  protected controlId(field: FieldDefinition) {
    return `quote-field-${field.id}`;
  }

  protected description(field: FieldDefinition) {
    const id = this.controlId(field);
    const descriptions = [
      field.helpText && `${id}-help`,
      this.errors()[field.id] && `${id}-error`,
    ].filter(Boolean);
    return descriptions.join(' ') || null;
  }

  protected inputType(field: FieldDefinition) {
    if (field.kind === 'date') return field.kind;
    return field.rules.some((rule) => rule.operator === 'email') ? 'email' : 'text';
  }

  protected onInput(field: FieldDefinition, event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.validity.badInput) this.badInput.add(field.id);
    else this.badInput.delete(field.id);
    if (this.touched.has(field.id) || this.submitted) this.recheck(field, true);
  }

  protected onBlur(field: FieldDefinition) {
    this.touched.add(field.id);
    this.recheck(field, true);
  }

  protected submit(event: Event) {
    event.preventDefault();
    this.submitted = true;
    this.clearAnnouncement();
    const fields = this.configuration().fields;
    const now = this.clock();
    const entries = fields.flatMap((field) => {
      const error = this.fieldError(field, now);
      return error ? [[field.id, error] as const] : [];
    });
    this.errors.set(Object.fromEntries(entries));
    if (entries.length) {
      afterNextRender(() => document.getElementById(`quote-field-${entries[0][0]}`)?.focus(), {
        injector: this.injector,
      });
      return;
    }
    this.save();
    this.complete.emit();
  }

  private save() {
    const config = this.configuration();
    const draft = Object.fromEntries(
      config.fields.map((field) => {
        const raw = this.form.controls[field.id].value;
        const value = raw === '' || !isKindValue(field.kind, raw) ? null : raw;
        return [field.id, { kind: field.kind, value } satisfies DraftEntry];
      }),
    );
    this.store.save(config.country, draft);
  }

  private fieldError(field: FieldDefinition, now: Date) {
    if (this.badInput.has(field.id)) return field.errorMessage;
    return validateField(field, this.form.controls[field.id].value, now)[0];
  }

  private recheck(field: FieldDefinition, announce: boolean) {
    const before = this.errors()[field.id];
    const error = this.fieldError(field, this.clock());
    if (before === error) return;
    this.errors.update((current) => {
      const next = { ...current };
      if (error) next[field.id] = error;
      else delete next[field.id];
      return next;
    });
    if (announce) {
      this.clearAnnouncement();
      if (error)
        this.announcer = setTimeout(() => this.announcement.set(`${field.label}: ${error}`), 250);
    }
  }

  private clearAnnouncement() {
    clearTimeout(this.announcer);
    this.announcement.set('');
  }
}
