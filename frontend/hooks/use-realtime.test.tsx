import { act, render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { vi } from "vitest";
import { useRealtimeLedger } from "./use-realtime-ledger";
import { useRealtimeWallets } from "./use-realtime-wallets";

const realtime = vi.hoisted(() => {
  const channel = { on: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn() };
  channel.on.mockReturnValue(channel);
  channel.subscribe.mockReturnValue(channel);
  return {
    channel,
    client: {
      auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: "test-token" } } })) },
      realtime: { setAuth: vi.fn() },
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    },
  };
});

vi.mock("@/lib/supabase/client", () => ({ createClient: () => realtime.client }));

function WalletProbe({ onChange }: { onChange: (wallet: { cat_id: string; balance: number }) => void }) {
  useRealtimeWallets(onChange);
  return null;
}

function LedgerProbe({ onChange }: { onChange: (payload: { eventType: "INSERT"; new: { id: string }; old: { id: string } }) => void }) {
  useRealtimeLedger(onChange as never);
  return null;
}

describe("realtime dashboard hooks", () => {
  beforeEach(() => {
    realtime.channel.on.mockClear();
    realtime.client.channel.mockClear();
    realtime.client.removeChannel.mockClear();
  });

  it("subscribes to unfiltered RLS-scoped wallet changes and forwards a payload", async () => {
    const onChange = vi.fn();
    render(<WalletProbe onChange={onChange} />);

    await waitFor(() => expect(realtime.client.channel).toHaveBeenCalledWith("dashboard-wallets"));
    expect(realtime.client.channel).toHaveBeenCalledWith("dashboard-wallets");
    expect(realtime.channel.on).toHaveBeenCalledWith("postgres_changes", { event: "*", schema: "public", table: "wallets" }, expect.any(Function));
    const handler = realtime.channel.on.mock.calls[0][2] as (payload: unknown) => void;
    act(() => handler({ new: { cat_id: "cat-1", balance: 725 } }));
    expect(onChange).toHaveBeenCalledWith({ cat_id: "cat-1", balance: 725 });
  });

  it("does not double-subscribe wallets during a Strict Mode effect replay", async () => {
    render(<StrictMode><WalletProbe onChange={vi.fn()} /></StrictMode>);

    await waitFor(() => expect(realtime.client.channel).toHaveBeenCalledTimes(1));
    expect(realtime.client.channel).toHaveBeenCalledTimes(1);
  });

  it("subscribes to unfiltered RLS-scoped ledger changes and forwards a payload", async () => {
    const onChange = vi.fn();
    render(<LedgerProbe onChange={onChange} />);

    await waitFor(() => expect(realtime.client.channel).toHaveBeenCalledWith("dashboard-ledger"));
    expect(realtime.client.channel).toHaveBeenCalledWith("dashboard-ledger");
    expect(realtime.channel.on).toHaveBeenCalledWith("postgres_changes", { event: "*", schema: "public", table: "ledger_entries" }, expect.any(Function));
    const handler = realtime.channel.on.mock.calls[0][2] as (payload: unknown) => void;
    const payload = { eventType: "INSERT", new: { id: "entry-1" }, old: { id: "entry-1" } };
    act(() => handler(payload));
    expect(onChange).toHaveBeenCalledWith(payload);
  });

  it("does not double-subscribe ledger during a Strict Mode effect replay", async () => {
    render(<StrictMode><LedgerProbe onChange={vi.fn()} /></StrictMode>);

    await waitFor(() => expect(realtime.client.channel).toHaveBeenCalledTimes(1));
    expect(realtime.client.channel).toHaveBeenCalledTimes(1);
  });
});
