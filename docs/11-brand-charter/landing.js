'use strict'

const form = document.querySelector('#launch-form')
const emailInput = document.querySelector('#launch-email')
const consentInput = document.querySelector('#launch-consent')
const emailError = document.querySelector('#email-error')
const consentError = document.querySelector('#consent-error')
const result = document.querySelector('#form-result')
const submitButton = document.querySelector(
  '#launch-form button[type="submit"]',
)

if (
  form instanceof HTMLFormElement &&
  emailInput instanceof HTMLInputElement &&
  consentInput instanceof HTMLInputElement &&
  emailError instanceof HTMLElement &&
  consentError instanceof HTMLElement &&
  result instanceof HTMLElement &&
  submitButton instanceof HTMLButtonElement
) {
  // This concept deliberately has no network request or persistent storage.
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    result.textContent = ''

    const emailIsValid =
      emailInput.value.trim() !== '' && emailInput.validity.valid
    const consentIsValid = consentInput.checked

    emailError.textContent = emailIsValid
      ? ''
      : 'Indiquez une adresse e-mail valide, par exemple vous@exemple.com.'
    consentError.textContent = consentIsValid
      ? ''
      : 'Cochez la case pour tester le consentement à l’inscription.'
    emailInput.setAttribute('aria-invalid', String(!emailIsValid))
    consentInput.setAttribute('aria-invalid', String(!consentIsValid))

    if (!emailIsValid) {
      emailInput.focus()
      return
    }

    if (!consentIsValid) {
      consentInput.focus()
      return
    }

    form.reset()
    result.textContent =
      'Démonstration réussie. Aucun e-mail n’a été envoyé et aucune adresse n’a été conservée. L’inscription réelle sera disponible au lancement.'
    result.focus()
  })

  emailInput.addEventListener('input', () => {
    emailError.textContent = ''
    emailInput.removeAttribute('aria-invalid')
    result.textContent = ''
  })

  consentInput.addEventListener('change', () => {
    consentError.textContent = ''
    consentInput.removeAttribute('aria-invalid')
    result.textContent = ''
  })

  // Keep the native submit path disabled until the local handler is installed.
  submitButton.disabled = false
}

const ticketArt = document.querySelector('[data-ticket-art]')
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')

if (ticketArt instanceof HTMLElement) {
  const resetTilt = () => {
    ticketArt.style.removeProperty('--tilt-x')
    ticketArt.style.removeProperty('--tilt-y')
  }

  ticketArt.addEventListener('pointermove', (event) => {
    if (motionPreference.matches || !finePointer.matches) return

    const bounds = ticketArt.getBoundingClientRect()
    const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5
    const vertical = (event.clientY - bounds.top) / bounds.height - 0.5
    ticketArt.style.setProperty('--tilt-x', `${(-vertical * 5).toFixed(2)}deg`)
    ticketArt.style.setProperty('--tilt-y', `${(horizontal * 7).toFixed(2)}deg`)
  })

  ticketArt.addEventListener('pointerleave', resetTilt)
  motionPreference.addEventListener('change', resetTilt)
}
