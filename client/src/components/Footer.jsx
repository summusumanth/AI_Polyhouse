<<<<<<< HEAD
import { BrandMark } from "./Brand";
=======
import { Leaf } from "lucide-react";
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <span className="row" style={{ gap: 8 }}>
<<<<<<< HEAD
          <BrandMark size={18} />
          Polyhouse · AI-Powered Smart Agriculture
=======
          <Leaf size={15} style={{ color: "var(--accent)" }} />
          Polyhouse monitoring platform
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
        </span>
        <span>&copy; {new Date().getFullYear()} Polyhouse. All rights reserved.</span>
      </div>
    </footer>
  );
}
