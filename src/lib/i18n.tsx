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
  "empty.noCommunity": { en: "No community agents yet", zh: "暂无社区代理" },
  "empty.noCommunityDesc": { en: "Share your agents to build the directory and discover others.", zh: "分享你的代理来构建目录并发现其他代理。" },
  "empty.noEnvVars": { en: "No environment variables", zh: "暂无环境变量" },
  "empty.noEnvVarsDesc": { en: "Add variables to use {{VAR_NAME}} substitution in request chains.", zh: "添加变量以在请求链中使用 {{VAR_NAME}} 替换。" },

  // Tabs
  "tab.test": { en: "Test", zh: "测试" },
  "tab.suites": { en: "Suites", zh: "套件" },
  "tab.proxy": { en: "Proxy", zh: "代理" },
  "tab.community": { en: "Community", zh: "社区" },
  "tab.workspace": { en: "Workspace", zh: "工作区" },

  // SkillPanel
  "skill.searchPlaceholder": { en: "Search skills...", zh: "搜索技能..." },
  "skill.noSkillSelected": { en: "No skill selected", zh: "未选择技能" },

  // Actions
  "action.newSuite": { en: "+ New suite", zh: "+ 新建套件" },
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

  // Community
  "community.directory": { en: "Directory", zh: "目录" },
  "community.favorites": { en: "Favorites", zh: "收藏" },
  "community.health": { en: "Health", zh: "健康" },
  "community.searchPlaceholder": { en: "Search community agents...", zh: "搜索社区代理..." },

  // Workspace
  "workspace.variables": { en: "Variables", zh: "变量" },
  "workspace.chains": { en: "Chains", zh: "链" },
  "workspace.diff": { en: "Diff", zh: "对比" },
  "workspace.export": { en: "Export", zh: "导出" },

  // Suite
  "suite.testSuites": { en: "TEST SUITES", zh: "测试套件" },
  "suite.new": { en: "+ New", zh: "+ 新建" },
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
