export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

export function PageLoader({ label = "Loading" }) {
  return (
    <div className="page-loader">
      <Spinner />
      <span className="faint">{label}...</span>
    </div>
  );
}
