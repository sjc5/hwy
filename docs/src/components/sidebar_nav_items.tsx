type SidebarNavItem = {
  name: string;
  url: string;
};

const sidebarNavItems: SidebarNavItem[] = [
  {
    name: "Getting Started",
    url: "/getting-started",
  },
  {
    name: "Using Bun",
    url: "/guides/node-to-bun",
  },
  {
    name: "Test",
    url: "/test",
  },
  {
    name: "From Scratch",
    url: "/guides/from-scratch",
  },
];

export function SidebarNavItems() {
  return (
    <ul>
      {sidebarNavItems.map((item) => (
        <li key={item.url}>
          <a href={item.url} data-boost>
            {item.name}
          </a>
        </li>
      ))}
    </ul>
  );
}
