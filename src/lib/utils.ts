import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getFriendInitial = (name?: string | null) => name ? name.charAt(0).toUpperCase() : '?';
