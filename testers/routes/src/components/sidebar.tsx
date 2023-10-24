function Sidebar() {
  return (
    <ul class="sidebar">
      <LinkListItem href="/this-should-be-ignored" />
      <LinkListItem href="/does-not-exist" />
      <LinkListItem href="/" />
      <LinkListItem href="/child-one" />
      <LinkListItem href="/child-one/123" />
      <LinkListItem href="/child-one/123/456" />
      <LinkListItem href="/child-one/123/456/789" />
      <LinkListItem href="/child-two" />
      <LinkListItem href="/child-two/123" />
      <LinkListItem href="/child-two/123/456" />
      <LinkListItem href="/child-two/123/456/789" />
      <LinkListItem href="/child-three" />
      <LinkListItem href="/child-three/123" />
      <LinkListItem href="/child-three/123/456" />
      <LinkListItem href="/child-three/123/456/789" />
      -------------
      <LinkListItem href="/dashboard" />
      <LinkListItem href="/dashboard/asdf" />
      <LinkListItem href="/dashboard/customers" />
      <LinkListItem href="/dashboard/customers/123" />
      <LinkListItem href="/dashboard/customers/123/orders" />
      <LinkListItem href="/dashboard/customers/123/orders/456" />
      -------------
      <LinkListItem href="/articles" />
      <LinkListItem href="/articles/test" />
      <LinkListItem href="/articles/test/articles" />
      <LinkListItem href="/articles/bob" />
    </ul>
  );
}

export { Sidebar };

function LinkListItem({ href }: { href: string }) {
  return (
    <li>
      <a href={href}>{href}</a>
    </li>
  );
}
