import { Component, forwardRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { brDateToIso, isoToBrDate, maskBrDateInput, toDateInputValue } from '../utils/date-input.util';

@Component({
  selector: 'app-date-input',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="sig-date-input">
      <input
        type="text"
        inputmode="numeric"
        autocomplete="off"
        placeholder="DD/MM/AAAA"
        maxlength="10"
        [attr.aria-label]="ariaLabel || 'Data'"
        [disabled]="disabled"
        [value]="display"
        (input)="onType($event)"
        (blur)="onBlur()"
        class="sig-date-input__field mt-1 w-full px-3 py-2 border rounded-md text-sm"
      />
      <input
        type="date"
        class="sig-date-input__picker"
        tabindex="-1"
        aria-hidden="true"
        [disabled]="disabled"
        [value]="iso"
        (change)="onPicker($event)"
      />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
        width: 100%;
      }

      .sig-date-input {
        position: relative;
        min-width: 0;
        width: 100%;
      }

      .sig-date-input__field {
        box-sizing: border-box;
        padding-right: 2.35rem;
      }

      .sig-date-input__picker {
        position: absolute;
        top: 0;
        right: 0;
        width: 2.25rem;
        height: 100%;
        margin: 0;
        padding: 0;
        border: 0;
        opacity: 0.01;
        cursor: pointer;
      }

      .sig-date-input__picker::-webkit-calendar-picker-indicator {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        cursor: pointer;
        opacity: 0;
      }

      .sig-date-input::after {
        content: '\\f073';
        font-family: 'Font Awesome 5 Free';
        font-weight: 900;
        position: absolute;
        top: 50%;
        right: 0.7rem;
        transform: translateY(-50%);
        font-size: 0.8rem;
        color: var(--sig-text-muted, #64748b);
        pointer-events: none;
      }
    `,
  ],
})
export class DateInputComponent implements ControlValueAccessor {
  @Input() ariaLabel = '';

  display = '';
  iso = '';
  disabled = false;

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: unknown): void {
    this.iso = toDateInputValue(value);
    this.display = isoToBrDate(this.iso);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onType(event: Event): void {
    const el = event.target as HTMLInputElement;
    this.display = maskBrDateInput(el.value);
    el.value = this.display;

    if (this.display.length === 10) {
      const next = brDateToIso(this.display);
      this.iso = next;
      this.onChange(next || null);
    } else if (!this.display) {
      this.iso = '';
      this.onChange(null);
    }
  }

  onBlur(): void {
    this.onTouched();
    if (!this.display) {
      this.iso = '';
      this.onChange(null);
      return;
    }
    const next = brDateToIso(this.display);
    if (next) {
      this.iso = next;
      this.display = isoToBrDate(next);
      this.onChange(next);
    } else {
      // Mantém o que o utilizador escreveu, mas não propaga ISO inválido
      this.iso = '';
      this.onChange(null);
    }
  }

  onPicker(event: Event): void {
    const next = toDateInputValue((event.target as HTMLInputElement).value);
    this.iso = next;
    this.display = isoToBrDate(next);
    this.onChange(next || null);
    this.onTouched();
  }
}
