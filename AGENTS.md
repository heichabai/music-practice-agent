# Git 规则

## 提交纪律
- 完成一个小功能或修复后主动提醒我提交，不要攒一大堆改动
- 提交前必须依次执行：git status、git diff、git log --oneline -10
- 只暂存本次任务相关的文件，绝不使用 git add -A 盲目全加
- 绝不提交：密钥、.env、token、日志、临时文件、node_modules
- commit message 用 Conventional Commits 格式，参考仓库历史风格：
  - feat: 新功能
  - fix: 修复 bug
  - refactor: 重构
  - docs: 文档
  - test: 测试
  - chore: 杂项
- message 用祈使句、一行以内说清楚，必要时 body 补充"为什么"

## 安全红线
- 未经我明确要求，绝不：commit、push、amend、force-push、rebase、创建 PR
- 绝不 force-push，绝不修改已推送的提交
- 绝不跳过或修改 git hooks、git config
- 提交被 hooks 拒绝时：修复问题后新建提交，不要 amend

## 分支策略
- 大重构、实验性改动、新功能：先建分支 feature/<名字> 或 fix/<名字>
- 主分支只放验证过的代码，实验失败直接删分支

## 修复翻车
- 改动还没提交就崩了：git restore <文件>
- 提交后发现有问题：优先 revert，而不是 reset --hard
- 任何破坏性命令（reset --hard、clean -f）执行前必须先向我确认
