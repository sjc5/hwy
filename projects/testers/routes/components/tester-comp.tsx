import { UIProps } from "@hwy-js/react";
import { useState } from "react";

function TesterComp({ Outlet, params, splatSegments, ...rest }: UIProps) {
	const [randomColor] = useState(
		"#" + Math.floor(Math.random() * 16777215).toString(16)
	);

	return (
		<div
			className="outlet-wrapper"
			style={{
				background: randomColor,
			}}
		>
			<div className="tester-comp-wrapper">
				<p>Splat Segments:{JSON.stringify(splatSegments)}</p>

				{Object.keys(params).length ? (
					<p>Params: {JSON.stringify(params)}</p>
				) : null}

				{rest.loaderData && JSON.stringify(rest.loaderData)}

				<Outlet />
			</div>
		</div>
	);
}

export { TesterComp };
