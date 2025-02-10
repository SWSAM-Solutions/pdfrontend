
import { Button } from '@/components/ui/button';
import { Ruler, History, HelpCircle } from 'lucide-react';

const Header = () => {
  return (
    <header className="w-full py-6 px-6 bg-brand/10 backdrop-blur-md border-b border-white/10 animate-slide-in fixed top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler className="w-6 h-6 text-white" />
          <h1 className="text-xl font-bold text-white">
            PD Measure Pro
          </h1>
        </div>
        <nav className="flex items-center gap-6">
          <Button variant="ghost" className="text-white hover:bg-white/10 gap-2">
            <HelpCircle className="w-4 h-4" />
            How It Works
          </Button>
        
        </nav>
      </div>
    </header>
  );
};

export default Header;
