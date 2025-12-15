/**
 * Nigerian Copy Constants - ALONG Framework
 * Human-readable, Nigerian-centric messages for all UI states
 */

export const NIGERIAN_COPY = {
    // Loading States
    LOADING: {
        FINDING_LANDMARKS: "Finding where you fit enter motor...",
        CHECKING_BOARDING: "Checking the best place to stand small...",
        LOOKING_FOR_ROUTE: "Looking for your route...",
        SEARCHING: "We dey find the way...",
        CALCULATING: "We dey calculate am...",
        ALMOST_READY: "Almost there, abeg wait small",
        GETTING_DETAILS: "Getting final details..."
    },

    // Partial Data States
    PARTIAL: {
        CLEAR_SO_FAR: "This part is clear...",
        STILL_CHECKING: "Still checking the best place to stand",
        ALMOST_THERE: "We don see the route, just getting final details",
        GETTING_POSITION: "Getting exact position...",
        FINALIZING: "Just small more..."
    },

    // Success States
    SUCCESS: {
        ROUTE_READY: "Your route don ready",
        ALL_SET: "Na so e be",
        CAN_START: "You fit start to dey go",
        WORKS_WELL: "This route dey work well",
        CONFIRMED: "Confirmed ✓",
        READY: "Ready to go"
    },

    // Soft Failure (Uncertainty)
    SOFT_FAILURE: {
        USUALLY_HERE: "People dey usually stand here...",
        BOTH_WORK: "Both places dey work",
        YOUR_CHOICE: "Na you go choose wetin sweet you",
        IF_CROWDED: "If e too crowd, try that side",
        ALTERNATIVE: "You fit also try...",
        TRAFFIC_HEAVY: "If traffic is heavy, this other spot works",
        MULTIPLE_OPTIONS: "We get different options for you"
    },

    // Hard Failure (Errors)
    HARD_FAILURE: {
        NETWORK_SLOW: "Abeg, network dey slow small...",
        NO_ROUTE_YET: "We never get route for this area yet",
        TRY_AGAIN: "Make we try again",
        NO_WAHALA: "No wahala, we go fix am",
        STILL_TRYING: "We'll keep trying...",
        USE_LAST_ROUTE: "Your last route still dey here",
        CANT_CONFIRM: "We couldn't confirm this route right now"
    },

    // Micro-Instructions
    MICRO: {
        STAND_NEAR: "Stand small near",
        CROSS_ROAD: "Cross go that side",
        TELL_DRIVER: "Tell am say you dey go",
        DROP_AT: "Drop for",
        WALK_SMALL: "Walk small to",
        YOU_DON_REACH: "You don reach",
        ENTER_MOTOR: "Enter motor here"
    },

    // Progress Steps
    PROGRESS: {
        FINDING_AREA: "Finding your area",
        CHECKING_CORRIDORS: "Checking transport corridors",
        GETTING_BOARDING: "Getting boarding details",
        CALCULATING_TIME: "Calculating time",
        CHECKING_SAFETY: "Checking safety"
    },

    // Reassurance
    REASSURANCE: {
        PLEASE_WAIT: "Abeg wait small",
        WORKING_ON_IT: "We dey work on am",
        ALMOST_DONE: "We almost done",
        BEAR_WITH_US: "Bear with us small",
        CHECKING: "We dey check..."
    },

    // Actions
    ACTIONS: {
        RETRY: "Try Again",
        USE_THIS: "Use This",
        CHOOSE_THIS: "Choose This",
        GO_BACK: "Go Back",
        CANCEL: "Cancel",
        CONTINUE: "Continue",
        SHARE: "Share",
        START_JOURNEY: "Start Journey"
    }
} as const;

/**
 * Helper to get random loading message
 */
export function getRandomLoadingMessage(): string {
    const messages = Object.values(NIGERIAN_COPY.LOADING);
    return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Helper to get random reassurance message
 */
export function getRandomReassurance(): string {
    const messages = Object.values(NIGERIAN_COPY.REASSURANCE);
    return messages[Math.floor(Math.random() * messages.length)];
}
