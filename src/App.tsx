import { useTheme } from "./hooks/useTheme";
import { AppShell } from "./components/layout/AppShell";

function App() {
  useTheme();
  return <AppShell />;
}

export default App;
