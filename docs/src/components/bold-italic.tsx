function Boldtalic({ children }: { children: string }) {
  return (
    <b>
      <i>{children}</i>
    </b>
  )
}

export { Boldtalic }
