import { initClient } from "@hwy-js/client";
import { RootOutlet } from "@hwy-js/react";
import React from "react";
import { createRoot } from "react-dom/client";
import { Sidebar } from "./components/sidebar";

await initClient(() => {
	const root = createRoot(document.getElementById("root") as HTMLElement);
	root.render(
		<React.StrictMode>
			<Sidebar />
			<main>
				<RootOutlet
					fallbackErrorBoundary={function ErrorBoundary() {
						return <div>Error Boundary in Root</div>;
					}}
				/>
			</main>
		</React.StrictMode>
	);
});
