import { useEffect } from 'react'

/**
 * Composant SEO réutilisable pour les SPA React
 * Met à jour dynamiquement les meta tags du <head>
 *
 * Usage :
 *   <SEO
 *     title="Ma page | Zevo"
 *     description="Description de la page"
 *     image="/og-image.png"
 *     url="/ma-page"
 *   />
 */

const SITE_NAME = 'Zevo'
const BASE_URL = 'https://zevo-one.vercel.app'
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`
const DEFAULT_DESCRIPTION = 'Logiciel coach sportif tout-en-un : suivi client, programmes sport en ligne, nutrition et facturation. 500+ coachs en France.'

function setMetaTag(attr, key, value) {
  let el = document.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', value)
}

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url = '',
  noindex = false,
}) {
  useEffect(() => {
    // Title
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `Logiciel coach sportif tout-en-un | ${SITE_NAME}`
    document.title = fullTitle

    // Basic meta
    setMetaTag('name', 'description', description)
    setMetaTag('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', `${BASE_URL}${url}`)

    // Open Graph
    setMetaTag('property', 'og:title', fullTitle)
    setMetaTag('property', 'og:description', description)
    setMetaTag('property', 'og:image', image.startsWith('http') ? image : `${BASE_URL}${image}`)
    setMetaTag('property', 'og:url', `${BASE_URL}${url}`)
    setMetaTag('property', 'og:type', 'website')
    setMetaTag('property', 'og:site_name', SITE_NAME)
    setMetaTag('property', 'og:locale', 'fr_FR')

    // Twitter
    setMetaTag('name', 'twitter:card', 'summary_large_image')
    setMetaTag('name', 'twitter:title', fullTitle)
    setMetaTag('name', 'twitter:description', description)
    setMetaTag('name', 'twitter:image', image.startsWith('http') ? image : `${BASE_URL}${image}`)
  }, [title, description, image, url, noindex])

  return null
}
