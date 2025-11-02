// // src/app/core/services/route.service.ts
// import { HttpClient, HttpParams } from '@angular/common/http';
// import { Injectable } from '@angular/core';
// import { Route } from '@angular/router';
// import { Observable } from 'rxjs';
// import { environment } from '../../../environments/environment';
// import { RouteDetails, RouteSearchParams, AppRoute } from '../../models/route.model';


// @Injectable({
// providedIn: 'root'
// })
// export class RouteService {
//   private apiUrl = `${environment.apiUrl}/routes`;

//   constructor(private http: HttpClient) {}

//   searchRoutes(params: RouteSearchParams): Observable<AppRoute[]> {
//     let httpParams = new HttpParams();
//     if (params.startLocation) httpParams = httpParams.set('start', params.startLocation);
//     if (params.endLocation) httpParams = httpParams.set('end', params.endLocation);
//     if (params.maxFare) httpParams = httpParams.set('maxFare', params.maxFare.toString());

//     return this.http.get<AppRoute[]>(this.apiUrl, { params: httpParams });
//   }

//   getRouteById(id: number): Observable<RouteDetails> {
//     return this.http.get<RouteDetails>(`${this.apiUrl}/${id}`);
//   }

//   getNearbyRoutes(lat: number, lng: number, radius: number = 2000): Observable<AppRoute[]> {
//     const params = new HttpParams()
//       .set('lat', lat.toString())
//       .set('lng', lng.toString())
//       .set('radius', radius.toString());

//     return this.http.get<AppRoute[]>(`${this.apiUrl}/nearby`, { params });
//   }

//   getFareEstimate(routeId: number): Observable<{ min: number; max: number; avg: number }> {
//     return this.http.get<{ min: number; max: number; avg: number }>(
//       `${this.apiUrl}/${routeId}/fare-estimate`
//     );
//   }
// }


// src/app/core/services/route.service.ts (Alternative)
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    TransportRoute,
    RouteSearchParams,
    TransportRouteDetails
} from '../../models/route.model';

@Injectable({
    providedIn: 'root'
})
export class RouteService {
    private apiUrl = `${environment.apiUrl}/routes`;

    constructor(private http: HttpClient) { }

    searchRoutes(params: RouteSearchParams): Observable<TransportRoute[]> {
        let httpParams = new HttpParams();
        if (params.startLocation) httpParams = httpParams.set('start', params.startLocation);
        if (params.endLocation) httpParams = httpParams.set('end', params.endLocation);
        if (params.maxFare) httpParams = httpParams.set('maxFare', params.maxFare.toString());

        return this.http.get<TransportRoute[]>(this.apiUrl, { params: httpParams });
    }

    getRouteById(id: number): Observable<TransportRouteDetails> {
        return this.http.get<TransportRouteDetails>(`${this.apiUrl}/${id}`);
    }

    getNearbyRoutes(lat: number, lng: number, radius: number = 2000): Observable<TransportRoute[]> {
        const params = new HttpParams()
            .set('lat', lat.toString())
            .set('lng', lng.toString())
            .set('radius', radius.toString());

        return this.http.get<TransportRoute[]>(`${this.apiUrl}/nearby`, { params });
    }

    getFareEstimate(routeId: number): Observable<{ min: number; max: number; avg: number }> {
        return this.http.get<{ min: number; max: number; avg: number }>(
            `${this.apiUrl}/${routeId}/fare-estimate`
        );
    }
}