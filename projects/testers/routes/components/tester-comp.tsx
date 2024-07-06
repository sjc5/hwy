import { RouteComponentProps } from "@hwy-js/react";
import { useState } from "react";

function TesterComp({
  Outlet,
  params,
  splatSegments,
  ...rest
}: RouteComponentProps<{
  loaderOutput: "bob";
}>) {
  const [randomColor] = useState(
    "#" + Math.floor(Math.random() * 16777215).toString(16),
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
    </div>
  );
}

export { TesterComp };
