import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { NewsTab } from '@/components/NewsTab';
import { CVEsTab } from '@/components/CVEsTab';
import { AboutTab } from '@/components/AboutTab';
import { SourcesTab } from '@/components/SourcesTab';

const TABS: Record<string, React.FC> = {
  news: NewsTab,
  cves: CVEsTab,
  about: AboutTab,
  quellen: SourcesTab,
};

const Index = () => {
  const [activeTab, setActiveTab] = useState('news');
  const ActiveComponent = TABS[activeTab] || NewsTab;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="container mx-auto px-4 py-6 flex-1">
        <ActiveComponent />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
