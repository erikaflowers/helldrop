import { useAppDispatch, actions } from '../../core/store.jsx';
import './Header.css';

function Header() {
  const dispatch = useAppDispatch();

  const toggleSidebar = () => dispatch({ type: actions.TOGGLE_SIDEBAR });

  return (
    <header className="header">
      <div className="header-left">
        <button
          className="header-sidebar-toggle"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          &#9776;
        </button>
        <h1 className="header-title">
          <span className="header-title-accent">HELL</span>DROP
        </h1>
      </div>
      <div className="header-right">
        <span className="header-version">v1.2.0</span>
      </div>
    </header>
  );
}

export default Header;
