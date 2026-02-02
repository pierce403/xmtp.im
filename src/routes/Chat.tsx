import {
  Client,
  ConsentState,
  SortDirection,
  type AsyncStreamProxy,
  type DecodedMessage,
  type Dm,
} from "@xmtp/browser-sdk";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { APP_VERSION, MAINNET_RPC_URL, WALLETCONNECT_PROJECT_ID, XMTP_ENV } from "../config";
import type { ResolvedRecipient } from "../lib/recipient";
import { resolveRecipient } from "../lib/recipient";
import {
  connectBrowserWallet,
  connectWalletConnect,
  createEphemeralSigner,
  type ConnectedSigner,
} from "../lib/signers";

type IdentityMode = "ephemeral" | "browserWallet" | "walletConnect";

function shortAddress(address: string) {
  if (!address.startsWith("0x") || address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

export default function Chat() {
  const navigate = useNavigate();
  const { target } = useParams();

  const decodedTarget = useMemo(() => {
    if (!target) return "";
    try {
      return decodeURIComponent(target);
    } catch {
      return target;
    }
  }, [target]);

  const [recipient, setRecipient] = useState<ResolvedRecipient | null>(null);
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [canMessage, setCanMessage] = useState<boolean | null>(null);

  const [identityMode, setIdentityMode] = useState<IdentityMode>("ephemeral");
  const [connectedSigner, setConnectedSigner] = useState<ConnectedSigner | null>(
    null,
  );

  const [client, setClient] = useState<Client | null>(null);
  const [dm, setDm] = useState<Dm | null>(null);
  const [messages, setMessages] = useState<DecodedMessage[]>([]);

  const { displayMessages, hiddenMessageCount } = useMemo(() => {
    const display: DecodedMessage[] = [];
    let hidden = 0;

    for (const message of messages) {
      const isDisplayable =
        typeof message.content === "string" || typeof message.fallback === "string";
      if (isDisplayable) {
        display.push(message);
      } else {
        hidden += 1;
      }
    }

    return { displayMessages: display, hiddenMessageCount: hidden };
  }, [messages]);

  const [messageText, setMessageText] = useState("");
  const [status, setStatus] = useState<string>("Idle");
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const streamRef = useRef<AsyncStreamProxy<DecodedMessage> | null>(null);
  const clientRef = useRef<Client | null>(null);
  const disconnectRef = useRef<(() => Promise<void>) | null>(null);
  const connectIdRef = useRef(0);
  const listRef = useRef<HTMLUListElement | null>(null);
  const autoConnectKeyRef = useRef<string | null>(null);

  const title = recipient?.displayName ?? decodedTarget;

  function cancelInFlightConnects() {
    connectIdRef.current += 1;
  }

  async function resetConnection() {
    try {
      await streamRef.current?.end();
    } catch {
      // ignore
    }
    streamRef.current = null;

    try {
      clientRef.current?.close();
    } catch {
      // ignore
    }
    clientRef.current = null;

    const disconnect = disconnectRef.current;
    disconnectRef.current = null;
    if (disconnect) {
      try {
        await disconnect();
      } catch {
        // ignore
      }
    }

    setClient(null);
    setDm(null);
    setMessages([]);
    setConnectedSigner(null);
  }

  useEffect(() => {
    cancelInFlightConnects();
    autoConnectKeyRef.current = null;
    setError(null);
    setStatus("Idle");
    void resetConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityMode]);

  useEffect(() => {
    void (async () => {
      cancelInFlightConnects();
      await resetConnection();
      setRecipient(null);
      setRecipientError(null);
      setCanMessage(null);
      setError(null);
      setStatus("Resolving recipient…");

      if (!decodedTarget) {
        setRecipientError("Missing recipient identity in the URL.");
        setStatus("Idle");
        return;
      }

      try {
        const resolved = await resolveRecipient(decodedTarget);
        setRecipient(resolved);
        setStatus("Checking XMTP inbox…");

        const map = await Client.canMessage([resolved.identifier], XMTP_ENV);
        setCanMessage(map.get(resolved.address.toLowerCase()) ?? false);
        setStatus("Ready");
      } catch (error) {
        setRecipientError(toErrorMessage(error));
        setStatus("Idle");
      }
    })();

    return () => {
      cancelInFlightConnects();
      void resetConnection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedTarget]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function connect(mode: IdentityMode) {
    if (!recipient) return;

    const connectId = ++connectIdRef.current;
    setConnecting(true);
    setError(null);
    setStatus("Connecting…");
    await resetConnection();

    try {
      if (canMessage === false) {
        throw new Error(
          `${recipient.displayName} does not appear to have an XMTP inbox on production.`,
        );
      }

      let signer: ConnectedSigner;
      if (mode === "ephemeral") {
        signer = createEphemeralSigner();
      } else if (mode === "browserWallet") {
        signer = await connectBrowserWallet();
      } else {
        if (!WALLETCONNECT_PROJECT_ID) {
          throw new Error(
            "WalletConnect is not configured. Set VITE_WALLETCONNECT_PROJECT_ID.",
          );
        }
        signer = await connectWalletConnect(
          WALLETCONNECT_PROJECT_ID,
          MAINNET_RPC_URL,
        );
      }

      if (connectId !== connectIdRef.current) {
        await signer.disconnect?.();
        return;
      }

      disconnectRef.current = signer.disconnect ?? null;
      setConnectedSigner(signer);

      setStatus("Creating XMTP client…");
      const newClient = await Client.create(signer.signer, {
        env: XMTP_ENV,
        dbPath: null,
        appVersion: APP_VERSION,
      });

      if (connectId !== connectIdRef.current) {
        newClient.close();
        await signer.disconnect?.();
        return;
      }

      clientRef.current = newClient;
      setClient(newClient);

      setStatus("Opening conversation…");
      const newDm = await newClient.conversations.createDmWithIdentifier(
        recipient.identifier,
      );

      if (connectId !== connectIdRef.current) {
        return;
      }

      setDm(newDm);

      const initial = await newDm.messages({
        direction: SortDirection.Ascending,
        limit: 50n,
      });
      setMessages(initial);

      setStatus("Streaming messages…");
      const stream = await newClient.conversations.streamAllMessages({
        consentStates: [ConsentState.Allowed, ConsentState.Unknown],
        onValue: (message) => {
          if (message.conversationId !== newDm.id) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev;
            const next = [...prev, message];
            next.sort((a, b) => (a.sentAtNs < b.sentAtNs ? -1 : 1));
            return next;
          });
        },
      });

      streamRef.current = stream;
      setStatus("Connected");
    } catch (error) {
      setError(toErrorMessage(error));
      setStatus("Idle");
    } finally {
      if (connectId === connectIdRef.current) {
        setConnecting(false);
      }
    }
  }

  useEffect(() => {
    if (!recipient) return;
    if (identityMode !== "ephemeral") return;
    if (recipientError) return;

    const key = `${recipient.address}:${identityMode}`;
    if (autoConnectKeyRef.current === key) return;
    autoConnectKeyRef.current = key;

    void connect(identityMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityMode, recipient?.address, recipientError]);

  async function onSend(event: FormEvent) {
    event.preventDefault();
    if (!dm || !client) return;

    const text = messageText.trim();
    if (!text) return;

    setMessageText("");
    setError(null);

    try {
      await dm.sendText(text);
      const updated = await dm.messages({
        direction: SortDirection.Ascending,
        limit: 50n,
      });
      setMessages(updated);
    } catch (error) {
      setMessageText(text);
      setError(toErrorMessage(error));
    }
  }

  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <div className="title">
            <h1>{title ? `Chat with ${title}` : "Chat"}</h1>
            <p>
              {recipient ? (
                <>
                  {recipient.input !== recipient.address ? (
                    <>
                      Resolved to <code>{shortAddress(recipient.address)}</code>
                    </>
                  ) : (
                    <>
                      Address <code>{shortAddress(recipient.address)}</code>
                    </>
                  )}
                </>
              ) : (
                status
              )}
            </p>
          </div>
          <div className="pill">
            <strong>XMTP</strong> <span>{XMTP_ENV}</span>
          </div>
        </div>

        <div className="content">
          <div className="grid">
            <div className="stack">
              <div className="panel">
                <h2>Recipient</h2>
                {recipientError ? (
                  <div className="error">{recipientError}</div>
                ) : (
                  <>
                    <div className="help">
                      {recipient ? (
                        <>
                          <div>
                            <strong>{recipient.displayName}</strong>
                          </div>
                          <div>
                            <code>{recipient.address}</code>
                          </div>
                        </>
                      ) : (
                        "Resolving…"
                      )}
                    </div>
                    {recipient && (
                      <div className="help">
                        {canMessage === null ? (
                          "Checking XMTP inbox…"
                        ) : canMessage ? (
                          <>
                            Status: <span style={{ color: "var(--ok)" }}>can message</span>
                          </>
                        ) : (
                          <>
                            Status:{" "}
                            <span style={{ color: "var(--danger)" }}>
                              not on XMTP (production)
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="panel">
                <h2>Identity</h2>
                <div className="radioRow" role="radiogroup" aria-label="Identity mode">
                  <label className="radioOption">
                    <input
                      type="radio"
                      checked={identityMode === "ephemeral"}
                      onChange={() => setIdentityMode("ephemeral")}
                    />
                    <div>
                      <strong>Ephemeral (recommended)</strong>
                      <span>Generates a new key in this tab.</span>
                    </div>
                  </label>

                  <label className="radioOption">
                    <input
                      type="radio"
                      checked={identityMode === "browserWallet"}
                      onChange={() => setIdentityMode("browserWallet")}
                    />
                    <div>
                      <strong>Browser wallet</strong>
                      <span>Use MetaMask / Coinbase Wallet / etc.</span>
                    </div>
                  </label>

                  <label className="radioOption">
                    <input
                      type="radio"
                      checked={identityMode === "walletConnect"}
                      onChange={() => setIdentityMode("walletConnect")}
                    />
                    <div>
                      <strong>WalletConnect</strong>
                      <span>
                        QR code (requires <code>VITE_WALLETCONNECT_PROJECT_ID</code>).
                      </span>
                    </div>
                  </label>
                </div>

                <div className="help">
                  {connectedSigner && client ? (
                    <>
                      Connected as <code>{shortAddress(connectedSigner.address)}</code>{" "}
                      (<strong>{connectedSigner.label}</strong>)<br />
                      Inbox <code>{client.inboxId}</code>
                    </>
                  ) : (
                    "Not connected yet."
                  )}
                </div>

                <div className="row" style={{ marginTop: 12 }}>
                  <button
                    className="button"
                    type="button"
                    disabled={
                      connecting ||
                      !!recipientError ||
                      !recipient ||
                      canMessage === false ||
                      (identityMode === "walletConnect" && !WALLETCONNECT_PROJECT_ID)
                    }
                    onClick={() => void connect(identityMode)}
                  >
                    {identityMode === "ephemeral" ? "Reconnect" : "Connect"}
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => navigate("/", { replace: true })}
                    disabled={connecting}
                  >
                    Start over
                  </button>
                </div>
              </div>
            </div>

            <div className="panel">
              <h2>Conversation</h2>

              {error && <div className="error">{error}</div>}
              {!error && canMessage === false && recipient && (
                <div className="error">
                  {recipient.displayName} does not appear to have an XMTP inbox on{" "}
                  <strong>{XMTP_ENV}</strong>.
                </div>
              )}

              {hiddenMessageCount > 0 && (
                <div className="help" style={{ marginTop: 0 }}>
                  {hiddenMessageCount} message{hiddenMessageCount === 1 ? "" : "s"}{" "}
                  hidden (unsupported types).
                </div>
              )}

              <ul className="messages" ref={listRef} aria-label="Messages">
                {displayMessages.length === 0 ? (
                  <li className="help">
                    {client && dm
                      ? "No messages yet. Send the first message."
                      : "Connect to load messages."}
                  </li>
                ) : (
                  displayMessages.map((m) => {
                    const isMe = !!client && m.senderInboxId === client.inboxId;
                    const text =
                      typeof m.content === "string" ? m.content : m.fallback ?? "";
                    return (
                      <li key={m.id} className={`messageItem ${isMe ? "me" : ""}`}>
                        <div className={`bubble ${isMe ? "me" : ""}`}>{text}</div>
                        <div className="meta">
                          <span>{isMe ? "me" : "them"}</span>
                          <span>{m.sentAt.toLocaleString()}</span>
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>

              <form className="composer" onSubmit={onSend}>
                <textarea
                  className="input"
                  placeholder="Type a message…"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={!client || !dm || connecting}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void onSend(e as unknown as FormEvent);
                    }
                  }}
                />
                <button
                  className="button"
                  type="submit"
                  disabled={!client || !dm || connecting || !messageText.trim()}
                >
                  Send
                </button>
              </form>

              <div className="help">
                Tip: Shift+Enter for a newline. Messages are sent on XMTP{" "}
                <strong>{XMTP_ENV}</strong>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
