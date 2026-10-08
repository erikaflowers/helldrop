import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import './App.css';

function App() {
  return (
    <div className="app">
      <Header />
      <div className="app-body">
        <Sidebar />
        <main className="app-content">
          <p className="app-placeholder">Standing by for deployment orders.</p>
        </main>
      </div>
    </div>
  );
}

export default App;
