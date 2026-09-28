export default function BulletCard({ title, items, empty, className = "" }) {
  const list = items?.length ? items : [];
  return (
    <article className={`card ${className}`.trim()}>
      <h3 className="card-title">{title}</h3>
      {list.length === 0 ? (
        <p className="empty-msg">{empty}</p>
      ) : (
        <ul className="bullet-list">
          {list.map((item, i) => (
            <li key={`${i}-${item.slice(0, 24)}`}>{item}</li>
          ))}
        </ul>
      )}
    </article>
  );
}
