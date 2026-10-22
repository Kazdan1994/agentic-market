# Contract: Run Event Stream (SSE)

`GET /v1/runs/{runId}/events` with a session cookie. Response `Content-Type:
text/event-stream`. Covers FR-021a and FR-021b; the target latency is SC-002a (each entry
visible within 1 second).

## Events

| `event:` | `id:` | `data:` (JSON) | When |
|---|---|---|---|
| `log` | entry `seq` | a `LogEntry` (see [openapi.yaml](./openapi.yaml)) | each decision log entry, in `seq` order |
| `run.completed` | none | a `Run` with `status = completed` and its final `outcome`, `strategy`, `fallbackReason`, `orderId` | once, after the last `log` event; the server then closes the stream |
| (comment `: ping`) | none | none | every 15 s while the run is open, to keep proxies from closing the connection |

Example:

```text
id: 3
event: log
data: {"seq":3,"at":"2026-10-22T10:00:01.412Z","step":"evaluation","message":"Discarded \"Trail Buds Pro\" from SoundHub: 129.00 EUR is over the 100.00 EUR per-purchase cap.","productId":"…","data":{"verdict":"discarded","reasonCode":"over_budget","merchant":"soundhub","priceMinor":12900}}

event: run.completed
data: {"id":"…","status":"completed","outcome":"order_placed","strategy":"ai","fallbackReason":null,"orderId":"…", …}
```

## Replay and reconnection rules

1. On connect, the server sends every stored entry with `seq > Last-Event-ID`, or all of
   them when the header is absent, then switches to live entries. There is no gap and no
   duplicate.
2. If the run is already completed on connect, the server sends the replay and then
   `run.completed`, and closes the stream.
3. Live entries are published only after their row is committed, so a replay can never
   send an entry that later disappears.
4. A run that belongs to another user returns `404` before the stream opens.
5. Closing the stream does not affect the run (FR-021b).

## Contract tests

- A fresh connect during a run receives entries 1…n in order, then `run.completed`.
- A reconnect with `Last-Event-ID: k` receives exactly `k+1…n` and nothing before.
- Connecting to a completed run receives the full log, then `run.completed`, then the stream
  closes.
- Another user's run returns `404`.
- Each live entry arrives at the client less than 1 s after its row is written.
