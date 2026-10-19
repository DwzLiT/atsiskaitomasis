/** Short delay so loading UI can be verified before real APIs exist. */
export function demoDelay(ms = 350) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
