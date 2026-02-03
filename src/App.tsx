import { NodeLibrary, PropertiesPanel, CenterPanel } from './components/nodes';
import { NodeToast } from './components/nodes/NodeToast';

function App() {
  return (
    <div className="flex h-screen overflow-hidden">
      <NodeLibrary />
      <CenterPanel />
      <PropertiesPanel />
      <NodeToast />
    </div>
  );
}

export default App;
