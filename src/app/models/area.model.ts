/**
 * Area Models - Nationwide Coverage (2,468 areas across 37 states)
 */

/**
 * Area - Represents a city, town, or district within Nigeria
 */
export interface Area {
    id: number;
    name: string;
    territory: string;        // "Lagos State", "Federal Capital Territory"
    lga: string;             // "Ikeja", "Municipal Area Council"
    type?: string;           // "commercial", "residential", "mixed"
    localityCount?: number;  // Number of localities mapped in this area
    status?: 'active' | 'pending' | 'unmapped';
    latitude?: number;
    longitude?: number;
    description?: string;
}

/**
 * Territory - Represents a Nigerian state
 */
export interface Territory {
    name: string;            // "Lagos State"
    code?: string;           // "LA"
    areaCount: number;       // Number of areas in this territory
    lgaCount?: number;       // Number of LGAs
    areas?: Area[];          // Areas within this territory
    isPopular?: boolean;     // Lagos, FCT, Kano, etc.
}

/**
 * LGA - Local Government Area
 */
export interface LGA {
    name: string;
    territory: string;
    areaCount: number;
    areas?: Area[];
}

/**
 * Area Search Result - Unified search response
 */
export interface AreaSearchResult {
    area: Area;
    matchType: 'name' | 'lga' | 'territory';  // What matched the search
    relevanceScore?: number;
}

/**
 * Area Statistics - For dashboard/overview
 */
export interface AreaStatistics {
    totalAreas: number;           // 2,468
    totalTerritories: number;     // 37
    totalLGAs: number;            // 778
    mappedAreas: number;          // Areas with localities
    unmappedAreas: number;        // Areas without localities
}
