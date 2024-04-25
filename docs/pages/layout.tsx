import { RootLayoutProps } from "@hwy-js/react";
import { startTransition, useEffect, useLayoutEffect } from "preact/compat";
import { useHtmlDialog } from "use-html-dialog";
import { useMediaQuery } from "usehooks-ts";
import { CloseIcon, HamburgerIcon } from "../components/icons.js";

type SidebarNavItem = {
  name: string;
  url: string;
  external?: boolean;
};

const sidebarNavItems: SidebarNavItem[] = [
  {
    name: "GitHub",
    url: "https://github.com/sjc5/hwy",
    external: true,
  },
  {
    name: "Manifesto",
    url: "/manifesto",
  },
  {
    name: "Using Bun",
    url: "/guides/node-to-bun",
  },
];

export function RootLayout({ children, splatSegments }: RootLayoutProps) {
  const {
    showModal,
    props: htmlDialogProps,
    close,
    isOpen: open,
  } = useHtmlDialog({});

  const isMobile = useMediaQuery("(max-width: 800px)");
  const buttonLabel = `${open ? "Close" : "Open"} menu`;

  useEffect(() => startTransition(close), [splatSegments]);

  useLockBodyScroll(open);

  return (
    <>
      <nav>
        <div className="logo-wrapper">
          <a href="/" id="logo" data-boost>
            <h1>Hwy</h1>
          </a>

          <button
            aria-roledescription={buttonLabel}
            title={buttonLabel}
            onClick={open ? close : showModal}
            className="mobile-only menu-icon"
          >
            {open ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>

        {isMobile ? (
          <dialog {...htmlDialogProps}>
            <Sidebar />
          </dialog>
        ) : (
          <Sidebar />
        )}
      </nav>

      <main>{children}</main>
    </>
  );
}

function Sidebar() {
  return (
    <ul id="sidebar">
      {sidebarNavItems.map((item) => (
        <li key={item.url}>
          <a
            href={item.url}
            data-boost={!item.external}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noopener noreferrer" : undefined}
          >
            {item.name}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function useLockBodyScroll(shouldLock: boolean) {
  useLayoutEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = shouldLock ? "hidden" : originalStyle;
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [shouldLock]);
}
