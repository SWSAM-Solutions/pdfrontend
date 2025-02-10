import React from 'react';

const DisplayResults = ({ pdResults }) => {
  if (!pdResults || !pdResults.data) return null;

//   console.log(pdResults,"asdakjsdlka");
  const { pd_mm, confidence } = pdResults.data;
  
  // Round PD value based on decimal part
  const pdNumber = parseFloat(pd_mm);
  const decimalPart = pdNumber % 1;
  const roundedPD = decimalPart >= 0.5 ? Math.ceil(pdNumber) : Math.floor(pdNumber);
    
  // Determine confidence level class
  const getConfidenceClass = (confidenceValue:any) => {
    if (confidenceValue >= 90) return 'text-green-600';
    if (confidenceValue >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="mt-4 p-6 bg-white rounded-xl shadow-lg border border-gray-100">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Measurement Results</h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Pupillary Distance:</span>
          <span className="text-2xl font-bold text-gray-900">{roundedPD} mm</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Confidence:</span>
          <span className={`text-lg font-semibold ${getConfidenceClass(confidence)}`}>
            {Math.round(confidence)}%
          </span>
        </div>
      </div>
      
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-700">
            Low confidence score. Consider retaking the measurement for better accuracy.
          </p>
        </div>
    
    </div>
  );
};

export default DisplayResults;