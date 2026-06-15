"use client";
/* Arc Cart — standalone shop/checkout dApp (light, clean shop). Self-contained.
   ABI preserved: create(label,price)/pay(id)/get/getMine/total. */
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
const C = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0") as `0x${string}`;
const CHAIN = 5042002, HEX = "0x4CEF52";
const ABI = [
  { name: "create", type: "function", stateMutability: "nonpayable", inputs: [{ name: "label", type: "string" }, { name: "price", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "pay", type: "function", stateMutability: "payable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { name: "get", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "tuple", components: [{ name: "owner", type: "address" }, { name: "label", type: "string" }, { name: "price", type: "uint256" }, { name: "paid", type: "bool" }, { name: "payer", type: "address" }, { name: "at", type: "uint256" }] }] },
  { name: "getMine", type: "function", stateMutability: "view", inputs: [{ name: "u", type: "address" }], outputs: [{ type: "uint256[]" }] },
  { name: "total", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;
const cut = (a?: string) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
const usd = (w?: bigint) => w === undefined ? "0.00" : Number(formatEther(w)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const EMO = ["👕", "🧢", "🧦", "👟", "🎒", "⌚", "🕶️", "🧥"];
async function toArc() { const e = (window as any).ethereum; if (!e) return; try { await e.request({ method: "wallet_addEthereumChain", params: [{ chainId: HEX, chainName: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: ["https://rpc.testnet.arc.network"], blockExplorerUrls: ["https://testnet.arcscan.app"] }] }); } catch { try { await e.request({ method: "wallet_switchEthereumChain", params: [{ chainId: HEX }] }); } catch {} } }
const CSS = `
.ct{--bg:#f7f8fa;--card:#fff;--bd:#e6e8ec;--bd2:#d6d9df;--mut:#8a909a;--txt:#161a20;--acc:#111418;min-height:100vh;background:var(--bg);color:var(--txt);font-family:'Inter','Segoe UI',system-ui,sans-serif}
.ct *{box-sizing:border-box}.ct a{color:#3b6;text-decoration:none}
.ct header{display:flex;align-items:center;gap:10px;padding:15px 6vw;border-bottom:1px solid #ebedf0;background:#fff}
.ct .logo{display:flex;align-items:center;gap:9px;font-weight:800;font-size:16px}
.ct .mark{width:32px;height:32px;border-radius:9px;background:var(--acc);color:#fff;display:grid;place-items:center;font-size:15px}
.ct .chip{font-size:11px;color:var(--mut);border:1px solid var(--bd2);border-radius:99px;padding:3px 9px}
.ct .btn{border:0;border-radius:9px;font:inherit;font-weight:700;cursor:pointer;padding:9px 16px;transition:.15s}.ct .btn:disabled{opacity:.5;cursor:not-allowed}
.ct .pri{background:var(--acc);color:#fff}.ct .pri:hover:not(:disabled){opacity:.9}.ct .red{background:#dc2626;color:#fff}
.ct .wrap{max-width:900px;margin:0 auto;padding:22px 22px 60px}
.ct .tabs{display:inline-flex;gap:4px;background:#fff;border:1px solid var(--bd);border-radius:12px;padding:4px;margin-bottom:18px}
.ct .tab{border:0;background:none;color:var(--mut);font:inherit;font-weight:700;font-size:13px;padding:8px 16px;border-radius:9px;cursor:pointer}.ct .tab.on{background:var(--acc);color:#fff}
.ct .grid{display:grid;grid-template-columns:1fr 280px;gap:18px;align-items:start}
.ct .shop{background:#fff;border:1px solid var(--bd);border-radius:16px;overflow:hidden}
.ct .it{display:flex;align-items:center;gap:12px;padding:13px 16px;border-bottom:1px solid #f1f2f4}.ct .it:last-child{border-bottom:0}
.ct .ic{width:46px;height:46px;border-radius:10px;background:#f1f2f4;display:grid;place-items:center;font-size:22px}
.ct .card{background:#fff;border:1px solid var(--bd);border-radius:16px;padding:18px}
.ct label{display:block;font-size:12px;color:var(--mut);font-weight:600;margin:8px 0 5px}
.ct input{width:100%;background:var(--bg);border:1px solid var(--bd2);border-radius:11px;padding:11px 13px;font:inherit;font-size:14px;color:var(--txt);outline:none}.ct input:focus{border-color:var(--acc)}
.ct .menu{position:absolute;right:0;top:115%;background:#fff;border:1px solid var(--bd);border-radius:11px;padding:6px;min-width:180px;z-index:30;box-shadow:0 14px 34px rgba(20,30,50,.16)}
.ct .menu button{display:block;width:100%;text-align:left;background:none;border:0;color:var(--txt);font:inherit;font-weight:600;font-size:13px;padding:8px 11px;border-radius:8px;cursor:pointer}.ct .menu button:hover{background:var(--bg)}
@media(max-width:780px){.ct .grid{grid-template-columns:1fr}}
`;
function Item({ id, busy, pay }: { id: bigint; busy: boolean; pay: (id: bigint, v: bigint) => void }) {
  const { data: it } = useReadContract({ address: C, abi: ABI, functionName: "get", args: [id] });
  if (!it) return null; const x = it as any;
  return (
    <div className="it">
      <div className="ic">{EMO[Number(id) % EMO.length]}</div>
      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600 }}>{x.label || `Item #${id}`}</div><div style={{ fontSize: 12, color: "var(--mut)" }}>#{id.toString()} · {cut(x.owner)}</div></div>
      <div style={{ fontWeight: 800 }}>${usd(x.price)}</div>
      {x.paid ? <span style={{ fontSize: 12, color: "var(--mut)" }}>Sold ✓</span> : <button className="btn pri" style={{ padding: "7px 14px", fontSize: 13 }} disabled={busy} onClick={() => pay(id, x.price)}>{busy ? "…" : "Buy"}</button>}
    </div>
  );
}
export default function App() {
  const { address, isConnected } = useAccount(); const net = useChainId();
  const { connectors, connect } = useConnect(); const { disconnect } = useDisconnect();
  const [pop, setPop] = useState(false); const [tab, setTab] = useState<"shop" | "sell">("shop");
  const [form, setForm] = useState({ label: "", price: "" });
  const tx = useWriteContract(); const rcpt = useWaitForTransactionReceipt({ hash: tx.data, query: { enabled: !!tx.data } });
  const busy = tx.isPending || rcpt.isLoading;
  const total = useReadContract({ address: C, abi: ABI, functionName: "total" });
  const mine = useReadContract({ address: C, abi: ABI, functionName: "getMine", args: address ? [address] : undefined, query: { enabled: !!address } });
  useEffect(() => { if (rcpt.isSuccess) { tx.reset(); setForm({ label: "", price: "" }); total.refetch(); mine.refetch(); } }, [rcpt.isSuccess]); // eslint-disable-line
  const wrong = isConnected && net !== CHAIN; const n = total.data !== undefined ? Number(total.data) : 0;
  const pay = (id: bigint, v: bigint) => tx.writeContract({ address: C, abi: ABI, functionName: "pay", args: [id], value: v });
  return (
    <div className="ct">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header>
        <div className="logo"><span className="mark">🛒</span>Arc Cart</div>
        <span className="chip">Shop · pay in USDC</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          {wrong && <button className="btn red" onClick={toArc}>Switch to Arc</button>}
          <div style={{ position: "relative" }}><button className="btn pri" onClick={() => setPop(p => !p)}>{isConnected ? cut(address) : "Connect"}</button>
            {pop && <div className="menu">{isConnected ? <button onClick={() => { disconnect(); setPop(false); }} style={{ color: "#dc2626" }}>Disconnect</button> : connectors.map(c => <button key={c.uid} onClick={() => { connect({ connector: c }); setPop(false); }}>{c.name}</button>)}</div>}</div>
        </div>
      </header>
      <div className="wrap">
        <div className="tabs">{([["shop", "Shop"], ["sell", "Sell"]] as const).map(([t, l]) => <button key={t} className={"tab" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>{l}</button>)}</div>
        {tab === "shop" && <div className="grid">
          <div className="shop">{n > 0 ? Array.from({ length: n }, (_, i) => BigInt(n - 1 - i)).map(id => <Item key={id.toString()} id={id} busy={busy} pay={pay} />) : <div style={{ color: "var(--mut)", textAlign: "center", padding: "40px 0" }}>No items yet — list one in Sell 🛒</div>}</div>
          <div className="card"><div style={{ fontWeight: 700, marginBottom: 10 }}>The shop</div><div style={{ fontSize: 13, color: "var(--mut)", display: "flex", justifyContent: "space-between", padding: "5px 0" }}><span>Items listed</span><b style={{ color: "var(--txt)" }}>{n}</b></div><div style={{ fontSize: 13, color: "var(--mut)" }}>Tap Buy on any item to pay its price in USDC — settles instantly on Arc.</div></div>
        </div>}
        {tab === "sell" && <div className="card" style={{ maxWidth: 440, margin: "0 auto" }}>
          <label>Item name</label><input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Organic tee" />
          <label>Price (USDC)</label><input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} type="number" placeholder="0.00" style={{ fontSize: 18, fontWeight: 800 }} />
          <button className="btn pri" style={{ width: "100%", marginTop: 14 }} disabled={!isConnected || busy || !(Number(form.price) > 0)} onClick={() => tx.writeContract({ address: C, abi: ABI, functionName: "create", args: [form.label, parseEther(form.price || "0")] })}>{busy ? "…" : "List item 🛒"}</button>
          {mine.data && (mine.data as readonly bigint[]).length > 0 && <div style={{ fontSize: 11, color: "var(--mut)", textAlign: "center", marginTop: 8 }}>Your item IDs: {(mine.data as readonly bigint[]).map(x => x.toString()).join(", ")}</div>}
        </div>}
        <div style={{ textAlign: "center", color: "#aab0ba", fontSize: 12, marginTop: 24 }}>Built on <a href="https://arc.network" target="_blank" rel="noopener noreferrer">Arc Network</a></div>
      </div>
    </div>
  );
}
