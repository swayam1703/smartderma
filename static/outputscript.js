document.addEventListener('DOMContentLoaded', function() {
  // Get stored data
  const results = JSON.parse(localStorage.getItem('analysisResults'));
  const uploadedImage = localStorage.getItem('uploadedImage');
  
  // Redirect if no data
  if (!results || !uploadedImage) {
      window.location.href = 'index.html';
      return;
  }
  
  // Display image
  const resultImage = document.getElementById('resultImage');
  resultImage.src = uploadedImage;
  
  // Display metadata
  document.getElementById('uploadDate').textContent = 
      new Date(results.image_metadata?.upload_date || new Date())
      .toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  
  document.getElementById('fileName').textContent = 
      results.image_metadata?.filename || 'skin_image.jpg';
  
  // Display main diagnosis
  const confidence = results.confidence || 0;
  const confidencePercent = Math.round(confidence * 100);
  let confidenceLevel = 'low';
  
  if (confidence > 0.7) confidenceLevel = 'high';
  else if (confidence > 0.4) confidenceLevel = 'medium';
  
  const mainDiagnosis = document.getElementById('mainDiagnosis');
  mainDiagnosis.textContent = results.prediction;
  
  const confidenceBadge = document.createElement('span');
  confidenceBadge.className = `confidence-badge ${confidenceLevel}`;
  confidenceBadge.textContent = `${confidenceLevel.charAt(0).toUpperCase() + confidenceLevel.slice(1)} Confidence`;
  mainDiagnosis.appendChild(confidenceBadge);
  
  // Update probability bar
  const confidenceBar = document.getElementById('confidenceBar');
  confidenceBar.style.width = `${confidencePercent}%`;
  confidenceBar.className = `probability-fill ${confidenceLevel}-fill`;
  
  // Update labels
  document.getElementById('probabilityValue').textContent = `Probability: ${confidencePercent}%`;
  document.getElementById('confidenceLevel').textContent = `${confidenceLevel.charAt(0).toUpperCase() + confidenceLevel.slice(1)} Confidence`;
  
  // Set description
  document.getElementById('diagnosisDescription').textContent = 
      `Our AI has detected patterns consistent with ${results.prediction} with ${confidencePercent}% confidence.`;
  
  // Set recommendations
  const recommendationsList = document.getElementById('recommendationsList');
  recommendationsList.innerHTML = (results.recommendations || []).map(rec => 
      `<li>${rec}</li>`
  ).join('');
  
  // Set up buttons
  document.getElementById('downloadBtn').addEventListener('click', downloadReport);
  document.getElementById('shareBtn').addEventListener('click', shareResults);
  
  // Fixed Try Another Photo button
  const tryAnotherBtn = document.querySelector('.try-another-btn label');
  const fileInput = document.getElementById('fileInput');
  
  tryAnotherBtn.addEventListener('click', function() {
    fileInput.click();
  });
  
  fileInput.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    // 1. Show the new image immediately
    const resultImage = document.getElementById('resultImage');
    resultImage.src = URL.createObjectURL(file);
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('uploadDate').textContent = new Date().toLocaleDateString();

    // 2. Clear old analysis (critical fix!)
    localStorage.removeItem('analysisResults');

    // 3. Simulate AI processing (replace with real API later)
    setTimeout(() => {
        const newResults = generateDummyResponse(file.name);
        
        // 4. Update localStorage AND the UI
        localStorage.setItem('analysisResults', JSON.stringify(newResults));
        updateResultsUI(newResults); // This will refresh the display
    }, 1500);
});

// Helper function to update the UI
function updateResultsUI(results) {
    const confidencePercent = Math.round(results.confidence);
    
    // Update diagnosis
    document.getElementById('mainDiagnosis').textContent = results.prediction;
    document.getElementById('diagnosisDescription').textContent = 
        `Our AI detected ${results.prediction} with ${confidencePercent}% confidence.`;
    
    // Update confidence bar
    document.getElementById('confidenceBar').style.width = `${confidencePercent}%`;
    
    // Update recommendations
    document.getElementById('recommendationsList').innerHTML = 
        results.recommendations.map(r => `<li>${r}</li>`).join('');
}
  
  // Doctor finder button
  document.getElementById('findDoctorBtn').addEventListener('click', function() {
    const location = document.querySelector('.location-input').value;
    alert(`Finding dermatologists near ${location || 'your location'}...`);
  });
  
  function downloadReport() {
    const report = generateReport(results);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartDerma_Report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  function shareResults() {
    if (navigator.share) {
      navigator.share({
        title: 'My Skin Analysis Results',
        text: `SmartDerma detected ${results.prediction} with ${confidencePercent}% confidence.`,
        url: window.location.href
      }).catch(err => {
        console.error('Share failed:', err);
        alert('Could not share results. Please try another method.');
      });
    } else {
      alert('Web Share API not supported. You can copy this page URL to share.');
    }
  }
  
  function generateReport(results) {
    let report = `SMARTDERMA SKIN ANALYSIS REPORT\n\n`;
    report += `Date: ${new Date().toLocaleDateString()}\n\n`;
    report += `PRIMARY DIAGNOSIS\n`;
    report += `Condition: ${results.prediction}\n`;
    report += `Confidence: ${Math.round((results.confidence || 0) * 100)}%\n\n`;
    
    if (results.alternative_diagnoses?.length) {
      report += `ALTERNATIVE DIAGNOSES\n`;
      results.alternative_diagnoses.forEach(alt => {
        report += `- ${alt.condition} (${Math.round(alt.confidence * 100)}%)\n`;
      });
      report += `\n`;
    }
    
    report += `RECOMMENDATIONS\n`;
    results.recommendations.forEach((rec, i) => {
      report += `${i + 1}. ${rec}\n`;
    });
    
    report += `\nDISCLAIMER\n`;
    report += `This report is generated by AI and not a substitute for professional medical advice.`;
    
    return report;
  }
});