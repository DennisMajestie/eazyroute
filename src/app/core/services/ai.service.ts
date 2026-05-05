import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AllUrlService } from '../../services/allUrl.service';
import { ApiResponse } from '../../models/transport.types';

export interface AiDispatchResponse {
  success: boolean;
  ai: {
    interpretation: string;
    parsed: {
      from: string;
      to: string;
      preferences?: any;
    }
  };
  routing: any;
}

export interface AiEnrichResponse {
  success: boolean;
  processed: number;
  updates: Array<{
    id: string;
    old: string;
    new: string;
    tier: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class AiService {
  constructor(
    private http: HttpClient,
    private urls: AllUrlService
  ) {}

  /**
   * Intelligent Dispatch: Parse NL request and generate route
   */
  dispatch(request: string): Observable<AiDispatchResponse> {
    return this.http.post<AiDispatchResponse>(
      this.urls.allUrl.ai.dispatch,
      { request }
    );
  }

  /**
   * AI Landmark Enrichment (Admin)
   */
  enrichLandmarks(ids: string[]): Observable<AiEnrichResponse> {
    return this.http.post<AiEnrichResponse>(
      this.urls.allUrl.ai.enrich,
      { ids }
    );
  }

  /**
   * General AI Chat / Route Assist
   */
  chat(messages: any[], model: string = 'gemini'): Observable<any> {
    return this.http.post<any>(
      this.urls.allUrl.ai.chat,
      { messages, model }
    );
  }

  /**
   * Smart Chat (Always high-intelligence model)
   */
  smartChat(messages: any[]): Observable<any> {
    return this.http.post<any>(
      this.urls.allUrl.ai.smartChat,
      { messages }
    );
  }

  /**
   * Quick Route Assist
   */
  routeAssist(question: string, context?: string): Observable<any> {
    return this.http.post<any>(
      this.urls.allUrl.ai.routeAssist,
      { question, context }
    );
  }
}
