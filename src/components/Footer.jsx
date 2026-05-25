import "../styles/Footer.css"

function Footer() {
  return (
    <footer className="footer">
      &copy; {new Date().getFullYear()} | Developed by &nbsp;<a href="https://github.com/kishor404" target="_blank" rel="noopener noreferrer">Kishor404</a>
    </footer>
  );
}

export default Footer;