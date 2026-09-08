import type { ViewId } from "../data/types";

const LINKS: { id: ViewId; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "practice", label: "Practice" },
  { id: "configs", label: "Configs" },
  { id: "stats", label: "Graphs" },
  { id: "changelog", label: "Changes" },
];

interface NavProps {
  view: ViewId;
  onChange: (view: ViewId) => void;
}

export function Nav({ view, onChange }: NavProps) {
  return (
    <nav className="nav">
      {LINKS.map((link) => (
        <button
          key={link.id}
          type="button"
          className={view === link.id ? "nav-btn active" : "nav-btn"}
          onClick={() => onChange(link.id)}
        >
          {link.label}
        </button>
      ))}
    </nav>
  );
}
