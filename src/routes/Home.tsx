import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function normalizeTarget(input: string) {
  return input.trim().replace(/^@/, "");
}

export default function Home() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");

  const target = useMemo(() => normalizeTarget(value), [value]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!target) return;
    navigate(`/${encodeURIComponent(target)}`);
  }

  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <div className="title">
            <h1>xmtp.im</h1>
            <p>One-off XMTP conversations (production network only)</p>
          </div>
          <div className="pill">
            <strong>Tip</strong> open <span>/name.eth</span>
          </div>
        </div>
        <div className="content">
          <form onSubmit={onSubmit} className="grid">
            <div className="panel">
              <h2>Message</h2>
              <p>Enter an ENS name (like deanpierce.eth) or an 0x address.</p>
            </div>
            <div className="panel">
              <div className="row">
                <input
                  className="input"
                  placeholder="deanpierce.eth"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button className="button" type="submit" disabled={!target}>
                  Start
                </button>
              </div>
              <div className="help">
                Examples: <code>/deanpierce.eth</code>, <code>/0xabc…</code>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

