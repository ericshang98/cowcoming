// Offline visitors can look at another form without changing the saved evolution.
export function shownEvolutionForm(online, sessionForm, guestForm, knownForms) {
  if (!online && knownForms.includes(guestForm)) return guestForm;
  return sessionForm;
}
