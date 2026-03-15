
function App() {
  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      <h1>🎉 AI Receptionist - Frontend Working!</h1>
      <p>Your frontend has successfully deployed.</p>
      <p>Backend URL: {import.meta.env.VITE_API_URL || 'Not configured'}</p>
    </div>
  );
}

export default App;
