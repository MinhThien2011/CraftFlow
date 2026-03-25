import { useState } from 'react';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Materials } from './pages/Materials';
import { Restock } from './pages/Restock';
import { History } from './pages/History';
import { Products } from './pages/Products';
function AppContent() {
  const { user } = useInventory();
  const [activeTab, setActiveTab] = useState('dashboard');
  if (!user) {
    return <Login />;
  }
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'materials':
        return <Materials />;
      case 'restock':
        return <Restock />;
      case 'history':
        return <History />;
      case 'products':
        return <Products />;
      default:
        return <Dashboard />;
    }
  };
  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>);

}
export function App() {
  return (
    <InventoryProvider>
      <AppContent />
    </InventoryProvider>);

}