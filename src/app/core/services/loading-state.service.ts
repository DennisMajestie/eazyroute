import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * UI State Types for ALONG Framework
 */
export type UIState =
    | 'initial_loading'
    | 'partial_data_loaded'
    | 'success_complete'
    | 'soft_failure_uncertainty'
    | 'hard_failure_error'
    | 'idle';

export type LoadingPhase =
    | 'cold_start'
    | 'progressive_reveal'
    | 'route_ready'
    | 'low_confidence'
    | 'recovery_mode'
    | 'none';

export interface LoadingStateData {
    state: UIState;
    phase: LoadingPhase;
    progress: number; // 0-100
    message: string;
    secondaryMessage?: string;
    showSkeleton: boolean;
    showProgress: boolean;
    confidence?: number; // 0-1
    hasPartialData: boolean;
    errorType?: 'no_corridor' | 'network_failure' | 'api_timeout' | 'data_unavailable';
}

@Injectable({
    providedIn: 'root'
})
export class LoadingStateService {
    private stateSubject = new BehaviorSubject<LoadingStateData>({
        state: 'idle',
        phase: 'none',
        progress: 0,
        message: '',
        showSkeleton: false,
        showProgress: false,
        hasPartialData: false
    });

    public state$: Observable<LoadingStateData> = this.stateSubject.asObservable();

    constructor() { }

    /**
     * Get current state
     */
    getCurrentState(): LoadingStateData {
        return this.stateSubject.value;
    }

    /**
     * Set initial loading state
     */
    setInitialLoading(message: string = 'Finding nearby landmarks...') {
        this.stateSubject.next({
            state: 'initial_loading',
            phase: 'cold_start',
            progress: 0,
            message,
            showSkeleton: true,
            showProgress: true,
            hasPartialData: false
        });
    }

    /**
     * Update progress during loading
     */
    updateProgress(progress: number, message?: string) {
        const current = this.stateSubject.value;
        this.stateSubject.next({
            ...current,
            progress,
            message: message || current.message
        });
    }

    /**
     * Set partial data loaded state
     */
    setPartialDataLoaded(message: string = 'This part is clear...', secondaryMessage?: string) {
        this.stateSubject.next({
            state: 'partial_data_loaded',
            phase: 'progressive_reveal',
            progress: 60,
            message,
            secondaryMessage,
            showSkeleton: true,
            showProgress: true,
            hasPartialData: true
        });
    }

    /**
     * Set success state
     */
    setSuccess(message: string = 'Your route is ready') {
        this.stateSubject.next({
            state: 'success_complete',
            phase: 'route_ready',
            progress: 100,
            message,
            showSkeleton: false,
            showProgress: false,
            hasPartialData: false,
            confidence: 1.0
        });
    }

    /**
     * Set soft failure (uncertainty) state
     */
    setSoftFailure(confidence: number, message: string = 'People usually stand here, but you can also try...') {
        this.stateSubject.next({
            state: 'soft_failure_uncertainty',
            phase: 'low_confidence',
            progress: 80,
            message,
            showSkeleton: false,
            showProgress: false,
            hasPartialData: true,
            confidence
        });
    }

    /**
     * Set hard failure (error) state
     */
    setHardFailure(
        errorType: 'no_corridor' | 'network_failure' | 'api_timeout' | 'data_unavailable',
        message: string = 'We couldn\'t confirm this route right now'
    ) {
        this.stateSubject.next({
            state: 'hard_failure_error',
            phase: 'recovery_mode',
            progress: 0,
            message,
            showSkeleton: false,
            showProgress: false,
            hasPartialData: false,
            errorType
        });
    }

    /**
     * Reset to idle state
     */
    reset() {
        this.stateSubject.next({
            state: 'idle',
            phase: 'none',
            progress: 0,
            message: '',
            showSkeleton: false,
            showProgress: false,
            hasPartialData: false
        });
    }

    /**
     * Check if currently loading
     */
    isLoading(): boolean {
        const state = this.stateSubject.value.state;
        return state === 'initial_loading' || state === 'partial_data_loaded';
    }

    /**
     * Check if has error
     */
    hasError(): boolean {
        return this.stateSubject.value.state === 'hard_failure_error';
    }

    /**
     * Check if successful
     */
    isSuccess(): boolean {
        return this.stateSubject.value.state === 'success_complete';
    }
}
