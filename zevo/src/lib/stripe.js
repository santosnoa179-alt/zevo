import { loadStripe } from '@stripe/stripe-js'

// Client Stripe — initialisé de façon lazy (une seule instance)
let stripePromise = null

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  }
  return stripePromise
}
