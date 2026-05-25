import { Link } from "react-router-dom";
import '../styles/Navbar.css';

import PrintLogo from "../assets/logo/VST_print.png"
function Navbar() {
  return (
    <div className="navbar-cont">
        <div className="navbar-logo">
          <img src={PrintLogo}/>
        </div>
        <div className="navbar-nav">
            <Link to="/">Home</Link>
            <Link to="/label">Label</Link>
            <Link to="/poform">PO Form</Link>
        </div>
    </div>
  );
}

export default Navbar;