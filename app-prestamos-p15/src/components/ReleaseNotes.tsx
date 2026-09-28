// Release bodies are Markdown bullet lists; show them open so nobody has to hunt for them.
export function ReleaseNotes({ notes }: { notes: string }) {
  const items = notes.split("\n").map((line) => line.trim()).filter((line) => /^[-*] /.test(line)).map((line) => line.slice(2));
  if (!items.length) return <pre className="update-notes">{notes}</pre>;
  return (
    <ul className="update-notes-list">
      {items.map((item, index) => <li key={index}>{item}</li>)}
    </ul>
  );
}
