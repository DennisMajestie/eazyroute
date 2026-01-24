import { Pipe, PipeTransform } from '@angular/core';

/**
 * NairaPipe - Format numbers as Nigerian Naira currency
 * Usage: {{ 1500 | naira }} => ₦1,500
 */
@Pipe({
    name: 'naira',
    standalone: true
})
export class NairaPipe implements PipeTransform {
    transform(value: number | null | undefined, showDecimal = false): string {
        if (value === null || value === undefined) {
            return '₦0';
        }

        const options: Intl.NumberFormatOptions = {
            minimumFractionDigits: showDecimal ? 2 : 0,
            maximumFractionDigits: showDecimal ? 2 : 0
        };

        const formatted = value.toLocaleString('en-NG', options);
        return `₦${formatted}`;
    }
}
