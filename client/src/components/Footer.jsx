import { Leaf } from "lucide-react";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <span className="row" style={{ gap: 8 }}>
          <Leaf size={15} style={{ color: "var(--accent)" }} />
          Polyhouse monitoring platform
        </span>
        <span>&copy; {new Date().getFullYear()} Polyhouse. All rights reserved.</span>
      </div>
    </footer>
  );
}
