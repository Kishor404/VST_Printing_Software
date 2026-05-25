import "../styles/Home.css";
import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="home">

      {/* HERO */}
      <section className="home-hero">
        <div className="home-hero-content">

          <span className="home-badge">
            VST Printing Software
          </span>

          <h1>
            Smart Printing <br />
            Tools for Business
          </h1>

          <p>
            Create professional parcel labels and sale order forms
            with live preview, print optimization, and advanced
            customization.
          </p>

          <div className="home-hero-btns">
            <Link to="/label" className="home-btn-primary">
              Open Label Generator
            </Link>

            <Link to="/poform" className="home-btn-secondary">
              Open PO Form
            </Link>
          </div>

        </div>

        <div className="home-hero-card">

          <div className="home-preview-window">
            <div className="home-preview-topbar">
              <span></span>
              <span></span>
              <span></span>
            </div>

            <div className="home-preview-body">

              <div className="preview-label-card">
                <div className="preview-title">Parcel Label</div>

                <div className="preview-lines">
                  <div></div>
                  <div></div>
                  <div></div>
                </div>

                <div className="preview-grid">
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              </div>

              <div className="preview-po-card">
                <div className="preview-title">PO Form</div>

                <div className="preview-table">
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

    </div>
  );
}

export default Home;