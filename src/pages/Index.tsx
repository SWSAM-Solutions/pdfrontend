
import Header from '@/components/Header';
import PDMeasurement from '@/components/PDMeasurement';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand via-accent to-warm">
      <Header />
      <main className="container mx-auto px-4 pt-32 pb-16">
        <div className="max-w-5xl mx-auto space-y-16">
          <div className="text-center space-y-6 animate-fade-in">
            <span className="inline-block px-6 py-2 text-sm font-medium bg-white/10 rounded-full text-white">
              Professional PD Measurement
            </span>
            <h2 className="text-5xl font-bold tracking-tight text-white">
              Measure Your Pupillary Distance
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Get accurate measurements for your perfect eyewear fit using our advanced digital tools
            </p>
          </div>
          
          <div className="flex justify-center animate-fade-in">
            <PDMeasurement />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
