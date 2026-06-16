import { useEffect, useState } from 'react'

/**
 * Wie useState, speichert den Wert aber zusätzlich in localStorage und stellt
 * ihn beim erneuten Laden (Aktualisieren, Schließen/Öffnen) wieder her.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial
    try {
      const raw = window.localStorage.getItem(key)
      return raw != null ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Speicher voll / nicht verfügbar – ignorieren
    }
  }, [key, value])

  return [value, setValue] as const
}
