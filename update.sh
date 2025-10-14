#!/usr/bin/env bash
# 用法：
#   ./update.sh "feat: 更新了倒计时"
#   ./update.sh --stash "fix: 临时改动，先拉再还原"
set -e

# 检查是否在 Git 仓库内
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "❌ 这里不是 Git 仓库目录"; exit 1; }

# 当前分支名
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

# 解析参数
STASH_MODE=false
MSG=""
for arg in "$@"; do
  if [[ "$arg" == "--stash" ]]; then
    STASH_MODE=true
  else
    MSG="$arg"
  fi
done

# 提交信息：如果没传，则用时间戳
if [[ -z "$MSG" ]]; then
  MSG="chore: update $(date '+%Y-%m-%d %H:%M:%S')"
fi

echo "🔎 当前分支：$BRANCH"
echo "📝 提交说明：$MSG"
echo "🧰 模式：$([[ "$STASH_MODE" == true ]] && echo '安全模式(先stash)' || echo '普通模式')"

# 确保远程存在
if ! git remote get-url origin >/dev/null 2>&1; then
  echo "❌ 未配置远程 origin。请先执行：git remote add origin <你的仓库URL>"
  exit 1
fi

# 1) 普通提交（把本地改动存档）
git add -A
if git diff --cached --quiet; then
  echo "ℹ️ 没有需要提交的改动。跳过 commit。"
else
  git commit -m "$MSG"
fi

# 2) 拉取远端（可选 stash）
if [[ "$STASH_MODE" == true ]]; then
  echo "📦 临时保存未提交改动（包含未跟踪文件）"
  git stash -u || true
  set +e
  git pull --rebase origin "$BRANCH"
  PULL_STATUS=$?
  set -e
  echo "📦 取出临时改动（如有冲突请按提示处理）"
  git stash pop || true
  if [[ $PULL_STATUS -ne 0 ]]; then
    echo "⚠️ pull 发生冲突，请根据提示解决后："
    echo "   1) 解决冲突并执行：git add <冲突文件>"
    echo "   2) 继续 rebase：git rebase --continue"
    echo "   3) 再执行：git push origin $BRANCH"
    exit 1
  fi
else
  git pull --rebase origin "$BRANCH"
fi

# 3) 推送
git push origin "$BRANCH"

echo "✅ 同步完成：本地 ⇄ GitHub（origin/$BRANCH）"
