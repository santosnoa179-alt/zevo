import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Retourne une version debouncée de `value`.
 * Utile pour éviter qu'un filter/requête API se déclenche à chaque frappe.
 *
 * Exemple :
 *   const [search, setSearch] = useState('')
 *   const debouncedSearch = useDebounce(search, 300)
 *   const filtered = useMemo(() => list.filter(x => x.includes(debouncedSearch)), [list, debouncedSearch])
 *
 * @param {any} value - valeur à debouncer
 * @param {number} delay - délai en ms (défaut : 300)
 * @returns {any} — la valeur, mise à jour seulement après `delay` ms sans changement
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])

  return debounced
}

/**
 * Retourne une version debouncée d'une fonction callback.
 * Utile pour les event handlers resize/scroll/mousemove, ou auto-save.
 *
 * Exemple :
 *   const debouncedSave = useDebouncedCallback((val) => supabase.update(val), 500)
 *   <input onChange={(e) => debouncedSave(e.target.value)} />
 *
 * @param {Function} fn - fonction à debouncer
 * @param {number} delay - délai en ms (défaut : 300)
 * @returns {Function} — fonction debouncée, stable entre les renders
 */
export function useDebouncedCallback(fn, delay = 300) {
  const timerRef = useRef(null)
  const fnRef = useRef(fn)

  // Garder la dernière version de fn sans casser l'identité du callback
  useEffect(() => { fnRef.current = fn }, [fn])

  // Cleanup au démontage pour éviter un call orphelin
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return useCallback((...args) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fnRef.current(...args), delay)
  }, [delay])
}
