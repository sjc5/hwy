import { HwyRoute, makeComp } from "@hwy-js/lit";
import { html } from "lit";
import { guard } from "lit/directives/guard.js";

class TesterCompDef extends HwyRoute<{ loaderData: "bob" }> {
	render() {
		const randomColor = guard(
			[],
			() => "#" + Math.floor(Math.random() * 16777215).toString(16),
		);

		console.log(this.passedFromParent);

		return html`
      <div class="outlet-wrapper" style="background-color: ${randomColor};">
        <div class="tester-comp-wrapper">
          <p>Splat Segments:${JSON.stringify(this.splatSegments)}</p>

          ${
						Object.keys(this.params).length
							? html`<p>Params: ${JSON.stringify(this.params)}</p>`
							: null
					}
          ${this.loaderData && JSON.stringify(this.loaderData)} ${this.Outlet()}
        </div>
        ${RANDOM_TEXT}
      </div>
    `;
	}
}

export const TesterComp = makeComp(TesterCompDef);

const RANDOM_TEXT = `
The 2024 United Kingdom general election was held on Thursday, 4 July
2024. The governing Conservative Party, led by Prime Minister Rishi Sunak,
was defeated in a landslide by the opposition Labour Party led by Sir Keir
Starmer. Labour achieved a 172-seat majority and a total of 411 seats.[a]
The election was the first victory for the Labour Party in a general
election in 19 years, its previous one achieving a majority of 66 seats in
the 2005 general election under the leadership of Tony Blair. Labour's
victory ended the Conservative Party's 14-year tenure as Britain's
governing party. Labour's total of 411 seats was exceeded only by Blair's
418-seat victory in the 1997 general election. Labour became the largest
party in Scotland for the first time since 2010, and became the dominant
party in Wales, Inner London, Northern England, and much of the
Midlands.[3] On the other hand, the Conservative Party experienced its
worst defeat in history; reduced to just 121 seats. The party lost 244
seats in total, including a record 12 cabinet ministers and 5 seats
previously held by Conservative Prime Ministers. [b] It also lost all of
its seats in Wales and Cornwall, and most of their seats in London,
Northern England, and South West England.[4] Liz Truss became the first
former Prime Minister to contest and lose their seat in over a century
since Arthur Balfour in the 1906 general election.[5] The 2024 United
Kingdom general election was held on Thursday, 4 July 2024. The governing
Conservative Party, led by Prime Minister Rishi Sunak, was defeated in a
landslide by the opposition Labour Party led by Sir Keir Starmer. Labour
achieved a 172-seat majority and a total of 411 seats.[a] The election was
the first victory for the Labour Party in a general election in 19 years,
its previous one achieving a majority of 66 seats in the 2005 general
election under the leadership of Tony Blair. Labour's victory ended the
Conservative Party's 14-year tenure as Britain's governing party. Labour's
total of 411 seats was exceeded only by Blair's 418-seat victory in the
1997 general election. Labour became the largest party in Scotland for the
first time since 2010, and became the dominant party in Wales, Inner
London, Northern England, and much of the Midlands.[3] On the other hand,
the Conservative Party experienced its worst defeat in history; reduced to
just 121 seats. The party lost 244 seats in total, including a record 12
cabinet ministers and 5 seats previously held by Conservative Prime
Ministers. [b] It also lost all of its seats in Wales and Cornwall, and
most of their seats in London, Northern England, and South West
England.[4] Liz Truss became the first former Prime Minister to contest
and lose their seat in over a century since Arthur Balfour in the 1906
general election.[5] The 2024 United Kingdom general election was held on
Thursday, 4 July 2024. The governing Conservative Party, led by Prime
Minister Rishi Sunak, was defeated in a landslide by the opposition Labour
Party led by Sir Keir Starmer. Labour achieved a 172-seat majority and a
total of 411 seats.[a] The election was the first victory for the Labour
Party in a general election in 19 years, its previous one achieving a
majority of 66 seats in the 2005 general election under the leadership of
Tony Blair. Labour's victory ended the Conservative Party's 14-year tenure
as Britain's governing party. Labour's total of 411 seats was exceeded
only by Blair's 418-seat victory in the 1997 general election. Labour
became the largest party in Scotland for the first time since 2010, and
became the dominant party in Wales, Inner London, Northern England, and
much of the Midlands.[3] On the other hand, the Conservative Party
experienced its worst defeat in history; reduced to just 121 seats. The
party lost 244 seats in total, including a record 12 cabinet ministers and
5 seats previously held by Conservative Prime Ministers. [b] It also lost
all of its seats in Wales and Cornwall, and most of their seats in London,
Northern England, and South West England.[4] Liz Truss became the first
former Prime Minister to contest and lose their seat in over a century
since Arthur Balfour in the 1906 general election.[5] The 2024 United
Kingdom general election was held on Thursday, 4 July 2024. The governing
Conservative Party, led by Prime Minister Rishi Sunak, was defeated in a
landslide by the opposition Labour Party led by Sir Keir Starmer. Labour
achieved a 172-seat majority and a total of 411 seats.[a] The election was
the first victory for the Labour Party in a general election in 19 years,
its previous one achieving a majority of 66 seats in the 2005 general
election under the leadership of Tony Blair. Labour's victory ended the
Conservative Party's 14-year tenure as Britain's governing party. Labour's
total of 411 seats was exceeded only by Blair's 418-seat victory in the
1997 general election. Labour became the largest party in Scotland for the
first time since 2010, and became the dominant party in Wales, Inner
London, Northern England, and much of the Midlands.[3] On the other hand,
the Conservative Party experienced its worst defeat in history; reduced to
just 121 seats. The party lost 244 seats in total, including a record 12
cabinet ministers and 5 seats previously held by Conservative Prime
Ministers. [b] It also lost all of its seats in Wales and Cornwall, and
most of their seats in London, Northern England, and South West
England.[4] Liz Truss became the first former Prime Minister to contest
and lose their seat in over a century since Arthur Balfour in the 1906
general election.[5]
`;
