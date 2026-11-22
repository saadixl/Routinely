export default function Empty({ icon, title, children, action }) {
  return (
    <div className="empty fade-in">
      {icon && <div className="empty-icon">{icon}</div>}
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
