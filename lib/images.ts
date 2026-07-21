/** Placeholder flou neutre (ton bone) partagé par toutes les images distantes. */
export const BLUR_DATA_URL =
  "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='8' height='8' fill='%23e7dfd2'/%3E%3C/svg%3E";

export function unsplash(id: string, w = 1800, q = 80) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=${q}`;
}
