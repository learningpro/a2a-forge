import { createContext, useContext, type ReactNode } from "react";
import { useUiStore, type Locale } from "../stores/uiStore";

const translations: Record<string, { en: string; zh: string }> = {
  // Sidebar
  "sidebar.agents": { en: "Agents", zh: "代理" },
  "sidebar.workspace": { en: "Workspace", zh: "工作区" },
  "sidebar.addAgentCard": { en: "Add agent card", zh: "添加代理卡片" },
  "sidebar.addAgent": { en: "+ Add agent", zh: "+ 添加代理" },
  "sidebar.createWorkspace": { en: "Create workspace", zh: "创建工作区" },
  "sidebar.collapse": { en: "Collapse sidebar", zh: "收起侧栏" },
  "sidebar.expand": { en: "Expand sidebar", zh: "展开侧栏" },

  // Empty states
  "empty.noAgents": { en: "No agents yet", zh: "暂无代理" },
  "empty.noAgentsDesc": { en: "Add your first A2A agent to get started.", zh: "添加你的第一个 A2A 代理开始使用。" },
  "empty.noAgentSelected": { en: "No agent selected", zh: "未选择代理" },
  "empty.noAgentSelectedDesc": { en: "Select an agent from the sidebar to browse its skills.", zh: "从侧栏选择一个代理来浏览其技能。" },
  "empty.noSkillsFound": { en: "No skills found", zh: "未找到技能" },
  "empty.noSkillsFoundDesc": { en: "Try a different search term or filter.", zh: "尝试不同的搜索词或筛选条件。" },
  "empty.readyToTest": { en: "Ready to test", zh: "准备测试" },
  "empty.readyToTestDesc": { en: "Pick an agent from the sidebar, then select a skill to start sending requests.", zh: "从侧栏选择代理，然后选择技能开始发送请求。" },
  "empty.resultsHere": { en: "Results will appear here", zh: "结果将显示在这里" },
  "empty.resultsHereDesc": { en: "Run a test to see the response, latency, and status.", zh: "运行测试查看响应、延迟和状态。" },
  "empty.noSuites": { en: "No test suites yet", zh: "暂无测试套件" },
  "empty.noSuitesDesc": { en: "Create a suite to group test cases into automated sequences.", zh: "创建套件将测试用例组织为自动化序列。" },
  "empty.selectSuite": { en: "Select a test suite", zh: "选择测试套件" },
  "empty.selectSuiteDesc": { en: "Pick a suite from the list or create a new one to start automating tests.", zh: "从列表中选择套件或创建新套件开始自动化测试。" },
  "empty.noRules": { en: "No intercept rules", zh: "暂无拦截规则" },
  "empty.noRulesDesc": { en: "Create a rule to modify, delay, or mock requests passing through the proxy.", zh: "创建规则来修改、延迟或模拟通过代理的请求。" },
  "empty.noCommunity": { en: "No agents in directory", zh: "目录中暂无代理" },
  "empty.noCommunityDesc": { en: "Add your agents to the local directory for quick access.", zh: "将代理添加到本地目录以便快速访问。" },
  "empty.noEnvVars": { en: "No environment variables", zh: "暂无环境变量" },
  "empty.noEnvVarsDesc": { en: "Add variables to use {{VAR_NAME}} substitution in request chains.", zh: "添加变量以在请求链中使用 {{VAR_NAME}} 替换。" },

  // Tabs
  "tab.test": { en: "Test", zh: "测试" },
  "tab.suites": { en: "Suites", zh: "套件" },
  "tab.proxy": { en: "Proxy", zh: "代理" },
  "tab.community": { en: "Directory", zh: "目录" },
  "tab.workspace": { en: "Workspace", zh: "工作区" },

  // SkillPanel
  "skill.searchPlaceholder": { en: "Search skills...", zh: "搜索技能..." },
  "skill.noSkillSelected": { en: "No skill selected", zh: "未选择技能" },

  // Actions
  "action.newSuite": { en: "+ New suite", zh: "+ 新建套件" },
  "suite.import": { en: "Import suite", zh: "导入套件" },
  "suite.export": { en: "Export suite", zh: "导出套件" },
  "action.newRule": { en: "+ New rule", zh: "+ 新建规则" },
  "action.run": { en: "Run", zh: "运行" },
  "action.done": { en: "Done", zh: "完成" },
  "action.cancel": { en: "Cancel", zh: "取消" },
  "action.save": { en: "Save", zh: "保存" },
  "action.add": { en: "Add", zh: "添加" },
  "action.delete": { en: "Delete", zh: "删除" },
  "action.search": { en: "Search", zh: "搜索" },
  "action.start": { en: "Start", zh: "启动" },
  "action.stop": { en: "Stop", zh: "停止" },

  // Settings
  "settings.title": { en: "Settings", zh: "设置" },
  "settings.appearance": { en: "Appearance", zh: "外观" },
  "settings.language": { en: "Language", zh: "语言" },
  "settings.data": { en: "Data", zh: "数据" },
  "settings.about": { en: "About", zh: "关于" },
  "settings.theme": { en: "Theme", zh: "主题" },
  "settings.themeSystem": { en: "System", zh: "跟随系统" },
  "settings.themeLight": { en: "Light", zh: "浅色" },
  "settings.themeDark": { en: "Dark", zh: "深色" },
  "settings.timeout": { en: "Default Timeout (ms)", zh: "默认超时 (ms)" },
  "settings.proxyUrl": { en: "Proxy URL", zh: "代理 URL" },
  "settings.telemetry": { en: "Enable telemetry", zh: "启用遥测" },
  "settings.languageLabel": { en: "Display Language", zh: "显示语言" },
  "settings.dataPath": { en: "Data Storage Path", zh: "数据存储路径" },
  "settings.dataPathDesc": { en: "Where your agents, history, and test data are stored.", zh: "代理、历史记录和测试数据的存储位置。" },
  "settings.changePath": { en: "Change Path", zh: "更改路径" },
  "settings.restartRequired": { en: "Restart required to apply the new data path.", zh: "需要重启应用以应用新的数据路径。" },
  "settings.version": { en: "Version", zh: "版本" },
  "settings.license": { en: "License", zh: "许可证" },
  "settings.author": { en: "Author", zh: "作者" },
  "settings.github": { en: "GitHub", zh: "GitHub" },
  "settings.description": { en: "A desktop workbench for discovering, inspecting, and testing A2A protocol agents.", zh: "用于发现、检查和测试 A2A 协议代理的桌面工作台。" },

  // Proxy
  "proxy.localProxy": { en: "Local Proxy", zh: "本地代理" },
  "proxy.stopped": { en: "Stopped", zh: "已停止" },
  "proxy.running": { en: "Running", zh: "运行中" },
  "proxy.rules": { en: "Rules", zh: "规则" },
  "proxy.recording": { en: "Recording", zh: "录制" },
  "proxy.traffic": { en: "Traffic", zh: "流量" },
  "proxy.interceptRules": { en: "INTERCEPT RULES", zh: "拦截规则" },

  // Agent Directory
  "community.directory": { en: "Directory", zh: "目录" },
  "community.favorites": { en: "Favorites", zh: "收藏" },
  "community.health": { en: "Health", zh: "健康" },
  "community.searchPlaceholder": { en: "Search agents...", zh: "搜索代理..." },

  // Workspace
  "workspace.variables": { en: "Variables", zh: "变量" },
  "workspace.chains": { en: "Chains", zh: "链" },
  "workspace.diff": { en: "Diff", zh: "对比" },
  "workspace.export": { en: "Export", zh: "导出" },

  // App
  "app.initializing": { en: "Initializing…", zh: "初始化中…" },
  "app.dbFailed": { en: "Database initialization failed", zh: "数据库初始化失败" },

  // Suite extras
  "suite.testSuites": { en: "TEST SUITES", zh: "测试套件" },
  "suite.new": { en: "+ New", zh: "+ 新建" },
  "suite.loading": { en: "Loading suites…", zh: "加载套件中…" },
  "suite.namePlaceholder": { en: "Suite name…", zh: "套件名称…" },
  "suite.deleteSuite": { en: "Delete suite", zh: "删除套件" },
  "suite.selectToEdit": { en: "Select a suite to edit", zh: "选择一个套件进行编辑" },
  "suite.clickToRename": { en: "Click to rename", zh: "点击重命名" },
  "suite.sequential": { en: "Sequential", zh: "顺序执行" },
  "suite.parallel": { en: "Parallel", zh: "并行执行" },
  "suite.steps": { en: "Steps", zh: "步骤" },
  "suite.addStep": { en: "+ Add", zh: "+ 添加" },
  "suite.noSteps": { en: "No steps yet. Add a step to define what to test.", zh: "暂无步骤。添加步骤来定义测试内容。" },
  "suite.edit": { en: "Edit", zh: "编辑" },
  "suite.runningSuite": { en: "Running…", zh: "运行中…" },
  "suite.runSuite": { en: "Run Suite", zh: "运行套件" },
  "suite.runningSuiteStatus": { en: "Running suite…", zh: "正在运行套件…" },
  "suite.runResults": { en: "Run a suite to see results here", zh: "运行套件后在此查看结果" },
  "suite.runHistory": { en: "Run History", zh: "运行历史" },
  "suite.previousRuns": { en: "Previous Runs", zh: "历史运行" },
  "suite.passed": { en: "passed", zh: "通过" },
  "suite.rerun": { en: "Re-run", zh: "重新运行" },
  "suite.editStep": { en: "Edit Step", zh: "编辑步骤" },
  "suite.addStepTitle": { en: "Add Step", zh: "添加步骤" },
  "suite.stepName": { en: "Name", zh: "名称" },
  "suite.stepNamePlaceholder": { en: "Step name", zh: "步骤名称" },
  "suite.agent": { en: "Agent", zh: "代理" },
  "suite.skill": { en: "Skill", zh: "技能" },
  "suite.selectSkill": { en: "Select skill…", zh: "选择技能…" },
  "suite.timeout": { en: "Timeout (ms)", zh: "超时 (ms)" },
  "suite.requestJson": { en: "Request JSON", zh: "请求 JSON" },
  "suite.update": { en: "Update", zh: "更新" },
  "suite.assertions": { en: "Assertions", zh: "断言" },
  "suite.noAssertions": { en: "No assertions. Add one to validate responses.", zh: "暂无断言。添加断言来验证响应。" },
  "suite.step": { en: "step", zh: "步骤" },
  "suite.assertion": { en: "assertion", zh: "断言" },
  "suite.unknown": { en: "Unknown", zh: "未知" },
  "suite.assertionStatusEquals": { en: "Status equals", zh: "状态等于" },
  "suite.assertionJsonPathEquals": { en: "JSONPath equals", zh: "JSONPath 等于" },
  "suite.assertionJsonPathExists": { en: "JSONPath exists", zh: "JSONPath 存在" },
  "suite.assertionJsonPathContains": { en: "JSONPath contains", zh: "JSONPath 包含" },
  "suite.assertionJsonPathMatches": { en: "JSONPath matches regex", zh: "JSONPath 正则匹配" },
  "suite.assertionResponseTimeLt": { en: "Response time <", zh: "响应时间 <" },
  "suite.assertionContainsMedia": { en: "Contains media URL", zh: "包含媒体 URL" },
  "suite.expectedValue": { en: "expected value", zh: "期望值" },
  "suite.got": { en: "got:", zh: "实际:" },
  "suite.error": { en: "Error:", zh: "错误:" },

  // Community extras
  "community.search": { en: "Search", zh: "搜索" },
  "community.shareAgents": { en: "Share Your Agents", zh: "分享你的代理" },
  "community.quickFavorite": { en: "Quick Favorite", zh: "快速收藏" },
  "community.noFavorites": { en: "No favorites yet. Star agents to add them here.", zh: "暂无收藏。收藏代理后将显示在这里。" },
  "community.agentHealth": { en: "Agent Health", zh: "代理健康" },
  "community.checking": { en: "Checking…", zh: "检查中…" },
  "community.checkAll": { en: "Check All", zh: "全部检查" },
  "community.noAgentsToMonitor": { en: "No agents to monitor. Add agents first.", zh: "暂无可监控的代理。请先添加代理。" },
  "community.notChecked": { en: "Not checked", zh: "未检查" },
  "community.check": { en: "Check", zh: "检查" },
  "agent.addTitle": { en: "Add agent card", zh: "添加代理卡片" },
  "agent.addSubtitle": { en: "Enter the base URL of the agent. The workbench will fetch the well-known card from", zh: "输入代理的 URL，工作台将从以下地址获取卡片" },
  "agent.baseUrl": { en: "Base URL", zh: "基础 URL" },
  "agent.nickname": { en: "Nickname (optional)", zh: "昵称（可选）" },
  "agent.preview": { en: "Preview", zh: "预览" },
  "agent.previewHint": { en: "Enter a URL to preview the agent card", zh: "输入 URL 预览代理卡片" },
  "agent.fetching": { en: "Fetching agent.json...", zh: "正在获取 agent.json..." },
  "agent.addButton": { en: "Add agent", zh: "添加代理" },
  "agent.fetchError": { en: "Failed to fetch agent card", zh: "获取代理卡片失败" },
  "agent.addError": { en: "Failed to add agent", zh: "添加代理失败" },
  "agent.more": { en: "more", zh: "更多" },

  // TestPanel
  "test.copyCurl": { en: "Copy as curl (Cmd+Shift+C)", zh: "复制为 curl (Cmd+Shift+C)" },
  "test.copied": { en: "Copied!", zh: "已复制!" },
  "test.curl": { en: "curl", zh: "curl" },
  "test.running": { en: "Running\u2026", zh: "运行中\u2026" },
  "test.savedTests": { en: "Saved Tests", zh: "已保存测试" },
  "test.history": { en: "History", zh: "历史记录" },
  "test.loading": { en: "Loading…", zh: "加载中…" },
  "test.noSavedTests": { en: "No saved tests for this skill", zh: "该技能暂无已保存测试" },
  "test.testNamePlaceholder": { en: "Test case name…", zh: "测试用例名称…" },
  "test.saveCurrent": { en: "Save current", zh: "保存当前" },

  // Proxy extras
  "proxy.runningOn": { en: "Running on", zh: "运行于" },
  "proxy.newRule": { en: "+ New", zh: "+ 新建" },
  "proxy.ruleName": { en: "Rule name", zh: "规则名称" },
  "proxy.matchAll": { en: "Match All", zh: "匹配全部" },
  "proxy.matchAgent": { en: "Match Agent", zh: "匹配代理" },
  "proxy.matchSkill": { en: "Match Skill", zh: "匹配技能" },
  "proxy.matchMethod": { en: "Match Method", zh: "匹配方法" },
  "proxy.actionDelay": { en: "Delay", zh: "延迟" },
  "proxy.actionError": { en: "Error", zh: "错误" },
  "proxy.actionMock": { en: "Mock Response", zh: "模拟响应" },
  "proxy.actionModifyReq": { en: "Modify Request", zh: "修改请求" },
  "proxy.actionModifyResp": { en: "Modify Response", zh: "修改响应" },
  "proxy.create": { en: "Create", zh: "创建" },
  "proxy.allRequests": { en: "All requests", zh: "所有请求" },
  "proxy.enable": { en: "Enable", zh: "启用" },
  "proxy.disable": { en: "Disable", zh: "禁用" },
  "proxy.recordingActive": { en: "Recording...", zh: "录制中..." },
  "proxy.sessionName": { en: "Session name...", zh: "会话名称..." },
  "proxy.record": { en: "Record", zh: "录制" },
  "proxy.noRecordings": { en: "No recordings yet. Start the proxy and record traffic.", zh: "暂无录制。启动代理并录制流量。" },
  "proxy.view": { en: "View", zh: "查看" },
  "proxy.replay": { en: "Replay", zh: "回放" },
  "proxy.noTraffic": { en: "No traffic records. View or replay a recording session to see traffic here.", zh: "暂无流量记录。查看或回放录制会话以查看流量。" },
  "proxy.request": { en: "Request:", zh: "请求:" },
  "proxy.response": { en: "Response:", zh: "响应:" },

  // Workspace extras
  "workspace.varName": { en: "VAR_NAME", zh: "变量名" },
  "workspace.varValue": { en: "value", zh: "值" },
  "workspace.secret": { en: "Secret", zh: "密钥" },
  "workspace.newChain": { en: "New chain...", zh: "新建链..." },
  "workspace.chainHint": { en: "Select or create a chain. Chains pipe the output of one skill into the next using {{variable}} substitution.", zh: "选择或创建链。链通过 {{variable}} 替换将一个技能的输出传递给下一个。" },
  "workspace.steps": { en: "Steps", zh: "步骤" },
  "workspace.addStep": { en: "+ Step", zh: "+ 步骤" },
  "workspace.stepName": { en: "Step name", zh: "步骤名称" },
  "workspace.agentPlaceholder": { en: "Agent...", zh: "代理..." },
  "workspace.skillPlaceholder": { en: "Skill...", zh: "技能..." },
  "workspace.requestJson": { en: "Request JSON (use {{var}} for substitution)", zh: "请求 JSON（使用 {{var}} 替换）" },
  "workspace.extractJson": { en: "Extract: {\"varName\": \"$.result.url\"}", zh: "提取: {\"varName\": \"$.result.url\"}" },
  "workspace.responseA": { en: "Response A", zh: "响应 A" },
  "workspace.responseB": { en: "Response B", zh: "响应 B" },
  "workspace.pasteJson": { en: "Paste JSON response...", zh: "粘贴 JSON 响应..." },
  "workspace.compare": { en: "Compare", zh: "对比" },
  "workspace.identical": { en: "Identical", zh: "完全一致" },
  "workspace.exportClipboard": { en: "Export Workspace to Clipboard", zh: "导出工作区到剪贴板" },
  "workspace.pasteImport": { en: "Paste workspace JSON...", zh: "粘贴工作区 JSON..." },
  "workspace.import": { en: "Import Workspace", zh: "导入工作区" },

  // InputForm
  "input.message": { en: "message", zh: "消息" },
  "input.contextData": { en: "context data", zh: "上下文数据" },
  "input.headers": { en: "headers", zh: "请求头" },
  "input.placeholder": { en: "Enter test message…", zh: "输入测试消息…" },
  "input.loadingEditor": { en: "Loading editor…", zh: "加载编辑器…" },
  "input.headerName": { en: "Header name", zh: "请求头名称" },
  "input.headerValue": { en: "Value", zh: "值" },
  "input.addHeader": { en: "+ Add header", zh: "+ 添加请求头" },
  "input.dropFile": { en: "Drop a file here or click to select", zh: "拖放文件到此处或点击选择" },
  "input.examples": { en: "Examples", zh: "示例" },

  // HistoryList
  "history.justNow": { en: "just now", zh: "刚刚" },
  "history.mAgo": { en: "m ago", zh: "分钟前" },
  "history.hAgo": { en: "h ago", zh: "小时前" },
  "history.searchPlaceholder": { en: "Search history…", zh: "搜索历史…" },
  "history.loading": { en: "Loading…", zh: "加载中…" },
  "history.empty": { en: "No test history yet", zh: "暂无测试历史" },
  "history.clearConfirm": { en: "Clear history for", zh: "清除历史记录：" },
  "history.clearHistory": { en: "Clear history", zh: "清除历史" },
  "history.clearAll": { en: "Clear all history", zh: "清除所有历史" },

  // Workspace extras
  "workspace.imported": { en: "Imported as workspace:", zh: "已导入为工作区：" },

  "workspace.extracted": { en: "Extracted:", zh: "已提取:" },

  // Sidebar extras
  "sidebar.default": { en: "Default", zh: "默认" },
};

type I18nContextType = {
  t: (key: string) => string;
  locale: Locale;
};

const I18nContext = createContext<I18nContextType>({
  t: (key) => key,
  locale: "en",
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useUiStore((s) => s.locale);

  const t = (key: string): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[locale] ?? entry.en ?? key;
  };

  return (
    <I18nContext.Provider value={{ t, locale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  return useContext(I18nContext);
}
