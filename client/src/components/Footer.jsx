import { BrandMark } from "./Brand";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <span className="row" style={{ gap: 8 }}>
          <BrandMark size={18} />
          Polyhouse · AI-Powered Smart Agriculture
        </span>
        <span>&copy; {new Date().getFullYear()} Polyhouse. All rights reserved.</span>
      </div>
    </footer>
  );
}
