# Sprint 1 — 2026-11-02 to 2026-11-03

> No milestone defined — planning against the story backlog alone.
> PR-SPRINT skipped — Lean mode.
> QA plan: run `/qa-plan sprint` before implementation begins.

## Sprint Goal
盘面规则层的地基跑通并有测试：发牌、连通判定、点击消除与翻牌、按兵种清除、死局洗牌（board-link 史诗前半）。

## Goal Prerequisites
| Needed to show the goal | Status |
|-------------------------|--------|
| None: the goal has nothing to run or show（只有规则层和 `node:test` 测试；无引擎，场景搜索不适用） | — |

## Capacity
- 单位：Claude 动手小时（不含用户试玩、审阅和等待）。每天约 5 小时，取自垂直切片的节奏（2 天约 9.5 小时，`prototypes/hulao-vertical-slice/REPORT.md`）
- 任务估时：S ≈ 0.5 h、M ≈ 1 h、L ≈ 2 h，含写测试和 `/story-readiness` → `/dev-story` → `/code-review` → `/story-done` 一轮流程。这是按切片推的判断，第一个冲刺结束后用实际用时校准
- Total days: 2（约 10 h）
- Buffer (20%): 0.4 天（约 2 h）
- Available: 1.6 天（约 8 h）

## Tasks

### Must Have (Critical Path)
| ID | Task | Agent/Owner | Est. Days | Dependencies | Acceptance Criteria |
|----|------|-------------|-----------|-------------|-------------------|
| 1-1 | [story-001 随机流、格子与牌组校验](../epics/board-link/story-001-rng-grid-deck.md) | gameplay-programmer | 0.2（M） | — | 见任务文件 |
| 1-2 | [story-002 发牌（满盘压底与压境）](../epics/board-link/story-002-deal.md) | gameplay-programmer | 0.2（M） | 1-1 | 见任务文件 |
| 1-3 | [story-003 连通判定（拐弯数与折线点数）](../epics/board-link/story-003-connectivity.md) | gameplay-programmer | 0.2（M） | 1-2 | 见任务文件 |
| 1-4 | [story-004 拐点取舍与对拍](../epics/board-link/story-004-path-tiebreak-oracle.md) | gameplay-programmer | 0.2（M） | 1-3 | 见任务文件 |
| 1-5 | [story-005 点击状态机、消除、连不上与翻牌](../epics/board-link/story-005-tap-match-reveal.md) | gameplay-programmer | 0.2（M） | 1-2、1-4 | 见任务文件 |
| 1-6 | [story-006 赵云待命与盘锁](../epics/board-link/story-006-force-next-lock.md) | gameplay-programmer | 0.1（S） | 1-5 | 见任务文件 |
| 1-7 | [story-007 clearKind、clearSelection 与 buriedCells](../epics/board-link/story-007-clear-kind.md) | gameplay-programmer | 0.2（M） | 1-5 | 见任务文件 |

### Should Have
| ID | Task | Agent/Owner | Est. Days | Dependencies | Acceptance Criteria |
|----|------|-------------|-----------|-------------|-------------------|
| 1-10 | [story-010 ensurePlayable（重排、对调、挪牌）](../epics/board-link/story-010-ensure-playable.md) | gameplay-programmer | 0.4（L） | 1-1、1-5 | 见任务文件 |
| 1-8 | [story-008 clearCells 与行列内容查询](../epics/board-link/story-008-clear-cells-contents.md) | gameplay-programmer | 0.2（M） | 1-7 | 见任务文件 |

### Nice to Have
| ID | Task | Agent/Owner | Est. Days | Dependencies | Acceptance Criteria |
|----|------|-------------|-----------|-------------|-------------------|
| 1-9 | [story-009 pushRowFromTop、addPairs 与 placeBlocks](../epics/board-link/story-009-push-add-place.md) | gameplay-programmer | 0.2（M） | 1-5 | 见任务文件 |

合计：必做约 6.5 h，应做约 3 h，可做约 1 h。留给冲刺 2：board-link 011–016（约 7 h），以及 round-flow、clear-effects 两个史诗（任务尚未拆）。

## Carryover from Previous Sprint
| Task | Reason | New Estimate |
|------|--------|-------------|
| — | 第一个冲刺，没有遗留 | — |

## Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| 9 份 GDD 仍是 In Review，复审可能改验收 | 中 | 中 | 本冲刺只做 board-link；开工前先 `/design-review design/gdd/board-link.md` 复审，验收变了就改任务 |
| 估时没有正式开发的实测数据（只有切片） | 高 | 中 | 每个任务记实际用时，冲刺结束 `/retrospective` 校准 S/M/L |
| 测试辅助文件 `tests/helpers/board-fixtures.mjs` 还不存在 | 高 | 低 | 在 story-001 或 story-005 里建，算进该任务 |
| ADR-0002/0003 于 2026-10-30 就地修订，但 Last Verified 仍是 2026-10-27，任务里的 ADR Version 是 2026-10-27 | 中 | 低 | `/dev-story` 提示版本不符时，按 ADR 现文核对任务里的 ADR 摘要 |
| 写入检查在工作区路径下误报“production/ 之外”（只警告） | 高 | 低 | 已记入 `production/trial-notes.md`；不影响写入 |

## Dependencies on External Factors
- 无。基准机测速（story-016）不在本冲刺。

## Definition of Done for this Sprint
- [ ] All Must Have tasks completed
- [ ] All tasks pass acceptance criteria
- [ ] QA plan exists (`production/qa/qa-plan-sprint-001-[date].md`, from `/qa-plan sprint`)
- [ ] All Logic/Integration stories have passing unit/integration tests
- [ ] 规则层纯净检查通过（`tests/integration/architecture/rules-layer-purity.test.mjs`）
- [ ] Smoke check passed (`/smoke-check sprint`)
- [ ] QA sign-off report: APPROVED or APPROVED WITH CONDITIONS (`/team-qa sprint`)
- [ ] No S1 or S2 bugs in delivered features
- [ ] Design documents updated for any deviations
- [ ] Code reviewed and merged
