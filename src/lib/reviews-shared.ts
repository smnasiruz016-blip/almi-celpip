// Shared review validation constants. Kept out of reviews.ts because a
// "use server" module may only export async functions.
export const TEXT_MIN = 10;
export const TEXT_MAX = 2000;
export const RATING_MIN = 1;
export const RATING_MAX = 5;
