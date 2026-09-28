const variantClass = {
  success: "tag-success",
  warn: "tag-warn",
  danger: "tag-danger",
  neutral: "tag-neutral",
};

export default function TagListCard({ title, items, missingItems, variant = "neutral", empty }) {
  const list = items?.length ? items : [];
  const missingList = missingItems?.length ? missingItems : [];
  return (
    <article className="card">
      <h3 className="card-title">{title}</h3>
      {list.length === 0 && missingList.length === 0 ? (
        <p className="empty-msg">{empty}</p>
      ) : (
        <>
          <div className="keyword-group">
            <p className="keyword-label">Found</p>
            {list.length ? <ul className="tag-list">
              {list.map((item, i) => (
                <li key={`${item}-${i}`} className={`tag ${variantClass[variant] || variantClass.neutral}`}>
                  {item}
                </li>
              ))}
            </ul> : <p className="empty-msg">No shared keywords found.</p>}
          </div>
          {missingItems && <div className="keyword-group keyword-group-missing">
            <p className="keyword-label">Missing</p>
            {missingList.length ? <ul className="tag-list">
              {missingList.map((item, i) => (
                <li key={`${item}-${i}`} className="tag tag-danger">{item}</li>
              ))}
            </ul> : <p className="empty-msg">No missing keywords flagged.</p>}
          </div>}
        </>
      )}
    </article>
  );
}
