function cx(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export { cx }
