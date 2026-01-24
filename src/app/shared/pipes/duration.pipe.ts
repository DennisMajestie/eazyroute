import { Pipe, PipeTransform } from '@angular/core';

/**
 * DurationPipe - Format minutes to human-readable duration
 * Usage: {{ 90 | duration }} => 1h 30m
 */
@Pipe({
    name: 'duration',
    standalone: true
})
export class DurationPipe implements PipeTransform {
    transform(minutes: number | null | undefined, format: 'short' | 'long' = 'short'): string {
        if (minutes === null || minutes === undefined || minutes < 0) {
            return '0m';
        }

        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);

        if (format === 'long') {
            if (hours === 0) {
                return `${mins} minute${mins !== 1 ? 's' : ''}`;
            }
            if (mins === 0) {
                return `${hours} hour${hours !== 1 ? 's' : ''}`;
            }
            return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
        }

        // Short format
        if (hours === 0) {
            return `${mins}m`;
        }
        if (mins === 0) {
            return `${hours}h`;
        }
        return `${hours}h ${mins}m`;
    }
}
