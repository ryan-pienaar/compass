# Research notes

Condensed from the research done before building Compass (September 2026).

## Prior art and UX lessons

**Tools built on Covey's system**
- **FranklinCovey PlanPlus.** Wizards for mission, values, goals, role balance and a weekly compass, with drag-onto-calendar. People who liked the method still left over fragility: sync conflicts, lost data, and wizards that lost input. [review](https://learn.microsoft.com/en-us/archive/blogs/jonathanh/review-of-franklincoveys-planplus)
- **Living the 7 Habits app.** Mission builder, a "7×7" commitment programme and Big Rocks by role. Reviews mention crashes, forced sign-ins, and closed weeks that can't be reopened. [release](https://ir.franklincovey.com/news-releases/news-release-details/franklin-covey-cos-living-7-habits-app-new-updated-7-habits-work/)
- **Week Plan.** Roles, weekly goals and a quadrant view are praised; the learning curve and data-loss updates are criticised. [features](https://weekplan.net/weekly-planner/)
- **Achieve Planner (Effexis).** Capable but heavy. [GTD forum](https://forum.gettingthingsdone.com/threads/achieve-planner-software-from-effexis.3204/)

**Adjacent planners**
- **Sunsama.** A daily ritual with a workload limit, weekly objectives, and an auto-archive after repeated rollovers. [daily planning](https://help.sunsama.com/docs/daily-planning)
- **Akiflow.** Planning and shutdown rituals; aims for 3–5 weekly goals. [rituals](https://product.akiflow.com/help/articles/0805246-rituals)
- **Structured.** A "replan" flow that goes through unfinished items one at a time. [blog](https://structured.app/blog/replan)
- **Things.** Separates "when" from "deadline". [support](https://culturedcode.com/things/support/articles/2803579/)
- **TickTick and Todoist.** Matrix views driven by rules or priority flags. [TickTick](https://help.ticktick.com/articles/7055782040439881728)

**Failure modes**
- Q2 work gets sorted but never scheduled. [HN](https://news.ycombinator.com/item?id=39949866)
- Everything gets labelled urgent and important, and the labels go stale.
- Overdue piles breed guilt and avoidance. [XDA](https://www.xda-developers.com/no-to-do-list-experiment/)
- Over-planning.
- Setup effort and fragile software.
- Skipped reviews. [GTD](https://gettingthingsdone.com/2015/07/podcast-07-guided-gtd-weekly-review/)
- Automation that takes control away.
- Tasks cut off from values.
- Streaks that punish a single miss. [INSEAD](https://knowledge.insead.edu/marketing/consumer-streaks-are-motivating-key-keeping-them-alive)

**Evidence borrowed**
- Planning fallacy [(Buehler 1994)](https://web.mit.edu/curhan/www/docs/Articles/biases/67_J_Personality_and_Social_Psychology_366,_1994.pdf): hence coarse estimates and a capacity target.
- Slack and buffer ([Fowler](https://martinfowler.com/bliki/Slack.html)): plan about 60% of the time.
- Implementation intentions ([Gollwitzer & Sheeran](https://www.researchgate.net/publication/37367696_Implementation_Intentions_and_Goal_Achievement_A_Meta-Analysis_of_Effects_and_Processes)) help most when used sparingly ([Dalton & Spiller](https://academic.oup.com/jcr/article-abstract/39/3/600/1822636)): hence if–then plans only for the top 1–3 rocks.
- Making a plan for an unfinished goal relieves the intrusive thoughts about it ([Masicampo & Baumeister](https://users.wfu.edu/masicaej/MasicampoBaumeister2011JPSP.pdf)): hence decide, don't drift.
- The start of a week works as a "fresh start" point ([Dai et al.](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2204126)).

## Stack verification (practical tests on this machine)

- Windows 11 x64, Node 25.9.0 (ABI 141), pnpm 9.15.9, and no Visual Studio Build Tools or Python, so node-gyp builds fail.
- `better-sqlite3` 13.x ships a prebuilt binary, but npm/pnpm may still run node-gyp and fail. That made it a fallback, not the default.
- `node:sqlite` works with no flag in Node 25.9 (SQLite 3.51). **Drizzle ORM / drizzle-kit 1.0.0-rc.4** support it natively (`drizzle-orm/node-sqlite`). `generate`, `migrate`, sync and async queries, transactions and WAL were all verified. Drizzle 0.45 (npm "latest") has no `node:sqlite` driver.
- Hono 4.13 on @hono/node-server 2.1 served the SPA fallback and API from a single `node server.ts` bound to 127.0.0.1.
- UI libraries:
  - @dnd-kit/react 0.5 is the maintained line.
  - Schedule-X v4 moved drag-and-drop behind a paid plugin.
  - FullCalendar 7 would bring a second drag system, so the week grid is custom.
  - shadcn/ui defaults to Base UI since July 2026.
- Temporal ships in Chrome/Firefox but not in Node 25 or Safari, so date-fns 4 is used.

## Chart palette

Quadrant colors were validated with the data-viz palette checker in stack order (Q1→Q4), in both modes, against the actual card surfaces:

| | Q1 | Q2 | Q3 | Q4 | Worst adjacent CVD ΔE | Normal-vision floor |
|---|---|---|---|---|---|---|
| Light | `#eb6834` | `#1baf7a` | `#eda100` | `#4a3aa7` | 9.1 | 22.9 |
| Dark | `#d95926` | `#199e70` | `#c98500` | `#9085e9` | 8.4 | 19.8 |

Two light-mode fills sit below 3:1 contrast, so every chart ships direct endpoint labels and a table view. Quadrant colors are used for marks and dots only; text stays in ink.
