export default function Pill({ color, children, className = '', ...rest }) {
  return (
    <span className={`pill ${className}`} style={{ '--c': color }} {...rest}>
      <span className="dot" />
      <span className="label">{children}</span>
    </span>
  );
}
