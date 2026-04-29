# 工作流规范实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将工作流规范写入全局 `~/.claude/CLAUDE.md`，并在当前项目中建立标准文档目录结构、迁移现有文档。

**Architecture:** 创建全局 CLAUDE.md 作为所有项目的强制工作流规则；在当前项目中按规范创建 docs/ 子目录结构，将已有文档迁移至对应位置。

**Tech Stack:** 文件系统操作、Git

---

### Task 1: 创建全局 CLAUDE.md

**Files:**
- Create: `~/.claude/CLAUDE.md`

- [ ] **Step 1: 创建 ~/.claude/CLAUDE.md，写入完整工作流规范**

文件内容需包含：
1. karpathy-guidelines 4 条行为准则核心要求
2. 全局规则（禁止未审批编码、功能分支、中文文档、完成定义）
3. 文档目录与流转规范（product/development/debug 三大类及子目录）
4. 新功能开发流程（9 步）
5. Debug 流程（9 步）

完整内容参见 `docs/product/deliverable/2026-04-29-workflow-spec-design.md`。在顶部加入引用声明，指向该设计文档。

- [ ] **Step 2: 验证文件内容完整**

确认 ~/.claude/CLAUDE.md 包含所有五个章节。

---

### Task 2: 创建标准文档目录结构

**Files:**
- Create: `docs/product/context/` (目录)
- Create: `docs/product/raw/` (目录)
- Create: `docs/product/tools/` (目录)
- Create: `docs/development/todo/` (目录)
- Create: `docs/development/doing/` (目录)
- Create: `docs/development/done/` (目录)
- Create: `docs/debug/todo/` (目录)
- Create: `docs/debug/doing/` (目录)
- Create: `docs/debug/done/` (目录)

- [ ] **Step 1: 创建所有目录**

```bash
mkdir -p docs/product/{context,raw,tools} docs/development/{todo,doing,done} docs/debug/{todo,doing,done}
```

- [ ] **Step 2: 验证目录结构**

```bash
find docs -type d | sort
```

预期输出应包含所有 9 个新子目录。

---

### Task 3: 迁移现有文档

**Files:**
- Move: `docs/technical-report.md` → `docs/product/context/technical-report.md`
- Move: `docs/superpowers/specs/2026-04-28-custom-model-provider-design.md` → `docs/product/deliverable/2026-04-28-custom-model-provider-design.md`
- Move: `docs/superpowers/plans/2026-04-28-custom-model-provider.md` → `docs/development/done/2026-04-28-custom-model-provider.md`

- [ ] **Step 1: 迁移 technical-report.md 至 context/**

```bash
mv docs/technical-report.md docs/product/context/technical-report.md
```

理由：技术报告为背景参考文档，属于 context 类型。

- [ ] **Step 2: 迁移 custom-model-provider 设计文档至 deliverable/**

```bash
mv docs/superpowers/specs/2026-04-28-custom-model-provider-design.md docs/product/deliverable/2026-04-28-custom-model-provider-design.md
```

理由：已确认的设计文档，属于 deliverable 类型。

- [ ] **Step 3: 迁移 custom-model-provider 开发计划至 done/**

```bash
mv docs/superpowers/plans/2026-04-28-custom-model-provider.md docs/development/done/2026-04-28-custom-model-provider.md
```

理由：该功能已完成（已合并到 custom-model 分支），属于 done 类型。

- [ ] **Step 4: 清理空的旧目录**

```bash
rm -rf docs/superpowers
```

- [ ] **Step 5: 验证迁移结果**

```bash
find docs -type f -not -name '.DS_Store' -not -name '.gitkeep' | sort
```

预期：
- `docs/product/context/technical-report.md`
- `docs/product/deliverable/2026-04-28-custom-model-provider-design.md`
- `docs/product/deliverable/2026-04-29-workflow-spec-design.md`
- `docs/development/done/2026-04-28-custom-model-provider.md`
- `docs/development/todo/2026-04-29-workflow-spec.md`（本计划文件）

---

### Task 4: 更新项目 CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 在 CLAUDE.md 中添加文档规范章节**

在「关键约定」章节后添加「文档规范」章节，说明本项目使用 `docs/` 标准目录结构，并引用全局工作流规范。

---

### Task 5: 提交所有变更

- [ ] **Step 1: 暂存所有变更**

```bash
git add -A
```

- [ ] **Step 2: 提交**

```bash
git commit -m "$(cat <<'EOF'
docs: 建立标准文档目录结构，迁移现有文档

- 创建 docs/product/{context,raw,deliverable,tools} 目录
- 创建 docs/development/{todo,doing,done} 目录
- 创建 docs/debug/{todo,doing,done} 目录
- 迁移现有文档至新结构
- 更新 CLAUDE.md 添加文档规范说明
EOF
)"
```

- [ ] **Step 3: 验证提交**

```bash
git status
git log --oneline -1
```
