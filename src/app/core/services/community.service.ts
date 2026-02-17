import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/transport.types';
import { CommunityReport, VerifiedStopAlias } from '../../models/community.types';
import { UserReputation } from '../../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class CommunityService {
    private apiUrl = `${environment.apiUrl}/community`;

    // Cache user reputation for performance
    private reputationSubject = new BehaviorSubject<UserReputation | null>(null);
    public reputation$ = this.reputationSubject.asObservable();

    constructor(private http: HttpClient) { }

    /**
     * Submit a crowd-powered intelligence report
     */
    submitReport(report: CommunityReport): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(`${this.apiUrl}/report`, report).pipe(
            tap(res => {
                if (res.success) {
                    // Potentially refresh reputation if needed
                    this.fetchUserReputation().subscribe();
                }
            })
        );
    }

    /**
     * Get verified local names for bus stops
     */
    getVerifiedStops(): Observable<ApiResponse<VerifiedStopAlias[]>> {
        return this.http.get<ApiResponse<VerifiedStopAlias[]>>(`${this.apiUrl}/stops`);
    }

    /**
     * Get current user's trust tier and stats
     */
    getUserReputation(): Observable<ApiResponse<UserReputation>> {
        return this.http.get<ApiResponse<UserReputation>>(`${this.apiUrl}/reputation`).pipe(
            tap(res => {
                if (res.success && res.data) {
                    this.reputationSubject.next(res.data);
                }
            })
        );
    }

    /**
     * Private helper to fetch reputation and update stream
     */
    private fetchUserReputation(): Observable<ApiResponse<UserReputation>> {
        return this.getUserReputation();
    }

    /**
     * Check if user is on rate-limit (3 reports / 10 mins)
     * Note: Full enforcement happens on backend
     */
    canReport(): boolean {
        const reports = JSON.parse(localStorage.getItem('cil_recent_reports') || '[]');
        const now = Date.now();
        const tenMins = 10 * 60 * 1000;

        const recentReports = reports.filter((t: number) => now - t < tenMins);
        return recentReports.length < 3;
    }

    /**
     * Log a report submission to local storage for client-side rate limiting
     */
    logReportSubmission(): void {
        const reports = JSON.parse(localStorage.getItem('cil_recent_reports') || '[]');
        reports.push(Date.now());
        localStorage.setItem('cil_recent_reports', JSON.stringify(reports));
    }
}
