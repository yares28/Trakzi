const CONSENT_KEY = "trakzi-cookie-consent"

export type ConsentStatus = "accepted" | "declined" | null

export function getConsentStatus(): ConsentStatus {
  if (typeof window === "undefined") return null
  return localStorage.getItem(CONSENT_KEY) as ConsentStatus
}

export function setConsent(status: "accepted" | "declined") {
  localStorage.setItem(CONSENT_KEY, status)

  if (status === "accepted") {
    window.dispatchEvent(new Event("trakzi:cookie-consent-accepted"))
  }
}
