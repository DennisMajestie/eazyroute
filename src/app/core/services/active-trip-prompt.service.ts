import { Injectable, signal } from '@angular/core';

export type ActiveTripPromptChoice = 'resume' | 'cancel' | 'continue';

export interface ActiveTripPromptData {
    tripId: string;
    destination?: string;
    startedAt?: string;
    status?: string;
    raw?: any;
}

@Injectable({
    providedIn: 'root'
})
export class ActiveTripPromptService {
    public activeTrip = signal<ActiveTripPromptData | null>(null);
    private resolveSelection?: (choice: ActiveTripPromptChoice) => void;

    prompt(activeTrip: ActiveTripPromptData): Promise<ActiveTripPromptChoice> {
        if (this.resolveSelection) {
            this.resolveSelection('continue');
        }

        this.activeTrip.set(activeTrip);

        return new Promise<ActiveTripPromptChoice>((resolve) => {
            this.resolveSelection = (choice: ActiveTripPromptChoice) => {
                this.activeTrip.set(null);
                this.resolveSelection = undefined;
                resolve(choice);
            };
        });
    }

    resolve(choice: ActiveTripPromptChoice): void {
        if (this.resolveSelection) {
            this.resolveSelection(choice);
        }
    }
}
